import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app
from app.models.user import UserResponse

client = TestClient(app)

class TestSubjectsRouterUnenrollment:
    """Test cases for subjects router unenrollment endpoint"""
    
    @pytest.fixture
    def mock_student_user(self):
        """Mock student user for testing"""
        return UserResponse(
            user_id="student123",
            name="Test Student",
            email="student@test.com",
            user_type="student",
            is_face_registered=True
        )
    
    @pytest.fixture
    def mock_teacher_user(self):
        """Mock teacher user for testing"""
        return UserResponse(
            user_id="teacher123",
            name="Test Teacher",
            email="teacher@test.com",
            user_type="teacher",
            is_face_registered=True
        )
    
    @pytest.fixture
    def mock_subject(self):
        """Mock subject data"""
        return {
            "subject_id": "subject123",
            "name": "Test Subject",
            "description": "Test Description",
            "teacher_id": "teacher123",
            "teacher_name": "Test Teacher",
            "is_active": True
        }
    
    def test_unenroll_success(self, mock_student_user, mock_subject):
        """Test successful unenrollment"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user), \
             patch('app.routers.subjects.db.get_subject_by_id', return_value=mock_subject), \
             patch('app.routers.subjects.db.is_student_enrolled', return_value=True), \
             patch('app.routers.subjects.db.unenroll_student', return_value=True):
            
            response = client.delete("/subjects/subject123/enrollment")
            
            assert response.status_code == 200
            assert response.json()["message"] == "Successfully unenrolled from subject"
    
    def test_unenroll_teacher_forbidden(self, mock_teacher_user):
        """Test that teachers cannot unenroll from subjects"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_teacher_user):
            
            response = client.delete("/subjects/subject123/enrollment")
            
            assert response.status_code == 403
            assert "Only students can unenroll" in response.json()["detail"]
    
    def test_unenroll_subject_not_found(self, mock_student_user):
        """Test unenrollment when subject doesn't exist"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user), \
             patch('app.routers.subjects.db.get_subject_by_id', return_value=None):
            
            response = client.delete("/subjects/nonexistent/enrollment")
            
            assert response.status_code == 404
            assert "Subject not found" in response.json()["detail"]
    
    def test_unenroll_not_enrolled(self, mock_student_user, mock_subject):
        """Test unenrollment when student is not enrolled"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user), \
             patch('app.routers.subjects.db.get_subject_by_id', return_value=mock_subject), \
             patch('app.routers.subjects.db.is_student_enrolled', return_value=False):
            
            response = client.delete("/subjects/subject123/enrollment")
            
            assert response.status_code == 400
            assert "You are not enrolled" in response.json()["detail"]
    
    def test_unenroll_database_error(self, mock_student_user, mock_subject):
        """Test unenrollment when database operation fails"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user), \
             patch('app.routers.subjects.db.get_subject_by_id', return_value=mock_subject), \
             patch('app.routers.subjects.db.is_student_enrolled', return_value=True), \
             patch('app.routers.subjects.db.unenroll_student', return_value=False):
            
            response = client.delete("/subjects/subject123/enrollment")
            
            assert response.status_code == 500
            assert "Failed to unenroll" in response.json()["detail"]
    
    def test_unenroll_validation_flow(self, mock_student_user, mock_subject):
        """Test the complete validation flow for unenrollment"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user) as mock_auth, \
             patch('app.routers.subjects.db.get_subject_by_id', return_value=mock_subject) as mock_get_subject, \
             patch('app.routers.subjects.db.is_student_enrolled', return_value=True) as mock_is_enrolled, \
             patch('app.routers.subjects.db.unenroll_student', return_value=True) as mock_unenroll:
            
            response = client.delete("/subjects/subject123/enrollment")
            
            # Verify all validation steps were called
            mock_auth.assert_called_once()
            mock_get_subject.assert_called_once_with("subject123")
            mock_is_enrolled.assert_called_once_with("subject123", "student123")
            mock_unenroll.assert_called_once_with("subject123", "student123")
            
            assert response.status_code == 200
    
    def test_unenroll_exception_handling(self, mock_student_user):
        """Test exception handling in unenrollment endpoint"""
        with patch('app.routers.subjects.get_current_user', return_value=mock_student_user), \
             patch('app.routers.subjects.db.get_subject_by_id', side_effect=Exception("Database error")):
            
            response = client.delete("/subjects/subject123/enrollment")
            
            assert response.status_code == 500
            assert "Failed to unenroll from subject" in response.json()["detail"]