#!/usr/bin/env python3
"""
Integration tests for session API endpoints
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
from app.models.session import SessionResponse, SessionListResponse


class TestSessionEndpoints(unittest.TestCase):
    """Test session API endpoints"""
    
    def setUp(self):
        """Set up test client and mocks"""
        self.client = TestClient(app)
        
        # Mock teacher user for authentication
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
        
        # Mock student user for authentication
        self.mock_student = UserResponse(
            user_id="student-123",
            auth_user_id="auth-student-123",
            name="Test Student",
            email="student@example.com",
            user_type=UserType.STUDENT,
            auth_provider=AuthProvider.EMAIL,
            is_face_registered=True,
            created_at=datetime.now()
        )
        
        # Mock subject data
        self.mock_subject = {
            "subject_id": "subject-123",
            "name": "Test Subject",
            "teacher_id": "teacher-123",
            "subject_code": "TEST101"
        }
        
        # Mock session data
        self.mock_session = {
            "session_id": "session-123",
            "subject_id": "subject-123",
            "name": "Test Session",
            "description": "Test session description",
            "session_date": datetime.now().isoformat(),
            "notes": None,
            "attendance_taken": False,
            "created_by": "teacher-123",
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
    @patch('app.services.local_supabase.LocalSupabase.is_student_enrolled')
    @patch('app.services.session_service.SessionService.get_sessions_by_subject')
    def test_get_sessions_by_subject_id_success_teacher(self, mock_get_sessions, mock_is_enrolled, mock_get_subject, mock_get_user):
        """Test successful retrieval of sessions by subject ID for teacher"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = self.mock_subject
        mock_get_sessions.return_value = {
            "sessions": [self.mock_session],
            "total_count": 1,
            "page": 1,
            "page_size": 50
        }
        
        # Make request
        response = self.client.get(f"/api/sessions/subject/{self.mock_subject['subject_id']}")
        
        # Debug: Print response details if test fails
        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("sessions", data)
        self.assertEqual(len(data["sessions"]), 1)
        self.assertEqual(data["sessions"][0]["session_id"], "session-123")
        self.assertEqual(data["total_count"], 1)
        
        # Verify mocks were called correctly
        mock_get_subject.assert_called_once_with(self.mock_subject['subject_id'])
        mock_get_sessions.assert_called_once()

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.local_supabase.LocalSupabase.is_student_enrolled')
    @patch('app.services.session_service.SessionService.get_sessions_by_subject')
    def test_get_sessions_by_subject_id_success_student(self, mock_get_sessions, mock_is_enrolled, mock_get_subject, mock_get_user):
        """Test successful retrieval of sessions by subject ID for enrolled student"""
        # Setup mocks
        mock_get_user.return_value = self.mock_student
        mock_get_subject.return_value = self.mock_subject
        mock_is_enrolled.return_value = True
        mock_get_sessions.return_value = {
            "sessions": [self.mock_session],
            "total_count": 1,
            "page": 1,
            "page_size": 50
        }
        
        # Make request
        response = self.client.get(f"/api/sessions/subject/{self.mock_subject['subject_id']}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("sessions", data)
        self.assertEqual(len(data["sessions"]), 1)
        
        # Verify enrollment check was called
        mock_is_enrolled.assert_called_once_with(self.mock_subject['subject_id'], self.mock_student.user_id)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_get_sessions_by_subject_id_subject_not_found(self, mock_get_subject, mock_get_user):
        """Test 404 error when subject doesn't exist"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = None
        
        # Make request
        response = self.client.get(f"/api/sessions/subject/{uuid4()}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn("doesn't exist", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.local_supabase.LocalSupabase.is_student_enrolled')
    def test_get_sessions_by_subject_id_access_denied_teacher(self, mock_is_enrolled, mock_get_subject, mock_get_user):
        """Test 403 error when teacher doesn't own the subject"""
        # Setup mocks - different teacher ID
        different_subject = self.mock_subject.copy()
        different_subject["teacher_id"] = "different-teacher-123"
        
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = different_subject
        
        # Make request
        response = self.client.get(f"/api/sessions/subject/{self.mock_subject['subject_id']}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn("classes you teach", data["detail"])

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.local_supabase.LocalSupabase.is_student_enrolled')
    def test_get_sessions_by_subject_id_access_denied_student(self, mock_is_enrolled, mock_get_subject, mock_get_user):
        """Test 403 error when student is not enrolled"""
        # Setup mocks
        mock_get_user.return_value = self.mock_student
        mock_get_subject.return_value = self.mock_subject
        mock_is_enrolled.return_value = False
        
        # Make request
        response = self.client.get(f"/api/sessions/subject/{self.mock_subject['subject_id']}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertIn("enrolled in this class", data["detail"])

    def test_get_sessions_by_subject_id_no_auth(self):
        """Test 401 error when no authentication provided"""
        # Make request without authentication
        response = self.client.get(f"/api/sessions/subject/{uuid4()}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


if __name__ == "__main__":
    unittest.main()