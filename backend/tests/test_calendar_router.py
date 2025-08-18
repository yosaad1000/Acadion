"""
Integration tests for Calendar API router endpoints.
Tests OAuth connection flow, authentication, and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from main import app
from app.models.user import UserResponse, UserType
from app.services.oauth_service import OAuthError

client = TestClient(app)


class TestCalendarRouter:
    """Test cases for calendar router endpoints"""
    
    @pytest.fixture
    def mock_faculty_user(self):
        """Mock faculty user for testing"""
        return UserResponse(
            user_id="faculty123",
            name="Test Teacher",
            email="teacher@test.com",
            user_type=UserType.TEACHER,
            is_face_registered=True,
            created_at=datetime.now()
        )
    
    @pytest.fixture
    def mock_student_user(self):
        """Mock student user for testing"""
        return UserResponse(
            user_id="student123",
            name="Test Student",
            email="student@test.com",
            user_type=UserType.STUDENT,
            is_face_registered=True,
            created_at=datetime.now()
        )
    
    @pytest.fixture
    def mock_connection_status_connected(self):
        """Mock connected calendar status"""
        return {
            "is_connected": True,
            "provider": "google",
            "calendar_id": "primary",
            "connected_at": datetime.now(),
            "token_expires_at": datetime.now() + timedelta(hours=1)
        }
    
    @pytest.fixture
    def mock_connection_status_disconnected(self):
        """Mock disconnected calendar status"""
        return {
            "is_connected": False,
            "provider": None,
            "calendar_id": None,
            "connected_at": None
        }


class TestConnectEndpoint(TestCalendarRouter):
    """Test cases for /connect endpoint"""
    
    def test_connect_success(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test successful OAuth initiation"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected), \
             patch('app.routers.calendar.oauth_service.initiate_google_auth', 
                   return_value=("https://accounts.google.com/oauth/authorize?...", "state123")):
            
            response = client.get("/api/calendar/connect")
            
            assert response.status_code == 200
            data = response.json()
            assert "auth_url" in data
            assert "state" in data
            assert data["auth_url"].startswith("https://accounts.google.com")
            assert data["state"] == "state123"
    
    def test_connect_already_connected(self, mock_faculty_user, mock_connection_status_connected):
        """Test connection attempt when already connected"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected):
            
            response = client.get("/api/calendar/connect")
            
            assert response.status_code == 400
            assert "already connected" in response.json()["detail"]
    
    def test_connect_oauth_error(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test OAuth initiation error"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected), \
             patch('app.routers.calendar.oauth_service.initiate_google_auth', 
                   side_effect=OAuthError("OAuth init failed", "OAUTH_INIT_FAILED")):
            
            response = client.get("/api/calendar/connect")
            
            assert response.status_code == 400
            assert "OAuth init failed" in response.json()["detail"]
    
    def test_connect_unexpected_error(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test unexpected error during connection"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected), \
             patch('app.routers.calendar.oauth_service.initiate_google_auth', 
                   side_effect=Exception("Unexpected error")):
            
            response = client.get("/api/calendar/connect")
            
            assert response.status_code == 500
            assert "Failed to initiate Google Calendar connection" in response.json()["detail"]
    
    def test_connect_authentication_required(self):
        """Test that authentication is required"""
        response = client.get("/api/calendar/connect")
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden


