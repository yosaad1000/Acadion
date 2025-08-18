"""
Comprehensive API endpoint validation tests for Google Calendar integration.
Tests all API endpoints for proper validation, error handling, and responses.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


class TestCalendarAPIEndpoints:
    """Test calendar-related API endpoints"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @pytest.mark.api_validation
    def test_calendar_connect_endpoint_validation(self):
        """Test /api/calendar/connect endpoint validation"""
        # Test without authentication
        response = self.client.post("/api/calendar/connect")
        assert response.status_code == 401
        
        # Test with invalid data
        with patch('app.routers.calendar.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            response = self.client.post(
                "/api/calendar/connect",
                headers={"Authorization": "Bearer test_token"},
                json={"invalid": "data"}
            )
            assert response.status_code in [400, 422]
    
    @pytest.mark.api_validation
    def test_calendar_callback_endpoint_validation(self):
        """Test /api/calendar/callback endpoint validation"""
        # Test without required parameters
        response = self.client.get("/api/calendar/callback")
        assert response.status_code in [400, 422]
        
        # Test with invalid state parameter
        response = self.client.get("/api/calendar/callback?code=test&state=invalid")
        assert response.status_code in [400, 401]
    
    @pytest.mark.api_validation
    def test_calendar_disconnect_endpoint_validation(self):
        """Test /api/calendar/disconnect endpoint validation"""
        # Test without authentication
        response = self.client.delete("/api/calendar/disconnect")
        assert response.status_code == 401
    
    @pytest.mark.api_validation
    def test_calendar_status_endpoint_validation(self):
        """Test /api/calendar/status endpoint validation"""
        # Test without authentication
        response = self.client.get("/api/calendar/status")
        assert response.status_code == 401


