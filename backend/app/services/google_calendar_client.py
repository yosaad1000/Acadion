"""
Google Calendar API client initialization and management.
Provides secure, authenticated access to Google Calendar API.
"""

import os
import json
from typing import Optional, Dict, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class GoogleCalendarClient:
    """
    Google Calendar API client for handling authentication and API operations.
    Manages OAuth flow, token refresh, and API service initialization.
    """
    
    def __init__(self):
        self.service = None
        self._credentials = None
        
    def create_oauth_flow(self, redirect_uri: str = None) -> Flow:
        """
        Create OAuth 2.0 flow for Google Calendar authentication.
        
        Args:
            redirect_uri: Optional custom redirect URI
            
        Returns:
            Flow: Configured OAuth flow object
            
        Raises:
            ValueError: If required OAuth credentials are missing
        """
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError("Google OAuth credentials not configured")
            
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri or settings.GOOGLE_REDIRECT_URI]
            }
        }
        
        flow = Flow.from_client_config(
            client_config,
            scopes=settings.google_calendar_scopes_list
        )
        flow.redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI
        
        return flow
    
    def build_service_from_credentials(self, credentials: Credentials):
        """
        Build Google Calendar API service from credentials.
        
        Args:
            credentials: Valid Google OAuth2 credentials
            
        Returns:
            Resource: Google Calendar API service object
            
        Raises:
            HttpError: If API service creation fails
        """
        try:
            service = build('calendar', 'v3', credentials=credentials)
            logger.info("Google Calendar API service initialized successfully")
            return service
        except HttpError as error:
            logger.error(f"Failed to build Google Calendar service: {error}")
            raise
    
    def create_credentials_from_token(self, token_data: Dict[str, Any]) -> Credentials:
        """
        Create credentials object from token data.
        
        Args:
            token_data: Dictionary containing OAuth token information
            
        Returns:
            Credentials: Google OAuth2 credentials object
        """
        credentials = Credentials(
            token=token_data.get('access_token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri=token_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=settings.google_calendar_scopes_list
        )
        
        return credentials
    
    def refresh_credentials(self, credentials: Credentials) -> Credentials:
        """
        Refresh expired credentials.
        
        Args:
            credentials: Expired credentials to refresh
            
        Returns:
            Credentials: Refreshed credentials
            
        Raises:
            Exception: If token refresh fails
        """
        try:
            credentials.refresh(Request())
            logger.info("Google Calendar credentials refreshed successfully")
            return credentials
        except Exception as error:
            logger.error(f"Failed to refresh credentials: {error}")
            raise
    
    def validate_credentials(self, credentials: Credentials) -> bool:
        """
        Validate if credentials are valid and not expired.
        
        Args:
            credentials: Credentials to validate
            
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        if not credentials:
            return False
            
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                try:
                    self.refresh_credentials(credentials)
                    return credentials.valid
                except Exception:
                    return False
            return False
            
        return True
    
    def get_service_with_credentials(self, credentials: Credentials):
        """
        Get Google Calendar API service with validated credentials.
        
        Args:
            credentials: OAuth2 credentials
            
        Returns:
            Resource: Google Calendar API service object
            
        Raises:
            ValueError: If credentials are invalid
            HttpError: If service creation fails
        """
        if not self.validate_credentials(credentials):
            raise ValueError("Invalid or expired credentials")
            
        return self.build_service_from_credentials(credentials)
    
    def test_api_connection(self, service) -> bool:
        """
        Test Google Calendar API connection by making a simple API call.
        
        Args:
            service: Google Calendar API service object
            
        Returns:
            bool: True if connection is successful, False otherwise
        """
        try:
            # Make a simple API call to test connection
            calendar_list = service.calendarList().list(maxResults=1).execute()
            logger.info("Google Calendar API connection test successful")
            return True
        except HttpError as error:
            logger.error(f"Google Calendar API connection test failed: {error}")
            return False
        except Exception as error:
            logger.error(f"Unexpected error during API connection test: {error}")
            return False


# Global client instance
google_calendar_client = GoogleCalendarClient()