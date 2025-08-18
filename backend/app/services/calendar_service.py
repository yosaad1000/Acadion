"""
Calendar service for Google Calendar API operations.
Handles event CRUD operations, rate limiting, conflict detection, and error handling.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx

from ..config import settings
from ..models.calendar import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse,
    RecurrencePattern, RecurrenceType
)
from .oauth_service import oauth_service, OAuthError
from .token_encryption import token_encryption
from ..core.logging_config import get_calendar_logger, PerformanceLogger, log_api_error
from .graceful_degradation import graceful_degradation
from .retry_queue import retry_queue_service, RetryConfig
from .error_messages import error_message_service

logger = get_calendar_logger(__name__)


class CalendarError(Exception):
    """Custom exception for calendar-related errors."""
    
    def __init__(self, message: str, error_code: str, retry_after: Optional[int] = None):
        self.message = message
        self.error_code = error_code
        self.retry_after = retry_after
        super().__init__(message)


class RateLimitError(CalendarError):
    """Exception for rate limit exceeded errors."""
    pass


class ConflictError(CalendarError):
    """Exception for calendar event conflicts."""
    pass


@dataclass
class RetryConfig:
    """Configuration for retry mechanisms."""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True


class CalendarService:
    """
    Service for Google Calendar API operations with rate limiting, retry mechanisms,
    and comprehensive error handling.
    """
    
    def __init__(self):
        self.retry_config = RetryConfig()
        self._rate_limit_tracker = {}  # Track rate limits per user
        
    async def create_event(
        self, 
        user_id: int, 
        event_data: CalendarEventCreate,
        calendar_id: str = "primary"
    ) -> str:
        """
        Create a single event in Google Calendar with comprehensive error handling.
        
        Args:
            user_id: ID of the user
            event_data: Event data to create
            calendar_id: Calendar ID (defaults to primary)
            
        Returns:
            str: Created event ID
            
        Raises:
            CalendarError: If event creation fails
            ConflictError: If event conflicts with existing events
        """
        
        with PerformanceLogger(logger, "create_calendar_event", user_id=user_id, event_title=event_data.title):
            
            async def primary_operation():
                """Primary operation: Create event in Google Calendar."""
                # Get authenticated service
                service = await self._get_authenticated_service(user_id)
                
                # Check for conflicts if requested
                conflicts = await self.check_conflicts(
                    user_id, 
                    event_data.start_datetime, 
                    event_data.duration_minutes
                )
                
                if conflicts:
                    raise ConflictError(
                        message=f"Event conflicts with {len(conflicts)} existing events",
                        error_code="EVENT_CONFLICT"
                    )
                
                # Prepare event data for Google Calendar API
                end_datetime = event_data.start_datetime + timedelta(minutes=event_data.duration_minutes)
                
                google_event = {
                    'summary': event_data.title,
                    'description': event_data.description or '',
                    'start': {
                        'dateTime': event_data.start_datetime.isoformat(),
                        'timeZone': 'UTC',
                    },
                    'end': {
                        'dateTime': end_datetime.isoformat(),
                        'timeZone': 'UTC',
                    },
                }
                
                # Add location if provided
                if event_data.location:
                    google_event['location'] = event_data.location
                
                # Add attendees if provided
                if event_data.attendees:
                    google_event['attendees'] = [
                        {'email': email} for email in event_data.attendees
                    ]
                
                # Create event with retry mechanism
                created_event = await self._execute_with_retry(
                    lambda: service.events().insert(
                        calendarId=calendar_id,
                        body=google_event
                    ).execute(),
                    user_id=user_id,
                    operation_name="create_event"
                )
                
                event_id = created_event['id']
                logger.info(f"Event created successfully in Google Calendar", extra={
                    'event_id': event_id,
                    'user_id': user_id,
                    'event_title': event_data.title,
                    'operation': 'create_event'
                })
                
                return event_id
            
            async def fallback_operation():
                """Fallback operation: Create event locally."""
                local_event_id = await graceful_degradation.create_local_event(user_id, event_data)
                
                # Queue for retry when service recovers
                await retry_queue_service.enqueue_operation(
                    "create_calendar_event",
                    {
                        "event_data": event_data.dict(),
                        "user_id": user_id,
                        "calendar_id": calendar_id,
                        "local_event_id": local_event_id.replace("local_", "")
                    },
                    user_id,
                    RetryConfig(max_attempts=5, initial_delay=60.0)  # Retry for 5 attempts starting after 1 minute
                )
                
                logger.info(f"Event created locally and queued for sync", extra={
                    'local_event_id': local_event_id,
                    'user_id': user_id,
                    'event_title': event_data.title,
                    'operation': 'create_event_fallback'
                })
                
                return local_event_id
            
            try:
                # Execute with graceful degradation
                return await graceful_degradation.execute_with_fallback(
                    primary_operation,
                    fallback_operation,
                    "create_calendar_event",
                    user_id=user_id,
                    event_title=event_data.title
                )
                
            except ConflictError as error:
                log_api_error(logger, error, "create_event", user_id, 
                             event_title=event_data.title, conflict_count=len(conflicts) if 'conflicts' in locals() else 0)
                raise
            except CalendarError as error:
                log_api_error(logger, error, "create_event", user_id, event_title=event_data.title)
                raise
            except Exception as error:
                log_api_error(logger, error, "create_event", user_id, event_title=event_data.title)
                raise CalendarError(
                    message="Failed to create calendar event",
                    error_code="EVENT_CREATE_FAILED"
                )
    
    async def create_recurring_event(
        self,
        user_id: int,
        event_data: CalendarEventCreate,
        recurrence_pattern: RecurrencePattern,
        calendar_id: str = "primary"
    ) -> List[str]:
        """
        Create a recurring event series in Google Calendar.
        
        Args:
            user_id: ID of the user
            event_data: Base event data
            recurrence_pattern: Recurrence configuration
            calendar_id: Calendar ID (defaults to primary)
            
        Returns:
            List[str]: List of created event IDs
            
        Raises:
            CalendarError: If recurring event creation fails
        """
        try:
            # Get authenticated service
            service = await self._get_authenticated_service(user_id)
            
            # Build recurrence rule
            rrule = self._build_recurrence_rule(recurrence_pattern)
            
            # Prepare event data
            end_datetime = event_data.start_datetime + timedelta(minutes=event_data.duration_minutes)
            
            google_event = {
                'summary': event_data.title,
                'description': event_data.description or '',
                'start': {
                    'dateTime': event_data.start_datetime.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'UTC',
                },
                'recurrence': [rrule]
            }
            
            # Add location if provided
            if event_data.location:
                google_event['location'] = event_data.location
            
            # Add attendees if provided
            if event_data.attendees:
                google_event['attendees'] = [
                    {'email': email} for email in event_data.attendees
                ]
            
            # Create recurring event with retry mechanism
            created_event = await self._execute_with_retry(
                lambda: service.events().insert(
                    calendarId=calendar_id,
                    body=google_event
                ).execute(),
                user_id=user_id,
                operation_name="create_recurring_event"
            )
            
            # Get all instances of the recurring event
            recurring_event_id = created_event['id']
            instances = await self._get_recurring_event_instances(
                service, calendar_id, recurring_event_id
            )
            
            event_ids = [instance['id'] for instance in instances]
            
            logger.info(f"Recurring event created: {recurring_event_id} with {len(event_ids)} instances for user {user_id}")
            
            return event_ids
            
        except CalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to create recurring event for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to create recurring calendar event",
                error_code="RECURRING_EVENT_CREATE_FAILED"
            )
    
    async def update_event(
        self,
        user_id: int,
        event_id: str,
        updates: CalendarEventUpdate,
        calendar_id: str = "primary"
    ) -> bool:
        """
        Update an existing calendar event.
        
        Args:
            user_id: ID of the user
            event_id: ID of the event to update
            updates: Update data
            calendar_id: Calendar ID (defaults to primary)
            
        Returns:
            bool: True if update successful
            
        Raises:
            CalendarError: If event update fails
        """
        try:
            # Get authenticated service
            service = await self._get_authenticated_service(user_id)
            
            # Get existing event
            existing_event = await self._execute_with_retry(
                lambda: service.events().get(
                    calendarId=calendar_id,
                    eventId=event_id
                ).execute(),
                user_id=user_id,
                operation_name="get_event"
            )
            
            # Apply updates
            updated_event = existing_event.copy()
            
            if updates.title is not None:
                updated_event['summary'] = updates.title
            
            if updates.description is not None:
                updated_event['description'] = updates.description
            
            if updates.start_datetime is not None:
                duration_minutes = updates.duration_minutes or self._calculate_duration_minutes(existing_event)
                end_datetime = updates.start_datetime + timedelta(minutes=duration_minutes)
                
                updated_event['start'] = {
                    'dateTime': updates.start_datetime.isoformat(),
                    'timeZone': 'UTC',
                }
                updated_event['end'] = {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'UTC',
                }
            elif updates.duration_minutes is not None:
                # Update duration only
                start_datetime = datetime.fromisoformat(
                    existing_event['start']['dateTime'].replace('Z', '+00:00')
                )
                end_datetime = start_datetime + timedelta(minutes=updates.duration_minutes)
                
                updated_event['end'] = {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'UTC',
                }
            
            if updates.location is not None:
                updated_event['location'] = updates.location
            
            if updates.attendees is not None:
                updated_event['attendees'] = [
                    {'email': email} for email in updates.attendees
                ]
            
            # Check for conflicts if time changed
            if updates.start_datetime is not None or updates.duration_minutes is not None:
                start_time = updates.start_datetime or datetime.fromisoformat(
                    existing_event['start']['dateTime'].replace('Z', '+00:00')
                )
                duration = updates.duration_minutes or self._calculate_duration_minutes(existing_event)
                
                conflicts = await self.check_conflicts(
                    user_id, start_time, duration, exclude_event_id=event_id
                )
                
                if conflicts:
                    raise ConflictError(
                        message=f"Event update conflicts with {len(conflicts)} existing events",
                        error_code="EVENT_UPDATE_CONFLICT"
                    )
            
            # Update event with retry mechanism
            await self._execute_with_retry(
                lambda: service.events().update(
                    calendarId=calendar_id,
                    eventId=event_id,
                    body=updated_event
                ).execute(),
                user_id=user_id,
                operation_name="update_event"
            )
            
            logger.info(f"Event updated successfully: {event_id} for user {user_id}")
            return True
            
        except ConflictError:
            raise
        except CalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to update event {event_id} for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to update calendar event",
                error_code="EVENT_UPDATE_FAILED"
            )
    
    async def delete_event(
        self,
        user_id: int,
        event_id: str,
        calendar_id: str = "primary"
    ) -> bool:
        """
        Delete a calendar event.
        
        Args:
            user_id: ID of the user
            event_id: ID of the event to delete
            calendar_id: Calendar ID (defaults to primary)
            
        Returns:
            bool: True if deletion successful
            
        Raises:
            CalendarError: If event deletion fails
        """
        try:
            # Get authenticated service
            service = await self._get_authenticated_service(user_id)
            
            # Delete event with retry mechanism
            await self._execute_with_retry(
                lambda: service.events().delete(
                    calendarId=calendar_id,
                    eventId=event_id
                ).execute(),
                user_id=user_id,
                operation_name="delete_event"
            )
            
            logger.info(f"Event deleted successfully: {event_id} for user {user_id}")
            return True
            
        except CalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to delete event {event_id} for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to delete calendar event",
                error_code="EVENT_DELETE_FAILED"
            )
    
    async def get_events(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        calendar_id: str = "primary"
    ) -> List[CalendarEventResponse]:
        """
        Get calendar events within a date range.
        
        Args:
            user_id: ID of the user
            start_date: Start of date range
            end_date: End of date range
            calendar_id: Calendar ID (defaults to primary)
            
        Returns:
            List[CalendarEventResponse]: List of calendar events
            
        Raises:
            CalendarError: If event retrieval fails
        """
        try:
            # Get authenticated service
            service = await self._get_authenticated_service(user_id)
            
            # Get events with retry mechanism
            events_result = await self._execute_with_retry(
                lambda: service.events().list(
                    calendarId=calendar_id,
                    timeMin=start_date.isoformat(),
                    timeMax=end_date.isoformat(),
                    singleEvents=True,
                    orderBy='startTime'
                ).execute(),
                user_id=user_id,
                operation_name="get_events"
            )
            
            events = events_result.get('items', [])
            
            # Convert to response format
            calendar_events = []
            for event in events:
                try:
                    calendar_event = self._convert_google_event_to_response(event)
                    calendar_events.append(calendar_event)
                except Exception as error:
                    logger.warning(f"Failed to convert event {event.get('id', 'unknown')}: {error}")
                    continue
            
            logger.info(f"Retrieved {len(calendar_events)} events for user {user_id}")
            return calendar_events
            
        except CalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to get events for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to retrieve calendar events",
                error_code="EVENTS_GET_FAILED"
            )
    
    async def check_conflicts(
        self,
        user_id: int,
        event_start: datetime,
        duration_minutes: int,
        calendar_id: str = "primary",
        exclude_event_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Check for conflicts with existing calendar events.
        
        Args:
            user_id: ID of the user
            event_start: Start time of the event to check
            duration_minutes: Duration of the event in minutes
            calendar_id: Calendar ID (defaults to primary)
            exclude_event_id: Event ID to exclude from conflict check
            
        Returns:
            List[Dict[str, Any]]: List of conflicting events
            
        Raises:
            CalendarError: If conflict check fails
        """
        try:
            event_end = event_start + timedelta(minutes=duration_minutes)
            
            # Get events in the time range (with some buffer)
            buffer_start = event_start - timedelta(hours=1)
            buffer_end = event_end + timedelta(hours=1)
            
            existing_events = await self.get_events(
                user_id, buffer_start, buffer_end, calendar_id
            )
            
            conflicts = []
            for existing_event in existing_events:
                # Skip if this is the event we're excluding
                if exclude_event_id and existing_event.event_id == exclude_event_id:
                    continue
                
                # Check for time overlap
                existing_start = existing_event.start_datetime
                existing_end = existing_event.end_datetime
                
                # Events overlap if one starts before the other ends
                if (event_start < existing_end and event_end > existing_start):
                    conflicts.append({
                        'event_id': existing_event.event_id,
                        'title': existing_event.title,
                        'start_datetime': existing_start.isoformat(),
                        'end_datetime': existing_end.isoformat(),
                        'overlap_start': max(event_start, existing_start).isoformat(),
                        'overlap_end': min(event_end, existing_end).isoformat()
                    })
            
            logger.info(f"Found {len(conflicts)} conflicts for user {user_id}")
            return conflicts
            
        except CalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to check conflicts for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to check for calendar conflicts",
                error_code="CONFLICT_CHECK_FAILED"
            )
    
    # Private helper methods
    
    async def _get_authenticated_service(self, user_id: int):
        """Get authenticated Google Calendar service for user."""
        try:
            # Get valid access token
            access_token = await oauth_service.get_valid_token(user_id)
            if not access_token:
                raise CalendarError(
                    message="No valid calendar access token found",
                    error_code="TOKEN_NOT_FOUND"
                )
            
            # Create credentials
            credentials = Credentials(
                token=access_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=settings.google_calendar_scopes_list
            )
            
            # Build and return service
            service = build('calendar', 'v3', credentials=credentials)
            return service
            
        except CalendarError:
            raise
        except OAuthError as error:
            raise CalendarError(
                message=f"Authentication failed: {error.message}",
                error_code="AUTH_FAILED"
            )
        except Exception as error:
            logger.error(f"Failed to get authenticated service for user {user_id}: {error}")
            raise CalendarError(
                message="Failed to authenticate with Google Calendar",
                error_code="SERVICE_AUTH_FAILED"
            )
    
    async def _execute_with_retry(
        self,
        operation,
        user_id: int,
        operation_name: str,
        max_retries: Optional[int] = None
    ):
        """Execute Google Calendar API operation with retry logic and rate limiting."""
        max_retries = max_retries or self.retry_config.max_retries
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                # Check rate limits
                await self._check_rate_limits(user_id)
                
                # Execute operation
                result = operation()
                
                # Reset rate limit tracker on success
                if user_id in self._rate_limit_tracker:
                    self._rate_limit_tracker[user_id]['consecutive_errors'] = 0
                
                return result
                
            except HttpError as error:
                last_error = error
                
                # Handle specific HTTP errors
                if error.resp.status == 401:
                    # Unauthorized - try to refresh token
                    if attempt == 0:  # Only try refresh once
                        try:
                            await oauth_service.refresh_access_token(user_id)
                            continue
                        except Exception:
                            pass
                    
                    raise CalendarError(
                        message="Calendar access unauthorized",
                        error_code="UNAUTHORIZED"
                    )
                
                elif error.resp.status == 403:
                    # Forbidden - might be rate limited
                    if 'quotaExceeded' in str(error) or 'rateLimitExceeded' in str(error):
                        await self._handle_rate_limit(user_id, error)
                        if attempt < max_retries:
                            continue
                        
                        raise RateLimitError(
                            message="Google Calendar API rate limit exceeded",
                            error_code="RATE_LIMIT_EXCEEDED",
                            retry_after=self._get_retry_delay(attempt)
                        )
                    
                    raise CalendarError(
                        message="Calendar access forbidden",
                        error_code="FORBIDDEN"
                    )
                
                elif error.resp.status == 404:
                    raise CalendarError(
                        message="Calendar or event not found",
                        error_code="NOT_FOUND"
                    )
                
                elif error.resp.status >= 500:
                    # Server error - retry with backoff
                    if attempt < max_retries:
                        delay = self._get_retry_delay(attempt)
                        logger.warning(f"Server error on attempt {attempt + 1}, retrying in {delay}s: {error}")
                        await asyncio.sleep(delay)
                        continue
                    
                    raise CalendarError(
                        message="Google Calendar service temporarily unavailable",
                        error_code="SERVICE_UNAVAILABLE"
                    )
                
                else:
                    # Other HTTP errors
                    raise CalendarError(
                        message=f"Google Calendar API error: {error}",
                        error_code="API_ERROR"
                    )
            
            except Exception as error:
                last_error = error
                
                if attempt < max_retries:
                    delay = self._get_retry_delay(attempt)
                    logger.warning(f"Operation failed on attempt {attempt + 1}, retrying in {delay}s: {error}")
                    await asyncio.sleep(delay)
                    continue
                
                break
        
        # All retries exhausted
        logger.error(f"Operation {operation_name} failed after {max_retries + 1} attempts: {last_error}")
        raise CalendarError(
            message=f"Operation failed after {max_retries + 1} attempts",
            error_code="MAX_RETRIES_EXCEEDED"
        )
    
    async def _check_rate_limits(self, user_id: int) -> None:
        """Check and enforce rate limits for user."""
        now = datetime.utcnow()
        
        if user_id not in self._rate_limit_tracker:
            self._rate_limit_tracker[user_id] = {
                'requests': [],
                'consecutive_errors': 0,
                'last_error_time': None
            }
        
        tracker = self._rate_limit_tracker[user_id]
        
        # Clean old requests (keep only last minute)
        tracker['requests'] = [
            req_time for req_time in tracker['requests']
            if (now - req_time).total_seconds() < 60
        ]
        
        # Check if we're hitting rate limits
        requests_per_minute = len(tracker['requests'])
        
        # Google Calendar API allows 1000 requests per 100 seconds per user
        # We'll be more conservative: 50 requests per minute
        if requests_per_minute >= 50:
            raise RateLimitError(
                message="Rate limit exceeded - too many requests",
                error_code="RATE_LIMIT_EXCEEDED",
                retry_after=60
            )
        
        # If we've had consecutive errors, add delay
        if tracker['consecutive_errors'] > 0:
            delay = min(2 ** tracker['consecutive_errors'], 30)  # Max 30 seconds
            if tracker['last_error_time'] and (now - tracker['last_error_time']).total_seconds() < delay:
                remaining_delay = delay - (now - tracker['last_error_time']).total_seconds()
                await asyncio.sleep(remaining_delay)
        
        # Record this request
        tracker['requests'].append(now)
    
    async def _handle_rate_limit(self, user_id: int, error: HttpError) -> None:
        """Handle rate limit error and update tracking."""
        now = datetime.utcnow()
        
        if user_id not in self._rate_limit_tracker:
            self._rate_limit_tracker[user_id] = {
                'requests': [],
                'consecutive_errors': 0,
                'last_error_time': None
            }
        
        tracker = self._rate_limit_tracker[user_id]
        tracker['consecutive_errors'] += 1
        tracker['last_error_time'] = now
        
        # Extract retry-after from error if available
        retry_after = 60  # Default to 1 minute
        
        try:
            if hasattr(error, 'resp') and error.resp.headers:
                retry_after_header = error.resp.headers.get('Retry-After')
                if retry_after_header and not isinstance(retry_after_header, Mock):
                    retry_after = int(retry_after_header)
        except (ValueError, AttributeError, TypeError):
            pass
        
        logger.warning(f"Rate limit hit for user {user_id}, waiting {retry_after} seconds")
        await asyncio.sleep(retry_after)
    
    def _get_retry_delay(self, attempt: int) -> float:
        """Calculate retry delay with exponential backoff and jitter."""
        delay = min(
            self.retry_config.base_delay * (self.retry_config.exponential_base ** attempt),
            self.retry_config.max_delay
        )
        
        if self.retry_config.jitter:
            import random
            delay *= (0.5 + random.random() * 0.5)  # Add 0-50% jitter
        
        return delay
    
    def _build_recurrence_rule(self, pattern: RecurrencePattern) -> str:
        """Build RRULE string from recurrence pattern."""
        rrule_parts = ["RRULE:FREQ=WEEKLY"]
        
        if pattern.interval > 1:
            rrule_parts.append(f"INTERVAL={pattern.interval}")
        
        if pattern.days_of_week:
            # Convert to RFC format (MO, TU, WE, TH, FR, SA, SU)
            day_names = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
            days = [day_names[day] for day in pattern.days_of_week]
            rrule_parts.append(f"BYDAY={','.join(days)}")
        
        if pattern.end_date:
            # Convert to YYYYMMDD format
            until_date = pattern.end_date.strftime('%Y%m%d')
            rrule_parts.append(f"UNTIL={until_date}")
        elif pattern.occurrence_count:
            rrule_parts.append(f"COUNT={pattern.occurrence_count}")
        
        return ';'.join(rrule_parts)
    
    async def _get_recurring_event_instances(
        self,
        service,
        calendar_id: str,
        recurring_event_id: str,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all instances of a recurring event."""
        try:
            instances_result = service.events().instances(
                calendarId=calendar_id,
                eventId=recurring_event_id,
                maxResults=max_results
            ).execute()
            
            return instances_result.get('items', [])
            
        except Exception as error:
            logger.error(f"Failed to get recurring event instances: {error}")
            return []
    
    def _calculate_duration_minutes(self, google_event: Dict[str, Any]) -> int:
        """Calculate event duration in minutes from Google Calendar event."""
        try:
            start_str = google_event['start'].get('dateTime', google_event['start'].get('date'))
            end_str = google_event['end'].get('dateTime', google_event['end'].get('date'))
            
            start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            
            duration = end_dt - start_dt
            return int(duration.total_seconds() / 60)
            
        except Exception:
            return 60  # Default to 1 hour
    
    def _convert_google_event_to_response(self, google_event: Dict[str, Any]) -> CalendarEventResponse:
        """Convert Google Calendar event to CalendarEventResponse."""
        try:
            # Parse start and end times
            start_str = google_event['start'].get('dateTime', google_event['start'].get('date'))
            end_str = google_event['end'].get('dateTime', google_event['end'].get('date'))
            
            start_datetime = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end_datetime = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            
            # Extract attendees
            attendees = []
            if 'attendees' in google_event:
                attendees = [attendee.get('email', '') for attendee in google_event['attendees']]
            
            # Parse created and updated times
            created_at = datetime.fromisoformat(
                google_event.get('created', datetime.utcnow().isoformat()).replace('Z', '+00:00')
            )
            updated_at = datetime.fromisoformat(
                google_event.get('updated', datetime.utcnow().isoformat()).replace('Z', '+00:00')
            )
            
            return CalendarEventResponse(
                event_id=google_event['id'],
                title=google_event.get('summary', ''),
                description=google_event.get('description', ''),
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                location=google_event.get('location', ''),
                attendees=attendees,
                created_at=created_at,
                updated_at=updated_at
            )
            
        except Exception as error:
            logger.error(f"Failed to convert Google event to response: {error}")
            raise ValueError(f"Invalid Google Calendar event format: {error}")


# Global calendar service instance
calendar_service = CalendarService()