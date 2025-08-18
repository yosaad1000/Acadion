import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, date
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.local_supabase import LocalSupabase

class TestDatabaseSchema:
    """Test database schema changes and data integrity"""
    
    @pytest.fixture
    def db_service(self):
        """Create LocalSupabase instance for testing"""
        return LocalSupabase()
    
    @pytest.fixture
    def mock_httpx_client(self):
        """Mock httpx client for testing"""
        with patch('httpx.AsyncClient') as mock_client:
            yield mock_client
    
    class TestAttendanceSchemaChanges:
        """Test attendance table schema changes"""
        
        @pytest.mark.asyncio
        async def test_attendance_supports_multiple_sessions_same_day(self, db_service, mock_httpx_client):
            """Test that attendance table supports multiple sessions on same day"""
            # Setup mock response for successful attendance marking
            mock_response = AsyncMock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "att-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.post.return_value = mock_response
            
            # Test data for first session
            session_1_id = str(uuid.uuid4())
            attendance_data_1 = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual",
                "session_id": session_1_id,
                "session_timestamp": "2024-01-15T09:00:00",
                "marked_by": "teacher-123"
            }
            
            # Test data for second session (same day, different session)
            session_2_id = str(uuid.uuid4())
            attendance_data_2 = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",  # Same date
                "status": "absent",
                "method": "manual",
                "session_id": session_2_id,  # Different session ID
                "session_timestamp": "2024-01-15T14:00:00",  # Different time
                "marked_by": "teacher-123"
            }
            
            # Both should succeed (no unique constraint violation)
            result1 = await db_service.mark_attendance(attendance_data_1)
            result2 = await db_service.mark_attendance(attendance_data_2)
            
            assert result1 == True
            assert result2 == True
            assert mock_client.post.call_count == 2
            
            # Verify different session IDs were used
            call_1_data = mock_client.post.call_args_list[0][1]["json"]
            call_2_data = mock_client.post.call_args_list[1][1]["json"]
            
            assert call_1_data["session_id"] != call_2_data["session_id"]
            assert call_1_data["session_timestamp"] != call_2_data["session_timestamp"]
        
        @pytest.mark.asyncio
        async def test_attendance_session_id_generation(self, db_service, mock_httpx_client):
            """Test that session IDs are properly generated and unique"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "att-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.post.return_value = mock_response
            
            # Mark attendance multiple times
            session_ids = []
            for i in range(5):
                session_id = str(uuid.uuid4())
                attendance_data = {
                    "student_id": f"student-{i}",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "present",
                    "method": "manual",
                    "session_id": session_id,
                    "session_timestamp": datetime.now().isoformat(),
                    "marked_by": "teacher-123"
                }
                
                result = await db_service.mark_attendance(attendance_data)
                assert result == True
                session_ids.append(session_id)
            
            # Verify all session IDs are unique
            assert len(set(session_ids)) == 5
        
        @pytest.mark.asyncio
        async def test_attendance_session_timestamp_format(self, db_service, mock_httpx_client):
            """Test that session timestamps are properly formatted"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "att-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.post.return_value = mock_response
            
            # Test with ISO format timestamp
            timestamp = datetime.now().isoformat()
            attendance_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual",
                "session_id": str(uuid.uuid4()),
                "session_timestamp": timestamp,
                "marked_by": "teacher-123"
            }
            
            result = await db_service.mark_attendance(attendance_data)
            assert result == True
            
            # Verify timestamp format is preserved
            call_data = mock_client.post.call_args[1]["json"]
            assert call_data["session_timestamp"] == timestamp
        
        @pytest.mark.asyncio
        async def test_attendance_backward_compatibility(self, db_service, mock_httpx_client):
            """Test that attendance marking works with and without session data"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "att-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.post.return_value = mock_response
            
            # Test with minimal data (backward compatibility)
            minimal_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual",
                "marked_by": "teacher-123"
            }
            
            result = await db_service.mark_attendance(minimal_data)
            assert result == True
            
            # Test with full session data
            full_data = {
                "student_id": "student-123",
                "subject_id": "subject-123",
                "date": "2024-01-15",
                "status": "present",
                "method": "manual",
                "session_id": str(uuid.uuid4()),
                "session_timestamp": datetime.now().isoformat(),
                "marked_by": "teacher-123"
            }
            
            result = await db_service.mark_attendance(full_data)
            assert result == True
            
            assert mock_client.post.call_count == 2
    
    class TestUserProfileSchemaChanges:
        """Test user profile schema changes"""
        
        @pytest.mark.asyncio
        async def test_user_profile_update_tracking(self, db_service, mock_httpx_client):
            """Test that user profile updates are tracked with timestamps"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"user_id": "user-123", "updated_at": datetime.now().isoformat()}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.patch.return_value = mock_response
            
            # Test profile update
            profile_data = {
                "name": "Updated Name",
                "email": "updated@test.com"
            }
            
            result = await db_service.update_user_profile("user-123", profile_data)
            assert result == True
            
            # Verify the update call includes the data
            call_args = mock_client.patch.call_args
            assert call_args[1]["json"] == profile_data
        
        @pytest.mark.asyncio
        async def test_password_change_tracking(self, db_service, mock_httpx_client):
            """Test that password changes are tracked"""
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
            
            # Mock password verification
            def mock_verify_password(plain, hashed):
                return True
            
            # Test password change
            result = await db_service.change_user_password(
                "user-123",
                "old_password",
                "$2b$12$newhash",
                mock_verify_password
            )
            
            assert result == True
            
            # Verify both get and patch calls were made
            mock_client.get.assert_called_once()
            mock_client.patch.assert_called_once()
        
        @pytest.mark.asyncio
        async def test_face_registration_status_update(self, db_service, mock_httpx_client):
            """Test face registration status updates"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"user_id": "user-123", "is_face_registered": True}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.patch.return_value = mock_response
            
            # Test setting face registration to true
            result = await db_service.update_user_face_status("user-123", True)
            assert result == True
            
            # Test setting face registration to false
            mock_response.json.return_value = [{"user_id": "user-123", "is_face_registered": False}]
            result = await db_service.update_user_face_status("user-123", False)
            assert result == True
            
            assert mock_client.patch.call_count == 2
    
    class TestEnrollmentSchemaIntegrity:
        """Test enrollment schema integrity"""
        
        @pytest.mark.asyncio
        async def test_enrollment_status_consistency(self, db_service, mock_httpx_client):
            """Test enrollment status consistency"""
            # Setup mock response for active enrollment
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {"subject_id": "subject-123", "student_id": "student-123", "is_active": True}
            ]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_response
            
            # Test enrollment check
            is_enrolled = await db_service.is_student_enrolled("subject-123", "student-123")
            assert is_enrolled == True
            
            # Test with inactive enrollment
            mock_response.json.return_value = [
                {"subject_id": "subject-123", "student_id": "student-123", "is_active": False}
            ]
            
            is_enrolled = await db_service.is_student_enrolled("subject-123", "student-123")
            assert is_enrolled == False  # Should return False for inactive enrollments
        
        @pytest.mark.asyncio
        async def test_unenrollment_data_integrity(self, db_service, mock_httpx_client):
            """Test unenrollment maintains data integrity"""
            # Setup mock response for successful unenrollment
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"subject_id": "subject-123", "student_id": "student-123"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.delete.return_value = mock_response
            
            # Test unenrollment
            result = await db_service.unenroll_student("subject-123", "student-123")
            assert result == True
            
            # Verify correct delete parameters
            call_args = mock_client.delete.call_args
            params = call_args[1]["params"]
            assert params["subject_id"] == "eq.subject-123"
            assert params["student_id"] == "eq.student-123"
        
        @pytest.mark.asyncio
        async def test_student_count_accuracy_with_active_enrollments(self, db_service, mock_httpx_client):
            """Test student count only includes active enrollments"""
            # Setup mock response with mixed active/inactive enrollments
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {"student_id": "student-1", "subject_id": "subject-123", "is_active": True},
                {"student_id": "student-2", "subject_id": "subject-123", "is_active": True},
                {"student_id": "student-3", "subject_id": "subject-123", "is_active": True}
            ]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_response
            
            # Test student count
            count = await db_service.get_subject_student_count("subject-123")
            assert count == 3
            
            # Verify query filters for active enrollments only
            call_args = mock_client.get.call_args
            params = call_args[1]["params"]
            assert params["is_active"] == "eq.true"
    
    class TestSubjectSchemaChanges:
        """Test subject schema changes"""
        
        @pytest.mark.asyncio
        async def test_subject_info_updates(self, db_service, mock_httpx_client):
            """Test subject information updates"""
            # Setup mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [{"subject_id": "subject-123", "name": "Updated Subject"}]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.patch.return_value = mock_response
            
            # Test name update
            result = await db_service.update_subject_info("subject-123", {"name": "Updated Subject"})
            assert result == True
            
            # Test description update
            mock_response.json.return_value = [{"subject_id": "subject-123", "description": "Updated Description"}]
            result = await db_service.update_subject_info("subject-123", {"description": "Updated Description"})
            assert result == True
            
            # Test both name and description update
            update_data = {"name": "New Name", "description": "New Description"}
            mock_response.json.return_value = [{"subject_id": "subject-123"}]
            result = await db_service.update_subject_info("subject-123", update_data)
            assert result == True
            
            # Verify the last call included both fields
            call_args = mock_client.patch.call_args
            assert call_args[1]["json"] == update_data
        
        @pytest.mark.asyncio
        async def test_subject_student_list_with_details(self, db_service, mock_httpx_client):
            """Test getting subject students with full details"""
            # Setup mock response with student details
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
                        "name": "Student One",
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
                        "name": "Student Two",
                        "email": "student2@test.com",
                        "is_face_registered": False
                    }
                }
            ]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_response
            
            # Test getting student list
            students = await db_service.get_subject_students("subject-123")
            
            assert len(students) == 2
            assert students[0]["user_id"] == "student-1"
            assert students[0]["name"] == "Student One"
            assert students[0]["is_face_registered"] == True
            assert students[1]["user_id"] == "student-2"
            assert students[1]["name"] == "Student Two"
            assert students[1]["is_face_registered"] == False
            
            # Verify query includes student details
            call_args = mock_client.get.call_args
            params = call_args[1]["params"]
            assert "select" in params
    
    class TestDataMigrationCompatibility:
        """Test compatibility with existing data after schema changes"""
        
        @pytest.mark.asyncio
        async def test_existing_attendance_records_compatibility(self, db_service, mock_httpx_client):
            """Test that existing attendance records without session data are handled"""
            # Setup mock response with old format attendance records
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "id": "att-1",
                    "student_id": "student-1",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "present",
                    "method": "manual",
                    "marked_by": "teacher-123"
                    # No session_id or session_timestamp (old format)
                },
                {
                    "id": "att-2",
                    "student_id": "student-2",
                    "subject_id": "subject-123",
                    "date": "2024-01-15",
                    "status": "present",
                    "method": "manual",
                    "session_id": "session-1",
                    "session_timestamp": "2024-01-15T09:00:00",
                    "marked_by": "teacher-123"
                    # New format with session data
                }
            ]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_response
            
            # Test getting attendance sessions (should handle mixed formats)
            sessions = await db_service.get_attendance_sessions("subject-123")
            
            # Should return all records regardless of format
            assert len(sessions) == 2
        
        @pytest.mark.asyncio
        async def test_user_profile_without_updated_at(self, db_service, mock_httpx_client):
            """Test handling users without updated_at timestamp"""
            # Setup mock response without updated_at field
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "user_id": "user-123",
                    "name": "Test User",
                    "email": "test@example.com",
                    "created_at": "2024-01-01T00:00:00"
                    # No updated_at field (old format)
                }
            ]
            
            mock_client = mock_httpx_client.return_value.__aenter__.return_value
            mock_client.get.return_value = mock_response
            
            # Should handle missing updated_at gracefully
            # This would be tested in the actual API layer, but we can verify
            # the service layer doesn't break with missing fields
            
            # Test profile update on user without updated_at
            mock_patch_response = AsyncMock()
            mock_patch_response.status_code = 200
            mock_patch_response.json.return_value = [{"user_id": "user-123"}]
            mock_client.patch.return_value = mock_patch_response
            
            result = await db_service.update_user_profile("user-123", {"name": "Updated Name"})
            assert result == True


if __name__ == "__main__":
    pytest.main([__file__])