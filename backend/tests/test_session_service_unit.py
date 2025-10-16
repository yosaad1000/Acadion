#!/usr/bin/env python3
"""
Unit tests for SessionService methods
Tests the new session service methods added for dashboard enhancement
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from uuid import uuid4, UUID
import httpx

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.session_service import SessionService
from app.models.session import SessionCreate, SessionUpdate


class TestSessionServiceUnit(unittest.IsolatedAsyncioTestCase):
    """Unit tests for SessionService methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.service = SessionService()
        self.subject_id = uuid4()
        self.user_id = uuid4()
        self.session_id = uuid4()
        
        # Mock session data
        self.mock_session_data = {
            "session_id": str(self.session_id),
            "subject_id": str(self.subject_id),
            "name": "Test Session",
            "description": "Test description",
            "session_date": datetime.utcnow().isoformat(),
            "notes": None,
            "attendance_taken": False,
            "created_by": str(self.user_id),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

    @patch('httpx.AsyncClient')
    async def test_generate_session_name_first_session(self, mock_client):
        """Test generating session name for first session"""
        # Mock HTTP response for empty sessions
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Range": "0-0/0"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.generate_session_name(self.subject_id)
        
        # Assertions
        self.assertEqual(result, "Session 1")
        mock_client_instance.get.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_generate_session_name_multiple_sessions(self, mock_client):
        """Test generating session name when sessions already exist"""
        # Mock HTTP response for 3 existing sessions
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Range": "0-2/3"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.generate_session_name(self.subject_id)
        
        # Assertions
        self.assertEqual(result, "Session 4")

    @patch('httpx.AsyncClient')
    async def test_generate_session_name_api_error(self, mock_client):
        """Test generating session name when API call fails"""
        # Mock HTTP error response
        mock_response = Mock()
        mock_response.status_code = 500
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.generate_session_name(self.subject_id)
        
        # Assertions - should fallback to default
        self.assertEqual(result, "Session 1")

    @patch('httpx.AsyncClient')
    async def test_generate_session_name_network_error(self, mock_client):
        """Test generating session name when network error occurs"""
        # Mock network error
        mock_client_instance = AsyncMock()
        mock_client_instance.get.side_effect = httpx.RequestError("Network error")
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.generate_session_name(self.subject_id)
        
        # Assertions - should fallback to default
        self.assertEqual(result, "Session 1")

    @patch.object(SessionService, 'generate_session_name')
    @patch.object(SessionService, 'create_session')
    async def test_create_session_with_defaults_no_name(self, mock_create, mock_generate):
        """Test creating session with defaults when no name provided"""
        # Setup mocks
        mock_generate.return_value = "Session 1"
        mock_create.return_value = self.mock_session_data
        
        # Create session data without name
        session_data = SessionCreate(
            subject_id=self.subject_id,
            name="",  # Empty name should trigger auto-generation
            description="Test description"
        )
        
        # Test
        result = await self.service.create_session_with_defaults(session_data, self.user_id)
        
        # Assertions
        self.assertIsNotNone(result)
        mock_generate.assert_called_once_with(self.subject_id)
        mock_create.assert_called_once()
        # Verify the session_data was modified
        self.assertEqual(session_data.name, "Session 1")

    @patch.object(SessionService, 'create_session')
    async def test_create_session_with_defaults_no_date(self, mock_create):
        """Test creating session with defaults when no date provided"""
        # Setup mock
        mock_create.return_value = self.mock_session_data
        
        # Create session data without date
        session_data = SessionCreate(
            subject_id=self.subject_id,
            name="Test Session",
            description="Test description"
            # No session_date provided
        )
        
        # Test
        result = await self.service.create_session_with_defaults(session_data, self.user_id)
        
        # Assertions
        self.assertIsNotNone(result)
        self.assertIsNotNone(session_data.session_date)
        mock_create.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_create_session_success(self, mock_client):
        """Test successful session creation"""
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = [self.mock_session_data]
        
        mock_client_instance = AsyncMock()
        mock_client_instance.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Create session data
        session_data = SessionCreate(
            subject_id=self.subject_id,
            name="Test Session",
            description="Test description"
        )
        
        # Test
        result = await self.service.create_session(session_data, self.user_id)
        
        # Assertions
        self.assertIsNotNone(result)
        self.assertEqual(result["session_id"], str(self.session_id))
        mock_client_instance.post.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_create_session_api_error(self, mock_client):
        """Test session creation with API error"""
        # Mock error HTTP response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad request"
        
        mock_client_instance = AsyncMock()
        mock_client_instance.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Create session data
        session_data = SessionCreate(
            subject_id=self.subject_id,
            name="Test Session"
        )
        
        # Test
        result = await self.service.create_session(session_data, self.user_id)
        
        # Assertions
        self.assertIsNone(result)

    @patch('httpx.AsyncClient')
    async def test_get_sessions_by_subject_success(self, mock_client):
        """Test successful retrieval of sessions by subject"""
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [self.mock_session_data]
        mock_response.headers = {"Content-Range": "0-0/1"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.get_sessions_by_subject(self.subject_id)
        
        # Assertions
        self.assertIsInstance(result, dict)
        self.assertIn("sessions", result)
        self.assertEqual(len(result["sessions"]), 1)
        self.assertEqual(result["total_count"], 1)
        self.assertEqual(result["page"], 1)
        self.assertEqual(result["page_size"], 50)

    @patch('httpx.AsyncClient')
    async def test_get_sessions_by_subject_empty(self, mock_client):
        """Test retrieval of sessions when none exist"""
        # Mock empty HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_response.headers = {"Content-Range": "0-0/0"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.get_sessions_by_subject(self.subject_id)
        
        # Assertions
        self.assertEqual(len(result["sessions"]), 0)
        self.assertEqual(result["total_count"], 0)

    @patch('httpx.AsyncClient')
    async def test_get_sessions_by_subject_pagination(self, mock_client):
        """Test sessions retrieval with pagination"""
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [self.mock_session_data]
        mock_response.headers = {"Content-Range": "10-19/25"}
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test with pagination
        result = await self.service.get_sessions_by_subject(self.subject_id, page=2, page_size=10)
        
        # Assertions
        self.assertEqual(result["page"], 2)
        self.assertEqual(result["page_size"], 10)
        self.assertEqual(result["total_count"], 25)
        
        # Verify correct offset was calculated
        call_args = mock_client_instance.get.call_args
        params = call_args[1]["params"]
        self.assertEqual(params["offset"], 10)  # (page-1) * page_size = (2-1) * 10

    @patch('httpx.AsyncClient')
    async def test_check_user_access_teacher_success(self, mock_client):
        """Test successful teacher access check"""
        # Mock session with subject data
        session_with_subject = {
            **self.mock_session_data,
            "subject": {
                "subject_id": str(self.subject_id),
                "teacher_id": str(self.user_id),
                "name": "Test Subject"
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [session_with_subject]
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.check_user_access_to_session(
            self.session_id, self.user_id, "teacher"
        )
        
        # Assertions
        self.assertTrue(result["has_access"])
        self.assertEqual(result["access_type"], "teacher")
        self.assertTrue(result["can_edit"])
        self.assertIn("session", result)

    @patch('httpx.AsyncClient')
    async def test_check_user_access_student_enrolled(self, mock_client):
        """Test successful student access check when enrolled"""
        # Mock session response
        session_with_subject = {
            **self.mock_session_data,
            "subject": {
                "subject_id": str(self.subject_id),
                "teacher_id": "different-teacher-id",
                "name": "Test Subject"
            }
        }
        
        mock_session_response = Mock()
        mock_session_response.status_code = 200
        mock_session_response.json.return_value = [session_with_subject]
        
        # Mock enrollment response
        mock_enrollment_response = Mock()
        mock_enrollment_response.status_code = 200
        mock_enrollment_response.json.return_value = [{"student_id": str(self.user_id)}]
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.side_effect = [mock_session_response, mock_enrollment_response]
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.check_user_access_to_session(
            self.session_id, self.user_id, "student"
        )
        
        # Assertions
        self.assertTrue(result["has_access"])
        self.assertEqual(result["access_type"], "student")
        self.assertFalse(result["can_edit"])

    @patch('httpx.AsyncClient')
    async def test_check_user_access_session_not_found(self, mock_client):
        """Test access check when session doesn't exist"""
        # Mock empty response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.check_user_access_to_session(
            self.session_id, self.user_id, "teacher"
        )
        
        # Assertions
        self.assertFalse(result["has_access"])
        self.assertEqual(result["reason"], "Session not found")

    @patch('httpx.AsyncClient')
    async def test_mark_attendance_taken_success(self, mock_client):
        """Test successfully marking attendance as taken"""
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        
        mock_client_instance = AsyncMock()
        mock_client_instance.patch.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.mark_attendance_taken(self.session_id)
        
        # Assertions
        self.assertTrue(result)
        mock_client_instance.patch.assert_called_once()
        
        # Verify correct data was sent
        call_args = mock_client_instance.patch.call_args
        json_data = call_args[1]["json"]
        self.assertEqual(json_data["attendance_taken"], True)

    @patch('httpx.AsyncClient')
    async def test_mark_attendance_taken_error(self, mock_client):
        """Test marking attendance when API error occurs"""
        # Mock error HTTP response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal server error"
        
        mock_client_instance = AsyncMock()
        mock_client_instance.patch.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test
        result = await self.service.mark_attendance_taken(self.session_id)
        
        # Assertions
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()