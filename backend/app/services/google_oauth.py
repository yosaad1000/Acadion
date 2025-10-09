import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from uuid import UUID
from app.config import settings
from app.models.google_integration import (
    GoogleIntegration, GoogleIntegrationCreate, GoogleIntegrationUpdate,
    GoogleAuthRequest, GoogleAuthResponse, GoogleIntegrationResponse
)

logger = logging.getLogger(__name__)

class GoogleIntegrationService:
    """Comprehensive Google Workspace integration service"""
    
    def __init__(self):
        try:
            # Use direct HTTP requests to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            
            # Google OAuth configuration
            self.client_id = settings.GOOGLE_CLIENT_ID
            self.client_secret = settings.GOOGLE_CLIENT_SECRET
            self.redirect_uri = settings.GOOGLE_REDIRECT_URI
            
            # Google API scopes for Workspace integration
            self.scopes = [
                "openid",
                "email", 
                "profile",
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/drive.file"
            ]
            
            self._connection_healthy = True
            logger.info("✅ Google Integration Service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Error initializing Google Integration Service: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize Google Integration Service: {e}")
    
    def get_authorization_url(self, state: str = None) -> str:
        """Generate Google OAuth authorization URL with Workspace scopes"""
        base_url = "https://accounts.google.com/o/oauth2/auth"
        scope_string = " ".join(self.scopes)
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope_string,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        if state:
            params["state"] = state
            
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{base_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str = None) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access and refresh tokens"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri or self.redirect_uri,
                    }
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    logger.info("✅ Successfully exchanged code for tokens")
                    return token_data
                else:
                    logger.error(f"❌ Token exchange failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error exchanging code for token: {e}")
            return None
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh an expired access token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    }
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    logger.info("✅ Successfully refreshed access token")
                    return token_data
                else:
                    logger.error(f"❌ Token refresh failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error refreshing token: {e}")
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Google"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if response.status_code == 200:
                    user_info = response.json()
                    logger.info(f"✅ Retrieved user info for: {user_info.get('email')}")
                    return user_info
                else:
                    logger.error(f"❌ User info fetch failed: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting user info: {e}")
            return None
    
    async def store_integration(self, user_id: UUID, token_data: Dict[str, Any]) -> Optional[GoogleIntegration]:
        """Store Google integration data in database"""
        try:
            # Calculate token expiration
            expires_in = token_data.get('expires_in', 3600)
            token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            integration_data = {
                "user_id": str(user_id),
                "access_token": token_data.get('access_token'),
                "refresh_token": token_data.get('refresh_token'),
                "token_expires_at": token_expires_at.isoformat(),
                "is_active": True
            }
            
            # Check if integration already exists for this user
            existing = await self.get_integration_by_user_id(user_id)
            
            if existing:
                # Update existing integration
                return await self.update_integration(existing.integration_id, integration_data)
            else:
                # Create new integration
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/rest/v1/google_integrations",
                        headers=self.headers,
                        json=integration_data
                    )
                    
                    if response.status_code == 201:
                        result = response.json()
                        if result:
                            integration_dict = result[0] if isinstance(result, list) else result
                            logger.info(f"✅ Stored Google integration for user: {user_id}")
                            return GoogleIntegration(**integration_dict)
                    else:
                        logger.error(f"❌ Failed to store integration: {response.status_code} - {response.text}")
                        return None
                        
        except Exception as e:
            logger.error(f"❌ Error storing integration: {e}")
            return None
    
    async def get_integration_by_user_id(self, user_id: UUID) -> Optional[GoogleIntegration]:
        """Get Google integration for a specific user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/google_integrations",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}", "is_active": "eq.true"}
                )
                
                if response.status_code == 200:
                    results = response.json()
                    if results:
                        integration_dict = results[0]
                        return GoogleIntegration(**integration_dict)
                    return None
                else:
                    logger.error(f"❌ Failed to get integration: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting integration: {e}")
            return None
    
    async def update_integration(self, integration_id: UUID, update_data: Dict[str, Any]) -> Optional[GoogleIntegration]:
        """Update Google integration"""
        try:
            # Add updated_at timestamp
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/google_integrations",
                    headers=self.headers,
                    params={"integration_id": f"eq.{integration_id}"},
                    json=update_data
                )
                
                if response.status_code == 200:
                    results = response.json()
                    if results:
                        integration_dict = results[0]
                        logger.info(f"✅ Updated Google integration: {integration_id}")
                        return GoogleIntegration(**integration_dict)
                    return None
                else:
                    logger.error(f"❌ Failed to update integration: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error updating integration: {e}")
            return None
    
    async def get_valid_access_token(self, user_id: UUID) -> Optional[str]:
        """Get a valid access token for a user, refreshing if necessary"""
        try:
            integration = await self.get_integration_by_user_id(user_id)
            if not integration:
                logger.warning(f"⚠️ No Google integration found for user: {user_id}")
                return None
            
            # Check if token is still valid
            if datetime.utcnow() < integration.token_expires_at:
                return integration.access_token
            
            # Token is expired, try to refresh
            logger.info(f"🔄 Refreshing expired token for user: {user_id}")
            token_data = await self.refresh_access_token(integration.refresh_token)
            
            if token_data:
                # Update stored tokens
                expires_in = token_data.get('expires_in', 3600)
                token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                
                update_data = {
                    "access_token": token_data.get('access_token'),
                    "token_expires_at": token_expires_at.isoformat()
                }
                
                # Update refresh token if provided
                if 'refresh_token' in token_data:
                    update_data["refresh_token"] = token_data['refresh_token']
                
                updated_integration = await self.update_integration(integration.integration_id, update_data)
                if updated_integration:
                    return updated_integration.access_token
            
            logger.error(f"❌ Failed to refresh token for user: {user_id}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting valid access token: {e}")
            return None
    
    async def revoke_integration(self, user_id: UUID) -> bool:
        """Revoke Google integration for a user"""
        try:
            integration = await self.get_integration_by_user_id(user_id)
            if not integration:
                return True  # Already revoked
            
            # Revoke token with Google
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://oauth2.googleapis.com/revoke?token={integration.access_token}"
                    )
            except Exception as e:
                logger.warning(f"⚠️ Failed to revoke token with Google: {e}")
            
            # Deactivate integration in database
            update_data = {"is_active": False}
            updated = await self.update_integration(integration.integration_id, update_data)
            
            if updated:
                logger.info(f"✅ Revoked Google integration for user: {user_id}")
                return True
            else:
                logger.error(f"❌ Failed to deactivate integration for user: {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error revoking integration: {e}")
            return False
    
    async def authenticate_user(self, auth_request: GoogleAuthRequest, user_id: UUID) -> GoogleAuthResponse:
        """Complete Google OAuth flow for a user"""
        try:
            # Exchange code for tokens
            token_data = await self.exchange_code_for_token(
                auth_request.authorization_code, 
                auth_request.redirect_uri
            )
            
            if not token_data:
                return GoogleAuthResponse(
                    success=False,
                    message="Failed to exchange authorization code for tokens"
                )
            
            # Get user info to verify
            user_info = await self.get_user_info(token_data.get('access_token'))
            if not user_info:
                return GoogleAuthResponse(
                    success=False,
                    message="Failed to retrieve user information from Google"
                )
            
            # Store integration
            integration = await self.store_integration(user_id, token_data)
            if not integration:
                return GoogleAuthResponse(
                    success=False,
                    message="Failed to store Google integration"
                )
            
            # Create response model
            integration_response = GoogleIntegrationResponse(
                integration_id=integration.integration_id,
                user_id=integration.user_id,
                google_calendar_id=integration.google_calendar_id,
                google_drive_folder_id=integration.google_drive_folder_id,
                is_active=integration.is_active,
                is_token_valid=True,
                created_at=integration.created_at,
                updated_at=integration.updated_at
            )
            
            return GoogleAuthResponse(
                success=True,
                message=f"Successfully authenticated with Google as {user_info.get('email')}",
                integration=integration_response
            )
            
        except Exception as e:
            logger.error(f"❌ Error authenticating user: {e}")
            return GoogleAuthResponse(
                success=False,
                message=f"Authentication failed: {str(e)}"
            )

# Create service instance
google_integration_service = GoogleIntegrationService()