class TestCallbackEndpoint(TestCalendarRouter):
    """Test cases for /callback endpoint"""
    
    def test_callback_success(self):
        """Test successful OAuth callback"""
        with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                   return_value={"success": True, "user_id": "faculty123"}):
            
            response = client.get("/api/calendar/callback?code=auth_code&state=state123")
            
            assert response.status_code == 302
            assert "success=true" in response.headers["location"]
            assert "Google Calendar connected successfully" in response.headers["location"]
    
    def test_callback_oauth_error(self):
        """Test OAuth error in callback"""
        response = client.get("/api/calendar/callback?error=access_denied")
        
        assert response.status_code == 302
        assert "error=oauth_denied" in response.headers["location"]
        assert "access_denied" in response.headers["location"]
    
    def test_callback_missing_parameters(self):
        """Test callback with missing parameters"""
        response = client.get("/api/calendar/callback")
        
        assert response.status_code == 302
        assert "error=invalid_request" in response.headers["location"]
        assert "Missing required parameters" in response.headers["location"]
    
    def test_callback_oauth_service_error(self):
        """Test OAuth service error during callback"""
        with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                   side_effect=OAuthError("Invalid state", "INVALID_STATE")):
            
            response = client.get("/api/calendar/callback?code=auth_code&state=invalid_state")
            
            assert response.status_code == 302
            assert "error=oauth_error" in response.headers["location"]
            assert "Invalid state" in response.headers["location"]
    
    def test_callback_unexpected_error(self):
        """Test unexpected error during callback"""
        with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                   side_effect=Exception("Unexpected error")):
            
            response = client.get("/api/calendar/callback?code=auth_code&state=state123")
            
            assert response.status_code == 302
            assert "error=server_error" in response.headers["location"]
            assert "unexpected error occurred" in response.headers["location"]
    
    def test_callback_failed_result(self):
        """Test callback with failed result"""
        with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                   return_value={"success": False}):
            
            response = client.get("/api/calendar/callback?code=auth_code&state=state123")
            
            assert response.status_code == 302
            assert "error=callback_failed" in response.headers["location"]


