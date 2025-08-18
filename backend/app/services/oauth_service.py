"""
OAuth service for Google Calendar authentication.
Handles Google OAuth 2.0 flow, token management, and secure storage.
"""

import logging
import secrets
import json
import httpx
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlencode

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from ..config import settings
from ..models.calendar import CalendarProvider, UserType
from .token_encryption import token_encryption
from .local_supabase import LocalSupabase

logger = logging.getLogger(__name__)


class OAuthError(Exception):
    """Custom exception for OAuth-related errors."""
    
    def __init__(self, message: str, error_code: str, retry_after: Optional[int] = None):
        self.message = message
        self.error_code = error_code
        self.retry_after = retry_after
        super().__init__(message)


class OAuthService:
    """
    Service for handling Google OAuth 2.0 authentication flow and token management.
    Provides secure token storage, automatic refresh, and error handling.
    """
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
        self.scopes = settings.google_calendar_scopes_list
        
        # Validate configuration
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("Google OAuth configuration incomplete")
            raise ValueError("Google OAuth configuration incomplete")
    
    async def initiate_google_auth(self, user_id: int, user_type: str = "faculty") -> Tuple[str, str]:
        """
        Initiate Google OAuth 2.0 authentication flow.
        
        Args:
            user_id: ID of the user initiating authentication
            user_type: Type of user (faculty/student)
            
        Returns:
            Tuple[str, str]: Authorization URL and state parameter
            
        Raises:
            OAuthError: If OAuth flow initialization fails
        """
        try:
            # Generate secure state parameter
            state = secrets.token_urlsafe(32)
            
            # Create OAuth flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=self.scopes
            )
            flow.redirect_uri = self.redirect_uri
            
            # Store state with user information for callback validation
            state_data = {
                "user_id": user_id,
                "user_type": user_type,
                "created_at": datetime.utcnow().isoformat(),
                "state": state
            }
            
            # Store state in database temporarily (expires in 10 minutes)
            await self._store_oauth_state(state, state_data)
            
            # Generate authorization URL
            auth_url, _ = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                state=state,
                prompt='consent'  # Force consent to get refresh token
            )
            
            logger.info(f"OAuth flow initiated for user {user_id}")
            return auth_url, state
            
        except Exception as error:
            logger.error(f"Failed to initiate OAuth flow: {error}")
            raise OAuthError(
                message="Failed to initiate Google authentication",
                error_code="OAUTH_INIT_FAILED"
            )
    
    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """
        Handle OAuth callback and exchange authorization code for tokens.
        
        Args:
            code: Authorization code from Google
            state: State parameter for validation
            
        Returns:
            dict: Connection information and status
            
        Raises:
            OAuthError: If callback handling fails
        """
        try:
            # Validate state and retrieve user information
            state_data = await self._get_oauth_state(state)
            if not state_data:
                raise OAuthError(
                    message="Invalid or expired authentication state",
                    error_code="INVALID_STATE"
                )
            
            user_id = state_data["user_id"]
            user_type = state_data["user_type"]
            
            # Create OAuth flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=self.scopes,
                state=state
            )
            flow.redirect_uri = self.redirect_uri
            
            # Exchange authorization code for tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Get user's primary calendar ID
            calendar_id = await self._get_primary_calendar_id(credentials)
            
            # Store tokens securely
            connection_id = await self._store_calendar_connection(
                user_id=user_id,
                user_type=user_type,
                credentials=credentials,
                calendar_id=calendar_id
            )
            
            # Clean up state
            await self._delete_oauth_state(state)
            
            logger.info(f"OAuth callback handled successfully for user {user_id}")
            return {
                "success": True,
                "connection_id": connection_id,
                "calendar_id": calendar_id,
                "user_id": user_id
            }
            
        except OAuthError:
            raise
        except Exception as error:
            logger.error(f"Failed to handle OAuth callback: {error}")
            raise OAuthError(
                message="Failed to complete Google authentication",
                error_code="OAUTH_CALLBACK_FAILED"
            )
    
    async def refresh_access_token(self, user_id: int, max_retries: int = 3) -> Optional[str]:
        """
        Refresh access token using stored refresh token.
        
        Args:
            user_id: ID of the user
            max_retries: Maximum number of retry attempts
            
        Returns:
            str: New access token, None if refresh fails
            
        Raises:
            OAuthError: If token refresh fails after retries
        """
        for attempt in range(max_retries):
            try:
                # Get stored connection
                connection = await self._get_calendar_connection(user_id)
                if not connection:
                    raise OAuthError(
                        message="No calendar connection found",
                        error_code="CONNECTION_NOT_FOUND"
                    )
                
                # Decrypt token data
                token_data = token_encryption.decrypt_token_data(
                    connection["access_token_encrypted"]
                )
                if not token_data:
                    raise OAuthError(
                        message="Failed to decrypt token data",
                        error_code="TOKEN_DECRYPT_FAILED"
                    )
                
                # Create credentials object
                credentials = Credentials(
                    token=token_data.get("access_token"),
                    refresh_token=token_data.get("refresh_token"),
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    scopes=self.scopes
                )
                
                # Refresh the token
                credentials.refresh(Request())
                
                # Update stored tokens
                await self._update_stored_tokens(user_id, credentials)
                
                logger.info(f"Access token refreshed successfully for user {user_id}")
                return credentials.token
                
            except Exception as error:
                logger.warning(f"Token refresh attempt {attempt + 1} failed: {error}")
                if attempt == max_retries - 1:
                    logger.error(f"Token refresh failed after {max_retries} attempts")
                    raise OAuthError(
                        message="Failed to refresh access token",
                        error_code="TOKEN_REFRESH_FAILED"
                    )
                
                # Wait before retry (exponential backoff)
                import asyncio
                await asyncio.sleep(2 ** attempt)
        
        return None
    
    async def revoke_access(self, user_id: int) -> bool:
        """
        Revoke Google Calendar access and remove stored tokens.
        
        Args:
            user_id: ID of the user
            
        Returns:
            bool: True if revocation successful, False otherwise
        """
        try:
            # Get stored connection
            connection = await self._get_calendar_connection(user_id)
            if not connection:
                logger.warning(f"No calendar connection found for user {user_id}")
                return True  # Already disconnected
            
            # Decrypt token data
            token_data = token_encryption.decrypt_token_data(
                connection["access_token_encrypted"]
            )
            
            if token_data and token_data.get("access_token"):
                # Revoke token with Google
                try:
                    credentials = Credentials(
                        token=token_data["access_token"],
                        refresh_token=token_data.get("refresh_token"),
                        token_uri="https://oauth2.googleapis.com/token",
                        client_id=self.client_id,
                        client_secret=self.client_secret
                    )
                    
                    # Build service to revoke token
                    service = build('oauth2', 'v2', credentials=credentials)
                    service.tokeninfo().execute()  # Test token validity
                    
                    # Revoke the token
                    import requests
                    revoke_url = f"https://oauth2.googleapis.com/revoke?token={credentials.token}"
                    response = requests.post(revoke_url)
                    
                    if response.status_code not in [200, 400]:  # 400 means already revoked
                        logger.warning(f"Token revocation returned status {response.status_code}")
                        
                except Exception as error:
                    logger.warning(f"Failed to revoke token with Google: {error}")
            
            # Remove connection from database
            await self._delete_calendar_connection(user_id)
            
            logger.info(f"Calendar access revoked for user {user_id}")
            return True
            
        except Exception as error:
            logger.error(f"Failed to revoke access for user {user_id}: {error}")
            return False
    
    async def get_valid_token(self, user_id: int) -> Optional[str]:
        """
        Get a valid access token, refreshing if necessary.
        
        Args:
            user_id: ID of the user
            
        Returns:
            str: Valid access token, None if unavailable
        """
        try:
            # Get stored connection
            connection = await self._get_calendar_connection(user_id)
            if not connection:
                return None
            
            # Check if token is expired
            if connection["token_expires_at"] and connection["token_expires_at"] <= datetime.utcnow():
                # Token expired, try to refresh
                return await self.refresh_access_token(user_id)
            
            # Decrypt and return current token
            token_data = token_encryption.decrypt_token_data(
                connection["access_token_encrypted"]
            )
            
            return token_data.get("access_token") if token_data else None
            
        except Exception as error:
            logger.error(f"Failed to get valid token for user {user_id}: {error}")
            return None
    
    async def get_connection_status(self, user_id: int) -> Dict[str, Any]:
        """
        Get calendar connection status for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            dict: Connection status information
        """
        try:
            connection = await self._get_calendar_connection(user_id)
            
            if not connection:
                return {
                    "is_connected": False,
                    "provider": None,
                    "calendar_id": None,
                    "connected_at": None
                }
            
            # Test token validity
            token = await self.get_valid_token(user_id)
            is_valid = token is not None
            
            return {
                "is_connected": is_valid,
                "provider": connection["provider"],
                "calendar_id": connection["calendar_id"],
                "connected_at": connection["created_at"],
                "token_expires_at": connection["token_expires_at"]
            }
            
        except Exception as error:
            logger.error(f"Failed to get connection status for user {user_id}: {error}")
            return {
                "is_connected": False,
                "provider": None,
                "calendar_id": None,
                "connected_at": None,
                "error": str(error)
            }
    
    # Private helper methods
    
    async def _store_oauth_state(self, state: str, state_data: Dict[str, Any]) -> None:
        """Store OAuth state temporarily for callback validation."""
        try:
            # Store in a temporary table or cache (expires in 10 minutes)
            expires_at = datetime.utcnow() + timedelta(minutes=10)
            
            db = LocalSupabase()
            
            # Use HTTP request to insert OAuth state
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{db.base_url}/rest/v1/oauth_states",
                    headers=db.headers,
                    json={
                        "state": state,
                        "data": json.dumps(state_data),
                        "expires_at": expires_at.isoformat()
                    }
                )
                
                if response.status_code not in [200, 201]:
                    raise Exception(f"Failed to store OAuth state: {response.status_code}")
                
        except Exception as error:
            logger.error(f"Failed to store OAuth state: {error}")
            raise
    
    async def _get_oauth_state(self, state: str) -> Optional[Dict[str, Any]]:
        """Retrieve and validate OAuth state."""
        try:
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{db.base_url}/rest/v1/oauth_states",
                    headers=db.headers,
                    params={"state": f"eq.{state}"}
                )
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                if not data:
                    return None
                
                state_record = data[0]
                
                # Check if expired
                expires_at = datetime.fromisoformat(state_record["expires_at"].replace('Z', '+00:00'))
                if expires_at <= datetime.utcnow():
                    await self._delete_oauth_state(state)
                    return None
                
                return json.loads(state_record["data"])
            
        except Exception as error:
            logger.error(f"Failed to get OAuth state: {error}")
            return None
    
    async def _delete_oauth_state(self, state: str) -> None:
        """Delete OAuth state after use."""
        try:
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{db.base_url}/rest/v1/oauth_states",
                    headers=db.headers,
                    params={"state": f"eq.{state}"}
                )
                
        except Exception as error:
            logger.warning(f"Failed to delete OAuth state: {error}")
    
    async def _get_primary_calendar_id(self, credentials: Credentials) -> str:
        """Get user's primary calendar ID."""
        try:
            service = build('calendar', 'v3', credentials=credentials)
            calendar_list = service.calendarList().list().execute()
            
            # Find primary calendar
            for calendar in calendar_list.get('items', []):
                if calendar.get('primary'):
                    return calendar['id']
            
            # Fallback to first calendar
            if calendar_list.get('items'):
                return calendar_list['items'][0]['id']
            
            raise Exception("No calendars found")
            
        except Exception as error:
            logger.error(f"Failed to get primary calendar ID: {error}")
            return "primary"  # Default fallback
    
    async def _store_calendar_connection(
        self, 
        user_id: int, 
        user_type: str, 
        credentials: Credentials, 
        calendar_id: str
    ) -> int:
        """Store calendar connection with encrypted tokens."""
        try:
            # Prepare token data for encryption
            token_data = {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "scopes": credentials.scopes,
                "token_uri": credentials.token_uri
            }
            
            # Encrypt token data
            encrypted_access_token = token_encryption.encrypt_token_data(token_data)
            encrypted_refresh_token = token_encryption.encrypt_token_data({
                "refresh_token": credentials.refresh_token
            })
            
            if not encrypted_access_token or not encrypted_refresh_token:
                raise Exception("Failed to encrypt token data")
            
            # Calculate token expiry
            token_expires_at = None
            if credentials.expiry:
                token_expires_at = credentials.expiry.isoformat()
            
            # Store in database (upsert to handle reconnections)
            connection_data = {
                "user_id": str(user_id),
                "user_type": user_type,
                "provider": CalendarProvider.GOOGLE.value,
                "access_token_encrypted": encrypted_access_token,
                "refresh_token_encrypted": encrypted_refresh_token,
                "token_expires_at": token_expires_at,
                "calendar_id": calendar_id,
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Try to update existing connection first
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                # Check for existing connection
                response = await client.get(
                    f"{db.base_url}/rest/v1/calendar_connections",
                    headers=db.headers,
                    params={
                        "user_id": f"eq.{user_id}",
                        "provider": f"eq.{CalendarProvider.GOOGLE.value}",
                        "select": "id"
                    }
                )
                
                if response.status_code == 200 and response.json():
                    # Update existing connection
                    existing_id = response.json()[0]["id"]
                    update_response = await client.patch(
                        f"{db.base_url}/rest/v1/calendar_connections",
                        headers=db.headers,
                        params={"id": f"eq.{existing_id}"},
                        json=connection_data
                    )
                    
                    if update_response.status_code not in [200, 204]:
                        raise Exception(f"Failed to update calendar connection: {update_response.status_code}")
                    
                    connection_id = existing_id
                else:
                    # Create new connection
                    connection_data["created_at"] = datetime.utcnow().isoformat()
                    create_response = await client.post(
                        f"{db.base_url}/rest/v1/calendar_connections",
                        headers=db.headers,
                        json=connection_data
                    )
                    
                    if create_response.status_code not in [200, 201]:
                        raise Exception(f"Failed to create calendar connection: {create_response.status_code}")
                    
                    result_data = create_response.json()
                    connection_id = result_data[0]["id"] if result_data else None
            
            if not result.data:
                raise Exception("Failed to store calendar connection")
            
            return connection_id
            
        except Exception as error:
            logger.error(f"Failed to store calendar connection: {error}")
            raise
    
    async def _get_calendar_connection(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get calendar connection for user."""
        try:
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{db.base_url}/rest/v1/calendar_connections",
                    headers=db.headers,
                    params={
                        "user_id": f"eq.{user_id}",
                        "provider": f"eq.{CalendarProvider.GOOGLE.value}",
                        "is_active": f"eq.true"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        connection = data[0]
                        # Convert string datetime back to datetime object
                        if connection.get("token_expires_at"):
                            connection["token_expires_at"] = datetime.fromisoformat(
                                connection["token_expires_at"].replace('Z', '+00:00')
                            )
                        return connection
                
                return None
            
        except Exception as error:
            logger.error(f"Failed to get calendar connection: {error}")
            return None
    
    async def _update_stored_tokens(self, user_id: int, credentials: Credentials) -> None:
        """Update stored tokens after refresh."""
        try:
            # Prepare updated token data
            token_data = {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "scopes": credentials.scopes,
                "token_uri": credentials.token_uri
            }
            
            # Encrypt token data
            encrypted_access_token = token_encryption.encrypt_token_data(token_data)
            if not encrypted_access_token:
                raise Exception("Failed to encrypt updated token data")
            
            # Calculate new expiry
            token_expires_at = None
            if credentials.expiry:
                token_expires_at = credentials.expiry.isoformat()
            
            # Update in database
            update_data = {
                "access_token_encrypted": encrypted_access_token,
                "token_expires_at": token_expires_at,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{db.base_url}/rest/v1/calendar_connections",
                    headers=db.headers,
                    params={
                        "user_id": f"eq.{user_id}",
                        "provider": f"eq.{CalendarProvider.GOOGLE.value}"
                    },
                    json=update_data
                )
                
                if response.status_code not in [200, 204]:
                    raise Exception(f"Failed to update stored tokens: {response.status_code}")
                
        except Exception as error:
            logger.error(f"Failed to update stored tokens: {error}")
            raise
    
    async def _delete_calendar_connection(self, user_id: int) -> None:
        """Delete calendar connection from database."""
        try:
            db = LocalSupabase()
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{db.base_url}/rest/v1/calendar_connections",
                    headers=db.headers,
                    params={
                        "user_id": f"eq.{user_id}",
                        "provider": f"eq.{CalendarProvider.GOOGLE.value}"
                    }
                )
                
        except Exception as error:
            logger.error(f"Failed to delete calendar connection: {error}")
            raise


# Global OAuth service instance
oauth_service = OAuthService()