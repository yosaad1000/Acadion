import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
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

class TestStudentCountFixes:
    """Test student count calculation fixes"""
    
    def setup_method(self):
        """Setup for each test method"""
        app.dependency_overrides.clear()
    
    def teardown_method(self):
        """Cleanup after each test method"""
        app.dependency_overrides.clear()
    
    def test_teacher_subjects_endpoint_returns_student_counts(self):
        """Test that teacher subjects endpoint includes student counts"""
        def override_get_current_user():
            return mock_teacher
        
        app.dependency_overrides[get_current_user] = override_get_current_user
        
        # Mock the database methods
        mock_db = AsyncMock()
        
        # Mock teacher subjects response
        mock_subjects = [
            {
                "subject_id": "subject-1",
                "subject_code": "CS101",
                "name": "Computer Science 101",
                "description": "Intro to CS",
                "teacher_id": "teacher-123",
                "teacher_name": "Test Teacher",  # Add teacher_name
                "invite_code": "ABC123",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00",
                "student_count": 5  # Pre-calculated count
            }
        ]
        
        mock_db.get_teacher_subjects = AsyncMock(return_value=mock_subjects)
        
        with patch('app.routers.subjects.db', mock_db):
            response = client.get("/api/subjects")
            
            assert response.status_code == 200
            subjects = response.json()
            
            assert len(subjects) == 1
            assert subjects[0]["student_count"] == 5
            assert subjects[0]["subject_id"] == "subject-1"
    
    def test_student_count_method_handles_empty_results(self):
        """Test that student count method handles empty enrollment results"""
        from app.services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        # Mock httpx client to return empty enrollments
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock empty response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = []  # Empty list
            
            mock_client.get.return_value = mock_response
            
            # Test the method
            import asyncio
            count = asyncio.run(db.get_subject_student_count("subject-empty"))
            
            assert count == 0
    
    def test_student_count_method_handles_api_errors(self):
        """Test that student count method handles API errors gracefully"""
        from app.services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        # Mock httpx client to return error
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock error response
            mock_response = MagicMock()
            mock_response.status_code = 500
            
            mock_client.get.return_value = mock_response
            
            # Test the method
            import asyncio
            count = asyncio.run(db.get_subject_student_count("subject-error"))
            
            assert count == 0  # Should return 0 on error
    
    def test_student_count_method_with_valid_enrollments(self):
        """Test that student count method correctly counts valid enrollments"""
        from app.services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        # Mock httpx client to return enrollments
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock response with 3 active enrollments including student data
            mock_enrollments = [
                {
                    "id": "enrollment-1",
                    "student_id": "student-1", 
                    "subject_id": "subject-123", 
                    "is_active": True,
                    "student": {"user_id": "student-1", "name": "Student 1", "email": "student1@test.com"}
                },
                {
                    "id": "enrollment-2",
                    "student_id": "student-2", 
                    "subject_id": "subject-123", 
                    "is_active": True,
                    "student": {"user_id": "student-2", "name": "Student 2", "email": "student2@test.com"}
                },
                {
                    "id": "enrollment-3",
                    "student_id": "student-3", 
                    "subject_id": "subject-123", 
                    "is_active": True,
                    "student": {"user_id": "student-3", "name": "Student 3", "email": "student3@test.com"}
                }
            ]
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_enrollments
            
            mock_client.get.return_value = mock_response
            
            # Test the method
            import asyncio
            count = asyncio.run(db.get_subject_student_count("subject-123"))
            
            assert count == 3
            
            # Verify the correct API call was made
            mock_client.get.assert_called_once()
            call_args = mock_client.get.call_args
            
            # Check URL
            assert "subject_enrollments" in call_args[0][0]
            
            # Check parameters
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["is_active"] == "eq.true"


if __name__ == "__main__":
    pytest.main([__file__])