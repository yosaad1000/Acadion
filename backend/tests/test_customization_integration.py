"""
Integration tests for customization and advanced scheduling features.
Tests the complete workflow of user preferences, CSV import, bulk operations,
and timezone handling in realistic scenarios.
"""

import pytest
from datetime import datetime, time, date, timedelta
from unittest.mock import Mock, patch, AsyncMock
import json
import tempfile
import os

from fastapi.testclient import TestClient
from app.main import app
from app.models.user_preferences import (
    UserPreferencesCreate, SchedulingPreferences, CalendarCustomization,
    TimezoneEnum, DayOfWeek, CSVImportRequest
)


class TestCustomizationIntegration:
    """Integration tests for customization features."""
    
    @pytest.fixture
    def client(self):
        """Test client for API calls."""
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self):
        """Mock authentication headers."""
        # In a real test, this would be a valid JWT token
        return {"Authorization": "Bearer mock_teacher_token"}
    
    @pytest.fixture
    def mock_auth_dependency(self):
        """Mock the authentication dependency."""
        from app.models.user import UserResponse, UserType
        
        mock_user = UserResponse(
            user_id="teacher123",
            email="teacher@example.com",
            name="Test Teacher",
            user_type=UserType.TEACHER,
            is_face_registered=False,
            created_at=datetime.now()
        )
        
        with patch('app.routers.user_preferences.get_current_user', return_value=mock_user):
            with patch('app.routers.user_preferences.require_teacher', return_value=mock_user):
                yield mock_user


