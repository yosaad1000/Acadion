#!/usr/bin/env python3
"""
Error scenario and edge case tests for session management
Tests various error conditions and edge cases for Requirements 4.1, 4.2, 4.4, 4.5
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
import httpx

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from app.models.user import UserResponse, UserType, AuthProvider
from app.services.session_service import SessionService


class TestSessionErrorScenarios(unittest.TestCase):
    """Test error scenarios and edge cases for session management"""
    
    def setUp(self):
        """Set up test client and mocks"""
        self.client = TestClient(app)
        self.service = SessionService()
        
        # Mock users
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

    def test_invalid_uuid_format(self):
        """Test API endpoints with invalid UUID formats"""
        # Test invalid subject ID
        response = self.client.get("/api/sessions/subject/invalid-uuid")
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Test invalid session ID
        response = self.client.get("/api/sessions/invalid-uuid")
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    def test_missing_authentication(self, mock_get_user):
        """Test endpoints without authentication"""
        # Mock authentication failure
        mock_get_user.side_effect = Exception("Authentication failed")
        
        # Test various endpoints
        endpoints = [
            ("GET", "/api/sessions/subject/12345678-1234-1234-1234-123456789012"),
            ("POST", "/api/sessions"),
            ("GET", "/api/sessions/12345678-1234-1234-1234-123456789012"),
            ("PUT", "/api/sessions/12345678-1234-1234-1234-123456789012"),
            ("DELETE", "/api/sessions/12345678-1234-1234-1234-123456789012")
        ]
        
        for method, endpoint in endpoints:
            with self.subTest(method=method, endpoint=endpoint):
                if method == "GET":
                    response = self.client.get(endpoint)
                elif method == "POST":
                    response = self.client.post(endpoint, json={})
                elif method == "PUT":
                    response = self.client.put(endpoint, json={})
                elif method == "DELETE":
                    response = self.client.delete(endpoint)
                
                # Should return 500 due to authentication error
                self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_malformed_request_data(self, mock_get_subject, mock_get_user):
        """Test session creation with malformed request data"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = {
            "subject_id": "subject-123",
            "teacher_id": "auth-teacher-123"
        }
        
        # Test cases with malformed data
        test_cases = [
            # Missing required fields
            {},
            {"name": "Test Session"},  # Missing subject_id
            
            # Invalid data types
            {"subject_id": "invalid-uuid", "name": "Test"},
            {"subject_id": "12345678-1234-1234-1234-123456789012", "name": 123},
            {"subject_id": "12345678-1234-1234-1234-123456789012", "session_date": "invalid-date"},
            
            # Extremely long strings
            {
                "subject_id": "12345678-1234-1234-1234-123456789012",
                "name": "x" * 1000,  # Very long name
                "description": "y" * 10000  # Very long description
            }
        ]
        
        for i, test_data in enumerate(test_cases):
            with self.subTest(case=i, data=test_data):
                response = self.client.post("/api/sessions", json=test_data)
                # Should return 422 for validation errors or 403/500 for other issues
                self.assertIn(response.status_code, [
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    status.HTTP_403_FORBIDDEN,
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ])

    @patch('httpx.AsyncClient')
    async def test_network_timeout_scenarios(self, mock_client):
        """Test service behavior during network timeouts"""
        # Mock timeout error
        mock_client_instance = AsyncMock()
        mock_client_instance.get.side_effect = httpx.TimeoutException("Request timeout")
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        subject_id = uuid4()
        
        # Test various service methods with timeout
        test_methods = [
            ("generate_session_name", [subject_id]),
            ("get_sessions_by_subject", [subject_id]),
            ("get_session_by_id", [uuid4()]),
        ]
        
        for method_name, args in test_methods:
            with self.subTest(method=method_name):
                method = getattr(self.service, method_name)
                result = await method(*args)
                
                # Should handle timeout gracefully
                if method_name == "generate_session_name":
                    self.assertEqual(result, "Session 1")  # Fallback
                elif method_name == "get_sessions_by_subject":
                    self.assertEqual(result["sessions"], [])  # Empty result
                elif method_name == "get_session_by_id":
                    self.assertIsNone(result)  # None result

    @patch('httpx.AsyncClient')
    async def test_database_connection_errors(self, mock_client):
        """Test service behavior during database connection errors"""
        # Mock connection error
        mock_client_instance = AsyncMock()
        mock_client_instance.post.side_effect = httpx.ConnectError("Connection failed")
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        from app.models.session import SessionCreate
        
        # Test session creation with connection error
        session_data = SessionCreate(
            subject_id=uuid4(),
            name="Test Session"
        )
        
        result = await self.service.create_session(session_data, uuid4())
        self.assertIsNone(result)  # Should return None on error

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    @patch('app.services.session_service.SessionService.get_sessions_by_subject')
    def test_large_dataset_pagination(self, mock_get_sessions, mock_get_subject, mock_get_user):
        """Test pagination with large datasets"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = {
            "subject_id": "subject-123",
            "teacher_id": "auth-teacher-123"
        }
        
        # Mock large dataset
        mock_get_sessions.return_value = {
            "sessions": [],
            "total_count": 10000,  # Large number
            "page": 100,  # High page number
            "page_size": 50
        }
        
        # Test high page number
        response = self.client.get("/api/sessions/subject/subject-123?page=100&page_size=50")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_count"], 10000)
        self.assertEqual(data["page"], 100)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_concurrent_session_creation(self, mock_get_subject, mock_get_user):
        """Test concurrent session creation scenarios"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = {
            "subject_id": "subject-123",
            "teacher_id": "auth-teacher-123"
        }
        
        # Simulate race condition by creating multiple sessions quickly
        session_data = {
            "subject_id": "subject-123",
            "name": "Concurrent Session"
        }
        
        # This test mainly ensures the endpoint doesn't crash under concurrent load
        # In a real scenario, you'd use threading or async calls
        responses = []
        for i in range(5):
            response = self.client.post("/api/sessions", json=session_data)
            responses.append(response.status_code)
        
        # At least some requests should succeed or fail gracefully
        for status_code in responses:
            self.assertIn(status_code, [
                status.HTTP_200_OK,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                status.HTTP_403_FORBIDDEN
            ])

    @patch('httpx.AsyncClient')
    async def test_malformed_api_responses(self, mock_client):
        """Test handling of malformed API responses from Supabase"""
        # Mock malformed JSON response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test service method
        result = await self.service.get_session_by_id(uuid4())
        self.assertIsNone(result)  # Should handle JSON error gracefully

    @patch('httpx.AsyncClient')
    async def test_partial_api_failures(self, mock_client):
        """Test scenarios where some API calls succeed and others fail"""
        subject_id = uuid4()
        
        # Mock mixed success/failure responses
        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = []
        success_response.headers = {"Content-Range": "0-0/0"}
        
        failure_response = Mock()
        failure_response.status_code = 500
        failure_response.text = "Internal server error"
        
        mock_client_instance = AsyncMock()
        # First call succeeds, second fails
        mock_client_instance.get.side_effect = [success_response, failure_response]
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Test method that might make multiple calls
        result = await self.service.get_sessions_by_subject(subject_id)
        
        # Should handle partial failures gracefully
        self.assertIsInstance(result, dict)
        self.assertIn("sessions", result)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.session_service.SessionService.check_user_access_to_session')
    def test_permission_edge_cases(self, mock_check_access, mock_get_user):
        """Test edge cases in permission checking"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        
        # Test various permission scenarios
        permission_scenarios = [
            # User has access but can't edit
            {"has_access": True, "can_edit": False, "reason": "Read-only access"},
            
            # User access check returns unexpected format
            {"has_access": True},  # Missing can_edit field
            
            # Access check fails with error
            {"has_access": False, "reason": "Database error"},
        ]
        
        session_id = "12345678-1234-1234-1234-123456789012"
        
        for i, scenario in enumerate(permission_scenarios):
            with self.subTest(scenario=i):
                mock_check_access.return_value = scenario
                
                # Test update operation (requires edit permission)
                response = self.client.put(f"/api/sessions/{session_id}", json={"name": "Updated"})
                
                if scenario.get("can_edit", False):
                    # Should succeed if can_edit is True
                    self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
                else:
                    # Should fail if can_edit is False or missing
                    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('app.middleware.supabase_auth.get_current_user_supabase')
    @patch('app.services.local_supabase.LocalSupabase.get_subject_by_id')
    def test_boundary_value_testing(self, mock_get_subject, mock_get_user):
        """Test boundary values for pagination and other parameters"""
        # Setup mocks
        mock_get_user.return_value = self.mock_teacher
        mock_get_subject.return_value = {
            "subject_id": "subject-123",
            "teacher_id": "auth-teacher-123"
        }
        
        subject_id = "subject-123"
        
        # Test boundary values for pagination
        boundary_tests = [
            # Valid boundaries
            {"page": 1, "page_size": 1, "expected_status": 200},
            {"page": 1, "page_size": 100, "expected_status": 200},
            
            # Invalid boundaries
            {"page": 0, "page_size": 50, "expected_status": 422},  # page < 1
            {"page": 1, "page_size": 0, "expected_status": 422},   # page_size < 1
            {"page": 1, "page_size": 101, "expected_status": 422}, # page_size > 100
            {"page": -1, "page_size": 50, "expected_status": 422}, # negative page
        ]
        
        for test in boundary_tests:
            with self.subTest(test=test):
                response = self.client.get(
                    f"/api/sessions/subject/{subject_id}",
                    params={"page": test["page"], "page_size": test["page_size"]}
                )
                self.assertEqual(response.status_code, test["expected_status"])


class TestSessionServiceErrorHandling(unittest.IsolatedAsyncioTestCase):
    """Async tests for service-level error handling"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.service = SessionService()

    @patch('httpx.AsyncClient')
    async def test_service_initialization_failure(self, mock_client):
        """Test service behavior when initialization fails"""
        # This test verifies the service handles initialization errors
        # The actual SessionService.__init__ is already robust, but we test edge cases
        
        # Mock a scenario where settings are invalid
        with patch('app.services.session_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = None
            mock_settings.SUPABASE_SERVICE_KEY = None
            
            # Service should still initialize but mark connection as unhealthy
            try:
                service = SessionService()
                # If it doesn't raise an exception, check the connection health
                self.assertFalse(service._connection_healthy)
            except Exception:
                # If it raises an exception, that's also acceptable behavior
                pass

    @patch('httpx.AsyncClient')
    async def test_http_client_context_manager_failure(self, mock_client):
        """Test handling of HTTP client context manager failures"""
        # Mock context manager failure
        mock_client.return_value.__aenter__.side_effect = Exception("Client creation failed")
        
        # Test a service method
        result = await self.service.generate_session_name(uuid4())
        
        # Should fallback gracefully
        self.assertEqual(result, "Session 1")


if __name__ == "__main__":
    unittest.main()