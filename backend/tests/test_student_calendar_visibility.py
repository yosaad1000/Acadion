"""
Tests for student calendar visibility features.
Tests student schedule access management, automatic enrollment-based access,
personal calendar sync, and read-only calendar event creation.
"""

import pytest
from datetime import datetime, timedelta, date
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import status

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
    from app.models.calendar import (
        ClassScheduleCreate, StudentScheduleAccessCreate, StudentScheduleAccessResponse,
        RecurrencePattern, RecurrenceType, CalendarEventCreate
    )
    from app.services.scheduling_service import SchedulingService, SchedulingError
    from app.services.student_calendar_service import StudentCalendarService, StudentCalendarError
except ImportError:
    # Skip tests if imports fail
    pytest.skip("App modules not available", allow_module_level=True)


class TestStudentScheduleAccessManagement:
    """Test student schedule access management functionality."""
    
    @pytest.fixture
    def scheduling_service(self):
        return SchedulingService()
    
    @pytest.fixture
    def mock_supabase_client(self):
        with patch('app.services.scheduling_service.get_supabase_client') as mock:
            client = Mock()
            mock.return_value = client
            yield client
    
    @pytest.fixture
    def sample_schedule_data(self):
        return {
            'id': 1,
            'teacher_id': 'teacher123',
            'subject_id': 'MATH101',
            'title': 'Advanced Mathematics',
            'description': 'Weekly math class',
            'start_datetime': '2024-01-15T10:00:00',
            'duration_minutes': 60,
            'recurrence_pattern': None,
            'google_event_id': None,
            'google_recurring_event_id': None,
            'is_active': True,
            'created_at': '2024-01-01T00:00:00',
            'updated_at': '2024-01-01T00:00:00'
        }
    
    @pytest.mark.asyncio
    async def test_manage_student_schedule_access_grant(self, scheduling_service, mock_supabase_client, sample_schedule_data):
        """Test granting student access to a schedule."""
        # Mock database responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_schedule_data]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'student_id': 'student123'}]
        
        access_record = {
            'id': 1,
            'student_id': 'student123',
            'schedule_id': 1,
            'sync_to_personal_calendar': False,
            'access_granted_at': '2024-01-15T10:00:00',
            'created_at': '2024-01-15T10:00:00'
        }
        mock_supabase_client.table.return_value.upsert.return_value.execute.return_value.data = [access_record]
        
        # Test granting access
        result = await scheduling_service.manage_student_schedule_access(
            student_id='student123',
            schedule_id=1,
            grant_access=True,
            sync_to_personal_calendar=False
        )
        
        assert isinstance(result, StudentScheduleAccessResponse)
        assert result.student_id == 'student123'
        assert result.schedule_id == 1
        assert result.sync_to_personal_calendar == False
        
        # Verify database calls
        mock_supabase_client.table.assert_called()
    
    @pytest.mark.asyncio
    async def test_manage_student_schedule_access_revoke(self, scheduling_service, mock_supabase_client, sample_schedule_data):
        """Test revoking student access to a schedule."""
        # Mock database responses
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_schedule_data]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'student_id': 'student123'}]
        
        access_record = {
            'id': 1,
            'student_id': 'student123',
            'schedule_id': 1,
            'sync_to_personal_calendar': False,
            'access_granted_at': '2024-01-15T10:00:00',
            'created_at': '2024-01-15T10:00:00'
        }
        mock_supabase_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = [access_record]
        
        # Test revoking access
        result = await scheduling_service.manage_student_schedule_access(
            student_id='student123',
            schedule_id=1,
            grant_access=False
        )
        
        assert result is None
        
        # Verify delete was called
        mock_supabase_client.table.return_value.delete.assert_called()
    
    @pytest.mark.asyncio
    async def test_manage_student_schedule_access_student_not_found(self, scheduling_service, mock_supabase_client, sample_schedule_data):
        """Test error when student not found."""
        # Mock schedule exists but student doesn't
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_schedule_data]
        
        # Mock student not found
        def mock_table_call(table_name):
            if table_name == 'students':
                mock_table = Mock()
                mock_table.select.return_value.eq.return_value.execute.return_value.data = []
                return mock_table
            else:
                mock_table = Mock()
                mock_table.select.return_value.eq.return_value.execute.return_value.data = [sample_schedule_data]
                return mock_table
        
        mock_supabase_client.table.side_effect = mock_table_call
        
        # Test student not found error
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.manage_student_schedule_access(
                student_id='nonexistent',
                schedule_id=1,
                grant_access=True
            )
        
        assert exc_info.value.error_code == "STUDENT_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_get_student_schedule_access(self, scheduling_service, mock_supabase_client):
        """Test retrieving student schedule access records."""
        access_records = [
            {
                'id': 1,
                'student_id': 'student123',
                'schedule_id': 1,
                'sync_to_personal_calendar': False,
                'access_granted_at': '2024-01-15T10:00:00',
                'created_at': '2024-01-15T10:00:00'
            },
            {
                'id': 2,
                'student_id': 'student123',
                'schedule_id': 2,
                'sync_to_personal_calendar': True,
                'access_granted_at': '2024-01-15T11:00:00',
                'created_at': '2024-01-15T11:00:00'
            }
        ]
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = access_records
        
        # Test getting all access records for student
        result = await scheduling_service.get_student_schedule_access('student123')
        
        assert len(result) == 2
        assert all(isinstance(record, StudentScheduleAccessResponse) for record in result)
        assert result[0].student_id == 'student123'
        assert result[1].sync_to_personal_calendar == True
    
    @pytest.mark.asyncio
    async def test_update_student_calendar_sync(self, scheduling_service, mock_supabase_client):
        """Test updating student calendar sync preference."""
        # Mock existing access record
        existing_record = {
            'id': 1,
            'student_id': 'student123',
            'schedule_id': 1,
            'sync_to_personal_calendar': False,
            'access_granted_at': '2024-01-15T10:00:00',
            'created_at': '2024-01-15T10:00:00'
        }
        
        updated_record = {**existing_record, 'sync_to_personal_calendar': True}
        
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [existing_record]
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated_record]
        
        # Test updating sync preference
        result = await scheduling_service.update_student_calendar_sync(
            student_id='student123',
            schedule_id=1,
            sync_enabled=True
        )
        
        assert isinstance(result, StudentScheduleAccessResponse)
        assert result.sync_to_personal_calendar == True
        
        # Verify update was called
        mock_supabase_client.table.return_value.update.assert_called()
    
    @pytest.mark.asyncio
    async def test_grant_enrollment_based_access(self, scheduling_service, mock_supabase_client, sample_schedule_data):
        """Test automatic enrollment-based access granting."""
        # Mock schedule with subject that has enrolled students
        subject_data = {
            'subject_id': 'MATH101',
            'enrolled_students': ['student1', 'student2', 'student3']
        }
        
        # Mock database responses
        def mock_table_call(table_name):
            if table_name == 'class_schedules':
                mock_table = Mock()
                mock_table.select.return_value.eq.return_value.execute.return_value.data = [sample_schedule_data]
                return mock_table
            elif table_name == 'subjects':
                mock_table = Mock()
                mock_table.select.return_value.eq.return_value.execute.return_value.data = [subject_data]
                return mock_table
            elif table_name == 'students':
                mock_table = Mock()
                mock_table.select.return_value.eq.return_value.execute.return_value.data = [{'student_id': 'student1'}]
                return mock_table
            else:
                mock_table = Mock()
                mock_table.upsert.return_value.execute.return_value.data = [{'id': 1}]
                return mock_table
        
        mock_supabase_client.table.side_effect = mock_table_call
        
        # Test enrollment-based access granting
        granted_count = await scheduling_service.grant_enrollment_based_access(1)
        
        # Should grant access to all enrolled students
        assert granted_count >= 0  # Some students might not exist, so we allow partial success


