import pytest
import httpx
import numpy as np
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import datetime
from main import app

client = TestClient(app)

# Mock user data
MOCK_USER = {
    "user_id": "test-user-123",
    "email": "test@example.com",
    "name": "Test User",
    "user_type": "student",
    "is_face_registered": False,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
}

MOCK_TOKEN = "Bearer mock-jwt-token"

@pytest.fixture
def mock_auth():
    """Mock authentication to return test user"""
    with patch('app.routers.profile.get_current_user') as mock_get_user:
        from app.models.user import UserResponse, UserType
        mock_get_user.return_value = UserResponse(
            user_id=MOCK_USER["user_id"],
            email=MOCK_USER["email"],
            name=MOCK_USER["name"],
            user_type=UserType.STUDENT,
            is_face_registered=MOCK_USER["is_face_registered"],
            created_at=datetime.fromisoformat(MOCK_USER["created_at"].replace('Z', '+00:00'))
        )
        yield mock_get_user

@pytest.fixture
def mock_db():
    """Mock database operations"""
    with patch('app.routers.profile.db') as mock_database:
        yield mock_database

class TestGetProfile:
    """Test GET /api/profile endpoint"""
    
    def test_get_profile_success(self, mock_auth, mock_db):
        """Test successful profile retrieval"""
        # Setup mock
        mock_db.get_user_by_id = AsyncMock(return_value=MOCK_USER)
        
        # Make request
        response = client.get(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == MOCK_USER["user_id"]
        assert data["email"] == MOCK_USER["email"]
        assert data["name"] == MOCK_USER["name"]
        assert data["user_type"] == MOCK_USER["user_type"]
        assert data["is_face_registered"] == MOCK_USER["is_face_registered"]
        assert "created_at" in data
        assert "updated_at" in data
        
        # Verify database call
        mock_db.get_user_by_id.assert_called_once_with(MOCK_USER["user_id"])
    
    def test_get_profile_user_not_found(self, mock_auth, mock_db):
        """Test profile retrieval when user not found in database"""
        # Setup mock
        mock_db.get_user_by_id = AsyncMock(return_value=None)
        
        # Make request
        response = client.get(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 404
        assert "User profile not found" in response.json()["detail"]
    
    def test_get_profile_database_error(self, mock_auth, mock_db):
        """Test profile retrieval with database error"""
        # Setup mock
        mock_db.get_user_by_id = AsyncMock(side_effect=Exception("Database error"))
        
        # Make request
        response = client.get(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 500
        assert "Failed to retrieve profile" in response.json()["detail"]

class TestUpdateProfile:
    """Test PUT /api/profile endpoint"""
    
    def test_update_profile_name_success(self, mock_auth, mock_db):
        """Test successful profile name update"""
        # Setup mocks
        mock_db.get_user_by_email = AsyncMock(return_value=None)
        mock_db.update_user_profile = AsyncMock(return_value=True)
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"name": "Updated Name"}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Profile updated successfully"
        
        # Verify database calls
        mock_db.update_user_profile.assert_called_once_with(
            MOCK_USER["user_id"], 
            {"name": "Updated Name"}
        )
    
    def test_update_profile_email_success(self, mock_auth, mock_db):
        """Test successful profile email update"""
        # Setup mocks
        mock_db.get_user_by_email = AsyncMock(return_value=None)
        mock_db.update_user_profile = AsyncMock(return_value=True)
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"email": "newemail@example.com"}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Profile updated successfully"
        
        # Verify database calls
        mock_db.get_user_by_email.assert_called_once_with("newemail@example.com")
        mock_db.update_user_profile.assert_called_once_with(
            MOCK_USER["user_id"], 
            {"email": "newemail@example.com"}
        )
    
    def test_update_profile_both_fields_success(self, mock_auth, mock_db):
        """Test successful profile update with both name and email"""
        # Setup mocks
        mock_db.get_user_by_email = AsyncMock(return_value=None)
        mock_db.update_user_profile = AsyncMock(return_value=True)
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "name": "Updated Name",
                "email": "newemail@example.com"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Profile updated successfully"
        
        # Verify database calls
        mock_db.update_user_profile.assert_called_once_with(
            MOCK_USER["user_id"], 
            {"name": "Updated Name", "email": "newemail@example.com"}
        )
    
    def test_update_profile_no_fields(self, mock_auth, mock_db):
        """Test profile update with no fields provided"""
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={}
        )
        
        # Assertions
        assert response.status_code == 400
        assert "At least one field must be provided" in response.json()["detail"]
    
    def test_update_profile_email_already_exists(self, mock_auth, mock_db):
        """Test profile update with email that already exists"""
        # Setup mock - email exists for different user
        mock_db.get_user_by_email = AsyncMock(return_value={
            "user_id": "different-user-id",
            "email": "existing@example.com"
        })
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"email": "existing@example.com"}
        )
        
        # Assertions
        assert response.status_code == 400
        assert "Email address is already registered" in response.json()["detail"]
    
    def test_update_profile_same_email(self, mock_auth, mock_db):
        """Test profile update with same email (should be allowed)"""
        # Setup mock - email exists for same user
        mock_db.get_user_by_email = AsyncMock(return_value={
            "user_id": MOCK_USER["user_id"],
            "email": MOCK_USER["email"]
        })
        mock_db.update_user_profile = AsyncMock(return_value=True)
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"email": MOCK_USER["email"]}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Profile updated successfully"
    
    def test_update_profile_database_error(self, mock_auth, mock_db):
        """Test profile update with database error"""
        # Setup mocks
        mock_db.get_user_by_email = AsyncMock(return_value=None)
        mock_db.update_user_profile = AsyncMock(return_value=False)
        
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"name": "Updated Name"}
        )
        
        # Assertions
        assert response.status_code == 500
        assert "Failed to update profile" in response.json()["detail"]
    
    def test_update_profile_invalid_email(self, mock_auth, mock_db):
        """Test profile update with invalid email format"""
        # Make request
        response = client.put(
            "/api/profile/",
            headers={"Authorization": MOCK_TOKEN},
            json={"email": "invalid-email"}
        )
        
        # Assertions
        assert response.status_code == 422  # Pydantic validation error

