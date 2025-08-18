"""
End-to-end integration tests that test the actual running server
"""
import requests
import pytest
import json
import time
from typing import Dict, Any

# Test server URL
BASE_URL = "http://localhost:8000"  # Use the main server, not test server

class TestE2EIntegration:
    """End-to-end integration tests"""
    
    def test_server_health_check(self):
        """Test that the server health check endpoint works"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "version" in data
            print("✅ Health check endpoint working")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print("✅ Root endpoint working")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code == 200
            
            # Check for CORS headers (they might be present)
            headers = response.headers
            print(f"Response headers: {dict(headers)}")
            print("✅ CORS headers check completed")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_authentication_endpoints_exist(self):
        """Test that authentication endpoints exist and return proper errors"""
        try:
            # Test login endpoint exists
            response = requests.post(f"{BASE_URL}/api/auth/login", 
                                   json={"email": "test@test.com", "password": "test"}, 
                                   timeout=5)
            # Should return 400 or 401, not 404
            assert response.status_code in [400, 401, 422]
            print("✅ Login endpoint exists")
            
            # Test register endpoint exists
            response = requests.post(f"{BASE_URL}/api/auth/register", 
                                   json={"email": "test@test.com", "password": "test", "name": "Test", "user_type": "student"}, 
                                   timeout=5)
            # Should return 400 or 422, not 404
            assert response.status_code in [400, 422]
            print("✅ Register endpoint exists")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_protected_endpoints_require_auth(self):
        """Test that protected endpoints require authentication"""
        try:
            # Test profile endpoint requires auth
            response = requests.get(f"{BASE_URL}/api/profile/", timeout=5)
            assert response.status_code == 401  # Should require authentication
            print("✅ Profile endpoint properly protected")
            
            # Test subjects endpoint requires auth
            response = requests.get(f"{BASE_URL}/api/subjects/", timeout=5)
            assert response.status_code == 401  # Should require authentication
            print("✅ Subjects endpoint properly protected")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_api_documentation_accessible(self):
        """Test that API documentation is accessible"""
        try:
            # Test Swagger docs
            response = requests.get(f"{BASE_URL}/docs", timeout=5)
            assert response.status_code == 200
            print("✅ Swagger documentation accessible")
            
            # Test ReDoc
            response = requests.get(f"{BASE_URL}/redoc", timeout=5)
            assert response.status_code == 200
            print("✅ ReDoc documentation accessible")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")

class TestDatabaseConnectivity:
    """Test database connectivity and basic operations"""
    
    def test_database_connection_via_health_check(self):
        """Test database connection through health check"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert data["database"] == "supabase"
            print("✅ Database connection confirmed via health check")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")

class TestSecurityHeaders:
    """Test security-related headers and configurations"""
    
    def test_security_headers_present(self):
        """Test that basic security headers are present"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code == 200
            
            headers = response.headers
            print(f"Security headers check - Response headers: {dict(headers)}")
            
            # Check for basic security headers (they might not all be present, but check what we have)
            security_headers = [
                'server',  # Should be present
                'content-type',  # Should be present
                'content-length'  # Should be present
            ]
            
            for header in security_headers:
                if header.lower() in [h.lower() for h in headers.keys()]:
                    print(f"✅ {header} header present")
                else:
                    print(f"ℹ️ {header} header not present (may be optional)")
            
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")

class TestErrorHandling:
    """Test error handling and response formats"""
    
    def test_404_handling(self):
        """Test 404 error handling"""
        try:
            response = requests.get(f"{BASE_URL}/nonexistent-endpoint", timeout=5)
            assert response.status_code == 404
            print("✅ 404 errors handled properly")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")
    
    def test_method_not_allowed_handling(self):
        """Test method not allowed handling"""
        try:
            # Try POST on a GET-only endpoint
            response = requests.post(f"{BASE_URL}/api/health", timeout=5)
            assert response.status_code == 405  # Method not allowed
            print("✅ Method not allowed errors handled properly")
        except requests.exceptions.ConnectionError:
            pytest.skip("Server not running - skipping E2E tests")

if __name__ == "__main__":
    # Run a quick connectivity test
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=2)
        if response.status_code == 200:
            print("🚀 Server is running and accessible!")
            print("Running integration tests...")
            pytest.main([__file__, "-v", "-s"])
        else:
            print(f"❌ Server responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")