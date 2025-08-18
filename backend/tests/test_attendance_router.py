import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import date, datetime
import uuid
import json

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

class TestAttendanceMarking:
    """Test attendance marking with multiple sessions support"""
    
    def test_mark_manual_attendance_success(self):
        """Test successful manual attendance marking with session tracking"""
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
            # Test data
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
            
            # Verify mark_attendance was called with correct data
            mock_db.mark_attendance.assert_called_once()
            call_args = mock_db.mark_attendance.call_args[0][0]
            assert call_args["student_id"] == "student-123"
            assert call_args["subject_id"] == "subject-123"
            assert call_args["status"] == "present"
            assert call_args["method"] == "manual"
            assert call_args["marked_by"] == "teacher-123"
        
        # Clean up
        app.dependency_overrides.clear()
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_mark_manual_attendance_with_session_data(self, mock_db, mock_get_user):
        """Test manual attendance marking with explicit session data"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        session_id = str(uuid.uuid4())
        session_timestamp = datetime.now().isoformat()
        
        # Test data with session info
        attendance_data = {
            "student_id": "student-123",
            "subject_id": "subject-123",
            "date": "2024-01-15", 
            "status": "present",
            "method": "manual",
            "session_id": session_id,
            "session_timestamp": session_timestamp
        }
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        
        assert response.status_code == 200
        
        # Verify session data was passed through
        call_args = mock_db.mark_attendance.call_args[0][0]
        assert call_args["session_id"] == session_id
        assert call_args["session_timestamp"] == session_timestamp
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_mark_bulk_attendance_success(self, mock_db, mock_get_user):
        """Test successful bulk attendance marking"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        # Test data for multiple students
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
        
        # Verify mark_attendance was called 3 times
        assert mock_db.mark_attendance.call_count == 3
        
        # Verify all calls used the same session_id
        session_ids = [call[0][0]["session_id"] for call in mock_db.mark_attendance.call_args_list]
        assert len(set(session_ids)) == 1  # All should be the same
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_mark_bulk_attendance_with_failures(self, mock_db, mock_get_user):
        """Test bulk attendance marking with some failures"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        
        # Mock enrollment check - student-2 not enrolled
        def mock_enrollment_check(subject_id, student_id):
            return student_id != "student-2"
        
        mock_db.is_student_enrolled = AsyncMock(side_effect=mock_enrollment_check)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        # Test data with one non-enrolled student
        bulk_data = {
            "subject_id": "subject-123",
            "date": "2024-01-15",
            "students": [
                {"student_id": "student-1", "status": "present"},
                {"student_id": "student-2", "status": "present"},  # Not enrolled
                {"student_id": "student-3", "status": "absent"}
            ],
            "method": "manual"
        }
        
        response = client.post("/api/attendance/bulk", json=bulk_data)
        
        assert response.status_code == 200
        result = response.json()
        assert result["marked_count"] == 2
        assert result["failed_count"] == 1
        
        # Check results details
        results = result["results"]
        assert len(results) == 3
        assert results[1]["success"] == False
        assert "not enrolled" in results[1]["error"]
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_multiple_sessions_same_day(self, mock_db, mock_get_user):
        """Test that multiple attendance sessions can be marked on the same day"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        # Mark attendance for first session
        attendance_data_1 = {
            "student_id": "student-123",
            "subject_id": "subject-123",
            "date": "2024-01-15",
            "status": "present",
            "method": "manual"
        }
        
        response1 = client.post("/api/attendance/manual", json=attendance_data_1)
        assert response1.status_code == 200
        
        # Mark attendance for second session same day
        attendance_data_2 = {
            "student_id": "student-123", 
            "subject_id": "subject-123",
            "date": "2024-01-15",
            "status": "present",
            "method": "manual"
        }
        
        response2 = client.post("/api/attendance/manual", json=attendance_data_2)
        assert response2.status_code == 200
        
        # Verify both calls succeeded (no unique constraint violation)
        assert mock_db.mark_attendance.call_count == 2
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_student_cannot_mark_attendance(self, mock_db, mock_get_user):
        """Test that students cannot mark attendance"""
        mock_get_user.return_value = mock_student
        
        attendance_data = {
            "student_id": "student-123",
            "subject_id": "subject-123",
            "date": "2024-01-15",
            "status": "present"
        }
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        
        assert response.status_code == 403
        assert "Only teachers can mark attendance" in response.json()["detail"]
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    def test_teacher_cannot_mark_attendance_for_other_subject(self, mock_db, mock_get_user):
        """Test that teachers can only mark attendance for their own subjects"""
        mock_get_user.return_value = mock_teacher
        
        # Mock subject owned by different teacher
        other_subject = {
            "subject_id": "subject-456",
            "name": "Other Subject", 
            "teacher_id": "other-teacher-123"
        }
        mock_db.get_subject_by_id = AsyncMock(return_value=other_subject)
        
        attendance_data = {
            "student_id": "student-123",
            "subject_id": "subject-456",
            "date": "2024-01-15",
            "status": "present"
        }
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


class TestFaceRecognitionAttendance:
    """Test face recognition attendance marking"""
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    @patch('app.services.face_recognition.face_recognition_service')
    def test_face_recognition_attendance_success(self, mock_face_service, mock_db, mock_get_user):
        """Test successful face recognition attendance marking"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=True)
        mock_db.mark_attendance = AsyncMock(return_value=True)
        
        # Mock face recognition result
        mock_face_service.recognize_student.return_value = {
            "success": True,
            "recognized_students": [
                {
                    "student_id": "student-1",
                    "similarity_score": 0.95
                },
                {
                    "student_id": "student-2", 
                    "similarity_score": 0.88
                }
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
        assert len(result["marked_students"]) == 2
        
        # Verify attendance was marked for both students
        assert mock_db.mark_attendance.call_count == 2
        
        # Verify session tracking in face recognition calls
        call_args_list = mock_db.mark_attendance.call_args_list
        session_ids = [call[0][0]["session_id"] for call in call_args_list]
        assert len(set(session_ids)) == 1  # All should use same session_id
        
        # Verify method is face_recognition
        for call in call_args_list:
            assert call[0][0]["method"] == "face_recognition"
    
    @patch('app.routers.attendance.get_current_user')
    @patch('app.routers.attendance.db')
    @patch('app.services.face_recognition.face_recognition_service')
    def test_face_recognition_no_students_enrolled(self, mock_face_service, mock_db, mock_get_user):
        """Test face recognition when recognized students are not enrolled"""
        # Setup mocks
        mock_get_user.return_value = mock_teacher
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.is_student_enrolled = AsyncMock(return_value=False)  # Not enrolled
        
        # Mock face recognition result
        mock_face_service.recognize_student.return_value = {
            "success": True,
            "recognized_students": [
                {
                    "student_id": "student-1",
                    "similarity_score": 0.95
                }
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
        assert result["success"] == False
        assert "No students were enrolled" in result["message"]
        
        # Verify no attendance was marked
        mock_db.mark_attendance.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__])