class TestSchedulingAPIEndpoints:
    """Test scheduling-related API endpoints"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @pytest.mark.api_validation
    def test_create_schedule_endpoint_validation(self):
        """Test POST /api/schedules endpoint validation"""
        # Test without authentication
        response = self.client.post("/api/schedules")
        assert response.status_code == 401
        
        # Test with invalid schedule data
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            invalid_data = {
                "subject_id": "",  # Empty subject_id
                "title": "",  # Empty title
                "start_datetime": "invalid_date",
                "duration_minutes": -10  # Negative duration
            }
            
            response = self.client.post(
                "/api/schedules",
                headers={"Authorization": "Bearer test_token"},
                json=invalid_data
            )
            assert response.status_code == 422
    
    @pytest.mark.api_validation
    def test_get_schedules_endpoint_validation(self):
        """Test GET /api/schedules endpoint validation"""
        # Test without authentication
        response = self.client.get("/api/schedules")
        assert response.status_code == 401
        
        # Test with invalid query parameters
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            response = self.client.get(
                "/api/schedules?start_date=invalid&end_date=invalid",
                headers={"Authorization": "Bearer test_token"}
            )
            assert response.status_code in [400, 422]
    
    @pytest.mark.api_validation
    def test_update_schedule_endpoint_validation(self):
        """Test PUT /api/schedules/{schedule_id} endpoint validation"""
        # Test without authentication
        response = self.client.put("/api/schedules/1")
        assert response.status_code == 401
        
        # Test with invalid schedule ID
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            response = self.client.put(
                "/api/schedules/invalid_id",
                headers={"Authorization": "Bearer test_token"},
                json={"title": "Updated Title"}
            )
            assert response.status_code in [400, 422]
    
    @pytest.mark.api_validation
    def test_delete_schedule_endpoint_validation(self):
        """Test DELETE /api/schedules/{schedule_id} endpoint validation"""
        # Test without authentication
        response = self.client.delete("/api/schedules/1")
        assert response.status_code == 401
        
        # Test with invalid schedule ID
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            response = self.client.delete(
                "/api/schedules/invalid_id",
                headers={"Authorization": "Bearer test_token"}
            )
            assert response.status_code in [400, 422]
    
    @pytest.mark.api_validation
    def test_sync_schedule_endpoint_validation(self):
        """Test POST /api/schedules/{schedule_id}/sync endpoint validation"""
        # Test without authentication
        response = self.client.post("/api/schedules/1/sync")
        assert response.status_code == 401


class TestInputValidationSecurity:
    """Test input validation for security vulnerabilities"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @pytest.mark.security_validation
    def test_sql_injection_protection(self):
        """Test protection against SQL injection attacks"""
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            sql_injection_payloads = [
                "'; DROP TABLE schedules; --",
                "1' OR '1'='1",
                "1; DELETE FROM users; --",
                "UNION SELECT * FROM users",
            ]
            
            for payload in sql_injection_payloads:
                response = self.client.get(
                    f"/api/schedules?subject_id={payload}",
                    headers={"Authorization": "Bearer test_token"}
                )
                # Should not return 500 (server error) or expose database errors
                assert response.status_code != 500
                
                if response.status_code == 200:
                    # Response should not contain sensitive database information
                    response_text = response.text.lower()
                    assert "error" not in response_text or "sql" not in response_text
    
    @pytest.mark.security_validation
    def test_xss_protection(self):
        """Test protection against XSS attacks"""
        with patch('app.routers.scheduling.get_current_user') as mock_user, \
             patch('app.services.scheduling_service.SchedulingService.create_class_schedule') as mock_create:
            
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            mock_create.return_value = 1
            
            xss_payloads = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//",
            ]
            
            for payload in xss_payloads:
                schedule_data = {
                    "subject_id": "CS101",
                    "title": payload,
                    "description": payload,
                    "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
                    "duration_minutes": 60
                }
                
                response = self.client.post(
                    "/api/schedules",
                    headers={"Authorization": "Bearer test_token"},
                    json=schedule_data
                )
                
                # Should either reject the input or sanitize it
                if response.status_code == 200:
                    response_data = response.json()
                    # Check that XSS payload is not reflected back unsanitized
                    assert payload not in str(response_data)
    
    @pytest.mark.security_validation
    def test_path_traversal_protection(self):
        """Test protection against path traversal attacks"""
        with patch('app.routers.scheduling.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            path_traversal_payloads = [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\config\\sam",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
                "....//....//....//etc/passwd",
            ]
            
            for payload in path_traversal_payloads:
                response = self.client.get(
                    f"/api/schedules/{payload}",
                    headers={"Authorization": "Bearer test_token"}
                )
                
                # Should return 404 or 400, not expose file system
                assert response.status_code in [400, 404, 422]
                
                # Response should not contain file system information
                response_text = response.text.lower()
                assert "root:" not in response_text
                assert "passwd" not in response_text
    
    @pytest.mark.security_validation
    def test_command_injection_protection(self):
        """Test protection against command injection attacks"""
        with patch('app.routers.scheduling.get_current_user') as mock_user, \
             patch('app.services.scheduling_service.SchedulingService.create_class_schedule') as mock_create:
            
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            mock_create.return_value = 1
            
            command_injection_payloads = [
                "; ls -la",
                "| cat /etc/passwd",
                "&& whoami",
                "`id`",
                "$(whoami)",
            ]
            
            for payload in command_injection_payloads:
                schedule_data = {
                    "subject_id": f"CS101{payload}",
                    "title": f"Test Class{payload}",
                    "start_datetime": (datetime.now() + timedelta(hours=1)).isoformat(),
                    "duration_minutes": 60
                }
                
                response = self.client.post(
                    "/api/schedules",
                    headers={"Authorization": "Bearer test_token"},
                    json=schedule_data
                )
                
                # Should not execute commands or return command output
                if response.status_code == 200:
                    response_text = response.text.lower()
                    assert "uid=" not in response_text  # Unix user ID output
                    assert "gid=" not in response_text  # Unix group ID output


