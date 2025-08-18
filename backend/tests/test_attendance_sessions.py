import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import date, datetime
import uuid
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

mock_subject = {
    "subject_id": "subject-123",
    "name": "Test Subject",
    "teacher_id": "teacher-123"
}

class TestAttendanceSessionSupport:
    """Test attendance system with multiple sessions support"""
    
    def setup_method(self):
        """Setup for each test method"""
        app.dependency_overrides.clear()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        app.dependency_overrides.clear()
    
    def test_manual_attendance_with_session_tracking(self):
        """Test that manual attendance includes session tracking"""
        # Setup dependency override
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Setup mock database
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        with patch('app.routers.attendance.db', mock_db):
            attendance_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual"
            }
            
            response = client.post("/api/attendance/manual", json=attendance_data)
            
            assert response.status_code == 200
            assert response.json()["message"] == "Attendance marked successfully"
            
            # Verify attendance was marked
            mock_db.mark_attendance.assert_called_once()
            call_args = mock_db.mark_attendance.call_args[0][0]
            
            # Verify basic attendance data
            assert call_args["student_id"] == "student-123"
            assert call_args["subject_id"] == "subject-123"
            assert call_args["status"] == "present"
            assert call_args["method"] == "manual"
            assert call_args["marked_by"] == "teacher-123"
    
    def test_multiple_sessions_same_day_allowed(self):
        """Test that multiple attendance sessions can be marked on the same day"""
        # Setup dependency override
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Setup mock database
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        with patch('app.routers.attendance.db', mock_db):
            attendance_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual"
            }
            
            # Mark attendance first time
            response1 = client.post("/api/attendance/manual", json=attendance_data)
            assert response1.status_code == 200
            
            # Mark attendance second time same day
            response2 = client.post("/api/attendance/manual", json=attendance_data)
            assert response2.status_code == 200
            
            # Verify both calls succeeded (no unique constraint violation)
            assert mock_db.mark_attendance.call_count == 2
    
    def test_bulk_attendance_creates_single_session(self):
        """Test that bulk attendance creates a single session for multiple students"""
        # Setup dependency override
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Setup mock database
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        with patch('app.routers.attendance.db', mock_db):
            bulk_data = {
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "students": [
                    {"student_id": "student-1", "status": "present"},
                    {"student_id": "student-2", "status": "present"},
                    {"student_id": "student-3", "status": "absent"}
                ],
                "method": "manual"
            }
            
            response = client.post("/api/attendance/bulk", json=bulk_data)
            
            assert response.status_code == 200
            result = response.json()
            assert result["marked_count"] == 3
            assert result["failed_count"] == 0
            assert "session_id" in result
            
            # Verify all students were marked with the same session_id
            assert mock_db.mark_attendance.call_count == 3
            session_ids = [call[0][0]["session_id"] for call in mock_db.mark_attendance.call_args_list]
            assert len(set(session_ids)) == 1  # All should be the same
    
    def test_face_recognition_creates_session(self):
        """Test that face recognition attendance creates proper session tracking"""
        # Setup dependency override
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Setup mock database
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        with patch('app.routers.attendance.db', mock_db), \
             patch('app.services.face_recognition.face_recognition_service') as mock_face_service:
            
            # Mock face recognition result
            mock_face_service.recognize_student.return_value = {
                "success": True,
                "recognized_students": [
                    {"student_id": "student-1", "similarity_score": 0.95},
                    {"student_id": "student-2", "similarity_score": 0.88}
                ]
            }
            
            # Create mock image file
            from io import BytesIO
            image_data = b"fake_image_data"
            files = {"file": ("test.jpg", BytesIO(image_data), "image/jpeg")}
            
            response = client.post(
                "/api/attendance/mark-face?subject_id=subject-123",
                files=files
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["attendance_marked"] == True
            assert result["marked_count"] == 2
            
            # Verify session tracking in face recognition calls
            assert mock_db.mark_attendance.call_count == 2
            call_args_list = mock_db.mark_attendance.call_args_list
            
            # All calls should have the same session_id
            session_ids = [call[0][0]["session_id"] for call in call_args_list]
            assert len(set(session_ids)) == 1
            
            # All calls should have method = "face_recognition"
            for call in call_args_list:
                assert call[0][0]["method"] == "face_recognition"
                assert "session_timestamp" in call[0][0]
    
    def test_authorization_checks(self):
        """Test that proper authorization checks are in place"""
        # Test without authentication
        attendance_data = {
            "student_id": "student-123",
            "subject_id": "subject-123",
            "date": "2024-01-15",
            "status": "present"
        }
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]
        
        # Test with student user (should fail)
        mock_student = UserResponse(
            user_id="student-123",
            name="Test Student", 
            email="student@test.com",
            user_type="student",
            is_face_registered=True,
            created_at=datetime.now()
        )
        
        def override_get_current_user():
            return mock_student
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        assert response.status_code == 403
        assert "Only teachers can mark attendance" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__])