class TestDisconnectEndpoint(TestCalendarRouter):
    """Test cases for /disconnect endpoint"""
    
    def test_disconnect_success(self, mock_faculty_user, mock_connection_status_connected):
        """Test successful disconnection"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected), \
             patch('app.routers.calendar.oauth_service.revoke_access', return_value=True):
            
            response = client.delete("/api/calendar/disconnect")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Google Calendar disconnected successfully"
            assert data["status"] == "disconnected"
    
    def test_disconnect_not_connected(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test disconnection when not connected"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected):
            
            response = client.delete("/api/calendar/disconnect")
            
            assert response.status_code == 400
            assert "No Google Calendar connection found" in response.json()["detail"]
    
    def test_disconnect_revoke_failed(self, mock_faculty_user, mock_connection_status_connected):
        """Test disconnection when revoke fails"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected), \
             patch('app.routers.calendar.oauth_service.revoke_access', return_value=False):
            
            response = client.delete("/api/calendar/disconnect")
            
            assert response.status_code == 500
            assert "Failed to disconnect Google Calendar" in response.json()["detail"]
    
    def test_disconnect_unexpected_error(self, mock_faculty_user):
        """Test unexpected error during disconnection"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   side_effect=Exception("Unexpected error")):
            
            response = client.delete("/api/calendar/disconnect")
            
            assert response.status_code == 500
            assert "Failed to disconnect Google Calendar" in response.json()["detail"]
    
    def test_disconnect_authentication_required(self):
        """Test that authentication is required"""
        response = client.delete("/api/calendar/disconnect")
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden


class TestStatusEndpoint(TestCalendarRouter):
    """Test cases for /status endpoint"""
    
    def test_status_connected(self, mock_faculty_user, mock_connection_status_connected):
        """Test status when connected"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected):
            
            response = client.get("/api/calendar/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["is_connected"] is True
            assert data["provider"] == "google"
            assert data["calendar_id"] == "primary"
            assert "connected_at" in data
    
    def test_status_disconnected(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test status when disconnected"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected):
            
            response = client.get("/api/calendar/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["is_connected"] is False
            assert data["provider"] is None
            assert data["calendar_id"] is None
            assert data["connected_at"] is None
    
    def test_status_error_handling(self, mock_faculty_user):
        """Test status endpoint error handling"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   side_effect=Exception("Service error")):
            
            response = client.get("/api/calendar/status")
            
            # Should return disconnected status on error rather than failing
            assert response.status_code == 200
            data = response.json()
            assert data["is_connected"] is False
    
    def test_status_authentication_required(self):
        """Test that authentication is required"""
        response = client.get("/api/calendar/status")
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden


class TestTestConnectionEndpoint(TestCalendarRouter):
    """Test cases for /test-connection endpoint"""
    
    def test_test_connection_success(self, mock_faculty_user, mock_connection_status_connected):
        """Test successful connection test"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected), \
             patch('app.routers.calendar.oauth_service.get_valid_token', 
                   return_value="valid_token"):
            
            response = client.post("/api/calendar/test-connection")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["token_valid"] is True
            assert "Google Calendar connection is working" in data["message"]
            assert data["calendar_id"] == "primary"
    
    def test_test_connection_invalid_token(self, mock_faculty_user, mock_connection_status_connected):
        """Test connection test with invalid token"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_connected), \
             patch('app.routers.calendar.oauth_service.get_valid_token', 
                   return_value=None):
            
            response = client.post("/api/calendar/test-connection")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["token_valid"] is False
            assert "invalid tokens" in data["message"]
    
    def test_test_connection_not_connected(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test connection test when not connected"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected):
            
            response = client.post("/api/calendar/test-connection")
            
            assert response.status_code == 400
            assert "No Google Calendar connection found" in response.json()["detail"]
    
    def test_test_connection_error(self, mock_faculty_user):
        """Test connection test error handling"""
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   side_effect=Exception("Service error")):
            
            response = client.post("/api/calendar/test-connection")
            
            assert response.status_code == 500
            assert "Failed to test calendar connection" in response.json()["detail"]
    
    def test_test_connection_authentication_required(self):
        """Test that authentication is required"""
        response = client.post("/api/calendar/test-connection")
        
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden


class TestCalendarRouterIntegration(TestCalendarRouter):
    """Integration tests for calendar router workflow"""
    
    def test_complete_oauth_flow(self, mock_faculty_user, mock_connection_status_disconnected):
        """Test complete OAuth flow from connect to callback"""
        # Step 1: Initiate connection
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_connection_status_disconnected), \
             patch('app.routers.calendar.oauth_service.initiate_google_auth', 
                   return_value=("https://accounts.google.com/oauth/authorize?state=state123", "state123")):
            
            connect_response = client.get("/api/calendar/connect")
            assert connect_response.status_code == 200
            
            connect_data = connect_response.json()
            state = connect_data["state"]
        
        # Step 2: Handle callback
        with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                   return_value={"success": True, "user_id": "faculty123", "connection_id": 1}):
            
            callback_response = client.get(f"/api/calendar/callback?code=auth_code&state={state}")
            assert callback_response.status_code == 302
            assert "success=true" in callback_response.headers["location"]
    
    def test_connection_lifecycle(self, mock_faculty_user):
        """Test complete connection lifecycle: connect -> status -> test -> disconnect"""
        connected_status = {
            "is_connected": True,
            "provider": "google",
            "calendar_id": "primary",
            "connected_at": datetime.now()
        }
        
        disconnected_status = {
            "is_connected": False,
            "provider": None,
            "calendar_id": None,
            "connected_at": None
        }
        
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user):
            # Test status when connected
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       return_value=connected_status):
                status_response = client.get("/api/calendar/status")
                assert status_response.status_code == 200
                assert status_response.json()["is_connected"] is True
            
            # Test connection
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       return_value=connected_status), \
                 patch('app.routers.calendar.oauth_service.get_valid_token', 
                       return_value="valid_token"):
                test_response = client.post("/api/calendar/test-connection")
                assert test_response.status_code == 200
                assert test_response.json()["success"] is True
            
            # Disconnect
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       return_value=connected_status), \
                 patch('app.routers.calendar.oauth_service.revoke_access', 
                       return_value=True):
                disconnect_response = client.delete("/api/calendar/disconnect")
                assert disconnect_response.status_code == 200
            
            # Verify disconnected status
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       return_value=disconnected_status):
                final_status_response = client.get("/api/calendar/status")
                assert final_status_response.status_code == 200
                assert final_status_response.json()["is_connected"] is False
    
    def test_error_handling_consistency(self, mock_faculty_user):
        """Test consistent error handling across endpoints"""
        oauth_error = OAuthError("Service unavailable", "SERVICE_UNAVAILABLE")
        
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user):
            # Test connect endpoint error handling
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       side_effect=oauth_error):
                connect_response = client.get("/api/calendar/connect")
                assert connect_response.status_code == 400
            
            # Test disconnect endpoint error handling
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       side_effect=oauth_error):
                disconnect_response = client.delete("/api/calendar/disconnect")
                assert disconnect_response.status_code == 500
            
            # Test test-connection endpoint error handling
            with patch('app.routers.calendar.oauth_service.get_connection_status', 
                       side_effect=oauth_error):
                test_response = client.post("/api/calendar/test-connection")
                assert test_response.status_code == 500
    
    def test_user_type_access(self, mock_student_user, mock_faculty_user):
        """Test that both students and faculty can access calendar endpoints"""
        mock_status = {"is_connected": False, "provider": None, "calendar_id": None, "connected_at": None}
        
        # Test student access
        with patch('app.routers.calendar.get_current_user', return_value=mock_student_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_status):
            student_response = client.get("/api/calendar/status")
            assert student_response.status_code == 200
        
        # Test faculty access
        with patch('app.routers.calendar.get_current_user', return_value=mock_faculty_user), \
             patch('app.routers.calendar.oauth_service.get_connection_status', 
                   return_value=mock_status):
            faculty_response = client.get("/api/calendar/status")
            assert faculty_response.status_code == 200


class TestCalendarRouterSecurity(TestCalendarRouter):
    """Security tests for calendar router"""
    
    def test_all_endpoints_require_authentication(self):
        """Test that all endpoints require authentication"""
        endpoints = [
            ("GET", "/api/calendar/connect"),
            ("GET", "/api/calendar/callback"),
            ("DELETE", "/api/calendar/disconnect"),
            ("GET", "/api/calendar/status"),
            ("POST", "/api/calendar/test-connection")
        ]
        
        for method, endpoint in endpoints:
            if method == "GET" and "callback" in endpoint:
                # Callback endpoint doesn't require auth but handles its own validation
                continue
                
            response = getattr(client, method.lower())(endpoint)
            assert response.status_code in [401, 403], f"Endpoint {method} {endpoint} should require authentication"
    
    def test_callback_parameter_validation(self):
        """Test callback endpoint parameter validation"""
        # Test with various invalid parameter combinations
        test_cases = [
            ("", ""),  # Empty parameters
            ("code123", ""),  # Missing state
            ("", "state123"),  # Missing code
            ("code with spaces", "state123"),  # Invalid code format
        ]
        
        for code, state in test_cases:
            params = []
            if code:
                params.append(f"code={code}")
            if state:
                params.append(f"state={state}")
            
            query_string = "&".join(params)
            url = f"/api/calendar/callback?{query_string}" if query_string else "/api/calendar/callback"
            
            response = client.get(url)
            assert response.status_code == 302
            assert "error=" in response.headers["location"]
    
    def test_state_parameter_security(self):
        """Test state parameter security in OAuth flow"""
        # Test callback with potentially malicious state parameter
        malicious_states = [
            "javascript:alert('xss')",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "'; DROP TABLE users; --"
        ]
        
        for malicious_state in malicious_states:
            with patch('app.routers.calendar.oauth_service.handle_oauth_callback', 
                       side_effect=OAuthError("Invalid state", "INVALID_STATE")):
                response = client.get(f"/api/calendar/callback?code=code123&state={malicious_state}")
                assert response.status_code == 302
                assert "error=oauth_error" in response.headers["location"]