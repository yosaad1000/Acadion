"""
Simple integration tests to verify basic functionality
"""
import pytest
import asyncio
from httpx import AsyncClient
from main import app

class TestSimpleIntegration:
    """Simple integration tests"""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_works(self):
        """Test health endpoint works"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            print("✅ Health endpoint working")
    
    @pytest.mark.asyncio
    async def test_root_endpoint_works(self):
        """Test root endpoint works"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print("✅ Root endpoint working")
    
    @pytest.mark.asyncio
    async def test_docs_accessible(self):
        """Test API docs are accessible"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/docs")
            assert response.status_code == 200
            print("✅ API docs accessible")
    
    @pytest.mark.asyncio
    async def test_protected_endpoints_require_auth(self):
        """Test protected endpoints require authentication"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Profile endpoint should require auth
            response = await client.get("/api/profile/")
            assert response.status_code in [401, 403]  # Both indicate auth required
            print("✅ Profile endpoint properly protected")
            
            # Subjects endpoint should require auth
            response = await client.get("/api/subjects")  # Remove trailing slash
            assert response.status_code in [401, 403]  # Both indicate auth required
            print("✅ Subjects endpoint properly protected")
    
    @pytest.mark.asyncio
    async def test_auth_endpoints_exist(self):
        """Test auth endpoints exist"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Login endpoint should exist
            response = await client.post("/api/auth/login", json={
                "email": "test@test.com",
                "password": "test"
            })
            # Should not be 404
            assert response.status_code != 404
            print("✅ Login endpoint exists")
            
            # Register endpoint should exist
            response = await client.post("/api/auth/register", json={
                "email": "test@test.com",
                "password": "TestPass123",
                "name": "Test User",
                "user_type": "student"
            })
            # Should not be 404
            assert response.status_code != 404
            print("✅ Register endpoint exists")

class TestApplicationStartup:
    """Test application startup and configuration"""
    
    def test_app_instance_created(self):
        """Test that FastAPI app instance is created"""
        assert app is not None
        assert hasattr(app, 'title')
        assert app.title == "AI-Powered Student Management Platform API"
        print("✅ FastAPI app instance created correctly")
    
    def test_routers_included(self):
        """Test that routers are included"""
        # Check that routes exist
        routes = [route.path for route in app.routes]
        
        expected_routes = [
            "/api/health",
            "/",
            "/docs",
            "/redoc"
        ]
        
        for route in expected_routes:
            assert any(route in r for r in routes), f"Route {route} not found"
            print(f"✅ Route {route} found")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])