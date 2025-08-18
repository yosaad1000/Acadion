import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import datetime
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

class TestStudentCountCalculations:
    """Test student count calculations and reporting"""
    
    def setup_method(self):
        """Setup for each test method"""
        app.dependency_overrides.clear()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        app.dependency_overrides.clear()
    
    def test_get_subject_student_count_accuracy(self):
        """Test that get_subject_student_count returns accurate counts"""
        from app.services.local_supabase import LocalSupabase
        
        # Mock the database response for subject_enrollments
        mock_enrollments = [
            {"student_id": "student-1", "subject_id": "subject-123", "is_active": True},
            {"student_id": "student-2", "subject_id": "subject-123", "is_active": True},
            {"student_id": "student-3", "subject_id": "subject-123", "is_active": True},
            {"student_id": "student-4", "subject_id": "subject-123", "is_active": False}  # Inactive
        ]
        
        db = LocalSupabase()
        
        with patch('httpx.AsyncClient') as mock_client:
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_enrollments[:3]  # Only active enrollments
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            import asyncio
            count = asyncio.run(db.get_subject_student_count("subject-123"))
            
            assert count == 3  # Should only count active enrollments
            
            # Verify the correct API call was made
            mock_client.return_value.__aenter__.return_value.get.assert_called_once()
            call_args = mock_client.return_value.__aenter__.return_value.get.call_args
            
            # Check that the correct parameters were used
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["is_active"] == "eq.true"
    
    def test_teacher_subjects_include_correct_student_count(self):
        """Test that teacher subjects endpoint returns correct student counts"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock database responses
        mock_subjects = [
            {
                "subject_id": "subject-1",
                "subject_code": "CS101",
                "name": "Computer Science 101",
                "description": "Intro to CS",
                "teacher_id": "teacher-123",
                "teacher": {"name": "Test Teacher"},
                "invite_code": "ABC123",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00"
            },
            {
                "subject_id": "subject-2", 
                "subject_code": "CS102",
                "name": "Computer Science 102",
                "description": "Advanced CS",
                "teacher_id": "teacher-123",
                "teacher": {"name": "Test Teacher"},
                "invite_code": "DEF456",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_teacher_subjects = AsyncMock(return_value=mock_subjects)
        
        # Mock student count calls
        def mock_student_count(subject_id):
            if subject_id == "subject-1":
                return 5
            elif subject_id == "subject-2":
                return 3
            return 0
        
        mock_db.get_subject_student_count = AsyncMock(side_effect=mock_student_count)
        
        with patch('app.routers.subjects.db', mock_db):
            response = client.get("/api/subjects")
            
            assert response.status_code == 200
            subjects = response.json()
            
            assert len(subjects) == 2
            
            # Check that student counts are correct
            subject_1 = next(s for s in subjects if s["subject_id"] == "subject-1")
            subject_2 = next(s for s in subjects if s["subject_id"] == "subject-2")
            
            assert subject_1["student_count"] == 5
            assert subject_2["student_count"] == 3
            
            # Verify that get_subject_student_count was called for each subject
            assert mock_db.get_subject_student_count.call_count == 2
    
    def test_student_subjects_include_correct_student_count(self):
        """Test that student subjects endpoint returns correct student counts"""
        def override_get_current_user():
            return mock_student
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock database responses for student enrollments
        mock_enrollments = [
            {
                "student_id": "student-123",
                "subject_id": "subject-1",
                "is_active": True,
                "subject": {
                    "subject_id": "subject-1",
                    "subject_code": "CS101",
                    "name": "Computer Science 101",
                    "description": "Intro to CS",
                    "teacher_id": "teacher-123",
                    "teacher": {"name": "Test Teacher"},
                    "invite_code": "ABC123",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00"
                }
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_student_subjects = AsyncMock(return_value=[enrollment["subject"] for enrollment in mock_enrollments])
        mock_db.get_subject_student_count = AsyncMock(return_value=10)
        
        with patch('app.routers.subjects.db', mock_db):
            response = client.get("/api/subjects")
            
            assert response.status_code == 200
            subjects = response.json()
            
            assert len(subjects) == 1
            assert subjects[0]["student_count"] == 10
            
            # Verify that get_subject_student_count was called
            mock_db.get_subject_student_count.assert_called_once_with("subject-1")
    
    def test_attendance_dashboard_shows_correct_student_count(self):
        """Test that attendance dashboard shows correct student count"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock subject and students data
        mock_subject = {
            "subject_id": "subject-123",
            "name": "Test Subject",
            "teacher_id": "teacher-123"
        }
        
        mock_students = [
            {"user_id": "student-1", "name": "Student 1"},
            {"user_id": "student-2", "name": "Student 2"},
            {"user_id": "student-3", "name": "Student 3"}
        ]
        
        mock_attendance_records = [
            {"student_id": "student-1", "status": "present", "date": "2024-01-15"},
            {"student_id": "student-2", "status": "present", "date": "2024-01-15"},
            {"student_id": "student-1", "status": "present", "date": "2024-01-16"}
        ]
        
        mock_db = AsyncMock()
        mock_db.get_subject_by_id = AsyncMock(return_value=mock_subject)
        mock_db.get_attendance_by_subject = AsyncMock(return_value=mock_attendance_records)
        mock_db.get_subject_students = AsyncMock(return_value=mock_students)
        
        with patch('app.routers.attendance.db', mock_db):
            response = client.get("/api/attendance/subject-123/dashboard")
            
            assert response.status_code == 200
            dashboard = response.json()
            
            # Check that total_students matches the actual enrolled students
            assert dashboard["total_students"] == 3
            assert len(dashboard["enrolled_students"]) == 3
            
            # Verify correct statistics
            assert dashboard["total_sessions"] == 2  # 2 unique dates
            assert dashboard["total_present_records"] == 3  # 3 present records
    
    def test_zero_student_count_handling(self):
        """Test that zero student counts are handled correctly"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock subject with no students
        mock_subjects = [
            {
                "subject_id": "subject-empty",
                "subject_code": "EMPTY101",
                "name": "Empty Subject",
                "description": "No students",
                "teacher_id": "teacher-123",
                "teacher": {"name": "Test Teacher"},
                "invite_code": "EMPTY1",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00"
            }
        ]
        
        mock_db = AsyncMock()
        mock_db.get_teacher_subjects = AsyncMock(return_value=mock_subjects)
        mock_db.get_subject_student_count = AsyncMock(return_value=0)
        
        with patch('app.routers.subjects.db', mock_db):
            response = client.get("/api/subjects")
            
            assert response.status_code == 200
            subjects = response.json()
            
            assert len(subjects) == 1
            assert subjects[0]["student_count"] == 0
            
            # Verify the method was still called
            mock_db.get_subject_student_count.assert_called_once_with("subject-empty")


if __name__ == "__main__":
    pytest.main([__file__])