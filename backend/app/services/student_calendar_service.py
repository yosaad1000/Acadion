"""
Student Calendar Service for managing read-only calendar events for students.
Handles creating and syncing class schedules to student personal calendars.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from ..models.calendar import (
    CalendarEventCreate, CalendarEventResponse, ClassScheduleResponse,
    StudentScheduleAccessResponse
)
from .calendar_service import CalendarService, CalendarError
from .scheduling_service import SchedulingService, SchedulingError
from .oauth_service import oauth_service, OAuthError

logger = logging.getLogger(__name__)


class StudentCalendarError(Exception):
    """Custom exception for student calendar-related errors."""
    
    def __init__(self, message: str, error_code: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


@dataclass
class StudentCalendarSyncResult:
    """Result of student calendar sync operation."""
    success: bool
    synced_count: int
    failed_count: int
    errors: List[Dict[str, Any]]
    student_id: str


class StudentCalendarService:
    """
    Service for managing student calendar visibility and personal calendar sync.
    Creates read-only calendar events for students and manages sync preferences.
    """
    
    def __init__(self):
        self.calendar_service = CalendarService()
        self.scheduling_service = SchedulingService()
    
    async def sync_student_schedules_to_personal_calendar(
        self,
        student_id: str,
        force_sync: bool = False
    ) -> StudentCalendarSyncResult:
        """
        Sync all student's schedules to their personal Google Calendar.
        
        Args:
            student_id: ID of the student
            force_sync: Whether to force sync even if already synced
            
        Returns:
            StudentCalendarSyncResult: Results of sync operation
            
        Raises:
            StudentCalendarError: If sync fails
        """
        try:
            logger.info(f"Starting calendar sync for student {student_id}")
            
            # Check if student has Google Calendar connected
            try:
                access_token = await oauth_service.get_valid_token(student_id)
                if not access_token:
                    raise StudentCalendarError(
                        message="Student does not have Google Calendar connected",
                        error_code="CALENDAR_NOT_CONNECTED"
                    )
            except OAuthError:
                raise StudentCalendarError(
                    message="Student does not have Google Calendar connected",
                    error_code="CALENDAR_NOT_CONNECTED"
                )
            
            # Get student's schedule access records with sync enabled
            access_records = await self.scheduling_service.get_student_schedule_access(student_id)
            sync_enabled_records = [
                record for record in access_records 
                if record.sync_to_personal_calendar
            ]
            
            if not sync_enabled_records:
                logger.info(f"No schedules with sync enabled for student {student_id}")
                return StudentCalendarSyncResult(
                    success=True,
                    synced_count=0,
                    failed_count=0,
                    errors=[],
                    student_id=student_id
                )
            
            synced_count = 0
            failed_count = 0
            errors = []
            
            # Sync each schedule
            for access_record in sync_enabled_records:
                try:
                    # Get schedule details
                    schedule = await self.scheduling_service.get_schedule_by_id(access_record.schedule_id)
                    
                    # Create calendar events for the schedule
                    await self._create_student_calendar_events(student_id, schedule, access_record)
                    synced_count += 1
                    
                except Exception as error:
                    failed_count += 1
                    errors.append({
                        'schedule_id': access_record.schedule_id,
                        'error': str(error)
                    })
                    logger.error(f"Failed to sync schedule {access_record.schedule_id} for student {student_id}: {error}")
            
            result = StudentCalendarSyncResult(
                success=failed_count == 0,
                synced_count=synced_count,
                failed_count=failed_count,
                errors=errors,
                student_id=student_id
            )
            
            logger.info(f"Calendar sync completed for student {student_id}: {synced_count} synced, {failed_count} failed")
            return result
            
        except StudentCalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to sync student calendars for {student_id}: {error}")
            raise StudentCalendarError(
                message="Failed to sync student calendars",
                error_code="SYNC_FAILED",
                details={'error': str(error)}
            )
    
    async def create_read_only_calendar_event(
        self,
        student_id: str,
        schedule: ClassScheduleResponse,
        instance_datetime: Optional[datetime] = None
    ) -> str:
        """
        Create a read-only calendar event for a student.
        
        Args:
            student_id: ID of the student
            schedule: Schedule to create event for
            instance_datetime: Specific instance datetime (for recurring schedules)
            
        Returns:
            str: Created event ID
            
        Raises:
            StudentCalendarError: If event creation fails
        """
        try:
            # Use instance datetime or schedule start datetime
            event_start = instance_datetime or schedule.start_datetime
            
            # Create event data
            event_data = CalendarEventCreate(
                title=f"[Class] {schedule.title}",
                description=self._build_student_event_description(schedule),
                start_datetime=event_start,
                duration_minutes=schedule.duration_minutes,
                location=None  # Could be added if location info is available
            )
            
            # Create event in student's calendar
            event_id = await self.calendar_service.create_event(
                user_id=student_id,
                event_data=event_data,
                calendar_id="primary"
            )
            
            logger.info(f"Read-only calendar event created for student {student_id}: {event_id}")
            return event_id
            
        except CalendarError as error:
            raise StudentCalendarError(
                message=f"Failed to create calendar event: {error.message}",
                error_code="EVENT_CREATE_FAILED",
                details={'calendar_error': error.error_code}
            )
        except Exception as error:
            logger.error(f"Failed to create read-only event for student {student_id}: {error}")
            raise StudentCalendarError(
                message="Failed to create read-only calendar event",
                error_code="EVENT_CREATE_FAILED",
                details={'error': str(error)}
            )
    
    async def remove_student_calendar_events(
        self,
        student_id: str,
        schedule_id: int
    ) -> bool:
        """
        Remove all calendar events for a schedule from student's calendar.
        
        Args:
            student_id: ID of the student
            schedule_id: ID of the schedule
            
        Returns:
            bool: True if removal successful
            
        Raises:
            StudentCalendarError: If removal fails
        """
        try:
            logger.info(f"Removing calendar events for student {student_id}, schedule {schedule_id}")
            
            # Get schedule details
            schedule = await self.scheduling_service.get_schedule_by_id(schedule_id)
            
            # Get events from student's calendar that match this schedule
            # We'll search for events with the schedule title
            start_date = schedule.start_datetime - timedelta(days=1)
            end_date = schedule.start_datetime + timedelta(days=365)  # Look ahead 1 year
            
            events = await self.calendar_service.get_events(
                user_id=student_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Filter events that match this schedule
            matching_events = [
                event for event in events
                if event.title == f"[Class] {schedule.title}"
            ]
            
            # Delete matching events
            deleted_count = 0
            for event in matching_events:
                try:
                    await self.calendar_service.delete_event(
                        user_id=student_id,
                        event_id=event.event_id
                    )
                    deleted_count += 1
                except CalendarError as error:
                    logger.warning(f"Failed to delete event {event.event_id}: {error.message}")
            
            logger.info(f"Removed {deleted_count} calendar events for student {student_id}")
            return True
            
        except SchedulingError as error:
            raise StudentCalendarError(
                message=f"Failed to get schedule details: {error.message}",
                error_code="SCHEDULE_GET_FAILED"
            )
        except CalendarError as error:
            raise StudentCalendarError(
                message=f"Failed to remove calendar events: {error.message}",
                error_code="EVENT_REMOVAL_FAILED"
            )
        except Exception as error:
            logger.error(f"Failed to remove calendar events for student {student_id}: {error}")
            raise StudentCalendarError(
                message="Failed to remove calendar events",
                error_code="EVENT_REMOVAL_FAILED",
                details={'error': str(error)}
            )
    
    async def update_student_calendar_event(
        self,
        student_id: str,
        schedule: ClassScheduleResponse,
        instance_datetime: Optional[datetime] = None
    ) -> bool:
        """
        Update student's calendar event when schedule changes.
        
        Args:
            student_id: ID of the student
            schedule: Updated schedule
            instance_datetime: Specific instance datetime (for recurring schedules)
            
        Returns:
            bool: True if update successful
            
        Raises:
            StudentCalendarError: If update fails
        """
        try:
            # For simplicity, we'll remove old events and create new ones
            # A more sophisticated approach would track event IDs and update them directly
            
            # Remove existing events
            await self.remove_student_calendar_events(student_id, schedule.id)
            
            # Create new event
            await self.create_read_only_calendar_event(student_id, schedule, instance_datetime)
            
            logger.info(f"Updated calendar event for student {student_id}, schedule {schedule.id}")
            return True
            
        except StudentCalendarError:
            raise
        except Exception as error:
            logger.error(f"Failed to update calendar event for student {student_id}: {error}")
            raise StudentCalendarError(
                message="Failed to update calendar event",
                error_code="EVENT_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    # Private helper methods
    
    async def _create_student_calendar_events(
        self,
        student_id: str,
        schedule: ClassScheduleResponse,
        access_record: StudentScheduleAccessResponse
    ) -> None:
        """Create calendar events for a student schedule."""
        try:
            if schedule.recurrence_pattern:
                # For recurring schedules, get all instances
                instances = await self.scheduling_service.get_schedule_instances(
                    schedule_id=schedule.id,
                    include_cancelled=False
                )
                
                # Create event for each instance
                for instance in instances:
                    try:
                        await self.create_read_only_calendar_event(
                            student_id=student_id,
                            schedule=schedule,
                            instance_datetime=instance.instance_datetime
                        )
                    except StudentCalendarError as error:
                        logger.warning(f"Failed to create event for instance {instance.id}: {error.message}")
            else:
                # Single event
                await self.create_read_only_calendar_event(
                    student_id=student_id,
                    schedule=schedule
                )
                
        except Exception as error:
            logger.error(f"Failed to create student calendar events: {error}")
            raise StudentCalendarError(
                message="Failed to create student calendar events",
                error_code="EVENTS_CREATE_FAILED",
                details={'error': str(error)}
            )
    
    def _build_student_event_description(self, schedule: ClassScheduleResponse) -> str:
        """Build description for student calendar event."""
        description_parts = []
        
        if schedule.description:
            description_parts.append(schedule.description)
        
        if schedule.subject_name:
            description_parts.append(f"Subject: {schedule.subject_name}")
        
        if schedule.teacher_name:
            description_parts.append(f"Teacher: {schedule.teacher_name}")
        
        description_parts.append("This is a read-only class schedule event.")
        
        return "\n\n".join(description_parts)


# Create a global instance for use in routers
student_calendar_service = StudentCalendarService()