class TestChangePassword:
    """Test POST /api/profile/password endpoint"""
    
    def test_change_password_success(self, mock_auth, mock_db):
        """Test successful password change"""
        # Setup mock
        mock_db.change_user_password = AsyncMock(return_value=True)
        
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "NewPassword123"
            }
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"
        
        # Verify database call
        mock_db.change_user_password.assert_called_once()
        call_args = mock_db.change_user_password.call_args
        assert call_args[0][0] == MOCK_USER["user_id"]  # user_id
        assert call_args[0][1] == "OldPassword123"  # old_password
        # new_password_hash should be a bcrypt hash
        assert len(call_args[0][2]) > 50  # bcrypt hashes are long
        assert callable(call_args[0][3])  # verify_password function
    
    def test_change_password_too_short(self, mock_auth, mock_db):
        """Test password change with password too short"""
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "Short1"
            }
        )
        
        # Assertions
        assert response.status_code == 400
        assert "at least 8 characters long" in response.json()["detail"]
    
    def test_change_password_no_uppercase(self, mock_auth, mock_db):
        """Test password change with no uppercase letter"""
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "newpassword123"
            }
        )
        
        # Assertions
        assert response.status_code == 400
        assert "uppercase letter" in response.json()["detail"]
    
    def test_change_password_no_lowercase(self, mock_auth, mock_db):
        """Test password change with no lowercase letter"""
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "NEWPASSWORD123"
            }
        )
        
        # Assertions
        assert response.status_code == 400
        assert "lowercase letter" in response.json()["detail"]
    
    def test_change_password_no_number(self, mock_auth, mock_db):
        """Test password change with no number"""
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "NewPassword"
            }
        )
        
        # Assertions
        assert response.status_code == 400
        assert "at least one number" in response.json()["detail"]
    
    def test_change_password_incorrect_current(self, mock_auth, mock_db):
        """Test password change with incorrect current password"""
        # Setup mock
        mock_db.change_user_password = AsyncMock(return_value=False)
        
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "WrongPassword123",
                "new_password": "NewPassword123"
            }
        )
        
        # Assertions
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
    
    def test_change_password_database_error(self, mock_auth, mock_db):
        """Test password change with database error"""
        # Setup mock
        mock_db.change_user_password = AsyncMock(side_effect=Exception("Database error"))
        
        # Make request
        response = client.post(
            "/api/profile/password",
            headers={"Authorization": MOCK_TOKEN},
            json={
                "current_password": "OldPassword123",
                "new_password": "NewPassword123"
            }
        )
        
        # Assertions
        assert response.status_code == 500
        assert "Failed to change password" in response.json()["detail"]

