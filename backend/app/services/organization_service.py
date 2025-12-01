import logging
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
from app.settings import settings

logger = logging.getLogger(__name__)

class OrganizationService:
    """Service for organization-related operations focused on facial attendance module management"""
    
    def __init__(self):
        try:
            # Use direct HTTP requests like LocalSupabase to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self._connection_healthy = True
            logger.info("✅ OrganizationService initialized successfully with HTTP client")
        except Exception as e:
            logger.error(f"❌ Error initializing OrganizationService: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize OrganizationService: {e}")
    
    async def check_facial_attendance_module_status(self, organization_id: str) -> Dict[str, Any]:
        """Check if facial attendance module is enabled for an organization"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/organization_subscriptions",
                    headers=self.headers,
                    params={
                        "organization_id": f"eq.{organization_id}",
                        "module_name": "eq.facial_attendance",
                        "status": "eq.active"
                    }
                )
                
                if response.status_code == 200:
                    subscriptions = response.json()
                    has_active_subscription = len(subscriptions) > 0
                    
                    if has_active_subscription:
                        subscription = subscriptions[0]
                        return {
                            "has_access": True,
                            "status": "active",
                            "subscription_id": subscription.get("subscription_id"),
                            "start_date": subscription.get("start_date"),
                            "end_date": subscription.get("end_date"),
                            "billing_cycle": subscription.get("billing_cycle")
                        }
                    else:
                        return {
                            "has_access": False,
                            "status": "inactive",
                            "message": "Facial attendance module not enabled for this organization"
                        }
                else:
                    logger.error(f"Failed to check module status: {response.status_code} - {response.text}")
                    return {
                        "has_access": False,
                        "status": "error",
                        "message": "Failed to check module status"
                    }
                    
        except Exception as e:
            logger.error(f"Error checking facial attendance module status: {e}")
            return {
                "has_access": False,
                "status": "error",
                "message": f"Error checking module status: {str(e)}"
            }
    
    async def validate_facial_attendance_access(self, organization_id: str) -> bool:
        """Validate if organization has access to facial attendance features"""
        try:
            module_status = await self.check_facial_attendance_module_status(organization_id)
            return module_status.get("has_access", False)
        except Exception as e:
            logger.error(f"Error validating facial attendance access: {e}")
            return False
    
    async def enable_facial_attendance_module(self, organization_id: str, billing_cycle: str = "monthly") -> Dict[str, Any]:
        """Enable facial attendance module for an organization (creates subscription record)"""
        try:
            # Check if subscription already exists
            existing_status = await self.check_facial_attendance_module_status(organization_id)
            if existing_status.get("has_access"):
                return {
                    "success": True,
                    "message": "Facial attendance module already enabled",
                    "subscription": existing_status
                }
            
            # Create new subscription
            from datetime import datetime, timedelta
            import uuid
            
            subscription_data = {
                "subscription_id": str(uuid.uuid4()),
                "organization_id": organization_id,
                "module_name": "facial_attendance",
                "status": "active",
                "start_date": datetime.utcnow().isoformat(),
                "end_date": None,  # No end date for now, can be set based on billing
                "billing_cycle": billing_cycle,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/organization_subscriptions",
                    headers=self.headers,
                    json=subscription_data
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Facial attendance module enabled for organization {organization_id}")
                    return {
                        "success": True,
                        "message": "Facial attendance module enabled successfully",
                        "subscription": subscription_data
                    }
                else:
                    logger.error(f"Failed to enable module: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"Failed to enable module: {response.text}"
                    }
                    
        except Exception as e:
            logger.error(f"Error enabling facial attendance module: {e}")
            return {
                "success": False,
                "message": f"Error enabling module: {str(e)}"
            }
    
    async def disable_facial_attendance_module(self, organization_id: str) -> Dict[str, Any]:
        """Disable facial attendance module for an organization"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/organization_subscriptions",
                    headers=self.headers,
                    params={
                        "organization_id": f"eq.{organization_id}",
                        "module_name": "eq.facial_attendance"
                    },
                    json={
                        "status": "inactive",
                        "updated_at": datetime.utcnow().isoformat()
                    }
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Facial attendance module disabled for organization {organization_id}")
                    return {
                        "success": True,
                        "message": "Facial attendance module disabled successfully"
                    }
                else:
                    logger.error(f"Failed to disable module: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"Failed to disable module: {response.text}"
                    }
                    
        except Exception as e:
            logger.error(f"Error disabling facial attendance module: {e}")
            return {
                "success": False,
                "message": f"Error disabling module: {str(e)}"
            }
    
    async def get_organization_modules(self, organization_id: str) -> Dict[str, Any]:
        """Get all module subscriptions for an organization"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/organization_subscriptions",
                    headers=self.headers,
                    params={
                        "organization_id": f"eq.{organization_id}",
                        "select": "*"
                    }
                )
                
                if response.status_code == 200:
                    subscriptions = response.json()
                    
                    modules = {}
                    for subscription in subscriptions:
                        module_name = subscription.get("module_name")
                        modules[module_name] = {
                            "status": subscription.get("status"),
                            "start_date": subscription.get("start_date"),
                            "end_date": subscription.get("end_date"),
                            "billing_cycle": subscription.get("billing_cycle"),
                            "has_access": subscription.get("status") == "active"
                        }
                    
                    # Ensure facial_attendance is always present
                    if "facial_attendance" not in modules:
                        modules["facial_attendance"] = {
                            "status": "inactive",
                            "has_access": False,
                            "message": "Module not subscribed"
                        }
                    
                    return {
                        "success": True,
                        "modules": modules
                    }
                else:
                    logger.error(f"Failed to get organization modules: {response.status_code} - {response.text}")
                    return {
                        "success": False,
                        "message": f"Failed to get modules: {response.text}"
                    }
                    
        except Exception as e:
            logger.error(f"Error getting organization modules: {e}")
            return {
                "success": False,
                "message": f"Error getting modules: {str(e)}"
            }

# Global instance
_organization_service = None

def get_organization_service() -> OrganizationService:
    """Get the global OrganizationService instance"""
    global _organization_service
    if _organization_service is None:
        _organization_service = OrganizationService()
    return _organization_service