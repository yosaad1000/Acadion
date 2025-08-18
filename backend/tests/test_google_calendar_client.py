"""
Tests for Google Calendar API client initialization and basic functionality.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from app.services.google_calendar_client import GoogleCalendarClient, google_calendar_client
from app.services.token_encryption import TokenEncryption, token_encryption


class TestGoogleCalendarClient:
    """Test cases for GoogleCalendarClient class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = GoogleCalendarClient()
    
    @patch('app.services.google_calendar_client.settings')
    def test_create_oauth_flow_success(self, mock_settings):
        """Test successful OAuth flow creation."""
        mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/callback"
        mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
        
        with patch('google_auth_oauthlib.flow.Flow') as mock_flow_class:
            mock_flow = Mock(spec=Flow)
            mock_flow_class.from_client_config.return_value = mock_flow
            
            flow = self.client.create_oauth_flow()
            
            assert flow is not None
            mock_flow_class.from_client_config.assert_called_once()
            assert mock_flow.redirect_uri == "http://localhost:8000/callback"
    
    @patch('app.services.google_calendar_client.settings')
    def test_create_oauth_flow_missing_credentials(self, mock_settings):
        """Test OAuth flow creation with missing credentials."""
        mock_settings.GOOGLE_CLIENT_ID = ""
        mock_settings.GOOGLE_CLIENT_SECRET = ""
        
        with pytest.raises(ValueError, match="Google OAuth credentials not configured"):
            self.client.create_oauth_flow()
    
    @patch('googleapiclient.discovery.build')
    def test_build_service_from_credentials_success(self, mock_build):
        """Test successful service building from credentials."""
        mock_credentials = Mock(spec=Credentials)
        mock_service = Mock()
        mock_build.return_value = mock_service
        
        service = self.client.build_service_from_credentials(mock_credentials)
        
        assert service == mock_service
        mock_build.assert_called_once_with('calendar', 'v3', credentials=mock_credentials)
    
    @patch('app.services.google_calendar_client.settings')
    def test_create_credentials_from_token(self, mock_settings):
        """Test credentials creation from token data."""
        mock_settings.GOOGLE_CLIENT_ID = "test_client_id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test_client_secret"
        mock_settings.google_calendar_scopes_list = ["https://www.googleapis.com/auth/calendar"]
        
        token_data = {
            'access_token': 'test_access_token',
            'refresh_token': 'test_refresh_token',
            'token_uri': 'https://oauth2.googleapis.com/token'
        }
        
        with patch('google.oauth2.credentials.Credentials') as mock_creds_class:
            mock_credentials = Mock(spec=Credentials)
            mock_creds_class.return_value = mock_credentials
            
            credentials = self.client.create_credentials_from_token(token_data)
            
            assert credentials == mock_credentials
            mock_creds_class.assert_called_once_with(
                token='test_access_token',
                refresh_token='test_refresh_token',
                token_uri='https://oauth2.googleapis.com/token',
                client_id='test_client_id',
                client_secret='test_client_secret',
                scopes=['https://www.googleapis.com/auth/calendar']
            )
    
    def test_validate_credentials_valid(self):
        """Test validation of valid credentials."""
        mock_credentials = Mock(spec=Credentials)
        mock_credentials.valid = True
        
        result = self.client.validate_credentials(mock_credentials)
        
        assert result is True
    
    def test_validate_credentials_none(self):
        """Test validation of None credentials."""
        result = self.client.validate_credentials(None)
        
        assert result is False
    
    def test_validate_credentials_expired_with_refresh(self):
        """Test validation of expired credentials with refresh token."""
        mock_credentials = Mock(spec=Credentials)
        mock_credentials.valid = False
        mock_credentials.expired = True
        mock_credentials.refresh_token = "refresh_token"
        
        with patch.object(self.client, 'refresh_credentials') as mock_refresh:
            # Set up the mock to simulate successful refresh
            def refresh_side_effect(creds):
                creds.valid = True
                return creds
            mock_refresh.side_effect = refresh_side_effect
            
            result = self.client.validate_credentials(mock_credentials)
            
            assert result is True
            mock_refresh.assert_called_once_with(mock_credentials)


class TestTokenEncryption:
    """Test cases for TokenEncryption class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.encryption = TokenEncryption()
    
    @patch('app.services.token_encryption.settings')
    def test_encrypt_decrypt_token_data(self, mock_settings):
        """Test token encryption and decryption."""
        mock_settings.TOKEN_ENCRYPTION_KEY = "test_encryption_key_32_bytes_long"
        
        # Reinitialize encryption with test key
        encryption = TokenEncryption()
        
        token_data = {
            'access_token': 'test_access_token',
            'refresh_token': 'test_refresh_token',
            'expires_in': 3600
        }
        
        # Test encryption
        encrypted = encryption.encrypt_token_data(token_data)
        assert encrypted is not None
        assert encrypted != token_data
        
        # Test decryption
        decrypted = encryption.decrypt_token_data(encrypted)
        assert decrypted == token_data
    
    @patch('app.services.token_encryption.settings')
    def test_encryption_not_available(self, mock_settings):
        """Test behavior when encryption is not available."""
        mock_settings.TOKEN_ENCRYPTION_KEY = ""
        
        encryption = TokenEncryption()
        
        assert not encryption.is_encryption_available()
        
        token_data = {'access_token': 'test_token'}
        
        # Should store as plaintext JSON
        result = encryption.encrypt_token_data(token_data)
        assert result == '{"access_token": "test_token"}'
        
        # Should parse as JSON
        decrypted = encryption.decrypt_token_data(result)
        assert decrypted == token_data


class TestGlobalInstances:
    """Test global service instances."""
    
    def test_google_calendar_client_instance(self):
        """Test global google_calendar_client instance."""
        assert google_calendar_client is not None
        assert isinstance(google_calendar_client, GoogleCalendarClient)
    
    def test_token_encryption_instance(self):
        """Test global token_encryption instance."""
        assert token_encryption is not None
        assert isinstance(token_encryption, TokenEncryption)