"""
Scheduling service for internal class management.
Handles class schedule CRUD operations, recurrence pattern processing,
schedule instance generation, and database operations with proper transaction handling.
"""

import logging
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Tuple
import json
from dataclasses import dataclass

from ..models.calendar import (
    ClassScheduleCreate, ClassScheduleUpdate, ClassScheduleResponse,
    ScheduleInstanceCreate, ScheduleInstanceUpdate, ScheduleInstanceResponse,
    StudentScheduleAccessCreate, StudentScheduleAccessResponse,
    RecurrencePattern, RecurrenceType, ScheduleStatus, UpdateScope,
    RecurringScheduleUpdate, ScheduleQuery, StudentScheduleQuery,
    BulkScheduleCreate, BulkScheduleResponse
)
from .supabase_client import get_supabase_client
from supabase import Client

logger = logging.getLogger(__name__)


class SchedulingError(Exception):
    """Custom exception for scheduling-related errors."""
    
    def __init__(self, message: str, error_code: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class TransactionError(SchedulingError):
    """Exception for database transaction errors."""
    pass


@dataclass
class RecurrenceConfig:
    """Configuration for recurrence pattern processing."""
    max_instances: int = 365  # Maximum instances to generate
    max_future_months: int = 12  # Maximum months into the future


class SchedulingService:
    """
    Service for internal class schedule management with comprehensive
    CRUD operations, recurrence processing, and transaction handling.
    """
    
    def __init__(self):
        self.client: Client = get_supabase_client()
        self.recurrence_config = RecurrenceConfig()
    
    async def create_class_schedule(
        self, 
        teacher_id: str, 
        schedule_data: ClassScheduleCreate
    ) -> ClassScheduleResponse:
        """
        Create a new class schedule with optional recurrence pattern.
        
        Args:
            teacher_id: ID of the teacher creating the schedule
            schedule_data: Schedule creation data
            
        Returns:
            ClassScheduleResponse: Created schedule with details
            
        Raises:
            SchedulingError: If schedule creation fails
        """
        try:
            # Validate teacher and subject exist
            await self._validate_teacher_and_subject(teacher_id, schedule_data.subject_id)
            
            # Prepare schedule data for database
            schedule_db_data = {
                'teacher_id': teacher_id,
                'subject_id': schedule_data.subject_id,
                'title': schedule_data.title,
                'description': schedule_data.description,
                'start_datetime': schedule_data.start_datetime.isoformat(),
                'duration_minutes': schedule_data.duration_minutes,
                'recurrence_pattern': schedule_data.recurrence_pattern.model_dump() if schedule_data.recurrence_pattern else None,
                'is_active': True
            }
            
            # Create schedule in database
            result = self.client.table('class_schedules').insert(schedule_db_data).execute()
            
            if not result.data:
                raise SchedulingError(
                    message="Failed to create class schedule",
                    error_code="SCHEDULE_CREATE_FAILED"
                )
            
            schedule_id = result.data[0]['id']
            
            # Generate schedule instances if recurrence pattern exists
            if schedule_data.recurrence_pattern:
                await self._generate_schedule_instances(schedule_id, schedule_data, schedule_data.recurrence_pattern)
            
            # Get the created schedule with full details
            created_schedule = await self.get_schedule_by_id(schedule_id)
            
            logger.info(f"Class schedule created successfully: {schedule_id} for teacher {teacher_id}")
            return created_schedule
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to create class schedule for teacher {teacher_id}: {error}")
            raise SchedulingError(
                message="Failed to create class schedule",
                error_code="SCHEDULE_CREATE_FAILED",
                details={'error': str(error)}
            )
    
    async def update_class_schedule(
        self, 
        schedule_id: int, 
        updates: ClassScheduleUpdate, 
        scope: UpdateScope = UpdateScope.THIS_AND_FUTURE,
        instance_datetime: Optional[datetime] = None
    ) -> ClassScheduleResponse:
        """
        Update a class schedule with support for recurring event modifications.
        
        Args:
            schedule_id: ID of the schedule to update
            updates: Update data
            scope: Update scope for recurring events
            instance_datetime: Required for THIS_INSTANCE scope
            
        Returns:
            ClassScheduleResponse: Updated schedule
            
        Raises:
            SchedulingError: If schedule update fails
        """
        try:
            # Get existing schedule
            existing_schedule = await self.get_schedule_by_id(schedule_id)
            
            # Handle different update scopes
            if scope == UpdateScope.THIS_INSTANCE:
                if not instance_datetime:
                    raise SchedulingError(
                        message="instance_datetime is required for THIS_INSTANCE scope",
                        error_code="MISSING_INSTANCE_DATETIME"
                    )
                return await self._update_single_instance(schedule_id, instance_datetime, updates)
            
            elif scope == UpdateScope.THIS_AND_FUTURE:
                return await self._update_this_and_future_instances(schedule_id, updates, instance_datetime)
            
            else:  # ALL_INSTANCES
                return await self._update_all_instances(schedule_id, updates)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to update class schedule {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to update class schedule",
                error_code="SCHEDULE_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    async def delete_class_schedule(
        self, 
        schedule_id: int, 
        scope: UpdateScope = UpdateScope.ALL_INSTANCES,
        instance_datetime: Optional[datetime] = None
    ) -> bool:
        """
        Delete a class schedule with support for recurring event deletion.
        
        Args:
            schedule_id: ID of the schedule to delete
            scope: Deletion scope for recurring events
            instance_datetime: Required for THIS_INSTANCE scope
            
        Returns:
            bool: True if deletion successful
            
        Raises:
            SchedulingError: If schedule deletion fails
        """
        try:
            # Get existing schedule to validate it exists
            existing_schedule = await self.get_schedule_by_id(schedule_id)
            
            if scope == UpdateScope.THIS_INSTANCE:
                if not instance_datetime:
                    raise SchedulingError(
                        message="instance_datetime is required for THIS_INSTANCE scope",
                        error_code="MISSING_INSTANCE_DATETIME"
                    )
                return await self._delete_single_instance(schedule_id, instance_datetime)
            
            elif scope == UpdateScope.THIS_AND_FUTURE:
                return await self._delete_this_and_future_instances(schedule_id, instance_datetime)
            
            else:  # ALL_INSTANCES
                return await self._delete_all_instances(schedule_id)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to delete class schedule {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to delete class schedule",
                error_code="SCHEDULE_DELETE_FAILED",
                details={'error': str(error)}
            )
    
    async def get_teacher_schedules(
        self, 
        teacher_id: str, 
        query: Optional[ScheduleQuery] = None
    ) -> List[ClassScheduleResponse]:
        """
        Get all schedules for a teacher with optional filtering.
        
        Args:
            teacher_id: ID of the teacher
            query: Optional query parameters for filtering
            
        Returns:
            List[ClassScheduleResponse]: List of teacher's schedules
            
        Raises:
            SchedulingError: If retrieval fails
        """
        try:
            # Build query
            db_query = self.client.table('teacher_calendar_view').select('*').eq('teacher_id', teacher_id)
            
            # Apply filters if provided
            if query:
                if query.start_date:
                    db_query = db_query.gte('start_datetime', query.start_date.isoformat())
                if query.end_date:
                    db_query = db_query.lte('start_datetime', query.end_date.isoformat())
                if query.subject_id:
                    db_query = db_query.eq('subject_id', query.subject_id)
                if query.is_active is not None:
                    # Note: This filter is already applied in the view, but we can add it for consistency
                    pass
            
            result = db_query.execute()
            
            schedules = []
            for row in result.data:
                schedule = await self._convert_db_row_to_schedule_response(row, query.include_instances if query else False)
                schedules.append(schedule)
            
            logger.info(f"Retrieved {len(schedules)} schedules for teacher {teacher_id}")
            return schedules
            
        except Exception as error:
            logger.error(f"Failed to get teacher schedules for {teacher_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve teacher schedules",
                error_code="TEACHER_SCHEDULES_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def get_student_schedules(
        self, 
        student_id: str, 
        query: Optional[StudentScheduleQuery] = None
    ) -> List[ClassScheduleResponse]:
        """
        Get all schedules accessible to a student with optional filtering.
        
        Args:
            student_id: ID of the student
            query: Optional query parameters for filtering
            
        Returns:
            List[ClassScheduleResponse]: List of accessible schedules
            
        Raises:
            SchedulingError: If retrieval fails
        """
        try:
            # Build query
            db_query = self.client.table('student_calendar_view').select('*').eq('student_id', student_id)
            
            # Apply filters if provided
            if query:
                if query.start_date:
                    db_query = db_query.gte('start_datetime', query.start_date.isoformat())
                if query.end_date:
                    db_query = db_query.lte('start_datetime', query.end_date.isoformat())
                if query.subject_id:
                    db_query = db_query.eq('subject_id', query.subject_id)
                if query.sync_enabled_only is not None:
                    db_query = db_query.eq('sync_to_personal_calendar', query.sync_enabled_only)
            
            result = db_query.execute()
            
            schedules = []
            for row in result.data:
                schedule = await self._convert_db_row_to_schedule_response(row, False)
                schedules.append(schedule)
            
            logger.info(f"Retrieved {len(schedules)} schedules for student {student_id}")
            return schedules
            
        except Exception as error:
            logger.error(f"Failed to get student schedules for {student_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve student schedules",
                error_code="STUDENT_SCHEDULES_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def get_schedule_by_id(self, schedule_id: int) -> ClassScheduleResponse:
        """
        Get a specific schedule by ID with full details.
        
        Args:
            schedule_id: ID of the schedule
            
        Returns:
            ClassScheduleResponse: Schedule details
            
        Raises:
            SchedulingError: If schedule not found or retrieval fails
        """
        try:
            result = self.client.table('class_schedules').select('*').eq('id', schedule_id).execute()
            
            if not result.data:
                raise SchedulingError(
                    message=f"Schedule not found: {schedule_id}",
                    error_code="SCHEDULE_NOT_FOUND"
                )
            
            schedule_data = result.data[0]
            return await self._convert_db_row_to_schedule_response(schedule_data, include_instances=True)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to get schedule {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve schedule",
                error_code="SCHEDULE_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def sync_with_calendar(self, schedule_id: int) -> bool:
        """
        Sync a schedule with external calendar (placeholder for calendar service integration).
        
        Args:
            schedule_id: ID of the schedule to sync
            
        Returns:
            bool: True if sync successful
            
        Raises:
            SchedulingError: If sync fails
        """
        try:
            # Get schedule details
            schedule = await self.get_schedule_by_id(schedule_id)
            
            # This is a placeholder - actual implementation would integrate with CalendarService
            # For now, we'll just mark the schedule as synced by updating a timestamp
            
            result = self.client.table('class_schedules').update({
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', schedule_id).execute()
            
            if not result.data:
                raise SchedulingError(
                    message="Failed to update schedule sync status",
                    error_code="SYNC_UPDATE_FAILED"
                )
            
            logger.info(f"Schedule {schedule_id} synced successfully")
            return True
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to sync schedule {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to sync schedule with calendar",
                error_code="SCHEDULE_SYNC_FAILED",
                details={'error': str(error)}
            )
    
    async def manage_student_schedule_access(
        self,
        student_id: str,
        schedule_id: int,
        grant_access: bool = True,
        sync_to_personal_calendar: bool = False
    ) -> StudentScheduleAccessResponse:
        """
        Manage student access to a class schedule.
        
        Args:
            student_id: ID of the student
            schedule_id: ID of the schedule
            grant_access: Whether to grant or revoke access
            sync_to_personal_calendar: Whether to sync to student's personal calendar
            
        Returns:
            StudentScheduleAccessResponse: Access record details
            
        Raises:
            SchedulingError: If access management fails
        """
        try:
            # Validate that the schedule exists
            await self.get_schedule_by_id(schedule_id)
            
            # Validate that the student exists
            student_result = self.client.table('students').select('student_id').eq('student_id', student_id).execute()
            if not student_result.data:
                raise SchedulingError(
                    message=f"Student not found: {student_id}",
                    error_code="STUDENT_NOT_FOUND"
                )
            
            if grant_access:
                # Grant or update access
                access_data = {
                    'student_id': student_id,
                    'schedule_id': schedule_id,
                    'sync_to_personal_calendar': sync_to_personal_calendar,
                    'access_granted_at': datetime.utcnow().isoformat()
                }
                
                # Use upsert to handle existing records
                result = self.client.table('student_schedule_access').upsert(
                    access_data,
                    on_conflict='student_id,schedule_id'
                ).execute()
                
                if not result.data:
                    raise SchedulingError(
                        message="Failed to grant schedule access",
                        error_code="ACCESS_GRANT_FAILED"
                    )
                
                access_record = result.data[0]
                logger.info(f"Schedule access granted to student {student_id} for schedule {schedule_id}")
                
            else:
                # Revoke access
                result = self.client.table('student_schedule_access').delete().eq(
                    'student_id', student_id
                ).eq('schedule_id', schedule_id).execute()
                
                if not result.data:
                    raise SchedulingError(
                        message="No access record found to revoke",
                        error_code="ACCESS_RECORD_NOT_FOUND"
                    )
                
                logger.info(f"Schedule access revoked for student {student_id} from schedule {schedule_id}")
                return None
            
            # Convert to response format
            return StudentScheduleAccessResponse(
                id=access_record['id'],
                student_id=access_record['student_id'],
                schedule_id=access_record['schedule_id'],
                sync_to_personal_calendar=access_record['sync_to_personal_calendar'],
                access_granted_at=datetime.fromisoformat(access_record['access_granted_at']),
                created_at=datetime.fromisoformat(access_record['created_at'])
            )
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to manage student schedule access: {error}")
            raise SchedulingError(
                message="Failed to manage student schedule access",
                error_code="ACCESS_MANAGEMENT_FAILED",
                details={'error': str(error)}
            )
    
    async def get_student_schedule_access(
        self,
        student_id: str,
        schedule_id: Optional[int] = None
    ) -> List[StudentScheduleAccessResponse]:
        """
        Get student's schedule access records.
        
        Args:
            student_id: ID of the student
            schedule_id: Optional specific schedule ID to check
            
        Returns:
            List[StudentScheduleAccessResponse]: List of access records
            
        Raises:
            SchedulingError: If retrieval fails
        """
        try:
            query = self.client.table('student_schedule_access').select('*').eq('student_id', student_id)
            
            if schedule_id:
                query = query.eq('schedule_id', schedule_id)
            
            result = query.execute()
            
            access_records = []
            for record in result.data:
                access_record = StudentScheduleAccessResponse(
                    id=record['id'],
                    student_id=record['student_id'],
                    schedule_id=record['schedule_id'],
                    sync_to_personal_calendar=record['sync_to_personal_calendar'],
                    access_granted_at=datetime.fromisoformat(record['access_granted_at']),
                    created_at=datetime.fromisoformat(record['created_at'])
                )
                access_records.append(access_record)
            
            logger.info(f"Retrieved {len(access_records)} access records for student {student_id}")
            return access_records
            
        except Exception as error:
            logger.error(f"Failed to get student schedule access for {student_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve student schedule access",
                error_code="ACCESS_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def update_student_calendar_sync(
        self,
        student_id: str,
        schedule_id: int,
        sync_enabled: bool
    ) -> StudentScheduleAccessResponse:
        """
        Update student's personal calendar sync preference for a schedule.
        
        Args:
            student_id: ID of the student
            schedule_id: ID of the schedule
            sync_enabled: Whether to enable sync to personal calendar
            
        Returns:
            StudentScheduleAccessResponse: Updated access record
            
        Raises:
            SchedulingError: If update fails
        """
        try:
            # Check if access record exists
            access_result = self.client.table('student_schedule_access').select('*').eq(
                'student_id', student_id
            ).eq('schedule_id', schedule_id).execute()
            
            if not access_result.data:
                raise SchedulingError(
                    message="Student does not have access to this schedule",
                    error_code="ACCESS_NOT_FOUND"
                )
            
            # Update sync preference
            update_result = self.client.table('student_schedule_access').update({
                'sync_to_personal_calendar': sync_enabled,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('student_id', student_id).eq('schedule_id', schedule_id).execute()
            
            if not update_result.data:
                raise SchedulingError(
                    message="Failed to update calendar sync preference",
                    error_code="SYNC_UPDATE_FAILED"
                )
            
            updated_record = update_result.data[0]
            
            logger.info(f"Calendar sync {'enabled' if sync_enabled else 'disabled'} for student {student_id}, schedule {schedule_id}")
            
            return StudentScheduleAccessResponse(
                id=updated_record['id'],
                student_id=updated_record['student_id'],
                schedule_id=updated_record['schedule_id'],
                sync_to_personal_calendar=updated_record['sync_to_personal_calendar'],
                access_granted_at=datetime.fromisoformat(updated_record['access_granted_at']),
                created_at=datetime.fromisoformat(updated_record['created_at'])
            )
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to update calendar sync for student {student_id}: {error}")
            raise SchedulingError(
                message="Failed to update calendar sync preference",
                error_code="SYNC_PREFERENCE_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    async def grant_enrollment_based_access(self, schedule_id: int) -> int:
        """
        Automatically grant schedule access to all enrolled students for a subject.
        
        Args:
            schedule_id: ID of the schedule
            
        Returns:
            int: Number of students granted access
            
        Raises:
            SchedulingError: If access granting fails
        """
        try:
            # Get schedule details
            schedule = await self.get_schedule_by_id(schedule_id)
            
            # Get enrolled students for the subject
            subject_result = self.client.table('subjects').select('enrolled_students').eq(
                'subject_id', schedule.subject_id
            ).execute()
            
            if not subject_result.data or not subject_result.data[0].get('enrolled_students'):
                logger.info(f"No enrolled students found for subject {schedule.subject_id}")
                return 0
            
            enrolled_students = subject_result.data[0]['enrolled_students']
            granted_count = 0
            
            # Grant access to each enrolled student
            for student_id in enrolled_students:
                try:
                    await self.manage_student_schedule_access(
                        student_id=student_id,
                        schedule_id=schedule_id,
                        grant_access=True,
                        sync_to_personal_calendar=False  # Default to disabled
                    )
                    granted_count += 1
                except SchedulingError as e:
                    if e.error_code != "STUDENT_NOT_FOUND":
                        logger.warning(f"Failed to grant access to student {student_id}: {e.message}")
                    continue
            
            logger.info(f"Granted schedule access to {granted_count} students for schedule {schedule_id}")
            return granted_count
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to grant enrollment-based access for schedule {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to grant enrollment-based access",
                error_code="ENROLLMENT_ACCESS_FAILED",
                details={'error': str(error)}
            )
    
    async def create_bulk_schedules(
        self, 
        teacher_id: str, 
        bulk_data: BulkScheduleCreate
    ) -> BulkScheduleResponse:
        """
        Create multiple schedules in a single transaction.
        
        Args:
            teacher_id: ID of the teacher creating the schedules
            bulk_data: Bulk creation data
            
        Returns:
            BulkScheduleResponse: Results of bulk creation
            
        Raises:
            SchedulingError: If bulk creation fails
        """
        try:
            created_schedules = []
            errors = []
            
            # Process each schedule
            for i, schedule_data in enumerate(bulk_data.schedules):
                try:
                    created_schedule = await self.create_class_schedule(teacher_id, schedule_data)
                    created_schedules.append(created_schedule)
                except Exception as error:
                    errors.append({
                        'index': i,
                        'schedule_data': schedule_data.model_dump(),
                        'error': str(error)
                    })
            
            result = BulkScheduleResponse(
                created_count=len(created_schedules),
                failed_count=len(errors),
                created_schedules=created_schedules,
                errors=errors
            )
            
            logger.info(f"Bulk schedule creation completed: {len(created_schedules)} created, {len(errors)} failed")
            return result
            
        except Exception as error:
            logger.error(f"Failed to create bulk schedules for teacher {teacher_id}: {error}")
            raise SchedulingError(
                message="Failed to create bulk schedules",
                error_code="BULK_SCHEDULE_CREATE_FAILED",
                details={'error': str(error)}
            )
    
    async def get_schedule_instances(
        self,
        schedule_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_cancelled: bool = False
    ) -> List[ScheduleInstanceResponse]:
        """
        Get schedule instances for a recurring schedule.
        
        Args:
            schedule_id: ID of the schedule
            start_date: Optional start date filter
            end_date: Optional end date filter
            include_cancelled: Whether to include cancelled instances
            
        Returns:
            List[ScheduleInstanceResponse]: List of schedule instances
            
        Raises:
            SchedulingError: If retrieval fails
        """
        try:
            query = self.client.table('schedule_instances').select('*').eq('schedule_id', schedule_id)
            
            if start_date:
                query = query.gte('instance_datetime', start_date.isoformat())
            if end_date:
                query = query.lte('instance_datetime', end_date.isoformat())
            if not include_cancelled:
                query = query.neq('status', ScheduleStatus.CANCELLED.value)
            
            result = query.order('instance_datetime').execute()
            
            instances = []
            for row in result.data:
                instance = await self._convert_db_row_to_instance_response(row)
                instances.append(instance)
            
            logger.info(f"Retrieved {len(instances)} instances for schedule {schedule_id}")
            return instances
            
        except Exception as error:
            logger.error(f"Failed to get schedule instances for {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve schedule instances",
                error_code="INSTANCES_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def handle_recurring_event_modification(
        self,
        schedule_id: int,
        instance_datetime: datetime,
        modifications: Dict[str, Any]
    ) -> ScheduleInstanceResponse:
        """
        Handle modification of a specific recurring event instance.
        
        Args:
            schedule_id: ID of the parent schedule
            instance_datetime: Datetime of the instance to modify
            modifications: Dictionary of modifications to apply
            
        Returns:
            ScheduleInstanceResponse: Modified instance details
            
        Raises:
            SchedulingError: If modification fails
        """
        try:
            # Find or create the instance record
            instance_result = self.client.table('schedule_instances').select('*').eq(
                'schedule_id', schedule_id
            ).eq('instance_datetime', instance_datetime.isoformat()).execute()
            
            if instance_result.data:
                # Update existing instance
                instance_id = instance_result.data[0]['id']
                existing_modifications = instance_result.data[0].get('modifications') or {}
                
                # Merge modifications
                updated_modifications = {**existing_modifications, **modifications}
                
                update_result = self.client.table('schedule_instances').update({
                    'status': ScheduleStatus.MODIFIED.value,
                    'modifications': updated_modifications,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', instance_id).execute()
                
                if not update_result.data:
                    raise SchedulingError(
                        message="Failed to update schedule instance",
                        error_code="INSTANCE_UPDATE_FAILED"
                    )
                
                updated_instance = update_result.data[0]
            else:
                # Create new instance record for modification
                instance_data = {
                    'schedule_id': schedule_id,
                    'instance_datetime': instance_datetime.isoformat(),
                    'status': ScheduleStatus.MODIFIED.value,
                    'modifications': modifications
                }
                
                create_result = self.client.table('schedule_instances').insert(instance_data).execute()
                
                if not create_result.data:
                    raise SchedulingError(
                        message="Failed to create modified instance record",
                        error_code="INSTANCE_CREATE_FAILED"
                    )
                
                updated_instance = create_result.data[0]
            
            logger.info(f"Instance modified for schedule {schedule_id} at {instance_datetime}")
            return await self._convert_db_row_to_instance_response(updated_instance)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to modify recurring event instance: {error}")
            raise SchedulingError(
                message="Failed to modify recurring event instance",
                error_code="INSTANCE_MODIFICATION_FAILED",
                details={'error': str(error)}
            )
    
    # Private helper methods
    
    async def _validate_teacher_and_subject(self, teacher_id: str, subject_id: str) -> None:
        """Validate that teacher and subject exist."""
        # Check if teacher exists
        teacher_result = self.client.table('faculty').select('faculty_id').eq('faculty_id', teacher_id).execute()
        if not teacher_result.data:
            raise SchedulingError(
                message=f"Teacher not found: {teacher_id}",
                error_code="TEACHER_NOT_FOUND"
            )
        
        # Check if subject exists
        subject_result = self.client.table('subjects').select('subject_id').eq('subject_id', subject_id).execute()
        if not subject_result.data:
            raise SchedulingError(
                message=f"Subject not found: {subject_id}",
                error_code="SUBJECT_NOT_FOUND"
            )
    
    async def _generate_schedule_instances(
        self, 
        schedule_id: int, 
        schedule_data: ClassScheduleCreate, 
        recurrence_pattern: RecurrencePattern
    ) -> None:
        """Generate schedule instances based on recurrence pattern."""
        try:
            instances = self._calculate_recurrence_instances(
                schedule_data.start_datetime,
                recurrence_pattern
            )
            
            # Prepare instance data for bulk insert
            instance_data = []
            for instance_datetime in instances:
                instance_data.append({
                    'schedule_id': schedule_id,
                    'instance_datetime': instance_datetime.isoformat(),
                    'status': ScheduleStatus.SCHEDULED.value
                })
            
            # Bulk insert instances
            if instance_data:
                result = self.client.table('schedule_instances').insert(instance_data).execute()
                if not result.data:
                    logger.warning(f"Failed to create some schedule instances for schedule {schedule_id}")
                else:
                    logger.info(f"Created {len(result.data)} schedule instances for schedule {schedule_id}")
            
        except Exception as error:
            logger.error(f"Failed to generate schedule instances for schedule {schedule_id}: {error}")
            # Don't raise here as the main schedule was created successfully
    
    def _calculate_recurrence_instances(
        self, 
        start_datetime: datetime, 
        pattern: RecurrencePattern
    ) -> List[datetime]:
        """Calculate all instance datetimes based on recurrence pattern."""
        instances = []
        current_datetime = start_datetime
        max_end_date = datetime.now() + timedelta(days=self.recurrence_config.max_future_months * 30)
        
        # Determine end condition
        end_date = pattern.end_date
        if end_date:
            end_datetime = datetime.combine(end_date, start_datetime.time())
            if end_datetime > max_end_date:
                end_datetime = max_end_date
        else:
            end_datetime = max_end_date
        
        occurrence_count = pattern.occurrence_count or self.recurrence_config.max_instances
        
        count = 0
        while (current_datetime <= end_datetime and 
               count < occurrence_count and 
               count < self.recurrence_config.max_instances):
            
            # Check if this instance should be included based on days_of_week
            if pattern.days_of_week:
                weekday = current_datetime.weekday()  # 0=Monday, 6=Sunday
                if weekday not in pattern.days_of_week:
                    current_datetime = self._get_next_occurrence(current_datetime, pattern)
                    continue
            
            instances.append(current_datetime)
            count += 1
            
            # Calculate next occurrence
            current_datetime = self._get_next_occurrence(current_datetime, pattern)
        
        return instances
    
    def _get_next_occurrence(self, current_datetime: datetime, pattern: RecurrencePattern) -> datetime:
        """Calculate the next occurrence based on recurrence pattern."""
        if pattern.type == RecurrenceType.WEEKLY:
            return current_datetime + timedelta(weeks=pattern.interval)
        elif pattern.type == RecurrenceType.BIWEEKLY:
            return current_datetime + timedelta(weeks=2 * pattern.interval)
        elif pattern.type == RecurrenceType.CUSTOM:
            return current_datetime + timedelta(weeks=pattern.interval)
        else:
            # Default to weekly
            return current_datetime + timedelta(weeks=1)
    
    async def _update_single_instance(
        self, 
        schedule_id: int, 
        instance_datetime: datetime, 
        updates: ClassScheduleUpdate
    ) -> ClassScheduleResponse:
        """Update a single instance of a recurring schedule."""
        try:
            # Find the specific instance
            instance_result = self.client.table('schedule_instances').select('*').eq(
                'schedule_id', schedule_id
            ).eq('instance_datetime', instance_datetime.isoformat()).execute()
            
            if not instance_result.data:
                raise SchedulingError(
                    message="Schedule instance not found",
                    error_code="INSTANCE_NOT_FOUND"
                )
            
            instance_id = instance_result.data[0]['id']
            
            # Prepare modifications data
            modifications = {}
            if updates.title is not None:
                modifications['title'] = updates.title
            if updates.description is not None:
                modifications['description'] = updates.description
            if updates.start_datetime is not None:
                modifications['start_datetime'] = updates.start_datetime.isoformat()
            if updates.duration_minutes is not None:
                modifications['duration_minutes'] = updates.duration_minutes
            
            # Update the instance with modifications
            update_data = {
                'status': ScheduleStatus.MODIFIED.value,
                'modifications': modifications,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.client.table('schedule_instances').update(update_data).eq('id', instance_id).execute()
            
            if not result.data:
                raise SchedulingError(
                    message="Failed to update schedule instance",
                    error_code="INSTANCE_UPDATE_FAILED"
                )
            
            # Return the parent schedule
            return await self.get_schedule_by_id(schedule_id)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to update single instance: {error}")
            raise SchedulingError(
                message="Failed to update schedule instance",
                error_code="INSTANCE_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    async def _update_this_and_future_instances(
        self, 
        schedule_id: int, 
        updates: ClassScheduleUpdate, 
        from_datetime: Optional[datetime] = None
    ) -> ClassScheduleResponse:
        """Update this and all future instances of a recurring schedule."""
        try:
            # Update the main schedule
            update_data = {}
            if updates.title is not None:
                update_data['title'] = updates.title
            if updates.description is not None:
                update_data['description'] = updates.description
            if updates.start_datetime is not None:
                update_data['start_datetime'] = updates.start_datetime.isoformat()
            if updates.duration_minutes is not None:
                update_data['duration_minutes'] = updates.duration_minutes
            if updates.recurrence_pattern is not None:
                update_data['recurrence_pattern'] = updates.recurrence_pattern.model_dump()
            if updates.is_active is not None:
                update_data['is_active'] = updates.is_active
            
            update_data['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table('class_schedules').update(update_data).eq('id', schedule_id).execute()
            
            if not result.data:
                raise SchedulingError(
                    message="Failed to update schedule",
                    error_code="SCHEDULE_UPDATE_FAILED"
                )
            
            # Update future instances if from_datetime is specified
            if from_datetime:
                instance_update_data = {
                    'status': ScheduleStatus.MODIFIED.value,
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                self.client.table('schedule_instances').update(instance_update_data).eq(
                    'schedule_id', schedule_id
                ).gte('instance_datetime', from_datetime.isoformat()).execute()
            
            return await self.get_schedule_by_id(schedule_id)
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to update this and future instances: {error}")
            raise SchedulingError(
                message="Failed to update schedule and future instances",
                error_code="SCHEDULE_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    async def _update_all_instances(self, schedule_id: int, updates: ClassScheduleUpdate) -> ClassScheduleResponse:
        """Update all instances of a recurring schedule."""
        return await self._update_this_and_future_instances(schedule_id, updates)
    
    async def _delete_single_instance(self, schedule_id: int, instance_datetime: datetime) -> bool:
        """Delete a single instance of a recurring schedule."""
        try:
            # Mark the instance as cancelled instead of deleting
            result = self.client.table('schedule_instances').update({
                'status': ScheduleStatus.CANCELLED.value,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('schedule_id', schedule_id).eq('instance_datetime', instance_datetime.isoformat()).execute()
            
            return bool(result.data)
            
        except Exception as error:
            logger.error(f"Failed to delete single instance: {error}")
            raise SchedulingError(
                message="Failed to delete schedule instance",
                error_code="INSTANCE_DELETE_FAILED",
                details={'error': str(error)}
            )
    
    async def _delete_this_and_future_instances(
        self, 
        schedule_id: int, 
        from_datetime: Optional[datetime] = None
    ) -> bool:
        """Delete this and all future instances of a recurring schedule."""
        try:
            if from_datetime:
                # Cancel future instances
                self.client.table('schedule_instances').update({
                    'status': ScheduleStatus.CANCELLED.value,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('schedule_id', schedule_id).gte('instance_datetime', from_datetime.isoformat()).execute()
                
                # Update the schedule's recurrence pattern to end before from_datetime
                schedule = await self.get_schedule_by_id(schedule_id)
                if schedule.recurrence_pattern:
                    # Set end date to the day before from_datetime
                    new_end_date = (from_datetime - timedelta(days=1)).date()
                    updated_pattern = schedule.recurrence_pattern.model_copy()
                    updated_pattern.end_date = new_end_date
                    
                    self.client.table('class_schedules').update({
                        'recurrence_pattern': updated_pattern.model_dump(),
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('id', schedule_id).execute()
            else:
                # Deactivate the entire schedule
                result = self.client.table('class_schedules').update({
                    'is_active': False,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', schedule_id).execute()
                
                if not result.data:
                    return False
            
            return True
            
        except Exception as error:
            logger.error(f"Failed to delete this and future instances: {error}")
            raise SchedulingError(
                message="Failed to delete schedule instances",
                error_code="INSTANCES_DELETE_FAILED",
                details={'error': str(error)}
            )
    
    async def _delete_all_instances(self, schedule_id: int) -> bool:
        """Delete all instances of a recurring schedule."""
        try:
            # Deactivate the entire schedule
            result = self.client.table('class_schedules').update({
                'is_active': False,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', schedule_id).execute()
            
            # Cancel all instances
            self.client.table('schedule_instances').update({
                'status': ScheduleStatus.CANCELLED.value,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('schedule_id', schedule_id).execute()
            
            return bool(result.data)
            
        except Exception as error:
            logger.error(f"Failed to delete all instances: {error}")
            raise SchedulingError(
                message="Failed to delete all schedule instances",
                error_code="ALL_INSTANCES_DELETE_FAILED",
                details={'error': str(error)}
            )
    
    async def sync_recurring_event_with_calendar(
        self, 
        schedule_id: int, 
        scope: UpdateScope = UpdateScope.ALL_INSTANCES,
        instance_datetime: Optional[datetime] = None
    ) -> bool:
        """
        Sync recurring event changes with Google Calendar.
        
        Args:
            schedule_id: ID of the schedule to sync
            scope: Sync scope for recurring events
            instance_datetime: Required for THIS_INSTANCE scope
            
        Returns:
            bool: True if sync successful
            
        Raises:
            SchedulingError: If sync fails
        """
        try:
            # Get schedule details
            schedule = await self.get_schedule_by_id(schedule_id)
            
            # Import calendar service here to avoid circular imports
            from .calendar_service import calendar_service
            
            # Get teacher's calendar connection
            connection_result = self.client.table('calendar_connections').select('*').eq(
                'user_id', schedule.teacher_id
            ).eq('provider', 'google').execute()
            
            if not connection_result.data:
                logger.warning(f"No Google Calendar connection found for teacher {schedule.teacher_id}")
                return False
            
            connection = connection_result.data[0]
            
            if scope == UpdateScope.THIS_INSTANCE:
                if not instance_datetime:
                    raise SchedulingError(
                        message="instance_datetime is required for THIS_INSTANCE scope",
                        error_code="MISSING_INSTANCE_DATETIME"
                    )
                
                # Get the specific instance
                instance_result = self.client.table('schedule_instances').select('*').eq(
                    'schedule_id', schedule_id
                ).eq('instance_datetime', instance_datetime.isoformat()).execute()
                
                if not instance_result.data:
                    raise SchedulingError(
                        message="Schedule instance not found",
                        error_code="INSTANCE_NOT_FOUND"
                    )
                
                instance = instance_result.data[0]
                
                # Sync single instance with Google Calendar
                if instance.get('google_event_id'):
                    # Update existing event
                    from ..models.calendar import CalendarEventUpdate
                    
                    modifications = instance.get('modifications', {})
                    updates = CalendarEventUpdate(
                        title=modifications.get('title', schedule.title),
                        description=modifications.get('description', schedule.description),
                        start_datetime=datetime.fromisoformat(
                            modifications.get('start_datetime', instance['instance_datetime']).replace('Z', '+00:00')
                        ),
                        duration_minutes=modifications.get('duration_minutes', schedule.duration_minutes)
                    )
                    
                    success = await calendar_service.update_event(
                        user_id=schedule.teacher_id,
                        event_id=instance['google_event_id'],
                        updates=updates
                    )
                    
                    if not success:
                        logger.error(f"Failed to update Google Calendar event {instance['google_event_id']}")
                        return False
                
            elif scope == UpdateScope.THIS_AND_FUTURE:
                # Update the recurring series from this point forward
                if schedule.google_recurring_event_id:
                    # For Google Calendar, we need to handle this by updating the recurring event
                    # and potentially creating a new series for the modified instances
                    success = await self._sync_recurring_series_update(
                        schedule, instance_datetime, connection
                    )
                    
                    if not success:
                        logger.error(f"Failed to sync recurring series update for schedule {schedule_id}")
                        return False
                
            else:  # ALL_INSTANCES
                # Update the entire recurring series
                if schedule.google_recurring_event_id:
                    from ..models.calendar import CalendarEventUpdate
                    
                    updates = CalendarEventUpdate(
                        title=schedule.title,
                        description=schedule.description,
                        start_datetime=schedule.start_datetime,
                        duration_minutes=schedule.duration_minutes
                    )
                    
                    success = await calendar_service.update_event(
                        user_id=schedule.teacher_id,
                        event_id=schedule.google_recurring_event_id,
                        updates=updates
                    )
                    
                    if not success:
                        logger.error(f"Failed to update Google Calendar recurring event {schedule.google_recurring_event_id}")
                        return False
            
            logger.info(f"Successfully synced schedule {schedule_id} with Google Calendar")
            return True
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to sync recurring event with calendar: {error}")
            return False
    
    async def _sync_recurring_series_update(
        self, 
        schedule: ClassScheduleResponse, 
        from_datetime: Optional[datetime],
        connection: Dict[str, Any]
    ) -> bool:
        """
        Handle complex recurring series updates with Google Calendar.
        
        This method handles the case where we need to modify a recurring series
        from a specific point forward, which may require creating a new series.
        """
        try:
            from .calendar_service import calendar_service
            
            if not from_datetime:
                # Update entire series
                from ..models.calendar import CalendarEventUpdate
                
                updates = CalendarEventUpdate(
                    title=schedule.title,
                    description=schedule.description,
                    start_datetime=schedule.start_datetime,
                    duration_minutes=schedule.duration_minutes
                )
                
                return await calendar_service.update_event(
                    user_id=schedule.teacher_id,
                    event_id=schedule.google_recurring_event_id,
                    updates=updates
                )
            
            # For "this and future" updates, we need to:
            # 1. End the current recurring series before from_datetime
            # 2. Create a new recurring series starting from from_datetime
            
            # First, get all instances to determine which ones to keep vs modify
            instances_result = self.client.table('schedule_instances').select('*').eq(
                'schedule_id', schedule.id
            ).gte('instance_datetime', from_datetime.isoformat()).execute()
            
            if not instances_result.data:
                return True  # No future instances to update
            
            # End the current recurring series at from_datetime
            # This is complex with Google Calendar API, so for now we'll update individual instances
            for instance_data in instances_result.data:
                if instance_data.get('google_event_id'):
                    modifications = instance_data.get('modifications') or {}
                    
                    from ..models.calendar import CalendarEventUpdate
                    updates = CalendarEventUpdate(
                        title=modifications.get('title', schedule.title),
                        description=modifications.get('description', schedule.description),
                        start_datetime=datetime.fromisoformat(
                            modifications.get('start_datetime', instance_data['instance_datetime']).replace('Z', '+00:00')
                        ),
                        duration_minutes=modifications.get('duration_minutes', schedule.duration_minutes)
                    )
                    
                    success = await calendar_service.update_event(
                        user_id=schedule.teacher_id,
                        event_id=instance_data['google_event_id'],
                        updates=updates
                    )
                    
                    if not success:
                        logger.warning(f"Failed to update instance {instance_data['google_event_id']}")
            
            return True
            
        except Exception as error:
            logger.error(f"Failed to sync recurring series update: {error}")
            return False
    
    async def delete_recurring_event_from_calendar(
        self, 
        schedule_id: int, 
        scope: UpdateScope = UpdateScope.ALL_INSTANCES,
        instance_datetime: Optional[datetime] = None
    ) -> bool:
        """
        Delete recurring event from Google Calendar with proper cleanup.
        
        Args:
            schedule_id: ID of the schedule to delete from calendar
            scope: Deletion scope for recurring events
            instance_datetime: Required for THIS_INSTANCE scope
            
        Returns:
            bool: True if deletion successful
            
        Raises:
            SchedulingError: If deletion fails
        """
        try:
            # Get schedule details
            schedule = await self.get_schedule_by_id(schedule_id)
            
            # Import calendar service here to avoid circular imports
            from .calendar_service import calendar_service
            
            # Get teacher's calendar connection
            connection_result = self.client.table('calendar_connections').select('*').eq(
                'user_id', schedule.teacher_id
            ).eq('provider', 'google').execute()
            
            if not connection_result.data:
                logger.warning(f"No Google Calendar connection found for teacher {schedule.teacher_id}")
                return True  # Consider it successful if no calendar connection
            
            if scope == UpdateScope.THIS_INSTANCE:
                if not instance_datetime:
                    raise SchedulingError(
                        message="instance_datetime is required for THIS_INSTANCE scope",
                        error_code="MISSING_INSTANCE_DATETIME"
                    )
                
                # Get the specific instance
                instance_result = self.client.table('schedule_instances').select('*').eq(
                    'schedule_id', schedule_id
                ).eq('instance_datetime', instance_datetime.isoformat()).execute()
                
                if not instance_result.data:
                    raise SchedulingError(
                        message="Schedule instance not found",
                        error_code="INSTANCE_NOT_FOUND"
                    )
                
                instance = instance_result.data[0]
                
                # Delete single instance from Google Calendar
                if instance.get('google_event_id'):
                    success = await calendar_service.delete_event(
                        user_id=schedule.teacher_id,
                        event_id=instance['google_event_id']
                    )
                    
                    if success:
                        # Clear the google_event_id from the instance
                        self.client.table('schedule_instances').update({
                            'google_event_id': None,
                            'updated_at': datetime.utcnow().isoformat()
                        }).eq('id', instance['id']).execute()
                
            elif scope == UpdateScope.THIS_AND_FUTURE:
                # Delete future instances from Google Calendar
                instances_result = self.client.table('schedule_instances').select('*').eq(
                    'schedule_id', schedule_id
                )
                
                if instance_datetime:
                    instances_result = instances_result.gte('instance_datetime', instance_datetime.isoformat())
                
                instances_data = instances_result.execute().data
                
                for instance_data in instances_data:
                    if instance_data.get('google_event_id'):
                        success = await calendar_service.delete_event(
                            user_id=schedule.teacher_id,
                            event_id=instance_data['google_event_id']
                        )
                        
                        if success:
                            # Clear the google_event_id from the instance
                            self.client.table('schedule_instances').update({
                                'google_event_id': None,
                                'updated_at': datetime.utcnow().isoformat()
                            }).eq('id', instance_data['id']).execute()
                
            else:  # ALL_INSTANCES
                # Delete the entire recurring series
                if schedule.google_recurring_event_id:
                    success = await calendar_service.delete_event(
                        user_id=schedule.teacher_id,
                        event_id=schedule.google_recurring_event_id
                    )
                    
                    if success:
                        # Clear Google Calendar IDs from the schedule
                        self.client.table('class_schedules').update({
                            'google_event_id': None,
                            'google_recurring_event_id': None,
                            'updated_at': datetime.utcnow().isoformat()
                        }).eq('id', schedule_id).execute()
                        
                        # Clear Google Calendar IDs from all instances
                        self.client.table('schedule_instances').update({
                            'google_event_id': None,
                            'updated_at': datetime.utcnow().isoformat()
                        }).eq('schedule_id', schedule_id).execute()
                
                # Also delete individual instances that might exist
                instances_result = self.client.table('schedule_instances').select('*').eq(
                    'schedule_id', schedule_id
                ).execute()
                
                for instance_data in instances_result.data:
                    if instance_data.get('google_event_id'):
                        await calendar_service.delete_event(
                            user_id=schedule.teacher_id,
                            event_id=instance_data['google_event_id']
                        )
            
            logger.info(f"Successfully deleted schedule {schedule_id} from Google Calendar")
            return True
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to delete recurring event from calendar: {error}")
            raise SchedulingError(
                message="Failed to delete recurring event from calendar",
                error_code="RECURRING_DELETE_FAILED",
                details={'error': str(error)}
            )
    
    async def get_schedule_instances(
        self, 
        schedule_id: int, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_cancelled: bool = False
    ) -> List[ScheduleInstanceResponse]:
        """
        Get schedule instances for a specific schedule with optional filtering.
        
        Args:
            schedule_id: ID of the schedule
            start_date: Optional start date filter
            end_date: Optional end date filter
            include_cancelled: Whether to include cancelled instances
            
        Returns:
            List[ScheduleInstanceResponse]: List of schedule instances
            
        Raises:
            SchedulingError: If retrieval fails
        """
        try:
            # Build query
            query = self.client.table('schedule_instances').select('*').eq('schedule_id', schedule_id)
            
            # Apply date filters
            if start_date:
                query = query.gte('instance_datetime', start_date.isoformat())
            if end_date:
                # Add one day to include the entire end date
                end_datetime = datetime.combine(end_date, datetime.min.time()) + timedelta(days=1)
                query = query.lt('instance_datetime', end_datetime.isoformat())
            
            # Filter out cancelled instances if requested
            if not include_cancelled:
                query = query.neq('status', ScheduleStatus.CANCELLED.value)
            
            # Order by instance datetime
            query = query.order('instance_datetime')
            
            result = query.execute()
            
            # Get parent schedule for additional details
            schedule = await self.get_schedule_by_id(schedule_id)
            
            instances = []
            for row in result.data:
                instance_datetime = datetime.fromisoformat(row['instance_datetime'].replace('Z', '+00:00'))
                created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
                updated_at = datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00'))
                
                # Apply modifications if they exist
                modifications = row.get('modifications') or {}
                title = modifications.get('title', schedule.title)
                description = modifications.get('description', schedule.description)
                duration_minutes = modifications.get('duration_minutes', schedule.duration_minutes)
                
                instance = ScheduleInstanceResponse(
                    id=row['id'],
                    schedule_id=row['schedule_id'],
                    instance_datetime=instance_datetime,
                    google_event_id=row.get('google_event_id'),
                    status=ScheduleStatus(row['status']),
                    modifications=modifications,
                    created_at=created_at,
                    updated_at=updated_at,
                    title=title,
                    description=description,
                    duration_minutes=duration_minutes,
                    subject_name=schedule.subject_name,
                    teacher_name=schedule.teacher_name
                )
                instances.append(instance)
            
            logger.info(f"Retrieved {len(instances)} instances for schedule {schedule_id}")
            return instances
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to get schedule instances for {schedule_id}: {error}")
            raise SchedulingError(
                message="Failed to retrieve schedule instances",
                error_code="INSTANCES_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def handle_recurring_event_modification(
        self, 
        schedule_id: int, 
        instance_datetime: datetime,
        modifications: Dict[str, Any],
        sync_to_calendar: bool = True
    ) -> ScheduleInstanceResponse:
        """
        Handle modification of a single recurring event instance.
        
        Args:
            schedule_id: ID of the parent schedule
            instance_datetime: Datetime of the instance to modify
            modifications: Dictionary of modifications to apply
            sync_to_calendar: Whether to sync changes to Google Calendar
            
        Returns:
            ScheduleInstanceResponse: Modified instance
            
        Raises:
            SchedulingError: If modification fails
        """
        try:
            # Find the specific instance
            instance_result = self.client.table('schedule_instances').select('*').eq(
                'schedule_id', schedule_id
            ).eq('instance_datetime', instance_datetime.isoformat()).execute()
            
            if not instance_result.data:
                raise SchedulingError(
                    message="Schedule instance not found",
                    error_code="INSTANCE_NOT_FOUND"
                )
            
            instance_data = instance_result.data[0]
            instance_id = instance_data['id']
            
            # Merge existing modifications with new ones
            existing_modifications = instance_data.get('modifications') or {}
            updated_modifications = {**existing_modifications, **modifications}
            
            # Update the instance
            update_data = {
                'status': ScheduleStatus.MODIFIED.value,
                'modifications': updated_modifications,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.client.table('schedule_instances').update(update_data).eq('id', instance_id).execute()
            
            if not result.data:
                raise SchedulingError(
                    message="Failed to update schedule instance",
                    error_code="INSTANCE_UPDATE_FAILED"
                )
            
            # Sync to Google Calendar if requested
            if sync_to_calendar:
                try:
                    await self.sync_recurring_event_with_calendar(
                        schedule_id, 
                        UpdateScope.THIS_INSTANCE, 
                        instance_datetime
                    )
                except Exception as sync_error:
                    logger.warning(f"Failed to sync instance modification to calendar: {sync_error}")
                    # Don't fail the entire operation if calendar sync fails
            
            # Get the updated instance
            instances = await self.get_schedule_instances(schedule_id)
            updated_instance = next(
                (inst for inst in instances if inst.instance_datetime == instance_datetime),
                None
            )
            
            if not updated_instance:
                raise SchedulingError(
                    message="Failed to retrieve updated instance",
                    error_code="UPDATED_INSTANCE_NOT_FOUND"
                )
            
            logger.info(f"Successfully modified instance {instance_id} of schedule {schedule_id}")
            return updated_instance
            
        except SchedulingError:
            raise
        except Exception as error:
            logger.error(f"Failed to handle recurring event modification: {error}")
            raise SchedulingError(
                message="Failed to modify recurring event instance",
                error_code="RECURRING_MODIFICATION_FAILED",
                details={'error': str(error)}
            )

    
    async def _convert_db_row_to_schedule_response(
        self, 
        row: Dict[str, Any], 
        include_instances: bool = False
    ) -> ClassScheduleResponse:
        """Convert database row to ClassScheduleResponse."""
        try:
            # Parse recurrence pattern if it exists
            recurrence_pattern = None
            if row.get('recurrence_pattern'):
                recurrence_data = row['recurrence_pattern']
                if isinstance(recurrence_data, str):
                    recurrence_data = json.loads(recurrence_data)
                recurrence_pattern = RecurrencePattern.model_validate(recurrence_data)
            
            # Parse datetime
            start_datetime = datetime.fromisoformat(row['start_datetime'].replace('Z', '+00:00'))
            created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
            updated_at = datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00'))
            
            # Create base response
            schedule_response = ClassScheduleResponse(
                id=row['id'],
                teacher_id=row['teacher_id'],
                subject_id=row['subject_id'],
                title=row['title'],
                description=row.get('description'),
                start_datetime=start_datetime,
                duration_minutes=row['duration_minutes'],
                recurrence_pattern=recurrence_pattern,
                google_event_id=row.get('google_event_id'),
                google_recurring_event_id=row.get('google_recurring_event_id'),
                is_active=row['is_active'],
                created_at=created_at,
                updated_at=updated_at,
                subject_name=row.get('subject_name'),
                teacher_name=row.get('teacher_name'),
                enrolled_student_count=row.get('enrolled_student_count')
            )
            
            # Add instances if requested
            if include_instances:
                instances_result = self.client.table('schedule_instances').select('*').eq(
                    'schedule_id', row['id']
                ).order('instance_datetime').execute()
                
                instances = []
                for instance_row in instances_result.data:
                    instance_datetime = datetime.fromisoformat(instance_row['instance_datetime'].replace('Z', '+00:00'))
                    instance_created_at = datetime.fromisoformat(instance_row['created_at'].replace('Z', '+00:00'))
                    instance_updated_at = datetime.fromisoformat(instance_row['updated_at'].replace('Z', '+00:00'))
                    
                    instance = ScheduleInstanceResponse(
                        id=instance_row['id'],
                        schedule_id=instance_row['schedule_id'],
                        instance_datetime=instance_datetime,
                        google_event_id=instance_row.get('google_event_id'),
                        status=ScheduleStatus(instance_row['status']),
                        modifications=instance_row.get('modifications'),
                        created_at=instance_created_at,
                        updated_at=instance_updated_at,
                        title=schedule_response.title,
                        description=schedule_response.description,
                        duration_minutes=schedule_response.duration_minutes,
                        subject_name=schedule_response.subject_name,
                        teacher_name=schedule_response.teacher_name
                    )
                    instances.append(instance)
                
                # Note: We can't modify the Pydantic model after creation,
                # so we'll need to handle instances separately in the calling code
            
            return schedule_response
            
        except Exception as error:
            logger.error(f"Failed to convert database row to schedule response: {error}")
            raise SchedulingError(
                message="Failed to process schedule data",
                error_code="DATA_CONVERSION_FAILED",
                details={'error': str(error)}
            )


# Create a global instance for use in routers
scheduling_service = SchedulingService()