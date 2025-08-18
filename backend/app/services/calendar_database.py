"""
Calendar Database Service
Handles database operations for calendar integration using Supabase
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date
from app.services.supabase_client import get_supabase_client
from app.models.calendar import (
    CalendarConnectionCreate, CalendarConnectionResponse,
    ClassScheduleCreate, ClassScheduleUpdate, ClassScheduleResponse,
    ScheduleInstanceCreate, ScheduleInstanceUpdate, ScheduleInstanceResponse,
    StudentScheduleAccessCreate, StudentScheduleAccessUpdate, StudentScheduleAccessResponse,
    RecurrencePattern, ScheduleStatus, UserType, CalendarProvider
)

logger = logging.getLogger(__name__)

class CalendarDatabaseService:
    """Database service for calendar integration operations"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    # Calendar Connection Operations
    async def create_calendar_connection(
        self, 
        user_id: str, 
        user_type: UserType,
        access_token_encrypted: str,
        refresh_token_encrypted: str,
        token_expires_at: datetime,
        calendar_id: Optional[str] = None,
        provider: CalendarProvider = CalendarProvider.GOOGLE
    ) -> Optional[CalendarConnectionResponse]:
        """Create a new calendar connection"""
        try:
            connection_data = {
                'user_id': user_id,
                'user_type': user_type.value,
                'provider': provider.value,
                'access_token_encrypted': access_token_encrypted,
                'refresh_token_encrypted': refresh_token_encrypted,
                'token_expires_at': token_expires_at.isoformat(),
                'calendar_id': calendar_id,
                'is_active': True
            }
            
            result = self.supabase.table('calendar_connections').upsert(
                connection_data,
                on_conflict='user_id,user_type,provider'
            ).execute()
            
            if result.data:
                return CalendarConnectionResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error creating calendar connection: {e}")
            return None
    
    async def get_calendar_connection(
        self, 
        user_id: str, 
        user_type: UserType,
        provider: CalendarProvider = CalendarProvider.GOOGLE
    ) -> Optional[CalendarConnectionResponse]:
        """Get calendar connection for a user"""
        try:
            result = self.supabase.table('calendar_connections').select("*").eq(
                'user_id', user_id
            ).eq('user_type', user_type.value).eq('provider', provider.value).eq(
                'is_active', True
            ).execute()
            
            if result.data:
                return CalendarConnectionResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting calendar connection: {e}")
            return None
    
    async def update_calendar_connection_tokens(
        self,
        connection_id: int,
        access_token_encrypted: str,
        refresh_token_encrypted: str,
        token_expires_at: datetime
    ) -> bool:
        """Update calendar connection tokens"""
        try:
            result = self.supabase.table('calendar_connections').update({
                'access_token_encrypted': access_token_encrypted,
                'refresh_token_encrypted': refresh_token_encrypted,
                'token_expires_at': token_expires_at.isoformat()
            }).eq('id', connection_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error updating calendar connection tokens: {e}")
            return False
    
    async def deactivate_calendar_connection(
        self, 
        user_id: str, 
        user_type: UserType,
        provider: CalendarProvider = CalendarProvider.GOOGLE
    ) -> bool:
        """Deactivate a calendar connection"""
        try:
            result = self.supabase.table('calendar_connections').update({
                'is_active': False
            }).eq('user_id', user_id).eq('user_type', user_type.value).eq(
                'provider', provider.value
            ).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error deactivating calendar connection: {e}")
            return False
    
    # Class Schedule Operations
    async def create_class_schedule(
        self, 
        teacher_id: str,
        schedule_data: ClassScheduleCreate,
        google_event_id: Optional[str] = None,
        google_recurring_event_id: Optional[str] = None
    ) -> Optional[ClassScheduleResponse]:
        """Create a new class schedule"""
        try:
            schedule_dict = {
                'teacher_id': teacher_id,
                'subject_id': schedule_data.subject_id,
                'title': schedule_data.title,
                'description': schedule_data.description,
                'start_datetime': schedule_data.start_datetime.isoformat(),
                'duration_minutes': schedule_data.duration_minutes,
                'recurrence_pattern': schedule_data.recurrence_pattern.dict() if schedule_data.recurrence_pattern else None,
                'google_event_id': google_event_id,
                'google_recurring_event_id': google_recurring_event_id,
                'is_active': True
            }
            
            result = self.supabase.table('class_schedules').insert(schedule_dict).execute()
            
            if result.data:
                return ClassScheduleResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error creating class schedule: {e}")
            return None
    
    async def get_class_schedule(self, schedule_id: int) -> Optional[ClassScheduleResponse]:
        """Get a class schedule by ID"""
        try:
            result = self.supabase.table('class_schedules').select("*").eq('id', schedule_id).execute()
            
            if result.data:
                schedule_data = result.data[0]
                if schedule_data.get('recurrence_pattern'):
                    schedule_data['recurrence_pattern'] = RecurrencePattern(**schedule_data['recurrence_pattern'])
                return ClassScheduleResponse(**schedule_data)
            return None
            
        except Exception as e:
            logger.error(f"Error getting class schedule: {e}")
            return None
    
    async def get_teacher_schedules(
        self, 
        teacher_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        subject_id: Optional[str] = None,
        is_active: Optional[bool] = True
    ) -> List[ClassScheduleResponse]:
        """Get all schedules for a teacher"""
        try:
            query = self.supabase.table('class_schedules').select("*").eq('teacher_id', teacher_id)
            
            if is_active is not None:
                query = query.eq('is_active', is_active)
            if subject_id:
                query = query.eq('subject_id', subject_id)
            if start_date:
                query = query.gte('start_datetime', start_date.isoformat())
            if end_date:
                query = query.lte('start_datetime', end_date.isoformat())
            
            result = query.execute()
            
            schedules = []
            for schedule_data in result.data:
                if schedule_data.get('recurrence_pattern'):
                    schedule_data['recurrence_pattern'] = RecurrencePattern(**schedule_data['recurrence_pattern'])
                schedules.append(ClassScheduleResponse(**schedule_data))
            
            return schedules
            
        except Exception as e:
            logger.error(f"Error getting teacher schedules: {e}")
            return []
    
    async def update_class_schedule(
        self, 
        schedule_id: int, 
        updates: ClassScheduleUpdate
    ) -> Optional[ClassScheduleResponse]:
        """Update a class schedule"""
        try:
            update_dict = {}
            for field, value in updates.dict(exclude_unset=True).items():
                if field == 'recurrence_pattern' and value:
                    update_dict[field] = value.dict()
                elif field == 'start_datetime' and value:
                    update_dict[field] = value.isoformat()
                else:
                    update_dict[field] = value
            
            result = self.supabase.table('class_schedules').update(update_dict).eq('id', schedule_id).execute()
            
            if result.data:
                schedule_data = result.data[0]
                if schedule_data.get('recurrence_pattern'):
                    schedule_data['recurrence_pattern'] = RecurrencePattern(**schedule_data['recurrence_pattern'])
                return ClassScheduleResponse(**schedule_data)
            return None
            
        except Exception as e:
            logger.error(f"Error updating class schedule: {e}")
            return None
    
    async def delete_class_schedule(self, schedule_id: int) -> bool:
        """Delete a class schedule (soft delete by setting is_active to False)"""
        try:
            result = self.supabase.table('class_schedules').update({
                'is_active': False
            }).eq('id', schedule_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error deleting class schedule: {e}")
            return False
    
    # Schedule Instance Operations
    async def create_schedule_instance(
        self, 
        instance_data: ScheduleInstanceCreate
    ) -> Optional[ScheduleInstanceResponse]:
        """Create a schedule instance"""
        try:
            instance_dict = {
                'schedule_id': instance_data.schedule_id,
                'instance_datetime': instance_data.instance_datetime.isoformat(),
                'google_event_id': instance_data.google_event_id,
                'status': ScheduleStatus.SCHEDULED.value,
                'modifications': instance_data.modifications
            }
            
            result = self.supabase.table('schedule_instances').insert(instance_dict).execute()
            
            if result.data:
                return ScheduleInstanceResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error creating schedule instance: {e}")
            return None
    
    async def get_schedule_instances(
        self, 
        schedule_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[ScheduleStatus] = None
    ) -> List[ScheduleInstanceResponse]:
        """Get schedule instances for a schedule"""
        try:
            query = self.supabase.table('schedule_instances').select("*").eq('schedule_id', schedule_id)
            
            if start_date:
                query = query.gte('instance_datetime', start_date.isoformat())
            if end_date:
                query = query.lte('instance_datetime', end_date.isoformat())
            if status:
                query = query.eq('status', status.value)
            
            result = query.execute()
            
            return [ScheduleInstanceResponse(**instance) for instance in result.data]
            
        except Exception as e:
            logger.error(f"Error getting schedule instances: {e}")
            return []
    
    async def update_schedule_instance(
        self, 
        instance_id: int, 
        updates: ScheduleInstanceUpdate
    ) -> Optional[ScheduleInstanceResponse]:
        """Update a schedule instance"""
        try:
            update_dict = {}
            for field, value in updates.dict(exclude_unset=True).items():
                if field == 'instance_datetime' and value:
                    update_dict[field] = value.isoformat()
                elif field == 'status' and value:
                    update_dict[field] = value.value
                else:
                    update_dict[field] = value
            
            result = self.supabase.table('schedule_instances').update(update_dict).eq('id', instance_id).execute()
            
            if result.data:
                return ScheduleInstanceResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating schedule instance: {e}")
            return None
    
    # Student Schedule Access Operations
    async def create_student_schedule_access(
        self, 
        access_data: StudentScheduleAccessCreate
    ) -> Optional[StudentScheduleAccessResponse]:
        """Create student schedule access"""
        try:
            access_dict = {
                'student_id': access_data.student_id,
                'schedule_id': access_data.schedule_id,
                'sync_to_personal_calendar': access_data.sync_to_personal_calendar
            }
            
            result = self.supabase.table('student_schedule_access').insert(access_dict).execute()
            
            if result.data:
                return StudentScheduleAccessResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error creating student schedule access: {e}")
            return None
    
    async def get_student_schedules(
        self, 
        student_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        subject_id: Optional[str] = None,
        sync_enabled_only: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Get schedules accessible to a student with additional info"""
        try:
            query = self.supabase.table('student_calendar_view').select("*").eq('student_id', student_id)
            
            if start_date:
                query = query.gte('start_datetime', start_date.isoformat())
            if end_date:
                query = query.lte('start_datetime', end_date.isoformat())
            if subject_id:
                query = query.eq('subject_id', subject_id)
            if sync_enabled_only is not None:
                query = query.eq('sync_to_personal_calendar', sync_enabled_only)
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Error getting student schedules: {e}")
            return []
    
    async def update_student_schedule_access(
        self, 
        student_id: str, 
        schedule_id: int, 
        updates: StudentScheduleAccessUpdate
    ) -> Optional[StudentScheduleAccessResponse]:
        """Update student schedule access"""
        try:
            update_dict = updates.dict(exclude_unset=True)
            
            result = self.supabase.table('student_schedule_access').update(update_dict).eq(
                'student_id', student_id
            ).eq('schedule_id', schedule_id).execute()
            
            if result.data:
                return StudentScheduleAccessResponse(**result.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating student schedule access: {e}")
            return None
    
    async def remove_student_schedule_access(self, student_id: str, schedule_id: int) -> bool:
        """Remove student access to a schedule"""
        try:
            result = self.supabase.table('student_schedule_access').delete().eq(
                'student_id', student_id
            ).eq('schedule_id', schedule_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Error removing student schedule access: {e}")
            return False
    
    # Utility Methods
    async def get_schedules_needing_sync(self, user_id: str, user_type: UserType) -> List[ClassScheduleResponse]:
        """Get schedules that need to be synced to calendar"""
        try:
            if user_type == UserType.FACULTY:
                # Get teacher's schedules that don't have google_event_id
                query = self.supabase.table('class_schedules').select("*").eq('teacher_id', user_id).eq(
                    'is_active', True
                ).is_('google_event_id', 'null')
            else:
                # Get student's schedules with sync enabled that don't have google_event_id
                query = self.supabase.table('student_calendar_view').select("*").eq(
                    'student_id', user_id
                ).eq('sync_to_personal_calendar', True)
            
            result = query.execute()
            
            schedules = []
            for schedule_data in result.data:
                if schedule_data.get('recurrence_pattern'):
                    schedule_data['recurrence_pattern'] = RecurrencePattern(**schedule_data['recurrence_pattern'])
                schedules.append(ClassScheduleResponse(**schedule_data))
            
            return schedules
            
        except Exception as e:
            logger.error(f"Error getting schedules needing sync: {e}")
            return []
    
    async def bulk_update_google_event_ids(self, updates: List[Tuple[int, str]]) -> bool:
        """Bulk update Google event IDs for schedules"""
        try:
            for schedule_id, google_event_id in updates:
                self.supabase.table('class_schedules').update({
                    'google_event_id': google_event_id
                }).eq('id', schedule_id).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error bulk updating Google event IDs: {e}")
            return False