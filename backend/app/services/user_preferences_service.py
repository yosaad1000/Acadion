"""
User preferences service for managing customization and advanced scheduling features.
Handles default duration preferences, buffer time settings, timezone handling,
CSV import functionality, and conflict detection.
"""

import logging
import csv
import io
from datetime import datetime, timedelta, time, date
from typing import Optional, List, Dict, Any, Tuple
import pytz

# Use pytz instead of zoneinfo for Python 3.8 compatibility
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    def ZoneInfo(key):
        return pytz.timezone(key)

from ..models.user_preferences import (
    UserPreferences, UserPreferencesCreate, UserPreferencesUpdate, UserPreferencesResponse,
    SchedulingPreferences, CalendarCustomization, TimezoneEnum, DayOfWeek,
    CSVScheduleRow, CSVImportRequest, CSVImportResult,
    TimezoneConversion, ConvertedDateTime,
    ConflictCheck, ScheduleConflict, ConflictCheckResult,
    BulkScheduleOperation, BulkOperationResult
)
from ..models.calendar import (
    ClassScheduleCreate, RecurrencePattern, RecurrenceType
)
from .supabase_client import get_supabase_client
from .scheduling_service import SchedulingService, SchedulingError
from supabase import Client

logger = logging.getLogger(__name__)


