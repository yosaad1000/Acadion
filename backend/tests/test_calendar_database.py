"""
Integration tests for calendar database service
Note: These tests require a working Supabase connection
"""

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import Mock, patch
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock the Supabase client to avoid import errors in testing environment
with patch('app.services.supabase_client.create_client'):
    from app.services.calendar_database import CalendarDatabaseService
from app.models.calendar import (
    ClassScheduleCreate, RecurrencePattern, RecurrenceType,
    UserType, CalendarProvider, ScheduleInstanceCreate,
    StudentScheduleAccessCreate
)

class TestCalendarDatabaseService:
    """Test calendar database service operations"""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client for testing"""
        mock_client = Mock()
        mock_table = Mock()
        mock_client.table.return_value = mock_table
        return mock_client, mock_table
    
    @pytest.fixture
    def calendar_db_service(self, mock_supabase_client):
        """Calendar database service with mocked client"""
        mock_client, mock_table = mock_supabase_client
        
        with patch('app.services.calendar_database.get_supabase_client', return_value=mock_client):
            service = CalendarDatabaseService()
            return service, mock_table
    
    @pytest.mark.asyncio
    async def test_create_calendar_connection(self, calendar_db_service):
        """Test creating a calendar connection"""
        service, mock_table = calendar_db_service
        
        # Mock successful response
        mock_table.upsert.return_value.execute.return_value.data = [{
            'id': 1,
            'user_id': 'FAC001',
            'user_type': 'faculty',
            'provider': 'google',
            'calendar_id': 'primary',
            'is_active': True,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }]
        
        result = await service.create_calendar_connection(
            user_id='FAC001',
            user_type=UserType.FACULTY,
            access_token_encrypted='encrypted_token',
            refresh_token_encrypted='encrypted_refresh',
            token_expires_at=datetime.now() + timedelta(hours=1),
            calendar_id='primary'
        )
        
        assert result is not None
        assert result.user_id == 'FAC001'
        assert result.user_type == UserType.FACULTY
        mock_table.upsert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_class_schedule(self, calendar_db_service):
        """Test creating a class schedule"""
        service, mock_table = calendar_db_service
        
        # Mock successful response
        schedule_data = {
            'id': 1,
            'teacher_id': 'FAC001',
            'subject_id': 'CS101',
            'title': 'Introduction to Programming',
            'description': 'Basic programming concepts',
            'start_datetime': (datetime.now() + timedelta(days=1)).isoformat(),
            'duration_minutes': 90,
            'recurrence_pattern': {
                'type': 'weekly',
                'interval': 1,
                'days_of_week': [0, 2, 4],
                'end_date': (date.today() + timedelta(days=90)).isoformat()
            },
            'google_event_id': 'event_123',
            'google_recurring_event_id': None,
            'is_active': True,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        mock_table.insert.return_value.execute.return_value.data = [schedule_data]
        
        schedule_create = ClassScheduleCreate(
            subject_id='CS101',
            title='Introduction to Programming',
            description='Basic programming concepts',
            start_datetime=datetime.now() + timedelta(days=1),
            duration_minutes=90,
            recurrence_pattern=RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                interval=1,
                days_of_week=[0, 2, 4],
                end_date=date.today() + timedelta(days=90)
            )
        )
        
        result = await service.create_class_schedule(
            teacher_id='FAC001',
            schedule_data=schedule_create,
            google_event_id='event_123'
        )
        
        assert result is not None
        assert result.teacher_id == 'FAC001'
        assert result.subject_id == 'CS101'
        assert result.title == 'Introduction to Programming'
        mock_table.insert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_teacher_schedules(self, calendar_db_service):
        """Test getting teacher schedules"""
        service, mock_table = calendar_db_service
        
        # Mock query chain
        mock_query = Mock()
        mock_table.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value.data = [{
            'id': 1,
            'teacher_id': 'FAC001',
            'subject_id': 'CS101',
            'title': 'Test Class',
            'description': 'Test Description',
            'start_datetime': datetime.now().isoformat(),
            'duration_minutes': 60,
            'recurrence_pattern': None,
            'google_event_id': None,
            'google_recurring_event_id': None,
            'is_active': True,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }]
        
        result = await service.get_teacher_schedules('FAC001')
        
        assert len(result) == 1
        assert result[0].teacher_id == 'FAC001'
        mock_table.select.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_schedule_instance(self, calendar_db_service):
        """Test creating a schedule instance"""
        service, mock_table = calendar_db_service
        
        # Mock successful response
        mock_table.insert.return_value.execute.return_value.data = [{
            'id': 1,
            'schedule_id': 1,
            'instance_datetime': (datetime.now() + timedelta(days=1)).isoformat(),
            'google_event_id': 'instance_event_123',
            'status': 'scheduled',
            'modifications': None,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }]
        
        instance_create = ScheduleInstanceCreate(
            schedule_id=1,
            instance_datetime=datetime.now() + timedelta(days=1),
            google_event_id='instance_event_123'
        )
        
        result = await service.create_schedule_instance(instance_create)
        
        assert result is not None
        assert result.schedule_id == 1
        assert result.google_event_id == 'instance_event_123'
        mock_table.insert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_student_schedule_access(self, calendar_db_service):
        """Test creating student schedule access"""
        service, mock_table = calendar_db_service
        
        # Mock successful response
        mock_table.insert.return_value.execute.return_value.data = [{
            'id': 1,
            'student_id': 'STU001',
            'schedule_id': 1,
            'sync_to_personal_calendar': True,
            'access_granted_at': datetime.now().isoformat(),
            'created_at': datetime.now().isoformat()
        }]
        
        access_create = StudentScheduleAccessCreate(
            student_id='STU001',
            schedule_id=1,
            sync_to_personal_calendar=True
        )
        
        result = await service.create_student_schedule_access(access_create)
        
        assert result is not None
        assert result.student_id == 'STU001'
        assert result.schedule_id == 1
        assert result.sync_to_personal_calendar is True
        mock_table.insert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_error_handling(self, calendar_db_service):
        """Test error handling in database operations"""
        service, mock_table = calendar_db_service
        
        # Mock exception
        mock_table.insert.side_effect = Exception("Database error")
        
        schedule_create = ClassScheduleCreate(
            subject_id='CS101',
            title='Test Class',
            start_datetime=datetime.now() + timedelta(days=1),
            duration_minutes=60
        )
        
        result = await service.create_class_schedule(
            teacher_id='FAC001',
            schedule_data=schedule_create
        )
        
        assert result is None  # Should return None on error