import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.models.user import UserResponse, UserType

client = TestClient(app)

# Mock user data
MOCK_STUDENT = {
    "user_id": "student-123",
    "email": "student@test.com",
    "name": "Test Student",
    "user_type": "student",
    "is_face_registered": False,
    "created_at": datetime.now()
}

MOCK_TEACHER = {
    "user_id": "teacher-123",
    "email": "teacher@test.com",
    "name": "Test Teacher",
    "user_type": "teacher",
    "is_face_registered": False,
    "created_at": datetime.now()
}

MOCK_SUBJECT = {
    "subject_id": "subject-123",
    "name": "Test Subject",
    "description": "Test Description",
    "teacher_id": "teacher-123",
    "teacher_name": "Test Teacher",
    "is_active": True
}

class TestAPIIntegration:
    """Integration tests for API endpoints"""
    
    def setup_method(self):
        """Setup for each test method"""
        app.dependency_overrides.clear()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        app.dependency_overrides.clear()
    
    class TestProfileAPI:
        """Test profile management API endpoints"""
        
        def test_get_profile_success(self):
            """Test successful profile retrieval"""
            # Mock authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.profile.db') as mock_db:
                mock_db.get_user_by_id = AsyncMock(return_value=MOCK_STUDENT)
                
                response = client.get("/api/profile/")
                
                assert response.status_code == 200
                data = response.json()
                assert data["user_id"] == MOCK_STUDENT["user_id"]
                assert data["email"] == MOCK_STUDENT["email"]
                assert data["name"] == MOCK_STUDENT["name"]
        
        def test_update_profile_success(self):
            """Test successful profile update"""
            # Mock authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.profile.db') as mock_db:
                mock_db.get_user_by_email = AsyncMock(return_value=None)
                mock_db.update_user_profile = AsyncMock(return_value=True)
                
                response = client.put(
                    "/api/profile/",
                    json={"name": "Updated Name"}
                )
                
                assert response.status_code == 200
                assert response.json()["message"] == "Profile updated successfully"
                
                # Verify database call
                mock_db.update_user_profile.assert_called_once_with(
                    MOCK_STUDENT["user_id"],
                    {"name": "Updated Name"}
                )
        
        def test_update_profile_email_already_exists(self):
            """Test profile update with existing email"""
            # Mock authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.profile.db') as mock_db:
                mock_db.get_user_by_email = AsyncMock(return_value={
                    "user_id": "different-user",
                    "email": "existing@test.com"
                })
                
                response = client.put(
                    "/api/profile/",
                    json={"email": "existing@test.com"}
                )
                
                assert response.status_code == 400
                assert "Email address is already registered" in response.json()["detail"]
        
        def test_change_password_success(self):
            """Test successful password change"""
            # Mock authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.profile.db') as mock_db:
                mock_db.change_user_password = AsyncMock(return_value=True)
                
                response = client.post(
                    "/api/profile/password",
                    json={
                        "current_password": "OldPassword123",
                        "new_password": "NewPassword123"
                    }
                )
                
                assert response.status_code == 200
                assert response.json()["message"] == "Password changed successfully"
                
                # Verify database call
                mock_db.change_user_password.assert_called_once()
        
        def test_change_password_validation_errors(self):
            """Test password change validation"""
            # Mock authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Test password too short
            response = client.post(
                "/api/profile/password",
                json={
                    "current_password": "OldPassword123",
                    "new_password": "Short1"
                }
            )
            
            assert response.status_code == 400
            assert "at least 8 characters long" in response.json()["detail"]
            
            # Test no uppercase
            response = client.post(
                "/api/profile/password",
                json={
                    "current_password": "OldPassword123",
                    "new_password": "newpassword123"
                }
            )
            
            assert response.status_code == 400
            assert "uppercase letter" in response.json()["detail"]
        
        def test_face_registration_student_only(self):
            """Test face registration is only allowed for students"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Create mock file
            file_content = b"fake_image_data"
            
            response = client.post(
                "/api/profile/face",
                files={"file": ("test.jpg", file_content, "image/jpeg")}
            )
            
            assert response.status_code == 403
            assert "Only students can register faces" in response.json()["detail"]
    
    class TestSubjectsAPI:
        """Test subjects management API endpoints"""
        
        def test_unenroll_success(self):
            """Test successful unenrollment"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=True)
                mock_db.unenroll_student = AsyncMock(return_value=True)
                
                response = client.delete("/api/subjects/subject-123/enrollment")
                
                assert response.status_code == 200
                assert response.json()["message"] == "Successfully unenrolled from subject"
                
                # Verify database calls
                mock_db.get_subject_by_id.assert_called_once_with("subject-123")
                mock_db.is_student_enrolled.assert_called_once_with("subject-123", MOCK_STUDENT["user_id"])
                mock_db.unenroll_student.assert_called_once_with("subject-123", MOCK_STUDENT["user_id"])
        
        def test_unenroll_teacher_forbidden(self):
            """Test that teachers cannot unenroll"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            response = client.delete("/api/subjects/subject-123/enrollment")
            
            assert response.status_code == 403
            assert "Only students can unenroll" in response.json()["detail"]
        
        def test_unenroll_not_enrolled(self):
            """Test unenrollment when student is not enrolled"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=False)
                
                response = client.delete("/api/subjects/subject-123/enrollment")
                
                assert response.status_code == 400
                assert "You are not enrolled" in response.json()["detail"]
        
        def test_unenroll_subject_not_found(self):
            """Test unenrollment when subject doesn't exist"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=None)
                
                response = client.delete("/api/subjects/nonexistent/enrollment")
                
                assert response.status_code == 404
                assert "Subject not found" in response.json()["detail"]
        
        def test_update_subject_info_teacher_only(self):
            """Test subject update is only allowed for teachers"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.update_subject_info = AsyncMock(return_value=True)
                
                response = client.put(
                    "/api/subjects/subject-123",
                    json={"name": "Updated Subject Name"}
                )
                
                assert response.status_code == 200
                assert response.json()["message"] == "Subject updated successfully"
                
                # Verify database call
                mock_db.update_subject_info.assert_called_once_with(
                    "subject-123",
                    {"name": "Updated Subject Name"}
                )
        
        def test_remove_student_from_subject_teacher_only(self):
            """Test removing student from subject (teacher only)"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=True)
                mock_db.unenroll_student = AsyncMock(return_value=True)
                
                response = client.delete("/api/subjects/subject-123/students/student-456")
                
                assert response.status_code == 200
                assert response.json()["message"] == "Student removed from subject successfully"
                
                # Verify database calls
                mock_db.unenroll_student.assert_called_once_with("subject-123", "student-456")
    
    class TestAttendanceAPI:
        """Test attendance management API endpoints"""
        
        def test_mark_manual_attendance_with_session_tracking(self):
            """Test manual attendance marking includes session tracking"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.attendance.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=True)
                mock_db.mark_attendance = AsyncMock(return_value=True)
                
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
                
                # Verify attendance was marked with session data
                mock_db.mark_attendance.assert_called_once()
                call_args = mock_db.mark_attendance.call_args[0][0]
                
                # Verify session tracking fields are included
                assert "session_id" in call_args
                assert "session_timestamp" in call_args
                assert call_args["marked_by"] == MOCK_TEACHER["user_id"]
        
        def test_bulk_attendance_creates_single_session(self):
            """Test bulk attendance creates single session for all students"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.attendance.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=True)
                mock_db.mark_attendance = AsyncMock(return_value=True)
                
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
        
        def test_attendance_sessions_endpoint(self):
            """Test attendance sessions retrieval endpoint"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.attendance.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.get_attendance_sessions = AsyncMock(return_value=[
                    {
                        "session_id": "session-1",
                        "date": "2024-01-15",
                        "session_timestamp": "2024-01-15T09:00:00",
                        "students": [
                            {"student_id": "student-1", "status": "present"},
                            {"student_id": "student-2", "status": "present"}
                        ]
                    },
                    {
                        "session_id": "session-2",
                        "date": "2024-01-15",
                        "session_timestamp": "2024-01-15T14:00:00",
                        "students": [
                            {"student_id": "student-1", "status": "absent"},
                            {"student_id": "student-2", "status": "present"}
                        ]
                    }
                ])
                
                response = client.get("/api/attendance/sessions/subject-123")
                
                assert response.status_code == 200
                sessions = response.json()["sessions"]
                assert len(sessions) == 2
                assert sessions[0]["session_id"] == "session-1"
                assert sessions[1]["session_id"] == "session-2"
        
        def test_student_cannot_mark_attendance(self):
            """Test that students cannot mark attendance"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            attendance_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present"
            }
            
            response = client.post("/api/attendance/manual", json=attendance_data)
            
            assert response.status_code == 403
            assert "Only teachers can mark attendance" in response.json()["detail"]
        
        def test_multiple_sessions_same_day_allowed(self):
            """Test that multiple attendance sessions can be marked on the same day"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.attendance.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value=MOCK_SUBJECT)
                mock_db.is_student_enrolled = AsyncMock(return_value=True)
                mock_db.mark_attendance = AsyncMock(return_value=True)
                
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
    
    class TestStudentCountAPI:
        """Test student count accuracy in API responses"""
        
        def test_teacher_subjects_include_correct_student_count(self):
            """Test teacher subjects endpoint returns accurate student counts"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_teacher_subjects = AsyncMock(return_value=[
                    {
                        "subject_id": "subject-1",
                        "name": "Subject 1",
                        "teacher_id": MOCK_TEACHER["user_id"],
                        "teacher_name": MOCK_TEACHER["name"]
                    },
                    {
                        "subject_id": "subject-2",
                        "name": "Subject 2",
                        "teacher_id": MOCK_TEACHER["user_id"],
                        "teacher_name": MOCK_TEACHER["name"]
                    }
                ])
                mock_db.get_subject_student_count = AsyncMock(side_effect=[3, 5])
                
                response = client.get("/api/subjects/teacher")
                
                assert response.status_code == 200
                subjects = response.json()
                
                assert len(subjects) == 2
                assert subjects[0]["student_count"] == 3
                assert subjects[1]["student_count"] == 5
                
                # Verify student count was called for each subject
                assert mock_db.get_subject_student_count.call_count == 2
        
        def test_student_subjects_include_correct_student_count(self):
            """Test student subjects endpoint returns accurate student counts"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_student_subjects = AsyncMock(return_value=[
                    {
                        "subject_id": "subject-1",
                        "name": "Subject 1",
                        "teacher_id": "teacher-1",
                        "teacher_name": "Teacher 1"
                    }
                ])
                mock_db.get_subject_student_count = AsyncMock(return_value=15)
                
                response = client.get("/api/subjects/student")
                
                assert response.status_code == 200
                subjects = response.json()
                
                assert len(subjects) == 1
                assert subjects[0]["student_count"] == 15
                
                # Verify student count was called
                mock_db.get_subject_student_count.assert_called_once_with("subject-1")
        
        def test_zero_student_count_handling(self):
            """Test handling of subjects with zero students"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_teacher_subjects = AsyncMock(return_value=[
                    {
                        "subject_id": "subject-1",
                        "name": "Empty Subject",
                        "teacher_id": MOCK_TEACHER["user_id"],
                        "teacher_name": MOCK_TEACHER["name"]
                    }
                ])
                mock_db.get_subject_student_count = AsyncMock(return_value=0)
                
                response = client.get("/api/subjects/teacher")
                
                assert response.status_code == 200
                subjects = response.json()
                
                assert len(subjects) == 1
                assert subjects[0]["student_count"] == 0
    
    class TestAuthorizationAndSecurity:
        """Test authorization and security aspects"""
        
        def test_unauthenticated_requests_rejected(self):
            """Test that unauthenticated requests are rejected"""
            # Test profile endpoint
            response = client.get("/api/profile/")
            assert response.status_code == 403
            
            # Test attendance endpoint
            response = client.post("/api/attendance/manual", json={})
            assert response.status_code == 403
            
            # Test subjects endpoint
            response = client.delete("/api/subjects/test/enrollment")
            assert response.status_code == 403
        
        def test_teacher_only_endpoints_protected(self):
            """Test that teacher-only endpoints are protected"""
            # Mock student authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_STUDENT)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Test attendance marking (teacher only)
            response = client.post("/api/attendance/manual", json={
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present"
            })
            assert response.status_code == 403
            
            # Test subject update (teacher only)
            response = client.put("/api/subjects/subject-123", json={
                "name": "Updated Name"
            })
            assert response.status_code == 403
        
        def test_student_only_endpoints_protected(self):
            """Test that student-only endpoints are protected"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Test face registration (student only)
            response = client.post(
                "/api/profile/face",
                files={"file": ("test.jpg", b"fake_data", "image/jpeg")}
            )
            assert response.status_code == 403
            
            # Test unenrollment (student only)
            response = client.delete("/api/subjects/subject-123/enrollment")
            assert response.status_code == 403
        
        def test_subject_ownership_validation(self):
            """Test that teachers can only modify their own subjects"""
            # Mock teacher authentication
            def mock_get_current_user():
                return UserResponse(**MOCK_TEACHER)
            
            app.dependency_overrides[get_current_user] = mock_get_current_user
            
            # Mock database - subject belongs to different teacher
            with patch('app.routers.subjects.db') as mock_db:
                mock_db.get_subject_by_id = AsyncMock(return_value={
                    "subject_id": "subject-123",
                    "name": "Test Subject",
                    "teacher_id": "different-teacher-id"
                })
                
                response = client.put("/api/subjects/subject-123", json={
                    "name": "Updated Name"
                })
                
                assert response.status_code == 403
                assert "Access denied" in response.json()["detail"]


# Import the get_current_user function for mocking
try:
    from app.routers.auth import get_current_user
except ImportError:
    # Fallback if import fails
    def get_current_user():
        pass


if __name__ == "__main__":
    pytest.main([__file__])