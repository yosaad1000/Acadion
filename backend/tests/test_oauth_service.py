"""
Simplified unit tests for OAuth service.
Tests core OAuth functionality with mocked dependencies.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

from app.services.oauth_service import OAuthService, OAuthError


class TestOAuthServiceSimple:
    """Simplified test cases for OAuth service functionality."""
    
    def test_oauth_service_initialization(self):
        """Test OAuth service can be initialized with proper configuration."""
        with patch('app.services.oauth_service.settings') as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
            mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/calendar/callback"
            mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
            
            service = OAuthService()
            
            assert service.client_id == "test_client_id"
            assert service.client_secret == "test_client_secret"
            assert service.redirect_uri == "http://localhost:8000/api/calendar/callback"
            assert service.scopes == ["https://www.googleapis.com/auth/calendar"]
    
    def test_oauth_service_initialization_missing_config(self):
        """Test OAuth service initialization fails with missing configuration."""
        with patch('app.services.oauth_service.settings') as mock_settings:
            mock_settings.GOOGLE_CLIENT_ID = ""
            mock_settings.GOOGLE_CLIENT_SECRET = "test_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/callback"
            
            with pytest.raises(ValueError, match="Google OAuth configuration incomplete"):
                OAuthService()
    
    def test_oauth_error_creation(self):
        """Test OAuthError exception creation."""
        error = OAuthError(
            message="Test error",
            error_code="TEST_ERROR",
            retry_after=60
        )
        
        assert str(error) == "Test error"
        assert error.message == "Test error"
        assert error.error_code == "TEST_ERROR"
        assert error.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_initiate_google_auth_basic(self):
        """Test basic OAuth flow initiation."""
        with patch('app.services.oauth_service.settings') as mock_settings, \
             patch('app.services.oauth_service.Flow') as mock_flow_class, \
             patch('app.services.oauth_service.LocalSupabase') as mock_local_supabase, \
             patch('app.services.oauth_service.httpx.AsyncClient') as mock_async_client:
            
            # Setup mocks
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
            mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/calendar/callback"
            mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
            
            # Mock LocalSupabase
            mock_db = Mock()
            mock_db.base_url = "http://localhost:54321"
            mock_db.headers = {"Authorization": "Bearer test"}
            mock_local_supabase.return_value = mock_db
            
            # Mock HTTP client
            mock_client = Mock()
            mock_response = Mock()
            mock_response.status_code = 201
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            # Mock Flow
            mock_flow = Mock()
            mock_flow.authorization_url.return_value = ("https://accounts.google.com/oauth/authorize?test=1", "test_state")
            mock_flow_class.from_client_config.return_value = mock_flow
            
            # Test
            service = OAuthService()
            auth_url, state = await service.initiate_google_auth(user_id=1, user_type="faculty")
            
            assert auth_url == "https://accounts.google.com/oauth/authorize?test=1"
            assert len(state) > 20  # State should be a secure random string
            
            # Verify flow was configured correctly
            mock_flow_class.from_client_config.assert_called_once()
            mock_flow.authorization_url.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_connection_status_not_connected(self):
        """Test getting connection status for non-connected user."""
        with patch('app.services.oauth_service.settings') as mock_settings, \
             patch('app.services.oauth_service.LocalSupabase') as mock_local_supabase, \
             patch('app.services.oauth_service.httpx.AsyncClient') as mock_async_client:
            
            # Setup mocks
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
            mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/calendar/callback"
            mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
            
            # Mock LocalSupabase
            mock_db = Mock()
            mock_db.base_url = "http://localhost:54321"
            mock_db.headers = {"Authorization": "Bearer test"}
            mock_local_supabase.return_value = mock_db
            
            # Mock HTTP client - return empty result (no connection)
            mock_client = Mock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            mock_client.get.return_value = mock_response
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            # Test
            service = OAuthService()
            status = await service.get_connection_status(user_id=1)
            
            assert status["is_connected"] is False
            assert status["provider"] is None
            assert status["calendar_id"] is None
            assert status["connected_at"] is None
    
    @pytest.mark.asyncio
    async def test_get_valid_token_no_connection(self):
        """Test getting valid token with no stored connection."""
        with patch('app.services.oauth_service.settings') as mock_settings, \
             patch('app.services.oauth_service.LocalSupabase') as mock_local_supabase, \
             patch('app.services.oauth_service.httpx.AsyncClient') as mock_async_client:
            
            # Setup mocks
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
            mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/calendar/callback"
            mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
            
            # Mock LocalSupabase
            mock_db = Mock()
            mock_db.base_url = "http://localhost:54321"
            mock_db.headers = {"Authorization": "Bearer test"}
            mock_local_supabase.return_value = mock_db
            
            # Mock HTTP client - return empty result (no connection)
            mock_client = Mock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            mock_client.get.return_value = mock_response
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            # Test
            service = OAuthService()
            token = await service.get_valid_token(user_id=1)
            
            assert token is None
    
    @pytest.mark.asyncio
    async def test_revoke_access_no_connection(self):
        """Test access revocation with no stored connection."""
        with patch('app.services.oauth_service.settings') as mock_settings, \
             patch('app.services.oauth_service.LocalSupabase') as mock_local_supabase, \
             patch('app.services.oauth_service.httpx.AsyncClient') as mock_async_client:
            
            # Setup mocks
            mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
            mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
            mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/calendar/callback"
            mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
            
            # Mock LocalSupabase
            mock_db = Mock()
            mock_db.base_url = "http://localhost:54321"
            mock_db.headers = {"Authorization": "Bearer test"}
            mock_local_supabase.return_value = mock_db
            
            # Mock HTTP client - return empty result (no connection)
            mock_client = Mock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            mock_client.get.return_value = mock_response
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            # Test
            service = OAuthService()
            result = await service.revoke_access(user_id=1)
            
            assert result is True  # Should return True if already disconnected