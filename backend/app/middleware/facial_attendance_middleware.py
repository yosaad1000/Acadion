"""
Middleware for validating facial attendance module access
"""

from fastapi import HTTPException, Depends
from app.services.organization_service import get_organization_service
from app.models.user import UserResponse
from app.middleware.supabase_auth import get_current_user_supabase
import logging

logger = logging.getLogger(__name__)

async def validate_facial_attendance_access(
    organization_id: str,
    current_user: UserResponse = None
) -> bool:
    """
    Validate if organization has access to facial attendance features
    
    Args:
        organization_id: The organization ID to check
        current_user: Current authenticated user (optional, for logging)
    
    Returns:
        bool: True if access is granted, False otherwise
    
    Raises:
        HTTPException: If access is denied or validation fails
    """
    try:
        organization_service = get_organization_service()
        has_access = await organization_service.validate_facial_attendance_access(organization_id)
        
        if not has_access:
            user_info = f" for user {current_user.user_id}" if current_user else ""
            logger.warning(f"Facial attendance access denied for organization {organization_id}{user_info}")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "facial_attendance_module_disabled",
                    "message": "Facial attendance module not enabled for your organization. Please upgrade to access this feature.",
                    "organization_id": organization_id,
                    "module_name": "facial_attendance",
                    "upgrade_required": True
                }
            )
        
        logger.info(f"Facial attendance access granted for organization {organization_id}")
        return True
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating facial attendance access: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to validate facial attendance module access"
        )

def require_facial_attendance_access(organization_id: str):
    """
    Dependency function to require facial attendance module access
    
    Usage:
        @router.post("/some-facial-endpoint")
        async def endpoint(
            _: bool = Depends(require_facial_attendance_access("org_id"))
        ):
            # Endpoint logic here
    """
    async def _validate_access(current_user: UserResponse = Depends(get_current_user_supabase)):
        return await validate_facial_attendance_access(organization_id, current_user)
    
    return _validate_access

class FacialAttendanceAccessError(HTTPException):
    """Custom exception for facial attendance access errors"""
    
    def __init__(self, organization_id: str, detail: str = None):
        self.organization_id = organization_id
        detail = detail or "Facial attendance module not enabled for your organization"
        
        super().__init__(
            status_code=403,
            detail={
                "error": "facial_attendance_access_denied",
                "message": detail,
                "organization_id": organization_id,
                "module_name": "facial_attendance",
                "upgrade_required": True
            }
        )