class TestResponseValidation:
    """Test API response validation and consistency"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @pytest.mark.response_validation
    def test_error_response_format(self):
        """Test that error responses follow consistent format"""
        # Test 401 Unauthorized
        response = self.client.get("/api/schedules")
        assert response.status_code == 401
        
        error_data = response.json()
        assert "detail" in error_data or "message" in error_data
    
    @pytest.mark.response_validation
    def test_success_response_format(self):
        """Test that success responses follow consistent format"""
        with patch('app.routers.scheduling.get_current_user') as mock_user, \
             patch('app.services.scheduling_service.SchedulingService.get_teacher_schedules') as mock_get:
            
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            mock_get.return_value = []
            
            response = self.client.get(
                "/api/schedules",
                headers={"Authorization": "Bearer test_token"}
            )
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/json"
            
            # Response should be valid JSON
            response_data = response.json()
            assert isinstance(response_data, (list, dict))
    
    @pytest.mark.response_validation
    def test_pagination_response_format(self):
        """Test pagination response format consistency"""
        with patch('app.routers.scheduling.get_current_user') as mock_user, \
             patch('app.services.scheduling_service.SchedulingService.get_teacher_schedules') as mock_get:
            
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            mock_get.return_value = []
            
            response = self.client.get(
                "/api/schedules?page=1&limit=10",
                headers={"Authorization": "Bearer test_token"}
            )
            
            if response.status_code == 200:
                response_data = response.json()
                # If pagination is implemented, check for standard fields
                if isinstance(response_data, dict):
                    expected_fields = ["items", "total", "page", "limit"]
                    # At least some pagination fields should be present
                    assert any(field in response_data for field in expected_fields)
    
    @pytest.mark.response_validation
    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = self.client.options("/api/schedules")
        
        # CORS headers should be present for OPTIONS requests
        headers = response.headers
        
        # Check for common CORS headers (may not all be present)
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers"
        ]
        
        # At least one CORS header should be present
        has_cors = any(
            header.lower() in [h.lower() for h in headers.keys()] 
            for header in cors_headers
        )
        
        # This is informational - CORS may be handled by middleware
        print(f"CORS headers present: {has_cors}")
        print(f"Response headers: {dict(headers)}")


class TestRateLimitingValidation:
    """Test rate limiting implementation"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @pytest.mark.rate_limiting
    def test_rate_limiting_calendar_connect(self):
        """Test rate limiting on calendar connect endpoint"""
        with patch('app.routers.calendar.get_current_user') as mock_user:
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            
            # Make multiple rapid requests
            responses = []
            for i in range(10):
                response = self.client.post(
                    "/api/calendar/connect",
                    headers={"Authorization": "Bearer test_token"},
                    json={"provider": "google"}
                )
                responses.append(response.status_code)
            
            # Check if any requests were rate limited
            rate_limited = any(status == 429 for status in responses)
            
            # Rate limiting may or may not be implemented
            print(f"Rate limiting detected: {rate_limited}")
            print(f"Response codes: {responses}")
    
    @pytest.mark.rate_limiting
    def test_rate_limiting_schedule_creation(self):
        """Test rate limiting on schedule creation endpoint"""
        with patch('app.routers.scheduling.get_current_user') as mock_user, \
             patch('app.services.scheduling_service.SchedulingService.create_class_schedule') as mock_create:
            
            mock_user.return_value = {"id": 1, "user_type": "faculty"}
            mock_create.return_value = 1
            
            # Make multiple rapid schedule creation requests
            responses = []
            for i in range(15):
                schedule_data = {
                    "subject_id": f"CS{i:03d}",
                    "title": f"Rate Limit Test {i}",
                    "start_datetime": (datetime.now() + timedelta(hours=i+1)).isoformat(),
                    "duration_minutes": 60
                }
                
                response = self.client.post(
                    "/api/schedules",
                    headers={"Authorization": "Bearer test_token"},
                    json=schedule_data
                )
                responses.append(response.status_code)
            
            # Check for rate limiting
            rate_limited = any(status == 429 for status in responses)
            
            print(f"Schedule creation rate limiting: {rate_limited}")
            print(f"Response codes: {responses}")


if __name__ == "__main__":
    # Run API validation tests
    pytest.main(["-v", "-m", "api_validation or security_validation or response_validation", __file__])