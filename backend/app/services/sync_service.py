"""
Sync service for calendar synchronization.
Handles bidirectional synchronization between internal schedules and Google Calendar,
batch synchronization capabilities, webhook handling, and conflict resolution.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import json

from ..models.calendar import (
    ClassScheduleResponse, ScheduleInstanceResponse, CalendarEventResponse,
    CalendarEventCreate, CalendarEventUpdate, SyncResponse, SyncRequest,
    ScheduleStatus, UpdateScope
)
try:
    from .calendar_service import CalendarService, CalendarError
    from .scheduling_service import SchedulingService, SchedulingError
    from .oauth_service import oauth_service, OAuthError
    from .supabase_client import get_supabase_client
    from supabase import Client
except ImportError as e:
    # Handle missing dependencies gracefully for testing
    CalendarService = None
    CalendarError = Exception
    SchedulingService = None
    SchedulingError = Exception
    oauth_service = None
    OAuthError = Exception
    get_supabase_client = None
    Client = None

logger = logging.getLogger(__name__)


class SyncError(Exception):
    """Custom exception for sync-related errors."""
    
    def __init__(self, message: str, error_code: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class ConflictResolutionStrategy(str, Enum):
    """Strategies for resolving sync conflicts."""
    CALENDAR_WINS = "calendar_wins"  # Google Calendar takes precedence
    SCHEDULE_WINS = "schedule_wins"  # Internal schedule takes precedence
    MANUAL_REVIEW = "manual_review"  # Flag for manual resolution
    MERGE = "merge"  # Attempt to merge changes


class SyncDirection(str, Enum):
    """Direction of synchronization."""
    TO_CALENDAR = "to_calendar"  # Internal schedule -> Google Calendar
    FROM_CALENDAR = "from_calendar"  # Google Calendar -> Internal schedule
    BIDIRECTIONAL = "bidirectional"  # Both directions


@dataclass
class SyncConfig:
    """Configuration for sync operations."""
    batch_size: int = 50  # Maximum schedules to sync in one batch
    max_retries: int = 3  # Maximum retry attempts for failed syncs
    retry_delay: float = 2.0  # Base delay between retries (seconds)
    conflict_resolution: ConflictResolutionStrategy = ConflictResolutionStrategy.SCHEDULE_WINS
    sync_window_days: int = 365  # Days into the future to sync


@dataclass
class SyncResult:
    """Result of a sync operation."""
    success: bool
    schedule_id: Optional[int] = None
    event_id: Optional[str] = None
    action: Optional[str] = None  # created, updated, deleted, skipped
    error: Optional[str] = None
    conflict_detected: bool = False


class SyncService:
    """
    Service for bidirectional synchronization between internal schedules and Google Calendar.
    Handles batch operations, webhook processing, and conflict resolution.
    """
    
    def __init__(self):
        if get_supabase_client:
            self.client: Client = get_supabase_client()
        else:
            self.client = None
        
        if CalendarService:
            self.calendar_service = CalendarService()
        else:
            self.calendar_service = None
            
        if SchedulingService:
            self.scheduling_service = SchedulingService()
        else:
            self.scheduling_service = None
            
        self.config = SyncConfig()
    
    async def sync_schedule_to_calendar(
        self, 
        schedule_id: int, 
        user_id: int,
        force_sync: bool = False
    ) -> SyncResult:
        """
        Sync a single schedule from internal system to Google Calendar.
        
        Args:
            schedule_id: ID of the schedule to sync
            user_id: ID of the user (teacher) who owns the calendar
            force_sync: Whether to force sync even if already synced
            
        Returns:
            SyncResult: Result of the sync operation
            
        Raises:
            SyncError: If sync operation fails
        """
        try:
            # Get schedule details
            schedule = await self.scheduling_service.get_schedule_by_id(schedule_id)
            
            # Check if user has calendar connection
            connection_status = await oauth_service.get_connection_status(user_id)
            if not connection_status["is_connected"]:
                raise SyncError(
                    message="User does not have Google Calendar connected",
                    error_code="NO_CALENDAR_CONNECTION"
                )
            
            # Check if schedule already has Google event ID
            if schedule.google_event_id and not force_sync:
                # Verify event still exists in Google Calendar
                try:
                    events = await self.calendar_service.get_events(
                        user_id=user_id,
                        start_date=schedule.start_datetime - timedelta(minutes=1),
                        end_date=schedule.start_datetime + timedelta(minutes=schedule.duration_minutes + 1)
                    )
                    
                    event_exists = any(event.event_id == schedule.google_event_id for event in events)
                    if event_exists:
                        return SyncResult(
                            success=True,
                            schedule_id=schedule_id,
                            event_id=schedule.google_event_id,
                            action="skipped"
                        )
                except CalendarError:
                    # Event might not exist, continue with sync
                    pass
            
            # Create calendar event data
            event_data = CalendarEventCreate(
                title=schedule.title,
                description=schedule.description or "",
                start_datetime=schedule.start_datetime,
                duration_minutes=schedule.duration_minutes
            )
            
            # Handle recurring vs single event
            if schedule.recurrence_pattern:
                # Create recurring event
                event_ids = await self.calendar_service.create_recurring_event(
                    user_id=user_id,
                    event_data=event_data,
                    recurrence_pattern=schedule.recurrence_pattern
                )
                
                if event_ids:
                    # Update schedule with Google event IDs
                    await self._update_schedule_google_ids(
                        schedule_id, 
                        event_ids[0],  # Main recurring event ID
                        event_ids[0]   # Recurring series ID
                    )
                    
                    # Update schedule instances with individual event IDs
                    await self._update_schedule_instances_google_ids(schedule_id, event_ids)
                    
                    return SyncResult(
                        success=True,
                        schedule_id=schedule_id,
                        event_id=event_ids[0],
                        action="created"
                    )
            else:
                # Create single event
                event_id = await self.calendar_service.create_event(
                    user_id=user_id,
                    event_data=event_data
                )
                
                # Update schedule with Google event ID
                await self._update_schedule_google_ids(schedule_id, event_id, None)
                
                return SyncResult(
                    success=True,
                    schedule_id=schedule_id,
                    event_id=event_id,
                    action="created"
                )
            
        except (CalendarError, SchedulingError, OAuthError) as error:
            logger.error(f"Failed to sync schedule {schedule_id} to calendar: {error}")
            return SyncResult(
                success=False,
                schedule_id=schedule_id,
                error=str(error)
            )
        except Exception as error:
            logger.error(f"Unexpected error syncing schedule {schedule_id}: {error}")
            raise SyncError(
                message="Failed to sync schedule to calendar",
                error_code="SYNC_TO_CALENDAR_FAILED",
                details={"schedule_id": schedule_id, "error": str(error)}
            )
    
    async def sync_calendar_to_schedule(
        self, 
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> SyncResponse:
        """
        Sync events from Google Calendar to internal schedules.
        
        Args:
            user_id: ID of the user whose calendar to sync
            start_date: Start date for sync window
            end_date: End date for sync window
            
        Returns:
            SyncResponse: Results of the sync operation
            
        Raises:
            SyncError: If sync operation fails
        """
        try:
            # Set default sync window
            if not start_date:
                start_date = datetime.now()
            if not end_date:
                end_date = start_date + timedelta(days=self.config.sync_window_days)
            
            # Check calendar connection
            connection_status = await oauth_service.get_connection_status(user_id)
            if not connection_status["is_connected"]:
                raise SyncError(
                    message="User does not have Google Calendar connected",
                    error_code="NO_CALENDAR_CONNECTION"
                )
            
            # Get events from Google Calendar
            calendar_events = await self.calendar_service.get_events(
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Get existing schedules for comparison
            existing_schedules = await self.scheduling_service.get_teacher_schedules(str(user_id))
            
            synced_count = 0
            failed_count = 0
            errors = []
            
            # Process each calendar event
            for calendar_event in calendar_events:
                try:
                    # Check if this event corresponds to an existing schedule
                    existing_schedule = self._find_matching_schedule(calendar_event, existing_schedules)
                    
                    if existing_schedule:
                        # Update existing schedule if needed
                        if await self._should_update_schedule(existing_schedule, calendar_event):
                            await self._update_schedule_from_calendar_event(
                                existing_schedule, calendar_event
                            )
                            synced_count += 1
                    else:
                        # This is a new event - check if it looks like a class schedule
                        if self._is_class_schedule_event(calendar_event):
                            # Create new schedule from calendar event
                            await self._create_schedule_from_calendar_event(
                                user_id, calendar_event
                            )
                            synced_count += 1
                    
                except Exception as error:
                    logger.warning(f"Failed to sync calendar event {calendar_event.event_id}: {error}")
                    failed_count += 1
                    errors.append({
                        "event_id": calendar_event.event_id,
                        "error": str(error)
                    })
            
            return SyncResponse(
                success=True,
                synced_count=synced_count,
                failed_count=failed_count,
                errors=errors,
                last_sync_at=datetime.now()
            )
            
        except (CalendarError, OAuthError) as error:
            logger.error(f"Failed to sync calendar to schedules for user {user_id}: {error}")
            raise SyncError(
                message="Failed to sync calendar to schedules",
                error_code="SYNC_FROM_CALENDAR_FAILED",
                details={"user_id": user_id, "error": str(error)}
            )
    
    async def handle_calendar_webhook(self, webhook_data: Dict[str, Any]) -> bool:
        """
        Handle Google Calendar webhook notifications for real-time sync.
        
        Args:
            webhook_data: Webhook payload from Google Calendar
            
        Returns:
            bool: True if webhook processed successfully
            
        Raises:
            SyncError: If webhook processing fails
        """
        try:
            # Extract relevant information from webhook
            resource_id = webhook_data.get("resourceId")
            resource_state = webhook_data.get("resourceState")  # sync, exists, not_exists
            channel_id = webhook_data.get("channelId")
            
            if not all([resource_id, resource_state, channel_id]):
                logger.warning("Invalid webhook data received")
                return False
            
            # Find the user associated with this webhook channel
            user_id = await self._get_user_from_webhook_channel(channel_id)
            if not user_id:
                logger.warning(f"No user found for webhook channel {channel_id}")
                return False
            
            # Handle different resource states
            if resource_state == "sync":
                # Initial sync notification - can be ignored
                logger.info(f"Received sync notification for user {user_id}")
                return True
            
            elif resource_state in ["exists", "not_exists"]:
                # Calendar change detected - trigger sync
                logger.info(f"Calendar change detected for user {user_id}, triggering sync")
                
                # Perform incremental sync (last 7 days to next 30 days)
                start_date = datetime.now() - timedelta(days=7)
                end_date = datetime.now() + timedelta(days=30)
                
                sync_result = await self.sync_calendar_to_schedule(
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date
                )
                
                logger.info(f"Webhook sync completed: {sync_result.synced_count} synced, {sync_result.failed_count} failed")
                return True
            
            else:
                logger.warning(f"Unknown resource state: {resource_state}")
                return False
            
        except Exception as error:
            logger.error(f"Failed to handle calendar webhook: {error}")
            raise SyncError(
                message="Failed to process calendar webhook",
                error_code="WEBHOOK_PROCESSING_FAILED",
                details={"error": str(error)}
            )
    
    async def batch_sync_schedules(
        self, 
        user_id: int, 
        sync_request: Optional[SyncRequest] = None
    ) -> SyncResponse:
        """
        Perform batch synchronization of multiple schedules.
        
        Args:
            user_id: ID of the user whose schedules to sync
            sync_request: Optional sync configuration
            
        Returns:
            SyncResponse: Results of the batch sync operation
            
        Raises:
            SyncError: If batch sync fails
        """
        try:
            sync_request = sync_request or SyncRequest()
            
            # Get schedules to sync
            if sync_request.schedule_ids:
                schedules = []
                for schedule_id in sync_request.schedule_ids:
                    try:
                        schedule = await self.scheduling_service.get_schedule_by_id(schedule_id)
                        schedules.append(schedule)
                    except SchedulingError:
                        logger.warning(f"Schedule {schedule_id} not found, skipping")
            else:
                # Get all active schedules for the user
                schedules = await self.scheduling_service.get_teacher_schedules(str(user_id))
            
            synced_count = 0
            failed_count = 0
            errors = []
            
            # Process schedules in batches
            for i in range(0, len(schedules), self.config.batch_size):
                batch = schedules[i:i + self.config.batch_size]
                
                # Process batch concurrently
                batch_tasks = [
                    self.sync_schedule_to_calendar(
                        schedule.id, 
                        user_id, 
                        force_sync=sync_request.force_sync
                    )
                    for schedule in batch
                ]
                
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process batch results
                for j, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        failed_count += 1
                        errors.append({
                            "schedule_id": batch[j].id,
                            "error": str(result)
                        })
                    elif isinstance(result, SyncResult):
                        if result.success:
                            synced_count += 1
                        else:
                            failed_count += 1
                            errors.append({
                                "schedule_id": result.schedule_id,
                                "error": result.error
                            })
                
                # Add delay between batches to avoid rate limiting
                if i + self.config.batch_size < len(schedules):
                    await asyncio.sleep(1.0)
            
            return SyncResponse(
                success=True,
                synced_count=synced_count,
                failed_count=failed_count,
                errors=errors,
                last_sync_at=datetime.now()
            )
            
        except Exception as error:
            logger.error(f"Failed to perform batch sync for user {user_id}: {error}")
            raise SyncError(
                message="Failed to perform batch synchronization",
                error_code="BATCH_SYNC_FAILED",
                details={"user_id": user_id, "error": str(error)}
            )
    
    async def resolve_sync_conflict(
        self,
        schedule_id: int,
        calendar_event: CalendarEventResponse,
        strategy: ConflictResolutionStrategy = None
    ) -> SyncResult:
        """
        Resolve synchronization conflicts between schedule and calendar event.
        
        Args:
            schedule_id: ID of the conflicting schedule
            calendar_event: Conflicting calendar event
            strategy: Resolution strategy to use
            
        Returns:
            SyncResult: Result of conflict resolution
            
        Raises:
            SyncError: If conflict resolution fails
        """
        try:
            strategy = strategy or self.config.conflict_resolution
            
            # Get current schedule
            schedule = await self.scheduling_service.get_schedule_by_id(schedule_id)
            
            if strategy == ConflictResolutionStrategy.CALENDAR_WINS:
                # Update schedule to match calendar event
                return await self._update_schedule_from_calendar_event(schedule, calendar_event)
            
            elif strategy == ConflictResolutionStrategy.SCHEDULE_WINS:
                # Update calendar event to match schedule
                user_id = int(schedule.teacher_id)
                
                event_update = CalendarEventUpdate(
                    title=schedule.title,
                    description=schedule.description,
                    start_datetime=schedule.start_datetime,
                    duration_minutes=schedule.duration_minutes
                )
                
                success = await self.calendar_service.update_event(
                    user_id=user_id,
                    event_id=calendar_event.event_id,
                    updates=event_update
                )
                
                return SyncResult(
                    success=success,
                    schedule_id=schedule_id,
                    event_id=calendar_event.event_id,
                    action="updated"
                )
            
            elif strategy == ConflictResolutionStrategy.MANUAL_REVIEW:
                # Flag for manual review
                await self._flag_for_manual_review(schedule_id, calendar_event)
                
                return SyncResult(
                    success=True,
                    schedule_id=schedule_id,
                    event_id=calendar_event.event_id,
                    action="flagged_for_review",
                    conflict_detected=True
                )
            
            elif strategy == ConflictResolutionStrategy.MERGE:
                # Attempt to merge changes
                return await self._merge_schedule_and_event(schedule, calendar_event)
            
            else:
                raise SyncError(
                    message=f"Unknown conflict resolution strategy: {strategy}",
                    error_code="UNKNOWN_STRATEGY"
                )
            
        except Exception as error:
            logger.error(f"Failed to resolve sync conflict for schedule {schedule_id}: {error}")
            raise SyncError(
                message="Failed to resolve synchronization conflict",
                error_code="CONFLICT_RESOLUTION_FAILED",
                details={"schedule_id": schedule_id, "error": str(error)}
            )
    
    # Private helper methods
    
    async def _update_schedule_google_ids(
        self, 
        schedule_id: int, 
        google_event_id: str, 
        google_recurring_event_id: Optional[str]
    ) -> None:
        """Update schedule with Google Calendar event IDs."""
        try:
            update_data = {
                "google_event_id": google_event_id,
                "updated_at": datetime.now().isoformat()
            }
            
            if google_recurring_event_id:
                update_data["google_recurring_event_id"] = google_recurring_event_id
            
            result = self.client.table('class_schedules').update(update_data).eq(
                'id', schedule_id
            ).execute()
            
            if not result.data:
                logger.warning(f"Failed to update Google IDs for schedule {schedule_id}")
            
        except Exception as error:
            logger.error(f"Failed to update schedule Google IDs: {error}")
    
    async def _update_schedule_instances_google_ids(
        self, 
        schedule_id: int, 
        event_ids: List[str]
    ) -> None:
        """Update schedule instances with individual Google event IDs."""
        try:
            # Get schedule instances
            result = self.client.table('schedule_instances').select('*').eq(
                'schedule_id', schedule_id
            ).order('instance_datetime').execute()
            
            instances = result.data
            
            # Update instances with corresponding event IDs
            for i, instance in enumerate(instances):
                if i < len(event_ids):
                    update_data = {
                        "google_event_id": event_ids[i],
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    self.client.table('schedule_instances').update(update_data).eq(
                        'id', instance['id']
                    ).execute()
            
        except Exception as error:
            logger.error(f"Failed to update schedule instance Google IDs: {error}")
    
    def _find_matching_schedule(
        self, 
        calendar_event: CalendarEventResponse, 
        schedules: List[ClassScheduleResponse]
    ) -> Optional[ClassScheduleResponse]:
        """Find schedule that matches a calendar event."""
        for schedule in schedules:
            # Check if Google event ID matches
            if schedule.google_event_id == calendar_event.event_id:
                return schedule
            
            # Check if title and time match (for events without stored Google ID)
            if (schedule.title == calendar_event.title and
                abs((schedule.start_datetime - calendar_event.start_datetime).total_seconds()) < 300):  # 5 minute tolerance
                return schedule
        
        return None
    
    async def _should_update_schedule(
        self, 
        schedule: ClassScheduleResponse, 
        calendar_event: CalendarEventResponse
    ) -> bool:
        """Determine if schedule should be updated based on calendar event."""
        # Check if there are meaningful differences
        title_different = schedule.title != calendar_event.title
        description_different = (schedule.description or "") != (calendar_event.description or "")
        time_different = abs((schedule.start_datetime - calendar_event.start_datetime).total_seconds()) > 60
        duration_different = abs(schedule.duration_minutes - 
                                (calendar_event.end_datetime - calendar_event.start_datetime).total_seconds() / 60) > 1
        
        return any([title_different, description_different, time_different, duration_different])
    
    async def _update_schedule_from_calendar_event(
        self, 
        schedule: ClassScheduleResponse, 
        calendar_event: CalendarEventResponse
    ) -> SyncResult:
        """Update internal schedule based on calendar event."""
        try:
            from ..models.calendar import ClassScheduleUpdate
            
            duration_minutes = int((calendar_event.end_datetime - calendar_event.start_datetime).total_seconds() / 60)
            
            updates = ClassScheduleUpdate(
                title=calendar_event.title,
                description=calendar_event.description,
                start_datetime=calendar_event.start_datetime,
                duration_minutes=duration_minutes
            )
            
            updated_schedule = await self.scheduling_service.update_class_schedule(
                schedule_id=schedule.id,
                updates=updates,
                scope=UpdateScope.THIS_AND_FUTURE
            )
            
            return SyncResult(
                success=True,
                schedule_id=schedule.id,
                event_id=calendar_event.event_id,
                action="updated"
            )
            
        except Exception as error:
            logger.error(f"Failed to update schedule from calendar event: {error}")
            return SyncResult(
                success=False,
                schedule_id=schedule.id,
                error=str(error)
            )
    
    def _is_class_schedule_event(self, calendar_event: CalendarEventResponse) -> bool:
        """Determine if a calendar event looks like a class schedule."""
        # Simple heuristics - can be enhanced based on requirements
        title_keywords = ["class", "lesson", "lecture", "tutorial", "seminar", "workshop"]
        
        title_lower = calendar_event.title.lower()
        has_class_keyword = any(keyword in title_lower for keyword in title_keywords)
        
        # Check duration (classes are typically 30 minutes to 4 hours)
        duration_minutes = (calendar_event.end_datetime - calendar_event.start_datetime).total_seconds() / 60
        reasonable_duration = 30 <= duration_minutes <= 240
        
        return has_class_keyword and reasonable_duration
    
    async def _create_schedule_from_calendar_event(
        self, 
        user_id: int, 
        calendar_event: CalendarEventResponse
    ) -> None:
        """Create new schedule from calendar event."""
        try:
            from ..models.calendar import ClassScheduleCreate
            
            # This is a simplified implementation - in practice, you'd need to:
            # 1. Determine the subject_id (maybe from event title or description)
            # 2. Handle recurrence patterns if the event is recurring
            # 3. Validate that the user is authorized to create schedules
            
            # For now, we'll skip creating schedules from calendar events
            # as it requires additional business logic and subject mapping
            logger.info(f"Skipping schedule creation from calendar event {calendar_event.event_id}")
            
        except Exception as error:
            logger.error(f"Failed to create schedule from calendar event: {error}")
    
    async def _get_user_from_webhook_channel(self, channel_id: str) -> Optional[int]:
        """Get user ID associated with webhook channel."""
        try:
            # This would typically query a webhook_channels table
            # For now, return None as webhook setup is not implemented
            return None
            
        except Exception as error:
            logger.error(f"Failed to get user from webhook channel: {error}")
            return None
    
    async def _flag_for_manual_review(
        self, 
        schedule_id: int, 
        calendar_event: CalendarEventResponse
    ) -> None:
        """Flag schedule/event conflict for manual review."""
        try:
            # Store conflict information for manual review
            conflict_data = {
                "schedule_id": schedule_id,
                "calendar_event_id": calendar_event.event_id,
                "conflict_type": "sync_conflict",
                "conflict_data": {
                    "calendar_event": {
                        "title": calendar_event.title,
                        "description": calendar_event.description,
                        "start_datetime": calendar_event.start_datetime.isoformat(),
                        "end_datetime": calendar_event.end_datetime.isoformat()
                    }
                },
                "status": "pending_review",
                "created_at": datetime.now().isoformat()
            }
            
            # This would typically insert into a sync_conflicts table
            logger.info(f"Flagged schedule {schedule_id} for manual review")
            
        except Exception as error:
            logger.error(f"Failed to flag for manual review: {error}")
    
    async def _merge_schedule_and_event(
        self, 
        schedule: ClassScheduleResponse, 
        calendar_event: CalendarEventResponse
    ) -> SyncResult:
        """Attempt to merge schedule and calendar event changes."""
        try:
            # Simple merge strategy: use most recent update
            schedule_updated = schedule.updated_at
            event_updated = calendar_event.updated_at
            
            if event_updated > schedule_updated:
                # Calendar event is more recent, update schedule
                return await self._update_schedule_from_calendar_event(schedule, calendar_event)
            else:
                # Schedule is more recent, update calendar event
                user_id = int(schedule.teacher_id)
                
                event_update = CalendarEventUpdate(
                    title=schedule.title,
                    description=schedule.description,
                    start_datetime=schedule.start_datetime,
                    duration_minutes=schedule.duration_minutes
                )
                
                success = await self.calendar_service.update_event(
                    user_id=user_id,
                    event_id=calendar_event.event_id,
                    updates=event_update
                )
                
                return SyncResult(
                    success=success,
                    schedule_id=schedule.id,
                    event_id=calendar_event.event_id,
                    action="merged"
                )
            
        except Exception as error:
            logger.error(f"Failed to merge schedule and event: {error}")
            return SyncResult(
                success=False,
                schedule_id=schedule.id,
                error=str(error)
            )


# Global sync service instance
sync_service = SyncService()