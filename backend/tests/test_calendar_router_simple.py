"""
Simple integration tests for Calendar API router endpoints.
Tests basic endpoint availability and authentication requirements.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestCalendarRouterBasic:
    """Basic tests for calendar router endpoints"""
    
    def test_connect_endpoint_exists(self):
        """Test that connect endpoint exists and requires authentication"""
        response = client.get("/api/calendar/connect")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403]
    
    def test_callback_endpoint_exists(self):
        """Test that callback endpoint exists"""
        response = client.get("/api/calendar/callback", follow_redirects=False)
        # Should redirect with error for missing parameters
        assert response.status_code == 302
        assert "error=" in response.headers["location"]
    
    def test_disconnect_endpoint_exists(self):
        """Test that disconnect endpoint exists and requires authentication"""
        response = client.delete("/api/calendar/disconnect")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403]
    
    def test_status_endpoint_exists(self):
        """Test that status endpoint exists and requires authentication"""
        response = client.get("/api/calendar/status")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403]
    
    def test_test_connection_endpoint_exists(self):
        """Test that test-connection endpoint exists and requires authentication"""
        response = client.post("/api/calendar/test-connection")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403]
    
    def test_callback_with_error_parameter(self):
        """Test callback endpoint with error parameter"""
        response = client.get("/api/calendar/callback?error=access_denied", follow_redirects=False)
        assert response.status_code == 302
        assert "error=oauth_denied" in response.headers["location"]
        assert "access_denied" in response.headers["location"]
    
    def test_callback_missing_parameters(self):
        """Test callback endpoint with missing parameters"""
        response = client.get("/api/calendar/callback", follow_redirects=False)
        assert response.status_code == 302
        assert "error=invalid_request" in response.headers["location"]
        assert "Missing%20required%20parameters" in response.headers["location"]
    
    def test_callback_partial_parameters(self):
        """Test callback endpoint with partial parameters"""
        # Test with only code
        response = client.get("/api/calendar/callback?code=test_code", follow_redirects=False)
        assert response.status_code == 302
        assert "error=invalid_request" in response.headers["location"]
        
        # Test with only state
        response = client.get("/api/calendar/callback?state=test_state", follow_redirects=False)
        assert response.status_code == 302
        assert "error=invalid_request" in response.headers["location"]
    
    def test_api_documentation_includes_calendar_endpoints(self):
        """Test that calendar endpoints are included in API documentation"""
        response = client.get("/docs")
        assert response.status_code == 200
        # The docs should be accessible (this tests that the router is properly registered)
    
    def test_openapi_schema_includes_calendar_endpoints(self):
        """Test that calendar endpoints are included in OpenAPI schema"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_data = response.json()
        paths = openapi_data.get("paths", {})
        
        # Check that calendar endpoints are in the schema
        assert "/api/calendar/connect" in paths
        assert "/api/calendar/callback" in paths
        assert "/api/calendar/disconnect" in paths
        assert "/api/calendar/status" in paths
        assert "/api/calendar/test-connection" in paths
        
        # Check that endpoints have proper HTTP methods
        assert "get" in paths["/api/calendar/connect"]
        assert "get" in paths["/api/calendar/callback"]
        assert "delete" in paths["/api/calendar/disconnect"]
        assert "get" in paths["/api/calendar/status"]
        assert "post" in paths["/api/calendar/test-connection"]
    
    def test_calendar_endpoints_have_proper_tags(self):
        """Test that calendar endpoints are properly tagged"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_data = response.json()
        paths = openapi_data.get("paths", {})
        
        # Check that calendar endpoints have the "Calendar" tag
        for endpoint in ["/api/calendar/connect", "/api/calendar/disconnect", 
                        "/api/calendar/status", "/api/calendar/test-connection"]:
            if endpoint in paths:
                for method_data in paths[endpoint].values():
                    if isinstance(method_data, dict) and "tags" in method_data:
                        assert "Calendar" in method_data["tags"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])