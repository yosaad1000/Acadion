#!/usr/bin/env python3
"""
Integration tests for session creation flow
Tests the complete session creation workflow including API endpoints and service integration
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import status
import json
from datetime import datetime
from uuid import uuid4

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from app.models.user import UserResponse, UserType, AuthProvider
from app.models.session import SessionCreate


class TestSessionIntegration(unittest.TestCase):
    """Integration tests for session creation workflow"""
    
    def setUp(self):
        """Set up test client and mocks"""
        self.client = TestClient(app, base_url="http://testserver")
        
        # Mock teacher user
        self.mock_teacher = UserResponse(
            user_id="teacher-123",
            auth_user_id="auth-teacher-123",
            name="Test Teacher",
            email="teacher@example.com",
            user_type=UserType.TEACHER,
            auth_provider=AuthProvider.EMAIL,
            is_face_registered=True,
            created_at=datetime.now()
        )
        
        # Mock subject data
        self.mock_subject = {
            "subject_id": "subject-123",
            "name": "Test Subject",
            "teacher_id": "auth-teacher-123",  # Match auth_user_id
            "subject_code": "TEST101"
        }
        
        # Mock session data
        self.mock_session = {
            "session_id": "session-123",
            "subject_id": "subject-123",
            "name": "Session 1",
            "description": None,
            "session_date": datetime.now().isoformat(),
            "notes": None,
            "attendance_taken": False,
            "created_by": "auth-teacher-123",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "assignments": [],
            "subject_name": "Test Subject",
            "teacher_name": "Test Teacher",
            "assignment_count": 0,
            "has_overdue_assignments": False
        }

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.session_service.SessionService.create_session_with_defaults')
    def test_create_session_with_smart_defaults_success(self, mock_create_with_defaults, mock_get_subject, mock_get_user):
        """Test complete session creation flow with smart defaults"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        mock_create_with_defaults.return_value = self.mock_session
        
        # Create session without name (should auto-generate)
        session_data = {
            "subject_id": "subject-123",
            "description": "Test session description"
            # No name provided - should be auto-generated
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Debug output
        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify response structure
        self.assertIn("session_id", data)
        self.assertIn("name", data)
        self.assertIn("subject_id", data)
        self.assertEqual(data["subject_id"], "subject-123")
        
        # Verify service was called with correct parameters
        mock_create_with_defaults.assert_called_once()
        call_args = mock_create_with_defaults.call_args[0]
        session_create_obj = call_args[0]
        self.assertIsInstance(session_create_obj, SessionCreate)
        self.assertEqual(str(session_create_obj.subject_id), "subject-123")

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.session_service.SessionService.create_session_with_defaults')
    def test_create_session_with_provided_name(self, mock_create_with_defaults, mock_get_subject, mock_get_user):
        """Test session creation when name is provided"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        
        # Mock session with provided name
        session_with_name = self.mock_session.copy()
        session_with_name["name"] = "Custom Session Name"
        mock_create_with_defaults.return_value = session_with_name
        
        # Create session with custom name
        session_data = {
            "subject_id": "subject-123",
            "name": "Custom Session Name",
            "description": "Test session description"
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["name"], "Custom Session Name")

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_create_session_teacher_not_owner(self, mock_get_subject, mock_get_user):
        """Test session creation fails when teacher doesn't own subject"""
        # Setup mocks - different teacher ID
        mock_get_user.return_value = self.mock_teacher
        different_subject = self.mock_subject.copy()
        different_subject["teacher_id"] = "different-teacher-id"
        mock_get_subject.return_value = different_subject
        
        # Create session data
        session_data = {
            "subject_id": "subject-123",
            "name": "Test Session"
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn("Access denied", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_create_session_subject_not_found(self, mock_get_subject, mock_get_user):
        """Test session creation fails when subject doesn't exist"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = None  # Subject not found
        
        # Create session data
        session_data = {
            "subject_id": "nonexistent-subject",
            "name": "Test Session"
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn("Access denied", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    def test_create_session_student_forbidden(self, mock_get_user):
        """Test session creation fails for students"""
        # Setup mock student user
        mock_student = UserResponse(
            user_id="student-123",
            auth_user_id="auth-student-123",
            name="Test Student",
            email="student@example.com",
            user_type=UserType.STUDENT,
            auth_provider=AuthProvider.EMAIL,
            is_face_registered=True,
            created_at=datetime.now()
        )
        mock_get_user.return_value = mock_student
        
        # Create session data
        session_data = {
            "subject_id": "subject-123",
            "name": "Test Session"
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn("Only teachers can create sessions", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.session_service.SessionService.create_session_with_defaults')
    def test_create_session_service_failure(self, mock_create_with_defaults, mock_get_subject, mock_get_user):
        """Test session creation when service fails"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        mock_create_with_defaults.return_value = None  # Service failure
        
        # Create session data
        session_data = {
            "subject_id": "subject-123",
            "name": "Test Session"
        }
        
        # Make request
        response = self.client.post("/api/sessions", json=session_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertIn("Failed to create session", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.local_supabase.LocalSupabase.is_student_enrolled')
    @patch('app.services.session_service.SessionService.get_sessions_by_subject')
    def test_get_sessions_after_creation_flow(self, mock_get_sessions, mock_is_enrolled, mock_get_subject, mock_get_user):
        """Test retrieving sessions after creation (complete workflow)"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        mock_get_sessions.return_value = {
            "sessions": [self.mock_session],
            "total_count": 1,
            "page": 1,
            "page_size": 50
        }
        
        # Make request to get sessions
        response = self.client.get(f"/api/sessions/subject/{self.mock_subject['subject_id']}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Verify session data structure
        self.assertIn("sessions", data)
        self.assertEqual(len(data["sessions"]), 1)
        session = data["sessions"][0]
        
        # Verify all required fields are present
        required_fields = [
            "session_id", "subject_id", "name", "session_date",
            "attendance_taken", "created_at", "updated_at"
        ]
        for field in required_fields:
            self.assertIn(field, session)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.session_service.SessionService.check_user_access_to_session')
    @patch('app.services.session_service.SessionService.update_session')
    def test_update_session_notes_flow(self, mock_update_session, mock_check_access, mock_get_subject, mock_get_user):
        """Test updating session notes (progressive notes management)"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        mock_check_access.return_value = {
            "has_access": True,
            "can_edit": True,
            "session": self.mock_session
        }
        
        # Mock updated session with notes
        updated_session = self.mock_session.copy()
        updated_session["notes"] = "Important session notes"
        mock_update_session.return_value = updated_session
        
        # Update session with notes
        update_data = {
            "notes": "Important session notes"
        }
        
        # Make request
        response = self.client.put(f"/api/sessions/{self.mock_session['session_id']}", json=update_data)
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["notes"], "Important session notes")
        
        # Verify service was called correctly
        mock_update_session.assert_called_once()

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.session_service.SessionService.check_user_access_to_session')
    @patch('app.services.session_service.SessionService.mark_attendance_taken')
    def test_mark_attendance_taken_flow(self, mock_mark_attendance, mock_check_access, mock_get_user):
        """Test marking attendance as taken workflow"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_check_access.return_value = {
            "has_access": True,
            "can_edit": True,
            "session": self.mock_session
        }
        mock_mark_attendance.return_value = True
        
        # Make request
        response = self.client.post(f"/api/sessions/{self.mock_session['session_id']}/attendance")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("Attendance marked as taken", data["message"])
        
        # Verify service was called
        mock_mark_attendance.assert_called_once()


if __name__ == "__main__":
    unittest.main()