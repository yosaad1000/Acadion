"""
User Profile Service - FACIAL RECOGNITION SCOPE ONLY

This service handles ONLY the user profile operations needed for facial recognition:
- Ensuring user profiles exist after OAuth (for face registration)
- Validating organization context for face operations
- Getting user profile data needed for facial attendance

All other user management is handled by React frontend + Supabase.
"""

import logging
from typing import Dict, Any, Optional
import httpx
from app.settings import settings

logger = logging.getLogger(__name__)

class UserProfileService:
    """Service for user profile operations needed by facial recognition features"""
    
    def __init__(self):
        try:
            # Use HTTP requests to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self._connection_healthy = True
            logger.info("✅ UserProfileService initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing UserProfileService: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize UserProfileService: {e}")
    
    async def ensure_user_profile(self, auth_user_id: str) -> Dict[str, Any]:
        """
        Ensure user profile exists after OAuth - needed for face registration
        Calls the ensure_user_profile RPC function
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/ensure_user_profile",
                    headers={
                        **self.headers,
                        "Authorization": f"Bearer {auth_user_id}"  # Use user's auth token
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ User profile ensured: {result.get('success')}")
                    return result
                else:
                    logger.error(f"❌ RPC Error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"RPC call failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error ensuring user profile: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_user_profile_with_context(self, auth_user_id: str) -> Dict[str, Any]:
        """
        Get user profile with organization context - needed for facial attendance
        Calls the get_user_profile_with_context RPC function
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/get_user_profile_with_context",
                    headers={
                        **self.headers,
                        "Authorization": f"Bearer {auth_user_id}"  # Use user's auth token
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ User profile retrieved: {result.get('success')}")
                    return result
                else:
                    logger.error(f"❌ RPC Error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"RPC call failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def validate_organization_context(self, auth_user_id: str, organization_id: str) -> Dict[str, Any]:
        """
        Validate user belongs to organization - needed for facial attendance operations
        Calls the validate_organization_context RPC function
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/rpc/validate_organization_context",
                    headers={
                        **self.headers,
                        "Authorization": f"Bearer {auth_user_id}"  # Use user's auth token
                    },
                    json={"target_organization_id": organization_id}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ Organization context validated: {result.get('success')}")
                    return result
                else:
                    logger.error(f"❌ RPC Error: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "error": f"RPC call failed: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error validating organization context: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_face_registration_status(self, user_id: str, is_registered: bool) -> bool:
        """
        Update user's face registration status - needed after face encoding is stored
        This is the ONLY direct database operation this service performs
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json={"is_face_registered": is_registered}
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Face registration status updated for user {user_id}: {is_registered}")
                    return True
                else:
                    logger.error(f"❌ Failed to update face status: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating face registration status: {e}")
            return False

# Global service instance
user_profile_service = UserProfileService()