"""
Feature gating utilities for modular functionality
"""

from typing import Dict, Any, Optional
from app.services.organization_service import get_organization_service
import logging

logger = logging.getLogger(__name__)

class FeatureGate:
    """Utility class for checking feature availability"""
    
    def __init__(self):
        self.organization_service = get_organization_service()
    
    async def check_facial_attendance_access(self, organization_id: str) -> Dict[str, Any]:
        """
        Check facial attendance module access without raising exceptions
        
        Returns:
            Dict with access status, message, and upgrade information
        """
        try:
            status = await self.organization_service.check_facial_attendance_module_status(organization_id)
            
            return {
                "has_access": status.get("has_access", False),
                "status": status.get("status", "inactive"),
                "message": status.get("message", ""),
                "organization_id": organization_id,
                "module_name": "facial_attendance",
                "upgrade_required": not status.get("has_access", False),
                "subscription_details": {
                    "subscription_id": status.get("subscription_id"),
                    "start_date": status.get("start_date"),
                    "end_date": status.get("end_date"),
                    "billing_cycle": status.get("billing_cycle")
                } if status.get("has_access") else None
            }
            
        except Exception as e:
            logger.error(f"Error checking facial attendance access: {e}")
            return {
                "has_access": False,
                "status": "error",
                "message": f"Error checking module access: {str(e)}",
                "organization_id": organization_id,
                "module_name": "facial_attendance",
                "upgrade_required": True,
                "subscription_details": None
            }
    
    async def get_available_attendance_methods(self, organization_id: str) -> Dict[str, Any]:
        """
        Get available attendance methods for an organization
        
        Returns:
            Dict with available methods and their status
        """
        try:
            facial_status = await self.check_facial_attendance_access(organization_id)
            
            methods = {
                "manual": {
                    "available": True,
                    "name": "Manual Attendance",
                    "description": "Mark attendance manually for each student",
                    "requires_upgrade": False
                },
                "facial": {
                    "available": facial_status["has_access"],
                    "name": "Facial Recognition Attendance",
                    "description": "Automatically mark attendance using facial recognition",
                    "requires_upgrade": facial_status["upgrade_required"],
                    "status": facial_status["status"],
                    "subscription_details": facial_status["subscription_details"]
                }
            }
            
            return {
                "organization_id": organization_id,
                "methods": methods,
                "default_method": "manual",
                "recommended_method": "facial" if facial_status["has_access"] else "manual"
            }
            
        except Exception as e:
            logger.error(f"Error getting available attendance methods: {e}")
            return {
                "organization_id": organization_id,
                "methods": {
                    "manual": {
                        "available": True,
                        "name": "Manual Attendance",
                        "description": "Mark attendance manually for each student",
                        "requires_upgrade": False
                    },
                    "facial": {
                        "available": False,
                        "name": "Facial Recognition Attendance",
                        "description": "Automatically mark attendance using facial recognition",
                        "requires_upgrade": True,
                        "status": "error",
                        "error": str(e)
                    }
                },
                "default_method": "manual",
                "recommended_method": "manual"
            }
    
    async def get_organization_features(self, organization_id: str) -> Dict[str, Any]:
        """
        Get all available features for an organization
        
        Returns:
            Dict with all features and their availability
        """
        try:
            modules = await self.organization_service.get_organization_modules(organization_id)
            
            if modules["success"]:
                features = {
                    "attendance": {
                        "manual": True,  # Always available
                        "facial": modules["modules"].get("facial_attendance", {}).get("has_access", False)
                    },
                    "analytics": {
                        "basic": True,  # Always available
                        "advanced": False  # Future paid module
                    },
                    "reporting": {
                        "basic": True,  # Always available
                        "advanced": False  # Future paid module
                    }
                }
                
                return {
                    "organization_id": organization_id,
                    "features": features,
                    "modules": modules["modules"]
                }
            else:
                raise Exception(modules.get("message", "Failed to get modules"))
                
        except Exception as e:
            logger.error(f"Error getting organization features: {e}")
            return {
                "organization_id": organization_id,
                "features": {
                    "attendance": {"manual": True, "facial": False},
                    "analytics": {"basic": True, "advanced": False},
                    "reporting": {"basic": True, "advanced": False}
                },
                "modules": {},
                "error": str(e)
            }

# Global instance
_feature_gate = None

def get_feature_gate() -> FeatureGate:
    """Get the global FeatureGate instance"""
    global _feature_gate
    if _feature_gate is None:
        _feature_gate = FeatureGate()
    return _feature_gate