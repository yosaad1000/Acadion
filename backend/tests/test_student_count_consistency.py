import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.local_supabase import LocalSupabase

class TestStudentCountConsistency:
    """Test that student count methods are consistent with each other"""
    
    def test_student_count_matches_student_list_length(self):
        """Test that get_subject_student_count returns the same count as len(get_subject_students)"""
        db = LocalSupabase()
        
        # Mock httpx client to return enrollments with student data
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock response with valid student data
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
                }
            ]
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_enrollments
            
            mock_client.get.return_value = mock_response
            
            # Test both methods
            import asyncio
            students = asyncio.run(db.get_subject_students("subject-123"))
            count = asyncio.run(db.get_subject_student_count("subject-123"))
            
            # They should be consistent
            assert len(students) == count
            assert count == 2
    
    def test_student_count_handles_missing_student_data(self):
        """Test that both methods handle missing student data consistently"""
        db = LocalSupabase()
        
        # Mock httpx client to return enrollments with some missing student data
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # Mock response with mixed data - some valid, some missing student info
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
                    "student": None  # Missing student data
                },
                {
                    "id": "enrollment-3",
                    "student_id": "student-3", 
                    "subject_id": "subject-123",
                    "is_active": True,
                    "student": {"user_id": "student-3", "name": "Student 3", "email": "student3@test.com"}
                },
                {
                    "id": "enrollment-4",
                    "student_id": "student-4",
                    "subject_id": "subject-123",
                    "is_active": True,
                    "student": {"user_id": None, "name": "Invalid Student"}  # Invalid student data
                }
            ]
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_enrollments
            
            mock_client.get.return_value = mock_response
            
            # Test both methods
            import asyncio
            students = asyncio.run(db.get_subject_students("subject-123"))
            count = asyncio.run(db.get_subject_student_count("subject-123"))
            
            # Should only count valid students (enrollment-1 and enrollment-3)
            assert len(students) == count
            assert count == 2
            
            # Verify the valid students are returned
            student_ids = [s["user_id"] for s in students]
            assert "student-1" in student_ids
            assert "student-3" in student_ids
    
    def test_student_count_handles_empty_response(self):
        """Test that both methods handle empty responses consistently"""
        db = LocalSupabase()
        
        # Mock httpx client to return empty response
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = []  # Empty list
            
            mock_client.get.return_value = mock_response
            
            # Test both methods
            import asyncio
            students = asyncio.run(db.get_subject_students("subject-empty"))
            count = asyncio.run(db.get_subject_student_count("subject-empty"))
            
            # Both should return 0/empty
            assert len(students) == count
            assert count == 0
            assert students == []
    
    def test_student_count_handles_api_error(self):
        """Test that both methods handle API errors consistently"""
        db = LocalSupabase()
        
        # Mock httpx client to return error
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 500  # Server error
            
            mock_client.get.return_value = mock_response
            
            # Test both methods
            import asyncio
            students = asyncio.run(db.get_subject_students("subject-error"))
            count = asyncio.run(db.get_subject_student_count("subject-error"))
            
            # Both should return 0/empty on error
            assert len(students) == count
            assert count == 0
            assert students == []


if __name__ == "__main__":
    pytest.main([__file__])