class TestUserPreferencesAPI:
    """Test user preferences API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_and_get_preferences(self, client, auth_headers, mock_auth_dependency):
        """Test creating and retrieving user preferences."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            # Mock database responses
            mock_db = Mock()
            mock_client.return_value = mock_db
            
            # Mock no existing preferences (for creation)
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
            
            # Mock successful creation
            created_prefs = {
                'user_id': 'teacher123',
                'scheduling_preferences': {
                    'default_duration_minutes': 90,
                    'buffer_time_minutes': 20,
                    'timezone': 'US/Eastern'
                },
                'calendar_preferences': {
                    'event_color': '#ff5722',
                    'show_student_count': True
                },
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
            mock_db.table.return_value.insert.return_value.execute.return_value.data = [created_prefs]
            
            # Create preferences
            preferences_data = {
                "scheduling": {
                    "default_duration_minutes": 90,
                    "buffer_time_minutes": 20,
                    "timezone": "US_EASTERN"
                },
                "calendar": {
                    "event_color": "#ff5722",
                    "show_student_count": True
                }
            }
            
            response = client.post(
                "/api/preferences/",
                json=preferences_data,
                headers=auth_headers
            )
            
            assert response.status_code == 201
            result = response.json()
            assert result["user_id"] == "teacher123"
            assert result["scheduling"]["default_duration_minutes"] == 90
            assert result["calendar"]["event_color"] == "#ff5722"
    
    @pytest.mark.asyncio
    async def test_update_preferences(self, client, auth_headers, mock_auth_dependency):
        """Test updating user preferences."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            mock_db = Mock()
            mock_client.return_value = mock_db
            
            # Mock existing preferences
            existing_prefs = {
                'user_id': 'teacher123',
                'scheduling_preferences': {
                    'default_duration_minutes': 60,
                    'buffer_time_minutes': 15,
                    'timezone': 'UTC'
                },
                'calendar_preferences': {
                    'event_color': '#4285f4',
                    'show_student_count': True
                },
                'created_at': '2024-01-01T00:00:00Z',
                'updated_at': '2024-01-01T00:00:00Z'
            }
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [existing_prefs]
            
            # Mock successful update
            updated_prefs = existing_prefs.copy()
            updated_prefs['scheduling_preferences']['default_duration_minutes'] = 90
            updated_prefs['updated_at'] = '2024-01-02T00:00:00Z'
            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated_prefs]
            
            # Update preferences
            update_data = {
                "scheduling": {
                    "default_duration_minutes": 90
                }
            }
            
            response = client.put(
                "/api/preferences/",
                json=update_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["scheduling"]["default_duration_minutes"] == 90


class TestTimezoneConversionAPI:
    """Test timezone conversion API."""
    
    @pytest.mark.asyncio
    async def test_timezone_conversion(self, client, auth_headers, mock_auth_dependency):
        """Test timezone conversion endpoint."""
        conversion_data = {
            "from_timezone": "UTC",
            "to_timezone": "US/Eastern",
            "datetime_str": "2024-01-15T14:00:00Z"
        }
        
        response = client.post(
            "/api/preferences/timezone/convert",
            json=conversion_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["from_timezone"] == "UTC"
        assert result["to_timezone"] == "US/Eastern"
        assert "2024-01-15T09:00:00" in result["converted_datetime"]  # EST is UTC-5
    
    @pytest.mark.asyncio
    async def test_invalid_timezone_conversion(self, client, auth_headers, mock_auth_dependency):
        """Test timezone conversion with invalid timezone."""
        conversion_data = {
            "from_timezone": "Invalid/Timezone",
            "to_timezone": "UTC",
            "datetime_str": "2024-01-15T14:00:00Z"
        }
        
        response = client.post(
            "/api/preferences/timezone/convert",
            json=conversion_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400


class TestConflictDetectionAPI:
    """Test conflict detection API."""
    
    @pytest.mark.asyncio
    async def test_conflict_detection_with_buffer(self, client, auth_headers, mock_auth_dependency):
        """Test conflict detection with buffer time."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            with patch('app.services.user_preferences_service.SchedulingService') as mock_sched_service:
                mock_db = Mock()
                mock_client.return_value = mock_db
                
                # Mock user preferences with buffer time
                prefs_data = {
                    'user_id': 'teacher123',
                    'scheduling_preferences': {
                        'buffer_time_minutes': 30,
                        'default_duration_minutes': 60,
                        'timezone': 'UTC'
                    },
                    'calendar_preferences': {},
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
                mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [prefs_data]
                
                # Mock existing schedules
                from app.models.calendar import ClassScheduleResponse
                existing_schedule = Mock(spec=ClassScheduleResponse)
                existing_schedule.id = 1
                existing_schedule.title = "Existing Class"
                existing_schedule.start_datetime = datetime(2024, 1, 15, 10, 0)
                existing_schedule.duration_minutes = 60
                
                mock_sched_service.return_value.get_teacher_schedules = AsyncMock(return_value=[existing_schedule])
                
                # Test conflict check
                conflict_data = {
                    "user_id": "teacher123",
                    "start_datetime": "2024-01-15T10:30:00Z",
                    "duration_minutes": 60,
                    "include_buffer_time": True
                }
                
                response = client.post(
                    "/api/preferences/conflicts/check",
                    json=conflict_data,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                result = response.json()
                assert result["has_conflicts"] == True
                assert len(result["conflicts"]) > 0


class TestCSVImportAPI:
    """Test CSV import API."""
    
    @pytest.fixture
    def sample_csv_content(self):
        """Sample CSV content for testing."""
        return """subject_id,title,description,start_date,start_time,duration_minutes,recurrence_type,recurrence_interval,days_of_week,end_date,occurrence_count
MATH101,Algebra Basics,Introduction to algebra,2024-01-15,09:00,60,weekly,1,"0,2,4",2024-05-15,
PHYS201,Physics Lab,Laboratory session,2024-01-16,14:00,90,weekly,1,"1,3",,20"""
    
    @pytest.mark.asyncio
    async def test_csv_import_success(self, client, auth_headers, mock_auth_dependency, sample_csv_content):
        """Test successful CSV import."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            with patch('app.services.user_preferences_service.SchedulingService') as mock_sched_service:
                mock_db = Mock()
                mock_client.return_value = mock_db
                
                # Mock user preferences
                prefs_data = {
                    'user_id': 'teacher123',
                    'scheduling_preferences': {'timezone': 'UTC'},
                    'calendar_preferences': {},
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
                mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [prefs_data]
                
                # Mock successful schedule creation
                from app.models.calendar import ClassScheduleResponse
                created_schedule = Mock(spec=ClassScheduleResponse)
                created_schedule.id = 1
                mock_sched_service.return_value.create_class_schedule = AsyncMock(return_value=created_schedule)
                mock_sched_service.return_value.sync_with_calendar = AsyncMock(return_value=True)
                
                # Import CSV
                import_data = {
                    "csv_data": sample_csv_content,
                    "skip_header": True,
                    "timezone": "UTC",
                    "auto_sync": True
                }
                
                response = client.post(
                    "/api/preferences/import/csv",
                    json=import_data,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                result = response.json()
                assert result["total_rows"] == 2
                assert result["successful_imports"] == 2
                assert result["failed_imports"] == 0
    
    @pytest.mark.asyncio
    async def test_csv_file_upload(self, client, auth_headers, mock_auth_dependency, sample_csv_content):
        """Test CSV file upload import."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            with patch('app.services.user_preferences_service.SchedulingService') as mock_sched_service:
                mock_db = Mock()
                mock_client.return_value = mock_db
                
                # Mock user preferences
                prefs_data = {
                    'user_id': 'teacher123',
                    'scheduling_preferences': {'timezone': 'UTC'},
                    'calendar_preferences': {},
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
                mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [prefs_data]
                
                # Mock successful schedule creation
                from app.models.calendar import ClassScheduleResponse
                created_schedule = Mock(spec=ClassScheduleResponse)
                created_schedule.id = 1
                mock_sched_service.return_value.create_class_schedule = AsyncMock(return_value=created_schedule)
                mock_sched_service.return_value.sync_with_calendar = AsyncMock(return_value=True)
                
                # Create temporary CSV file
                with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
                    f.write(sample_csv_content)
                    temp_file_path = f.name
                
                try:
                    # Upload CSV file
                    with open(temp_file_path, 'rb') as f:
                        response = client.post(
                            "/api/preferences/import/csv-file",
                            files={"file": ("schedules.csv", f, "text/csv")},
                            params={
                                "skip_header": True,
                                "timezone": "UTC",
                                "auto_sync": True
                            },
                            headers=auth_headers
                        )
                    
                    assert response.status_code == 200
                    result = response.json()
                    assert result["total_rows"] == 2
                    assert result["successful_imports"] == 2
                
                finally:
                    # Clean up temporary file
                    os.unlink(temp_file_path)
    
    @pytest.mark.asyncio
    async def test_csv_template_endpoint(self, client, auth_headers, mock_auth_dependency):
        """Test CSV template endpoint."""
        response = client.get(
            "/api/preferences/csv-template",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "headers" in result
        assert "example_row" in result
        assert "field_descriptions" in result
        assert "notes" in result
        
        # Verify required headers are present
        expected_headers = [
            "subject_id", "title", "start_date", "start_time"
        ]
        for header in expected_headers:
            assert header in result["headers"]


class TestBulkOperationsAPI:
    """Test bulk operations API."""
    
    @pytest.mark.asyncio
    async def test_bulk_sync_operation(self, client, auth_headers, mock_auth_dependency):
        """Test bulk sync operation."""
        with patch('app.services.user_preferences_service.SchedulingService') as mock_sched_service:
            # Mock schedule ownership verification
            from app.models.calendar import ClassScheduleResponse
            schedule1 = Mock(spec=ClassScheduleResponse)
            schedule1.teacher_id = "teacher123"
            schedule2 = Mock(spec=ClassScheduleResponse)
            schedule2.teacher_id = "teacher123"
            
            async def mock_get_schedule(schedule_id):
                if schedule_id == 1:
                    return schedule1
                elif schedule_id == 2:
                    return schedule2
                else:
                    raise Exception("Schedule not found")
            
            mock_sched_service.return_value.get_schedule_by_id = AsyncMock(side_effect=mock_get_schedule)
            mock_sched_service.return_value.sync_with_calendar = AsyncMock(return_value=True)
            
            # Bulk sync operation
            operation_data = {
                "schedule_ids": [1, 2],
                "operation": "sync"
            }
            
            response = client.post(
                "/api/preferences/bulk-operations",
                json=operation_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["total_schedules"] == 2
            assert result["successful_operations"] == 2
            assert result["failed_operations"] == 0
    
    @pytest.mark.asyncio
    async def test_bulk_operation_access_denied(self, client, auth_headers, mock_auth_dependency):
        """Test bulk operation with access denied."""
        with patch('app.services.user_preferences_service.SchedulingService') as mock_sched_service:
            # Mock schedule with different owner
            from app.models.calendar import ClassScheduleResponse
            schedule1 = Mock(spec=ClassScheduleResponse)
            schedule1.teacher_id = "teacher123"
            schedule2 = Mock(spec=ClassScheduleResponse)
            schedule2.teacher_id = "other_teacher"  # Different owner
            
            async def mock_get_schedule(schedule_id):
                if schedule_id == 1:
                    return schedule1
                elif schedule_id == 2:
                    return schedule2
                else:
                    raise Exception("Schedule not found")
            
            mock_sched_service.return_value.get_schedule_by_id = AsyncMock(side_effect=mock_get_schedule)
            mock_sched_service.return_value.sync_with_calendar = AsyncMock(return_value=True)
            
            # Bulk sync operation
            operation_data = {
                "schedule_ids": [1, 2],
                "operation": "sync"
            }
            
            response = client.post(
                "/api/preferences/bulk-operations",
                json=operation_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["total_schedules"] == 2
            assert result["successful_operations"] == 1
            assert result["failed_operations"] == 1
            assert len(result["errors"]) == 1


class TestAdvancedSchedulingFeatures:
    """Test advanced scheduling features integration."""
    
    @pytest.mark.asyncio
    async def test_schedule_with_custom_duration_and_buffer(self, client, auth_headers, mock_auth_dependency):
        """Test creating schedule with custom duration and buffer time from preferences."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock_client:
            with patch('app.services.scheduling_service.get_supabase_client') as mock_sched_client:
                # Mock user preferences with custom defaults
                mock_db = Mock()
                mock_client.return_value = mock_db
                mock_sched_client.return_value = mock_db
                
                prefs_data = {
                    'user_id': 'teacher123',
                    'scheduling_preferences': {
                        'default_duration_minutes': 90,  # Custom default
                        'buffer_time_minutes': 20,       # Custom buffer
                        'timezone': 'US/Eastern'
                    },
                    'calendar_preferences': {
                        'event_color': '#ff5722'
                    },
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
                mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [prefs_data]
                
                # Mock schedule creation
                created_schedule = {
                    'id': 1,
                    'teacher_id': 'teacher123',
                    'subject_id': 'MATH101',
                    'title': 'Advanced Algebra',
                    'duration_minutes': 90,  # Should use custom default
                    'buffer_time_minutes': 20,  # Should use custom buffer
                    'timezone': 'US/Eastern',
                    'created_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z'
                }
                mock_db.table.return_value.insert.return_value.execute.return_value.data = [created_schedule]
                
                # Create schedule (this would typically use preferences for defaults)
                schedule_data = {
                    "subject_id": "MATH101",
                    "title": "Advanced Algebra",
                    "start_datetime": "2024-01-15T10:00:00Z",
                    "duration_minutes": 90,  # Using custom default
                    "timezone": "US/Eastern",
                    "buffer_time_minutes": 20
                }
                
                # This would be called through the scheduling API
                # but we're testing the integration of preferences
                response = client.get(
                    "/api/preferences/",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                result = response.json()
                assert result["scheduling"]["default_duration_minutes"] == 90
                assert result["scheduling"]["buffer_time_minutes"] == 20
                assert result["scheduling"]["timezone"] == "US_EASTERN"


if __name__ == "__main__":
    pytest.main([__file__])