class UserPreferencesError(Exception):
    """Custom exception for user preferences-related errors."""
    
    def __init__(self, message: str, error_code: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class UserPreferencesService:
    """
    Service for managing user preferences and advanced scheduling features.
    """
    
    def __init__(self):
        self.client: Client = get_supabase_client()
        self.scheduling_service = SchedulingService()
    
    async def get_user_preferences(self, user_id: str) -> UserPreferencesResponse:
        """
        Get user preferences, creating defaults if none exist.
        
        Args:
            user_id: ID of the user
            
        Returns:
            UserPreferencesResponse: User preferences
            
        Raises:
            UserPreferencesError: If retrieval fails
        """
        try:
            result = self.client.table('user_preferences').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                # User has existing preferences
                prefs_data = result.data[0]
                return self._convert_db_to_response(prefs_data)
            else:
                # Create default preferences
                return await self.create_user_preferences(user_id, UserPreferencesCreate())
                
        except Exception as error:
            logger.error(f"Failed to get user preferences for {user_id}: {error}")
            raise UserPreferencesError(
                message="Failed to retrieve user preferences",
                error_code="PREFERENCES_GET_FAILED",
                details={'error': str(error)}
            )
    
    async def create_user_preferences(
        self, 
        user_id: str, 
        preferences: UserPreferencesCreate
    ) -> UserPreferencesResponse:
        """
        Create user preferences with defaults.
        
        Args:
            user_id: ID of the user
            preferences: Preference creation data
            
        Returns:
            UserPreferencesResponse: Created preferences
            
        Raises:
            UserPreferencesError: If creation fails
        """
        try:
            # Prepare preferences data with defaults
            scheduling_prefs = preferences.scheduling or SchedulingPreferences()
            calendar_prefs = preferences.calendar or CalendarCustomization()
            
            prefs_data = {
                'user_id': user_id,
                'scheduling_preferences': scheduling_prefs.model_dump(),
                'calendar_preferences': calendar_prefs.model_dump(),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = self.client.table('user_preferences').insert(prefs_data).execute()
            
            if not result.data:
                raise UserPreferencesError(
                    message="Failed to create user preferences",
                    error_code="PREFERENCES_CREATE_FAILED"
                )
            
            created_prefs = result.data[0]
            logger.info(f"User preferences created for user {user_id}")
            
            return self._convert_db_to_response(created_prefs)
            
        except UserPreferencesError:
            raise
        except Exception as error:
            logger.error(f"Failed to create user preferences for {user_id}: {error}")
            raise UserPreferencesError(
                message="Failed to create user preferences",
                error_code="PREFERENCES_CREATE_FAILED",
                details={'error': str(error)}
            )
    
    async def update_user_preferences(
        self, 
        user_id: str, 
        updates: UserPreferencesUpdate
    ) -> UserPreferencesResponse:
        """
        Update user preferences.
        
        Args:
            user_id: ID of the user
            updates: Preference updates
            
        Returns:
            UserPreferencesResponse: Updated preferences
            
        Raises:
            UserPreferencesError: If update fails
        """
        try:
            # Get existing preferences
            existing_prefs = await self.get_user_preferences(user_id)
            
            # Prepare update data
            update_data = {'updated_at': datetime.utcnow().isoformat()}
            
            if updates.scheduling:
                update_data['scheduling_preferences'] = updates.scheduling.model_dump()
            
            if updates.calendar:
                update_data['calendar_preferences'] = updates.calendar.model_dump()
            
            result = self.client.table('user_preferences').update(update_data).eq('user_id', user_id).execute()
            
            if not result.data:
                raise UserPreferencesError(
                    message="Failed to update user preferences",
                    error_code="PREFERENCES_UPDATE_FAILED"
                )
            
            updated_prefs = result.data[0]
            logger.info(f"User preferences updated for user {user_id}")
            
            return self._convert_db_to_response(updated_prefs)
            
        except UserPreferencesError:
            raise
        except Exception as error:
            logger.error(f"Failed to update user preferences for {user_id}: {error}")
            raise UserPreferencesError(
                message="Failed to update user preferences",
                error_code="PREFERENCES_UPDATE_FAILED",
                details={'error': str(error)}
            )
    
    async def convert_timezone(self, conversion: TimezoneConversion) -> ConvertedDateTime:
        """
        Convert datetime between timezones.
        
        Args:
            conversion: Timezone conversion request
            
        Returns:
            ConvertedDateTime: Converted datetime information
            
        Raises:
            UserPreferencesError: If conversion fails
        """
        try:
            # Parse the datetime string
            dt = datetime.fromisoformat(conversion.datetime_str.replace('Z', '+00:00'))
            
            # Create timezone objects
            from_tz = ZoneInfo(conversion.from_timezone)
            to_tz = ZoneInfo(conversion.to_timezone)
            
            # If datetime is naive, assume it's in the from_timezone
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=from_tz)
            
            # Convert to target timezone
            converted_dt = dt.astimezone(to_tz)
            
            # Calculate UTC offset
            utc_offset_hours = converted_dt.utcoffset().total_seconds() / 3600
            
            return ConvertedDateTime(
                original_datetime=dt.isoformat(),
                converted_datetime=converted_dt.isoformat(),
                from_timezone=conversion.from_timezone,
                to_timezone=conversion.to_timezone,
                utc_offset_hours=utc_offset_hours
            )
            
        except Exception as error:
            logger.error(f"Failed to convert timezone: {error}")
            raise UserPreferencesError(
                message="Failed to convert timezone",
                error_code="TIMEZONE_CONVERSION_FAILED",
                details={'error': str(error)}
            )
    
    async def check_schedule_conflicts(self, conflict_check: ConflictCheck) -> ConflictCheckResult:
        """
        Check for scheduling conflicts with existing schedules.
        
        Args:
            conflict_check: Conflict check parameters
            
        Returns:
            ConflictCheckResult: Conflict detection results
            
        Raises:
            UserPreferencesError: If conflict check fails
        """
        try:
            # Get user preferences for buffer time
            user_prefs = await self.get_user_preferences(conflict_check.user_id)
            buffer_minutes = user_prefs.scheduling.buffer_time_minutes if conflict_check.include_buffer_time else 0
            
            # Parse the proposed datetime
            proposed_start = datetime.fromisoformat(conflict_check.start_datetime.replace('Z', '+00:00'))
            proposed_end = proposed_start + timedelta(minutes=conflict_check.duration_minutes)
            
            # Calculate buffer periods
            buffer_start = proposed_start - timedelta(minutes=buffer_minutes)
            buffer_end = proposed_end + timedelta(minutes=buffer_minutes)
            
            # Get existing schedules for the user
            existing_schedules = await self.scheduling_service.get_teacher_schedules(conflict_check.user_id)
            
            conflicts = []
            
            for schedule in existing_schedules:
                # Skip the schedule being updated
                if conflict_check.exclude_schedule_id and schedule.id == conflict_check.exclude_schedule_id:
                    continue
                
                # Check for conflicts
                existing_start = schedule.start_datetime
                existing_end = existing_start + timedelta(minutes=schedule.duration_minutes)
                
                # Direct overlap check
                if (proposed_start < existing_end and proposed_end > existing_start):
                    overlap_start = max(proposed_start, existing_start)
                    overlap_end = min(proposed_end, existing_end)
                    overlap_minutes = int((overlap_end - overlap_start).total_seconds() / 60)
                    
                    conflicts.append(ScheduleConflict(
                        conflicting_schedule_id=schedule.id,
                        conflicting_title=schedule.title,
                        conflicting_start=existing_start.isoformat(),
                        conflicting_end=existing_end.isoformat(),
                        overlap_minutes=overlap_minutes,
                        conflict_type="direct_overlap"
                    ))
                
                # Buffer time conflict check
                elif conflict_check.include_buffer_time and buffer_minutes > 0:
                    if (buffer_start < existing_end and buffer_end > existing_start):
                        conflicts.append(ScheduleConflict(
                            conflicting_schedule_id=schedule.id,
                            conflicting_title=schedule.title,
                            conflicting_start=existing_start.isoformat(),
                            conflicting_end=existing_end.isoformat(),
                            overlap_minutes=0,
                            conflict_type="buffer_conflict"
                        ))
            
            # Generate suggested alternative times if conflicts exist
            suggested_times = []
            if conflicts:
                suggested_times = await self._generate_alternative_times(
                    conflict_check.user_id,
                    proposed_start,
                    conflict_check.duration_minutes,
                    user_prefs
                )
            
            return ConflictCheckResult(
                has_conflicts=len(conflicts) > 0,
                conflicts=conflicts,
                suggested_times=suggested_times
            )
            
        except Exception as error:
            logger.error(f"Failed to check schedule conflicts: {error}")
            raise UserPreferencesError(
                message="Failed to check schedule conflicts",
                error_code="CONFLICT_CHECK_FAILED",
                details={'error': str(error)}
            )
    
    async def import_schedules_from_csv(
        self, 
        user_id: str, 
        import_request: CSVImportRequest
    ) -> CSVImportResult:
        """
        Import schedules from CSV data.
        
        Args:
            user_id: ID of the user importing schedules
            import_request: CSV import request data
            
        Returns:
            CSVImportResult: Import results
            
        Raises:
            UserPreferencesError: If import fails
        """
        try:
            # Parse CSV data
            csv_reader = csv.DictReader(io.StringIO(import_request.csv_data))
            
            if import_request.skip_header:
                # Skip header row if requested (already handled by DictReader)
                pass
            
            rows = list(csv_reader)
            total_rows = len(rows)
            
            created_schedules = []
            errors = []
            warnings = []
            
            # Get user timezone for conversion
            user_prefs = await self.get_user_preferences(user_id)
            user_timezone = user_prefs.scheduling.timezone
            
            for row_index, row_data in enumerate(rows):
                try:
                    # Validate and parse CSV row
                    csv_row = CSVScheduleRow(**row_data)
                    
                    # Convert to ClassScheduleCreate
                    schedule_create = await self._convert_csv_row_to_schedule(
                        csv_row, 
                        import_request.timezone, 
                        user_timezone
                    )
                    
                    # Create the schedule
                    created_schedule = await self.scheduling_service.create_class_schedule(
                        teacher_id=user_id,
                        schedule_data=schedule_create
                    )
                    
                    created_schedules.append(created_schedule.id)
                    
                    # Sync to calendar if requested
                    if import_request.auto_sync:
                        try:
                            await self.scheduling_service.sync_with_calendar(created_schedule.id)
                        except Exception as sync_error:
                            warnings.append({
                                'row': row_index + 1,
                                'message': f"Schedule created but sync failed: {sync_error}",
                                'schedule_id': created_schedule.id
                            })
                    
                except Exception as row_error:
                    errors.append({
                        'row': row_index + 1,
                        'data': row_data,
                        'error': str(row_error)
                    })
            
            result = CSVImportResult(
                total_rows=total_rows,
                successful_imports=len(created_schedules),
                failed_imports=len(errors),
                created_schedules=created_schedules,
                errors=errors,
                warnings=warnings
            )
            
            logger.info(f"CSV import completed for user {user_id}: {len(created_schedules)} created, {len(errors)} failed")
            return result
            
        except Exception as error:
            logger.error(f"Failed to import CSV schedules for user {user_id}: {error}")
            raise UserPreferencesError(
                message="Failed to import schedules from CSV",
                error_code="CSV_IMPORT_FAILED",
                details={'error': str(error)}
            )
    
    async def perform_bulk_operation(
        self, 
        user_id: str, 
        operation: BulkScheduleOperation
    ) -> BulkOperationResult:
        """
        Perform bulk operations on schedules.
        
        Args:
            user_id: ID of the user performing the operation
            operation: Bulk operation details
            
        Returns:
            BulkOperationResult: Operation results
            
        Raises:
            UserPreferencesError: If bulk operation fails
        """
        try:
            results = []
            errors = []
            
            for schedule_id in operation.schedule_ids:
                try:
                    # Verify user owns the schedule
                    schedule = await self.scheduling_service.get_schedule_by_id(schedule_id)
                    if schedule.teacher_id != user_id:
                        errors.append({
                            'schedule_id': schedule_id,
                            'error': 'Access denied - not your schedule'
                        })
                        continue
                    
                    # Perform the requested operation
                    if operation.operation == "sync":
                        success = await self.scheduling_service.sync_with_calendar(schedule_id)
                        results.append({
                            'schedule_id': schedule_id,
                            'operation': 'sync',
                            'success': success
                        })
                    
                    elif operation.operation == "delete":
                        success = await self.scheduling_service.delete_class_schedule(schedule_id)
                        results.append({
                            'schedule_id': schedule_id,
                            'operation': 'delete',
                            'success': success
                        })
                    
                    elif operation.operation == "update":
                        if not operation.parameters:
                            raise ValueError("Update operation requires parameters")
                        
                        # This would need to be implemented based on specific update requirements
                        # For now, we'll just mark it as not implemented
                        errors.append({
                            'schedule_id': schedule_id,
                            'error': 'Bulk update not yet implemented'
                        })
                    
                    else:
                        errors.append({
                            'schedule_id': schedule_id,
                            'error': f'Unknown operation: {operation.operation}'
                        })
                
                except Exception as op_error:
                    errors.append({
                        'schedule_id': schedule_id,
                        'error': str(op_error)
                    })
            
            return BulkOperationResult(
                total_schedules=len(operation.schedule_ids),
                successful_operations=len(results),
                failed_operations=len(errors),
                results=results,
                errors=errors
            )
            
        except Exception as error:
            logger.error(f"Failed to perform bulk operation for user {user_id}: {error}")
            raise UserPreferencesError(
                message="Failed to perform bulk operation",
                error_code="BULK_OPERATION_FAILED",
                details={'error': str(error)}
            )
    
    def _convert_db_to_response(self, db_data: Dict[str, Any]) -> UserPreferencesResponse:
        """Convert database row to response model."""
        scheduling_prefs = SchedulingPreferences(**db_data['scheduling_preferences'])
        calendar_prefs = CalendarCustomization(**db_data['calendar_preferences'])
        
        return UserPreferencesResponse(
            user_id=db_data['user_id'],
            scheduling=scheduling_prefs,
            calendar=calendar_prefs,
            created_at=db_data['created_at'],
            updated_at=db_data['updated_at']
        )
    
    async def _convert_csv_row_to_schedule(
        self, 
        csv_row: CSVScheduleRow, 
        import_timezone: TimezoneEnum, 
        user_timezone: TimezoneEnum
    ) -> ClassScheduleCreate:
        """Convert CSV row to ClassScheduleCreate model."""
        # Parse date and time
        start_date = datetime.strptime(csv_row.start_date, '%Y-%m-%d').date()
        start_time = datetime.strptime(csv_row.start_time, '%H:%M').time()
        
        # Combine date and time
        naive_datetime = datetime.combine(start_date, start_time)
        
        # Apply timezone
        import_tz = ZoneInfo(import_timezone.value)
        aware_datetime = naive_datetime.replace(tzinfo=import_tz)
        
        # Convert to user timezone if different
        if import_timezone != user_timezone:
            user_tz = ZoneInfo(user_timezone.value)
            aware_datetime = aware_datetime.astimezone(user_tz)
        
        # Create recurrence pattern if specified
        recurrence_pattern = None
        if csv_row.recurrence_type:
            days_of_week = None
            if csv_row.days_of_week:
                days_of_week = [int(day.strip()) for day in csv_row.days_of_week.split(',')]
            
            end_date = None
            if csv_row.end_date:
                end_date = datetime.strptime(csv_row.end_date, '%Y-%m-%d').date()
            
            recurrence_pattern = RecurrencePattern(
                type=RecurrenceType(csv_row.recurrence_type),
                interval=csv_row.recurrence_interval or 1,
                days_of_week=days_of_week,
                end_date=end_date,
                occurrence_count=csv_row.occurrence_count
            )
        
        return ClassScheduleCreate(
            subject_id=csv_row.subject_id,
            title=csv_row.title,
            description=csv_row.description,
            start_datetime=aware_datetime,
            duration_minutes=csv_row.duration_minutes,
            recurrence_pattern=recurrence_pattern
        )
    
    async def _generate_alternative_times(
        self, 
        user_id: str, 
        proposed_start: datetime, 
        duration_minutes: int,
        user_prefs: UserPreferencesResponse
    ) -> List[str]:
        """Generate alternative time suggestions when conflicts exist."""
        suggestions = []
        
        # Get user's preferred time range
        preferred_start = user_prefs.scheduling.preferred_start_time or time(9, 0)
        preferred_end = user_prefs.scheduling.preferred_end_time or time(17, 0)
        buffer_minutes = user_prefs.scheduling.buffer_time_minutes
        
        # Try different time slots on the same day
        base_date = proposed_start.date()
        
        # Generate hourly slots within preferred time range
        current_time = datetime.combine(base_date, preferred_start)
        end_time = datetime.combine(base_date, preferred_end)
        
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            # Check if this time slot is free
            conflict_check = ConflictCheck(
                user_id=user_id,
                start_datetime=current_time.isoformat(),
                duration_minutes=duration_minutes,
                include_buffer_time=True
            )
            
            try:
                result = await self.check_schedule_conflicts(conflict_check)
                if not result.has_conflicts:
                    suggestions.append(current_time.isoformat())
                    if len(suggestions) >= 3:  # Limit to 3 suggestions
                        break
            except:
                pass  # Skip this time slot if check fails
            
            current_time += timedelta(hours=1)
        
        return suggestions