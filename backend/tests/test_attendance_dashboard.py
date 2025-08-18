import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import datetime, date
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.models.user import UserResponse
from app.routers.auth import get_current_user

client = TestClient(app, base_url="http://localhost")

# Mock user data
mock_teacher = UserResponse(
    user_id="teacher-123",
    name="Test Teacher",
    email="teacher@test.com",
    user_type="teacher",
    is_face_registered=True,
    created_at=datetime.now()
)

mock_student = UserResponse(
    user_id="student-123",
    name="Test Student",
    email="student@test.com",
    user_type="student",
    is_face_registered=True,
    created_at=datetime.now()
)

mock_subject = {
    "subject_id": "subject-123",
    "name": "Test Subject",
    "teacher_id": "teacher-123"
}

class TestAttendanceDashboardEnhancements:
    """Test enhanced attendance dashboard with session support"""
    
    def setup_method(self):
        """Setup for each test method"""
        app.dependency_overrides.clear()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        app.dependency_overrides.clear()
    
    def test_dashboard_with_multiple_sessions_same_day(self):
        """Test dashboard correctly handles multiple sessions on the same day"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock students
        mock_students = [
            {"user_id": "student-1", "name": "Student 1"},
            {"user_id": "student-2", "name": "Student 2"},
            {"user_id": "student-3", "name": "Student 3"}
        ]
        
        # Mock attendance records with multiple sessions on same day
        mock_attendance_records = [
            # Morning session
            {
                "id": "att-1",
                "student_id": "student-1",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-morning",
                "session_timestamp": "2024-01-15T09:00:00"
            },
            {
                "id": "att-2",
                "student_id": "student-2",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-morning",
                "session_timestamp": "2024-01-15T09:00:00"
            },
            # Afternoon session same day
            {
                "id": "att-3",
                "student_id": "student-1",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-afternoon",
                "session_timestamp": "2024-01-15T14:00:00"
            },
            {
                "id": "att-4",
                "student_id": "student-2",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "absent",
                "session_id": "session-afternoon",
                "session_timestamp": "2024-01-15T14:00:00"
            },
            {
                "id": "att-5",
                "student_id": "student-3",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "late",
                "session_id": "session-afternoon",
                "session_timestamp": "2024-01-15T14:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.get_attendance_by_subject = AsyncMock(return_value=mock_attendance_records)
        mock_db.get_subject_students = AsyncMock(return_value=mock_students)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/dashboard")
            
            assert response.status_code == 200
            dashboard = response.json()
            
            # Check basic counts
            assert dashboard["total_students"] == 3
            assert dashboard["total_sessions"] == 2  # Two different sessions
            assert dashboard["total_attendance_records"] == 5
            
            # Check status counts
            assert dashboard["present_count"] == 3
            assert dashboard["absent_count"] == 1
            assert dashboard["late_count"] == 1
            
            # Check attendance rate (present + late) / total * 100
            expected_rate = (3 + 1) / 5 * 100  # 80%
            assert dashboard["attendance_rate"] == 80.0
            
            # Check sessions by date
            sessions_by_date = dashboard["sessions_by_date"]
            assert "2024-01-15" in sessions_by_date
            
            date_sessions = sessions_by_date["2024-01-15"]
            assert len(date_sessions) == 2  # Two sessions on this date
            
            # Find morning and afternoon sessions
            morning_session = next(s for s in date_sessions if s["session_id"] == "session-morning")
            afternoon_session = next(s for s in date_sessions if s["session_id"] == "session-afternoon")
            
            # Check morning session stats
            assert morning_session["total_records"] == 2
            assert morning_session["present_count"] == 2
            assert morning_session["absent_count"] == 0
            assert morning_session["late_count"] == 0
            
            # Check afternoon session stats
            assert afternoon_session["total_records"] == 3
            assert afternoon_session["present_count"] == 1
            assert afternoon_session["absent_count"] == 1
            assert afternoon_session["late_count"] == 1
    
    def test_dashboard_with_no_attendance_records(self):
        """Test dashboard handles subjects with no attendance records"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        mock_students = [
            {"user_id": "student-1", "name": "Student 1"},
            {"user_id": "student-2", "name": "Student 2"}
        ]
        
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.get_attendance_by_subject = AsyncMock(return_value=[])  # No records
        mock_db.get_subject_students = AsyncMock(return_value=mock_students)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/dashboard")
            
            assert response.status_code == 200
            dashboard = response.json()
            
            # Check that it handles empty data gracefully
            assert dashboard["total_students"] == 2
            assert dashboard["total_sessions"] == 0
            assert dashboard["total_attendance_records"] == 0
            assert dashboard["present_count"] == 0
            assert dashboard["absent_count"] == 0
            assert dashboard["late_count"] == 0
            assert dashboard["attendance_rate"] == 0
            assert dashboard["sessions_by_date"] == {}
    
    def test_dashboard_sessions_sorted_by_date(self):
        """Test that sessions are sorted by date (most recent first)"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        mock_students = [{"user_id": "student-1", "name": "Student 1"}]
        
        # Mock attendance records across multiple dates
        mock_attendance_records = [
            {
                "id": "att-1",
                "student_id": "student-1",
                "date": "2024-01-10",
                "status": "present",
                "session_id": "session-1",
                "session_timestamp": "2024-01-10T09:00:00"
            },
            {
                "id": "att-2",
                "student_id": "student-1",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-2",
                "session_timestamp": "2024-01-15T09:00:00"
            },
            {
                "id": "att-3",
                "student_id": "student-1",
                "date": "2024-01-12",
                "status": "present",
                "session_id": "session-3",
                "session_timestamp": "2024-01-12T09:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.get_attendance_by_subject = AsyncMock(return_value=mock_attendance_records)
        mock_db.get_subject_students = AsyncMock(return_value=mock_students)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/dashboard")
            
            assert response.status_code == 200
            dashboard = response.json()
            
            # Check that dates are sorted (most recent first)
            sessions_by_date = dashboard["sessions_by_date"]
            dates = list(sessions_by_date.keys())
            
            assert dates == ["2024-01-15", "2024-01-12", "2024-01-10"]
    
    def test_attendance_sessions_endpoint(self):
        """Test the new attendance sessions endpoint"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        mock_sessions = [
            {
                "id": "att-1",
                "student_id": "student-1",
                "student_name": "Student 1",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-1",
                "session_timestamp": "2024-01-15T09:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.get_attendance_sessions = AsyncMock(return_value=mock_sessions)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/sessions")
            
            assert response.status_code == 200
            result = response.json()
            
            assert result["subject_id"] == "subject-123"
            assert result["sessions"] == mock_sessions
            
            # Verify the correct method was called
            mock_db.get_attendance_sessions.assert_called_once_with("subject-123")
    
    def test_student_can_access_sessions_if_enrolled(self):
        """Test that students can access sessions for subjects they're enrolled in"""
        def override_get_current_user():
            return mock_student
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        mock_sessions = [
            {
                "id": "att-1",
                "student_id": "student-123",
                "student_name": "Test Student",
                "date": "2024-01-15",
                "status": "present",
                "session_id": "session-1",
                "session_timestamp": "2024-01-15T09:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.get_attendance_sessions = AsyncMock(return_value=mock_sessions)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/sessions")
            
            assert response.status_code == 200
            result = response.json()
            
            assert result["subject_id"] == "subject-123"
            assert result["sessions"] == mock_sessions
    
    def test_student_cannot_access_sessions_if_not_enrolled(self):
        """Test that students cannot access sessions for subjects they're not enrolled in"""
        def override_get_current_user():
            return mock_student
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        mock_db = AsyncMock()
        mock_db.is_student_enrolled = AsyncMock(return_value=False)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/sessions")
            
            assert response.status_code == 403
            assert "Not enrolled in this subject" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__])