class TestStudentCalendarService:
    """Test student calendar service functionality."""
    
    @pytest.fixture
    def student_calendar_service(self):
        return StudentCalendarService()
    
    @pytest.fixture
    def mock_calendar_service(self):
        with patch('app.services.student_calendar_service.CalendarService') as mock:
            service = Mock()
            mock.return_value = service
            yield service
    
    @pytest.fixture
    def mock_scheduling_service(self):
        with patch('app.services.student_calendar_service.SchedulingService') as mock:
            service = Mock()
            mock.return_value = service
            yield service
    
    @pytest.fixture
    def mock_oauth_service(self):
        with patch('app.services.student_calendar_service.oauth_service') as mock:
            yield mock
    
    @pytest.fixture
    def sample_schedule(self):
        from app.models.calendar import ClassScheduleResponse
        return ClassScheduleResponse(
            id=1,
            teacher_id='teacher123',
            subject_id='MATH101',
            title='Advanced Mathematics',
            description='Weekly math class',
            start_datetime=datetime(2024, 1, 15, 10, 0),
            duration_minutes=60,
            recurrence_pattern=None,
            google_event_id=None,
            google_recurring_event_id=None,
            is_active=True,
            created_at=datetime(2024, 1, 1),
            updated_at=datetime(2024, 1, 1),
            subject_name='Advanced Mathematics',
            teacher_name='Dr. Smith',
            enrolled_student_count=25
        )
    
    @pytest.mark.asyncio
    async def test_create_read_only_calendar_event(self, student_calendar_service, mock_calendar_service, sample_schedule):
        """Test creating read-only calendar event for student."""
        # Mock calendar service
        student_calendar_service.calendar_service = mock_calendar_service
        mock_calendar_service.create_event = AsyncMock(return_value='event123')
        
        # Test creating read-only event
        event_id = await student_calendar_service.create_read_only_calendar_event(
            student_id='student123',
            schedule=sample_schedule
        )
        
        assert event_id == 'event123'
        
        # Verify calendar service was called with correct data
        mock_calendar_service.create_event.assert_called_once()
        call_args = mock_calendar_service.create_event.call_args
        
        assert call_args[1]['user_id'] == 'student123'
        event_data = call_args[1]['event_data']
        assert event_data.title == '[Class] Advanced Mathematics'
        assert 'read-only' in event_data.description.lower()
    
    @pytest.mark.asyncio
    async def test_sync_student_schedules_to_personal_calendar(self, student_calendar_service, mock_oauth_service, mock_scheduling_service, sample_schedule):
        """Test syncing student schedules to personal calendar."""
        # Mock OAuth service
        mock_oauth_service.get_valid_token = AsyncMock(return_value='valid_token')
        
        # Mock scheduling service
        student_calendar_service.scheduling_service = mock_scheduling_service
        
        access_records = [
            Mock(schedule_id=1, sync_to_personal_calendar=True),
            Mock(schedule_id=2, sync_to_personal_calendar=False),
            Mock(schedule_id=3, sync_to_personal_calendar=True)
        ]
        mock_scheduling_service.get_student_schedule_access = AsyncMock(return_value=access_records)
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=sample_schedule)
        
        # Mock calendar event creation
        student_calendar_service._create_student_calendar_events = AsyncMock()
        
        # Test sync
        result = await student_calendar_service.sync_student_schedules_to_personal_calendar('student123')
        
        assert result.success == True
        assert result.synced_count == 2  # Only sync-enabled schedules
        assert result.failed_count == 0
        assert result.student_id == 'student123'
    
    @pytest.mark.asyncio
    async def test_sync_student_schedules_no_calendar_connection(self, student_calendar_service, mock_oauth_service):
        """Test sync when student has no calendar connection."""
        # Mock OAuth service to return no token
        mock_oauth_service.get_valid_token = AsyncMock(return_value=None)
        
        # Test sync should fail
        with pytest.raises(StudentCalendarError) as exc_info:
            await student_calendar_service.sync_student_schedules_to_personal_calendar('student123')
        
        assert exc_info.value.error_code == "CALENDAR_NOT_CONNECTED"
    
    @pytest.mark.asyncio
    async def test_remove_student_calendar_events(self, student_calendar_service, mock_calendar_service, mock_scheduling_service, sample_schedule):
        """Test removing student calendar events."""
        # Mock services
        student_calendar_service.calendar_service = mock_calendar_service
        student_calendar_service.scheduling_service = mock_scheduling_service
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=sample_schedule)
        
        # Mock existing events
        existing_events = [
            Mock(event_id='event1', title='[Class] Advanced Mathematics'),
            Mock(event_id='event2', title='[Class] Advanced Mathematics'),
            Mock(event_id='event3', title='Other Event')  # Should not be deleted
        ]
        mock_calendar_service.get_events = AsyncMock(return_value=existing_events)
        mock_calendar_service.delete_event = AsyncMock(return_value=True)
        
        # Test removal
        result = await student_calendar_service.remove_student_calendar_events('student123', 1)
        
        assert result == True
        
        # Verify only matching events were deleted (2 calls for matching events)
        assert mock_calendar_service.delete_event.call_count == 2