class TestFaceRegistration:
    """Test POST /api/profile/face endpoint"""
    
    @patch('app.routers.profile.face_recognition_service')
    def test_register_face_success_new(self, mock_face_service, mock_auth, mock_db):
        """Test successful face registration for new user"""
        # Setup mocks
        mock_face_service.process_student_photo.return_value = {
            "success": True,
            "message": "Face registered successfully"
        }
        mock_db.update_user_face_status = AsyncMock(return_value=True)
        
        # Create mock file
        file_content = b"fake_image_data"
        
        # Make request
        response = client.post(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN},
            files={"file": ("test.jpg", file_content, "image/jpeg")}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Face registered successfully"
        
        # Verify service calls
        mock_face_service.process_student_photo.assert_called_once_with(
            MOCK_USER["user_id"], file_content
        )
        mock_db.update_user_face_status.assert_called_once_with(
            MOCK_USER["user_id"], True
        )
    
    @patch('app.routers.profile.face_recognition_service')
    def test_update_face_success_existing(self, mock_face_service, mock_auth, mock_db):
        """Test successful face update for existing registration"""
        # Setup mocks - user already has face registered
        mock_auth.return_value.is_face_registered = True
        mock_face_service.extract_face_encoding.return_value = np.array([1, 2, 3])  # Mock encoding
        mock_face_service.update_face_encoding.return_value = True
        mock_db.update_user_face_status = AsyncMock(return_value=True)
        
        # Create mock file
        file_content = b"fake_image_data"
        
        # Make request
        response = client.post(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN},
            files={"file": ("test.jpg", file_content, "image/jpeg")}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Face updated successfully"
        
        # Verify service calls
        mock_face_service.extract_face_encoding.assert_called_once_with(file_content)
        mock_face_service.update_face_encoding.assert_called_once()
    
    def test_register_face_teacher_forbidden(self, mock_auth, mock_db):
        """Test face registration forbidden for teachers"""
        # Setup mock - user is teacher
        from app.models.user import UserType
        mock_auth.return_value.user_type = UserType.TEACHER
        
        # Create mock file
        file_content = b"fake_image_data"
        
        # Make request
        response = client.post(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN},
            files={"file": ("test.jpg", file_content, "image/jpeg")}
        )
        
        # Assertions
        assert response.status_code == 403
        assert "Only students can register faces" in response.json()["detail"]
    
    def test_register_face_invalid_file_type(self, mock_auth, mock_db):
        """Test face registration with invalid file type"""
        # Create mock file with wrong content type
        file_content = b"fake_text_data"
        
        # Make request
        response = client.post(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN},
            files={"file": ("test.txt", file_content, "text/plain")}
        )
        
        # Assertions
        assert response.status_code == 400
        assert "File must be an image" in response.json()["detail"]
    
    @patch('app.routers.profile.face_recognition_service')
    def test_register_face_no_face_detected(self, mock_face_service, mock_auth, mock_db):
        """Test face registration when no face is detected"""
        # Setup mock
        mock_face_service.process_student_photo.return_value = {
            "success": False,
            "message": "No face detected in the image"
        }
        
        # Create mock file
        file_content = b"fake_image_data"
        
        # Make request
        response = client.post(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN},
            files={"file": ("test.jpg", file_content, "image/jpeg")}
        )
        
        # Assertions
        assert response.status_code == 400
        assert "No face detected in the image" in response.json()["detail"]

class TestRemoveFaceRegistration:
    """Test DELETE /api/profile/face endpoint"""
    
    @patch('app.routers.profile.face_recognition_service')
    def test_remove_face_success(self, mock_face_service, mock_auth, mock_db):
        """Test successful face registration removal"""
        # Setup mocks - user has face registered
        mock_auth.return_value.is_face_registered = True
        mock_face_service.delete_face_encoding.return_value = True
        mock_db.update_user_face_status = AsyncMock(return_value=True)
        
        # Make request
        response = client.delete(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 200
        assert response.json()["message"] == "Face registration removed successfully"
        
        # Verify service calls
        mock_face_service.delete_face_encoding.assert_called_once_with(MOCK_USER["user_id"])
        mock_db.update_user_face_status.assert_called_once_with(MOCK_USER["user_id"], False)
    
    def test_remove_face_teacher_forbidden(self, mock_auth, mock_db):
        """Test face removal forbidden for teachers"""
        # Setup mock - user is teacher
        from app.models.user import UserType
        mock_auth.return_value.user_type = UserType.TEACHER
        
        # Make request
        response = client.delete(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 403
        assert "Only students can have face registrations" in response.json()["detail"]
    
    def test_remove_face_not_registered(self, mock_auth, mock_db):
        """Test face removal when no face is registered"""
        # Setup mock - user has no face registered
        mock_auth.return_value.is_face_registered = False
        
        # Make request
        response = client.delete(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 400
        assert "No face registration found to remove" in response.json()["detail"]
    
    @patch('app.routers.profile.face_recognition_service')
    def test_remove_face_database_error(self, mock_face_service, mock_auth, mock_db):
        """Test face removal with database error"""
        # Setup mocks
        mock_auth.return_value.is_face_registered = True
        mock_face_service.delete_face_encoding.return_value = True
        mock_db.update_user_face_status = AsyncMock(return_value=False)
        
        # Make request
        response = client.delete(
            "/api/profile/face",
            headers={"Authorization": MOCK_TOKEN}
        )
        
        # Assertions
        assert response.status_code == 500
        assert "Failed to update face registration status" in response.json()["detail"]

if __name__ == "__main__":
    pytest.main([__file__])