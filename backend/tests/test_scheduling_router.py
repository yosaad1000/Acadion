"""
Integration tests for the scheduling API router endpoints.
Tests CRUD operations, role-based access control, query parameters, and sync functionality.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, date, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
import json

from main import app
from app.models.user import UserType
from app.models.calendar import (
    RecurrenceType, UpdateScope, ScheduleStatus
)


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


@pytest.fixture
def teacher_token():
    """Mock teacher JWT token."""
    return "Bearer mock_teacher_token"


@pytest.fixture
def student_token():
    """Mock student JWT token."""
    return "Bearer mock_student_token"


@pytest.fixture
def mock_teacher_user():
    """Mock teacher user response."""
    return {
        "user_id": "teacher_123",
        "email": "teacher@example.com",
        "name": "Test Teacher",
        "user_type": UserType.TEACHER,
        "is_face_registered": False,
        "created_at": datetime.now()
    }


@pytest.fixture
def mock_student_user():
    """Mock student user response."""
    return {
        "user_id": "student_456",
        "email": "student@example.com",
        "name": "Test Student",
        "user_type": UserType.STUDENT,
        "is_face_registered": True,
        "created_at": datetime.now()
    }


@pytest.fixture
def sample_schedule_data():
    """Sample schedule creation data."""
    return {
        "subject_id": "MATH101",
        "title": "Advanced Mathematics",
        "description": "Weekly math class",
        "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
        "duration_minutes": 90,
        "recurrence_pattern": {
            "type": "weekly",
            "interval": 1,
            "days_of_week": [0, 2, 4],  # Monday, Wednesday, Friday
            "end_date": (date.today() + timedelta(days=90)).isoformat()
        }
    }


@pytest.fixture
def sample_schedule_response():
    """Sample schedule response data."""
    return {
        "id": 1,
        "teacher_id": "teacher_123",
        "subject_id": "MATH101",
        "title": "Advanced Mathematics",
        "description": "Weekly math class",
        "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
        "duration_minutes": 90,
        "recurrence_pattern": {
            "type": "weekly",
            "interval": 1,
            "days_of_week": [0, 2, 4],
            "end_date": (date.today() + timedelta(days=90)).isoformat()
        },
        "google_event_id": None,
        "google_recurring_event_id": None,
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "subject_name": "Advanced Mathematics",
        "teacher_name": "Test Teacher",
        "enrolled_student_count": 25
    }


class TestSchedulingRouterAuthentication:
    """Test authentication and authorization for scheduling endpoints."""
    
    @patch('app.routers.auth.get_current_user')
    def test_create_schedule_requires_teacher_auth(self, mock_get_user, client, sample_schedule_data):
        """Test that creating schedules requires teacher authentication."""
        # Test with student authentication
        mock_get_user.return_value = MagicMock(user_type=UserType.STUDENT)
        response = client.post(
            "/api/schedules/", 
            json=sample_schedule_data,
            headers={"Authorization": "Bearer student_token"}
        )
        assert response.status_code == 403
        assert "Only teachers can perform this action" in response.json()["detail"]
    
    @patch('app.routers.auth.get_current_user')
    def test_get_schedules_allows_both_roles(self, mock_get_user, client):
        """Test that getting schedules allows both teachers and students."""
        # Test with teacher
        mock_get_user.return_value = MagicMock(user_type=UserType.TEACHER, user_id="teacher_123")
        with patch('app.services.scheduling_service.SchedulingService.get_teacher_schedules') as mock_get:
            mock_get.return_value = []
            response = client.get(
                "/api/schedules/",
                headers={"Authorization": "Bearer teacher_token"}
            )
            assert response.status_code == 200


class TestScheduleCreation:
    """Test schedule creation endpoints."""
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.create_class_schedule')
    def test_create_schedule_success(self, mock_create, mock_get_user, client, mock_teacher_user, sample_schedule_data, sample_schedule_response):
        """Test successful schedule creation."""
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_create.return_value = MagicMock(**sample_schedule_response)
        
        response = client.post(
            "/api/schedules/",
            json=sample_schedule_data,
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["teacher_id"] == "teacher_123"
        assert data["title"] == "Advanced Mathematics"
        assert data["duration_minutes"] == 90
        
        # Verify service was called with correct parameters
        mock_create.assert_called_once()
        call_args = mock_create.call_args
        assert call_args[1]["teacher_id"] == "teacher_123"
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.create_class_schedule')
    def test_create_schedule_validation_error(self, mock_create, mock_get_user, client, mock_teacher_user):
        """Test schedule creation with validation errors."""
        from app.services.scheduling_service import SchedulingError
        
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_create.side_effect = SchedulingError("Subject not found", "SUBJECT_NOT_FOUND")
        
        invalid_data = {
            "subject_id": "INVALID",
            "title": "Test Class",
            "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 60
        }
        
        response = client.post(
            "/api/schedules/",
            json=invalid_data,
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 400
        assert "Subject not found" in response.json()["detail"]


class TestScheduleRetrieval:
    """Test schedule retrieval endpoints."""
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.get_teacher_schedules')
    def test_get_teacher_schedules_with_filters(self, mock_get_schedules, mock_get_user, client, mock_teacher_user, sample_schedule_response):
        """Test getting teacher schedules with query filters."""
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_get_schedules.return_value = [MagicMock(**sample_schedule_response)]
        
        # Test with date range filter
        start_date = date.today().isoformat()
        end_date = (date.today() + timedelta(days=30)).isoformat()
        
        response = client.get(
            f"/api/schedules/?start_date={start_date}&end_date={end_date}&subject_id=MATH101&include_instances=true",
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == 1
        
        # Verify service was called with correct query parameters
        mock_get_schedules.assert_called_once()
        call_args = mock_get_schedules.call_args
        query = call_args[1]["query"]
        assert query.start_date.isoformat() == start_date
        assert query.end_date.isoformat() == end_date
        assert query.subject_id == "MATH101"
        assert query.include_instances is True
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.get_schedule_by_id')
    def test_get_schedule_by_id_teacher_access(self, mock_get_schedule, mock_get_user, client, mock_teacher_user, sample_schedule_response):
        """Test getting schedule by ID with teacher access control."""
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_get_schedule.return_value = MagicMock(**sample_schedule_response)
        
        response = client.get(
            "/api/schedules/1",
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["teacher_id"] == "teacher_123"


class TestScheduleUpdates:
    """Test schedule update endpoints."""
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.get_schedule_by_id')
    @patch('app.services.scheduling_service.SchedulingService.update_class_schedule')
    def test_update_schedule_success(self, mock_update, mock_get_schedule, mock_get_user, client, mock_teacher_user, sample_schedule_response):
        """Test successful schedule update."""
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_get_schedule.return_value = MagicMock(**sample_schedule_response)
        
        updated_response = sample_schedule_response.copy()
        updated_response["title"] = "Updated Mathematics"
        mock_update.return_value = MagicMock(**updated_response)
        
        update_data = {
            "title": "Updated Mathematics",
            "duration_minutes": 120
        }
        
        response = client.put(
            "/api/schedules/1?scope=this_and_future",
            json=update_data,
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Mathematics"
        
        # Verify service was called with correct parameters
        mock_update.assert_called_once()
        call_args = mock_update.call_args
        assert call_args[1]["schedule_id"] == 1
        assert call_args[1]["scope"] == UpdateScope.THIS_AND_FUTURE


class TestScheduleSync:
    """Test schedule synchronization endpoints."""
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.get_schedule_by_id')
    @patch('app.services.scheduling_service.SchedulingService.sync_with_calendar')
    def test_sync_single_schedule(self, mock_sync, mock_get_schedule, mock_get_user, client, mock_teacher_user, sample_schedule_response):
        """Test syncing a single schedule with calendar."""
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_get_schedule.return_value = MagicMock(**sample_schedule_response)
        mock_sync.return_value = True
        
        response = client.post(
            "/api/schedules/1/sync",
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["synced_count"] == 1
        assert data["failed_count"] == 0
        assert len(data["errors"]) == 0
        
        # Verify service was called
        mock_sync.assert_called_once_with(1)


class TestErrorHandling:
    """Test error handling scenarios."""
    
    @patch('app.routers.auth.get_current_user')
    @patch('app.services.scheduling_service.SchedulingService.get_schedule_by_id')
    def test_schedule_not_found(self, mock_get_schedule, mock_get_user, client, mock_teacher_user):
        """Test handling of schedule not found errors."""
        from app.services.scheduling_service import SchedulingError
        
        mock_get_user.return_value = MagicMock(**mock_teacher_user)
        mock_get_schedule.side_effect = SchedulingError("Schedule not found", "SCHEDULE_NOT_FOUND")
        
        response = client.get(
            "/api/schedules/999",
            headers={"Authorization": "Bearer teacher_token"}
        )
        
        assert response.status_code == 404
        assert "Schedule not found" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])