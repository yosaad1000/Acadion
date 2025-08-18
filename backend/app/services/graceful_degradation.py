"""
Graceful degradation service for calendar operations.
Provides fallback functionality when Google Calendar API is unavailable.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Callable
from enum import Enum
import asyncio
from dataclasses import dataclass

from ..models.calendar import CalendarEventCreate, CalendarEventResponse, RecurrencePattern
from ..core.logging_config import get_calendar_logger, PerformanceLogger
from .local_supabase import LocalSupabase

logger = get_calendar_logger(__name__)


class ServiceStatus(Enum):
    """Service availability status."""
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


@dataclass
class ServiceHealth:
    """Service health information."""
    status: ServiceStatus
    last_check: datetime
    error_count: int
    last_error: Optional[str]
    response_time: Optional[float]


class GracefulDegradationService:
    """
    Service that provides graceful degradation when Google Calendar API is unavailable.
    Maintains local calendar functionality and queues operations for later synchronization.
    """
    
    def __init__(self):
        self.service_health = {
            'google_calendar': ServiceHealth(
                status=ServiceStatus.AVAILABLE,
                last_check=datetime.utcnow(),
                error_count=0,
                last_error=None,
                response_time=None
            )
        }
        self.degraded_mode = False
        self.operation_queue = []
        self.max_queue_size = 1000
        self.health_check_interval = 300  # 5 minutes
        
    async def check_service_health(self, service_name: str) -> ServiceHealth:
        """
        Check the health of an external service.
        
        Args:
            service_name: Name of the service to check
            
        Returns:
            ServiceHealth: Current health status
        """
        with PerformanceLogger(logger, f"health_check_{service_name}"):
            if service_name == 'google_calendar':
                return await self._check_google_calendar_health()
            
            # Default to available for unknown services
            return ServiceHealth(
                status=ServiceStatus.AVAILABLE,
                last_check=datetime.utcnow(),
                error_count=0,
                last_error=None,
                response_time=None
            )
    
    async def _check_google_calendar_health(self) -> ServiceHealth:
        """Check Google Calendar API health."""
        start_time = datetime.utcnow()
        
        try:
            # Simple health check - try to access the API
            import httpx
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get("https://www.googleapis.com/calendar/v3/users/me/calendarList")
                
                # We expect 401 (unauthorized) which means the API is responding
                # 200 would mean we somehow have valid credentials in the health check
                response_time = (datetime.utcnow() - start_time).total_seconds()
                
                if response.status_code in [200, 401, 403]:
                    # API is responding
                    health = ServiceHealth(
                        status=ServiceStatus.AVAILABLE,
                        last_check=datetime.utcnow(),
                        error_count=0,
                        last_error=None,
                        response_time=response_time
                    )
                    
                    if self.service_health['google_calendar'].status != ServiceStatus.AVAILABLE:
                        logger.info("Google Calendar API is now available", extra={
                            'service': 'google_calendar',
                            'status': 'recovered',
                            'response_time': response_time
                        })
                    
                    self.degraded_mode = False
                    return health
                else:
                    raise Exception(f"Unexpected status code: {response.status_code}")
                    
        except Exception as error:
            response_time = (datetime.utcnow() - start_time).total_seconds()
            error_count = self.service_health['google_calendar'].error_count + 1
            
            # Determine status based on error count
            if error_count >= 5:
                status = ServiceStatus.UNAVAILABLE
                self.degraded_mode = True
            elif error_count >= 2:
                status = ServiceStatus.DEGRADED
                self.degraded_mode = True
            else:
                status = ServiceStatus.AVAILABLE
            
            health = ServiceHealth(
                status=status,
                last_check=datetime.utcnow(),
                error_count=error_count,
                last_error=str(error),
                response_time=response_time
            )
            
            if status != ServiceStatus.AVAILABLE:
                logger.warning("Google Calendar API health check failed", extra={
                    'service': 'google_calendar',
                    'status': status.value,
                    'error_count': error_count,
                    'error': str(error),
                    'response_time': response_time
                })
            
            return health
    
    async def execute_with_fallback(
        self,
        primary_operation: Callable,
        fallback_operation: Callable,
        operation_name: str,
        **context
    ) -> Any:
        """
        Execute an operation with fallback to local functionality.
        
        Args:
            primary_operation: Primary operation (e.g., Google Calendar API call)
            fallback_operation: Fallback operation (e.g., local storage)
            operation_name: Name of the operation for logging
            **context: Additional context for logging
            
        Returns:
            Result of primary or fallback operation
        """
        with PerformanceLogger(logger, f"execute_with_fallback_{operation_name}", **context):
            
            # Check if we should try primary operation
            if not self.degraded_mode:
                try:
                    result = await primary_operation()
                    
                    # Reset error count on success
                    self.service_health['google_calendar'].error_count = 0
                    
                    logger.info(f"Primary operation successful: {operation_name}", extra={
                        'operation': operation_name,
                        'mode': 'primary',
                        **context
                    })
                    
                    return result
                    
                except Exception as error:
                    logger.warning(f"Primary operation failed: {operation_name}", extra={
                        'operation': operation_name,
                        'mode': 'primary',
                        'error': str(error),
                        **context
                    })
                    
                    # Update service health
                    await self.check_service_health('google_calendar')
                    
                    # Fall through to fallback
            
            # Execute fallback operation
            try:
                result = await fallback_operation()
                
                # Queue operation for later retry if in degraded mode
                if self.degraded_mode:
                    await self._queue_operation(operation_name, primary_operation, context)
                
                logger.info(f"Fallback operation successful: {operation_name}", extra={
                    'operation': operation_name,
                    'mode': 'fallback',
                    'degraded_mode': self.degraded_mode,
                    **context
                })
                
                return result
                
            except Exception as error:
                logger.error(f"Both primary and fallback operations failed: {operation_name}", extra={
                    'operation': operation_name,
                    'mode': 'both_failed',
                    'error': str(error),
                    **context
                })
                raise
    
    async def _queue_operation(
        self,
        operation_name: str,
        operation: Callable,
        context: Dict[str, Any]
    ) -> None:
        """Queue an operation for later retry when service recovers."""
        
        if len(self.operation_queue) >= self.max_queue_size:
            # Remove oldest operation
            removed = self.operation_queue.pop(0)
            logger.warning("Operation queue full, removing oldest operation", extra={
                'queue_size': len(self.operation_queue),
                'removed_operation': removed.get('name', 'unknown')
            })
        
        queued_operation = {
            'name': operation_name,
            'operation': operation,
            'context': context,
            'queued_at': datetime.utcnow(),
            'retry_count': 0
        }
        
        self.operation_queue.append(queued_operation)
        
        logger.info(f"Operation queued for retry: {operation_name}", extra={
            'operation': operation_name,
            'queue_size': len(self.operation_queue),
            **context
        })
    
    async def process_queued_operations(self) -> Dict[str, int]:
        """
        Process queued operations when service becomes available.
        
        Returns:
            dict: Statistics about processed operations
        """
        if self.degraded_mode or not self.operation_queue:
            return {'processed': 0, 'failed': 0, 'remaining': len(self.operation_queue)}
        
        processed = 0
        failed = 0
        
        # Process operations in batches to avoid overwhelming the service
        batch_size = 10
        operations_to_process = self.operation_queue[:batch_size]
        
        for operation_data in operations_to_process:
            try:
                await operation_data['operation']()
                self.operation_queue.remove(operation_data)
                processed += 1
                
                logger.info(f"Queued operation processed successfully: {operation_data['name']}", extra={
                    'operation': operation_data['name'],
                    'queued_at': operation_data['queued_at'].isoformat(),
                    'retry_count': operation_data['retry_count']
                })
                
            except Exception as error:
                operation_data['retry_count'] += 1
                
                # Remove operation if it has failed too many times
                if operation_data['retry_count'] >= 3:
                    self.operation_queue.remove(operation_data)
                    failed += 1
                    
                    logger.error(f"Queued operation failed permanently: {operation_data['name']}", extra={
                        'operation': operation_data['name'],
                        'queued_at': operation_data['queued_at'].isoformat(),
                        'retry_count': operation_data['retry_count'],
                        'error': str(error)
                    })
                else:
                    logger.warning(f"Queued operation failed, will retry: {operation_data['name']}", extra={
                        'operation': operation_data['name'],
                        'retry_count': operation_data['retry_count'],
                        'error': str(error)
                    })
        
        return {
            'processed': processed,
            'failed': failed,
            'remaining': len(self.operation_queue)
        }
    
    async def create_local_event(
        self,
        user_id: int,
        event_data: CalendarEventCreate
    ) -> str:
        """
        Create event in local storage as fallback.
        
        Args:
            user_id: User ID
            event_data: Event data
            
        Returns:
            str: Local event ID
        """
        try:
            db = LocalSupabase()
            
            # Create local event record
            local_event = {
                'user_id': str(user_id),
                'title': event_data.title,
                'description': event_data.description or '',
                'start_datetime': event_data.start_datetime.isoformat(),
                'end_datetime': (event_data.start_datetime + timedelta(minutes=event_data.duration_minutes)).isoformat(),
                'location': event_data.location or '',
                'attendees': event_data.attendees or [],
                'is_synced': False,
                'created_locally': True,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store in local events table
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{db.base_url}/rest/v1/local_calendar_events",
                    headers=db.headers,
                    json=local_event
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    event_id = result[0]['id'] if result else None
                    
                    logger.info(f"Local event created: {event_id}", extra={
                        'user_id': user_id,
                        'event_title': event_data.title,
                        'local_event_id': event_id
                    })
                    
                    return f"local_{event_id}"
                else:
                    raise Exception(f"Failed to create local event: {response.status_code}")
                    
        except Exception as error:
            logger.error(f"Failed to create local event for user {user_id}", extra={
                'user_id': user_id,
                'error': str(error)
            })
            raise
    
    async def get_local_events(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[CalendarEventResponse]:
        """
        Get events from local storage.
        
        Args:
            user_id: User ID
            start_date: Start date
            end_date: End date
            
        Returns:
            List of calendar events
        """
        try:
            db = LocalSupabase()
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{db.base_url}/rest/v1/local_calendar_events",
                    headers=db.headers,
                    params={
                        'user_id': f'eq.{user_id}',
                        'start_datetime': f'gte.{start_date.isoformat()}',
                        'start_datetime': f'lte.{end_date.isoformat()}'
                    }
                )
                
                if response.status_code == 200:
                    events_data = response.json()
                    
                    events = []
                    for event_data in events_data:
                        event = CalendarEventResponse(
                            event_id=f"local_{event_data['id']}",
                            title=event_data['title'],
                            description=event_data['description'],
                            start_datetime=datetime.fromisoformat(event_data['start_datetime'].replace('Z', '+00:00')),
                            end_datetime=datetime.fromisoformat(event_data['end_datetime'].replace('Z', '+00:00')),
                            location=event_data.get('location'),
                            attendees=event_data.get('attendees', []),
                            is_synced=event_data.get('is_synced', False)
                        )
                        events.append(event)
                    
                    logger.info(f"Retrieved {len(events)} local events for user {user_id}")
                    return events
                else:
                    raise Exception(f"Failed to get local events: {response.status_code}")
                    
        except Exception as error:
            logger.error(f"Failed to get local events for user {user_id}", extra={
                'user_id': user_id,
                'error': str(error)
            })
            return []
    
    def get_service_status(self) -> Dict[str, Any]:
        """
        Get current service status information.
        
        Returns:
            dict: Service status information
        """
        return {
            'degraded_mode': self.degraded_mode,
            'services': {
                name: {
                    'status': health.status.value,
                    'last_check': health.last_check.isoformat(),
                    'error_count': health.error_count,
                    'last_error': health.last_error,
                    'response_time': health.response_time
                }
                for name, health in self.service_health.items()
            },
            'operation_queue': {
                'size': len(self.operation_queue),
                'max_size': self.max_queue_size,
                'oldest_operation': (
                    self.operation_queue[0]['queued_at'].isoformat()
                    if self.operation_queue else None
                )
            }
        }
    
    async def start_background_tasks(self) -> None:
        """Start background tasks for health monitoring and queue processing."""
        
        async def health_monitor():
            """Background task to monitor service health."""
            while True:
                try:
                    await asyncio.sleep(self.health_check_interval)
                    await self.check_service_health('google_calendar')
                    
                    # Process queued operations if service is available
                    if not self.degraded_mode:
                        stats = await self.process_queued_operations()
                        if stats['processed'] > 0 or stats['failed'] > 0:
                            logger.info("Processed queued operations", extra={
                                'processed': stats['processed'],
                                'failed': stats['failed'],
                                'remaining': stats['remaining']
                            })
                            
                except Exception as error:
                    logger.error("Error in health monitor background task", extra={
                        'error': str(error)
                    })
        
        # Start background task
        asyncio.create_task(health_monitor())
        logger.info("Background health monitoring started")


# Global instance
graceful_degradation = GracefulDegradationService()