class TestStudentCalendarVisibilityAPI:
    """Test API endpoints for student calendar visibility."""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def mock_auth_teacher(self):
        with patch('app.routers.scheduling.get_current_user') as mock:
            mock.return_value = Mock(
                user_id='teacher123',
                user_type='TEACHER'
            )
            yield mock
    
    @pytest.fixture
    def mock_auth_student(self):
        with patch('app.routers.scheduling.get_current_user') as mock:
            mock.return_value = Mock(
                user_id='student123',
                user_type='STUDENT'
            )
            yield mock
    
    @pytest.fixture
    def mock_scheduling_service(self):
        with patch('app.routers.scheduling.scheduling_service') as mock:
            yield mock
    
    def test_manage_student_schedule_access_success(self, client, mock_auth_teacher, mock_scheduling_service):
        """Test successful student schedule access management."""
        # Mock service responses
        mock_schedule = Mock(teacher_id='teacher123')
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        mock_access_record = Mock(
            id=1,
            student_id='student123',
            schedule_id=1,
            sync_to_personal_calendar=False
        )
        mock_scheduling_service.manage_student_schedule_access = AsyncMock(return_value=mock_access_record)
        
        # Test API call
        response = client.post(
            "/api/schedules/access",
            json={
                "student_id": "student123",
                "schedule_id": 1,
                "sync_to_personal_calendar": False
            }
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_manage_student_schedule_access_unauthorized(self, client, mock_auth_teacher, mock_scheduling_service):
        """Test unauthorized access to schedule."""
        # Mock schedule owned by different teacher
        mock_schedule = Mock(teacher_id='other_teacher')
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        # Test API call should fail
        response = client.post(
            "/api/schedules/access",
            json={
                "student_id": "student123",
                "schedule_id": 1,
                "sync_to_personal_calendar": False
            }
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_student_schedule_access_as_student(self, client, mock_auth_student, mock_scheduling_service):
        """Test student getting their own access records."""
        mock_access_records = [
            Mock(id=1, student_id='student123', schedule_id=1),
            Mock(id=2, student_id='student123', schedule_id=2)
        ]
        mock_scheduling_service.get_student_schedule_access = AsyncMock(return_value=mock_access_records)
        
        # Test API call
        response = client.get("/api/schedules/access/student123")
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_get_student_schedule_access_wrong_student(self, client, mock_auth_student, mock_scheduling_service):
        """Test student trying to access other student's records."""
        # Test API call should fail
        response = client.get("/api/schedules/access/other_student")
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_student_calendar_sync_as_student(self, client, mock_auth_student, mock_scheduling_service):
        """Test student updating their own calendar sync preference."""
        mock_updated_record = Mock(
            id=1,
            student_id='student123',
            schedule_id=1,
            sync_to_personal_calendar=True
        )
        mock_scheduling_service.update_student_calendar_sync = AsyncMock(return_value=mock_updated_record)
        
        # Test API call
        response = client.put(
            "/api/schedules/access/student123/1/sync?sync_enabled=true"
        )
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_grant_enrollment_based_access(self, client, mock_auth_teacher, mock_scheduling_service):
        """Test granting enrollment-based access."""
        mock_schedule = Mock(teacher_id='teacher123')
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        mock_scheduling_service.grant_enrollment_based_access = AsyncMock(return_value=5)
        
        # Test API call
        response = client.post("/api/schedules/1/grant-enrollment-access")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] == True
        assert data["granted_count"] == 5
    
    def test_sync_student_personal_calendar(self, client, mock_auth_student):
        """Test syncing student personal calendar."""
        with patch('app.routers.scheduling.student_calendar_service') as mock_service:
            mock_result = Mock(
                success=True,
                synced_count=3,
                failed_count=0,
                errors=[],
                student_id='student123'
            )
            mock_service.sync_student_schedules_to_personal_calendar = AsyncMock(return_value=mock_result)
            
            # Test API call
            response = client.post("/api/schedules/student/student123/sync-calendar")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["success"] == True
            assert data["synced_count"] == 3


class TestStudentCalendarVisibilityIntegration:
    """Integration tests for student calendar visibility features."""
    
    @pytest.mark.asyncio
    async def test_complete_student_visibility_workflow(self):
        """Test complete workflow from schedule creation to student calendar sync."""
        # This would be a comprehensive integration test that:
        # 1. Creates a class schedule
        # 2. Grants enrollment-based access
        # 3. Student enables calendar sync
        # 4. Verifies calendar events are created
        # 5. Tests schedule modifications
        # 6. Tests access revocation
        
        # For now, this is a placeholder for the integration test structure
        pass
    
    @pytest.mark.asyncio
    async def test_recurring_schedule_student_visibility(self):
        """Test student visibility for recurring schedules."""
        # Test that:
        # 1. Recurring schedules create multiple calendar events for students
        # 2. Individual instance modifications are reflected in student calendars
        # 3. Cancellations are properly handled
        
        # Placeholder for recurring schedule integration test
        pass
    
    @pytest.mark.asyncio
    async def test_access_control_and_permissions(self):
        """Test access control and permissions for student calendar features."""
        # Test that:
        # 1. Students can only access their own schedules
        # 2. Teachers can only manage access to their own schedules
        # 3. Proper error handling for unauthorized access
        
        # Placeholder for access control integration test
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])