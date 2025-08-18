import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, date
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.local_supabase import LocalSupabase

class TestLocalSupabaseService:
    """Test LocalSupabase service methods"""
    
    @pytest.fixture
    def db_service(self):
        """Create LocalSupabase instance for testing"""
        return LocalSupabase()
    
    @pytest.fixture
    def mock_httpx_client(self):
        """Mock httpx client for testing"""
        with patch('httpx.AsyncClient') as mock_client:
            yield mock_client
    
    class TestUserProfileMethods:
        """Test user profile related methods"""
        
        @pytest.mark.asyncio
        async def test_update_user_profile_success(self, db_service, mock_httpx_client):
            """Test successful user profile update"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"user_id": "user-123", "name": "Updated Name"}]
            
            mock_httpx_client.return_value.__aenter__.return_value.patch.return_value = mock_response
            
            # Test the method
            result = await db_service.update_user_profile("user-123", {"name": "Updated Name"})
            
            assert result == True
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.patch.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.patch.call_args
            
            assert "users" in call_args[0][0]
            assert call_args[1]["params"]["user_id"] == "eq.user-123"
            assert call_args[1]["json"] == {"name": "Updated Name"}
        
        @pytest.mark.asyncio
        async def test_update_user_profile_failure(self, db_service, mock_httpx_client):
            """Test user profile update failure"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 400
            mock_response.text = "Bad request"
            
            mock_httpx_client.return_value.__aenter__.return_value.patch.return_value = mock_response
            
            # Test the method
            result = await db_service.update_user_profile("user-123", {"name": "Updated Name"})
            
            assert result == False
        
        @pytest.mark.asyncio
        async def test_change_user_password_success(self, db_service, mock_httpx_client):
            """Test successful password change"""
            # Setup mock responses
            mock_get_response = AsyncMock()
            mock_get_response.status_code = 200
            mock_get_response.json.return_value = [{"password_hash": "$2b$12$hashedpassword"}]
            
            mock_patch_response = AsyncMock()
            mock_patch_response.status_code = 200
            mock_patch_response.json.return_value = [{"user_id": "user-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_get_response
            mock_client.patch.return_value = mock_patch_response
            
            # Mock password verification function
            def mock_verify_password(plain, hashed):
                return plain == "correct_password"
            
            # Test the method
            result = await db_service.change_user_password(
                "user-123", 
                "correct_password", 
                "$2b$12$newhash",
                mock_verify_password
            )
            
            assert result == True
            
            # Verify get call for current password
            mock_client.get.assert_called_once()
            # Verify patch call for password update
            mock_client.patch.assert_called_once()
        
        @pytest.mark.asyncio
        async def test_change_user_password_wrong_current(self, db_service, mock_httpx_client):
            """Test password change with wrong current password"""
            # Setup mock response
            mock_get_response = AsyncMock()
            mock_get_response.status_code = 200
            mock_get_response.json.return_value = [{"password_hash": "$2b$12$hashedpassword"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_get_response
            
            # Mock password verification function that returns False
            def mock_verify_password(plain, hashed):
                return False
            
            # Test the method
            result = await db_service.change_user_password(
                "user-123", 
                "wrong_password", 
                "$2b$12$newhash",
                mock_verify_password
            )
            
            assert result == False
        
        @pytest.mark.asyncio
        async def test_update_user_face_status_success(self, db_service, mock_httpx_client):
            """Test successful face status update"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"user_id": "user-123", "is_face_registered": True}]
            
            mock_httpx_client.return_value.__aenter__.return_value.patch.return_value = mock_response
            
            # Test the method
            result = await db_service.update_user_face_status("user-123", True)
            
            assert result == True
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.patch.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.patch.call_args
            
            assert call_args[1]["json"] == {"is_face_registered": True}
    
    class TestUnenrollmentMethods:
        """Test unenrollment related methods"""
        
        @pytest.mark.asyncio
        async def test_unenroll_student_success(self, db_service, mock_httpx_client):
            """Test successful student unenrollment"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"subject_id": "subject-123", "student_id": "student-123"}]
            
            mock_httpx_client.return_value.__aenter__.return_value.delete.return_value = mock_response
            
            # Test the method
            result = await db_service.unenroll_student("subject-123", "student-123")
            
            assert result == True
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.delete.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.delete.call_args
            
            assert "subject_enrollments" in call_args[0][0]
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["student_id"] == "eq.student-123"
        
        @pytest.mark.asyncio
        async def test_unenroll_student_failure(self, db_service, mock_httpx_client):
            """Test student unenrollment failure"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 404
            mock_response.text = "Not found"
            
            mock_httpx_client.return_value.__aenter__.return_value.delete.return_value = mock_response
            
            # Test the method
            result = await db_service.unenroll_student("subject-123", "student-123")
            
            assert result == False
        
        @pytest.mark.asyncio
        async def test_is_student_enrolled_true(self, db_service, mock_httpx_client):
            """Test checking enrollment when student is enrolled"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"subject_id": "subject-123", "student_id": "student-123"}]
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            result = await db_service.is_student_enrolled("subject-123", "student-123")
            
            assert result == True
        
        @pytest.mark.asyncio
        async def test_is_student_enrolled_false(self, db_service, mock_httpx_client):
            """Test checking enrollment when student is not enrolled"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = []  # Empty result
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            result = await db_service.is_student_enrolled("subject-123", "student-123")
            
            assert result == False
    
    class TestStudentCountMethods:
        """Test student count calculation methods"""
        
        @pytest.mark.asyncio
        async def test_get_subject_student_count_accurate(self, db_service, mock_httpx_client):
            """Test accurate student count calculation"""
            # Setup mock response with active enrollments
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {"student_id": "student-1", "subject_id": "subject-123", "is_active": True},
                {"student_id": "student-2", "subject_id": "subject-123", "is_active": True},
                {"student_id": "student-3", "subject_id": "subject-123", "is_active": True}
            ]
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            count = await db_service.get_subject_student_count("subject-123")
            
            assert count == 3
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.get.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.get.call_args
            
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["is_active"] == "eq.true"
        
        @pytest.mark.asyncio
        async def test_get_subject_student_count_zero(self, db_service, mock_httpx_client):
            """Test student count when no students enrolled"""
            # Setup mock response with no enrollments
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            count = await db_service.get_subject_student_count("subject-123")
            
            assert count == 0
        
        @pytest.mark.asyncio
        async def test_get_subject_student_count_error_handling(self, db_service, mock_httpx_client):
            """Test student count with database error"""
            # Setup mock response with error
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_response.text = "Internal server error"
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            count = await db_service.get_subject_student_count("subject-123")
            
            assert count == 0  # Should return 0 on error
    
    class TestAttendanceSessionMethods:
        """Test attendance session related methods"""
        
        @pytest.mark.asyncio
        async def test_mark_attendance_with_session_tracking(self, db_service, mock_httpx_client):
            """Test attendance marking with session tracking"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "att-123"}]
            
            mock_httpx_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            # Test data with session tracking
            attendance_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual",
                "session_id": str(uuid.uuid4()),
                "session_timestamp": datetime.now().isoformat(),
                "marked_by": "teacher-123"
            }
            
            # Test the method
            result = await db_service.mark_attendance(attendance_data)
            
            assert result == True
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.post.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.post.call_args
            
            assert "attendance" in call_args[0][0]
            assert call_args[1]["json"] == attendance_data
        
        @pytest.mark.asyncio
        async def test_get_attendance_sessions_grouped(self, db_service, mock_httpx_client):
            """Test getting attendance sessions grouped by session"""
            # Setup mock response with multiple sessions
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "id": "att-1",
                    "student_id": "student-1",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "present",
                    "session_id": "session-1",
                    "session_timestamp": "2024-01-15T09:00:00"
                },
                {
                    "id": "att-2",
                    "student_id": "student-2",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "present",
                    "session_id": "session-1",
                    "session_timestamp": "2024-01-15T09:00:00"
                },
                {
                    "id": "att-3",
                    "student_id": "student-1",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "absent",
                    "session_id": "session-2",
                    "session_timestamp": "2024-01-15T14:00:00"
                }
            ]
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            sessions = await db_service.get_attendance_sessions("subject-123")
            
            assert len(sessions) == 3
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.get.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.get.call_args
            
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert "order" in params  # Should be ordered by session_timestamp
    
    class TestClassManagementMethods:
        """Test class management related methods"""
        
        @pytest.mark.asyncio
        async def test_update_subject_info_success(self, db_service, mock_httpx_client):
            """Test successful subject information update"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"subject_id": "subject-123", "name": "Updated Subject"}]
            
            mock_httpx_client.return_value.__aenter__.return_value.patch.return_value = mock_response
            
            # Test the method
            result = await db_service.update_subject_info("subject-123", {"name": "Updated Subject"})
            
            assert result == True
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.patch.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.patch.call_args
            
            assert "subjects" in call_args[0][0]
            assert call_args[1]["params"]["subject_id"] == "eq.subject-123"
            assert call_args[1]["json"] == {"name": "Updated Subject"}
        
        @pytest.mark.asyncio
        async def test_get_subject_students_list(self, db_service, mock_httpx_client):
            """Test getting list of enrolled students for a subject"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "student_id": "student-1",
                    "subject_id": "subject-123",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00",
                    "student": {
                        "user_id": "student-1",
                        "name": "Student 1",
                        "email": "student1@test.com",
                        "is_face_registered": True
                    }
                },
                {
                    "student_id": "student-2",
                    "subject_id": "subject-123",
                    "is_active": True,
                    "created_at": "2024-01-02T00:00:00",
                    "student": {
                        "user_id": "student-2",
                        "name": "Student 2",
                        "email": "student2@test.com",
                        "is_face_registered": False
                    }
                }
            ]
            
            mock_httpx_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            # Test the method
            students = await db_service.get_subject_students("subject-123")
            
            assert len(students) == 2
            assert students[0]["user_id"] == "student-1"
            assert students[1]["user_id"] == "student-2"
            
            # Verify the correct API call was made
            mock_httpx_client.return_value.__aenter__.return_value.get.assert_called_once()
            call_args = mock_httpx_client.return_value.__aenter__.return_value.get.call_args
            
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["is_active"] == "eq.true"
            assert "select" in params  # Should include student details
    
    class TestErrorHandling:
        """Test error handling in service methods"""
        
        @pytest.mark.asyncio
        async def test_network_error_handling(self, db_service, mock_httpx_client):
            """Test handling of network errors"""
            # Setup mock to raise network error
            mock_httpx_client.return_value.__aenter__.return_value.get.side_effect = httpx.NetworkError("Connection failed")
            
            # Test various methods handle network errors gracefully
            count = await db_service.get_subject_student_count("subject-123")
            assert count == 0
            
            result = await db_service.update_user_profile("user-123", {"name": "Test"})
            assert result == False
            
            enrolled = await db_service.is_student_enrolled("subject-123", "student-123")
            assert enrolled == False
        
        @pytest.mark.asyncio
        async def test_timeout_error_handling(self, db_service, mock_httpx_client):
            """Test handling of timeout errors"""
            # Setup mock to raise timeout error
            mock_httpx_client.return_value.__aenter__.return_value.get.side_effect = httpx.TimeoutException("Request timeout")
            
            # Test methods handle timeout errors gracefully
            sessions = await db_service.get_attendance_sessions("subject-123")
            assert sessions == []
            
            students = await db_service.get_subject_students("subject-123")
            assert students == []


if __name__ == "__main__":
    pytest.main([__file__])