from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.services.organization_service import get_organization_service
from app.middleware.supabase_auth import get_current_user_supabase
from app.models.user import UserResponse
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ModuleToggleRequest(BaseModel):
    organization_id: str
    billing_cycle: str = "monthly"

class ModuleStatusResponse(BaseModel):
    has_access: bool
    status: str
    message: str = None
    subscription_id: str = None
    start_date: str = None
    end_date: str = None
    billing_cycle: str = None

@router.get("/modules/facial-attendance/status/{organization_id}", response_model=Dict[str, Any])
async def get_facial_attendance_status(
    organization_id: str,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Get facial attendance module status for an organization"""
    try:
        organization_service = get_organization_service()
        status = await organization_service.check_facial_attendance_module_status(organization_id)
        
        return {
            "organization_id": organization_id,
            "module_name": "facial_attendance",
            **status
        }
        
    except Exception as e:
        logger.error(f"Error getting facial attendance status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get module status: {str(e)}")

@router.post("/modules/facial-attendance/enable")
async def enable_facial_attendance_module(
    request: ModuleToggleRequest,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Enable facial attendance module for an organization"""
    try:
        # TODO: Add authorization check - only org admins should be able to enable modules
        # For now, allowing any authenticated user
        
        organization_service = get_organization_service()
        result = await organization_service.enable_facial_attendance_module(
            request.organization_id, 
            request.billing_cycle
        )
        
        if result["success"]:
            return {
                "message": "Facial attendance module enabled successfully",
                "organization_id": request.organization_id,
                "module_name": "facial_attendance",
                "status": "active",
                "subscription": result.get("subscription")
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling facial attendance module: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enable module: {str(e)}")

@router.post("/modules/facial-attendance/disable")
async def disable_facial_attendance_module(
    request: ModuleToggleRequest,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Disable facial attendance module for an organization"""
    try:
        # TODO: Add authorization check - only org admins should be able to disable modules
        
        organization_service = get_organization_service()
        result = await organization_service.disable_facial_attendance_module(request.organization_id)
        
        if result["success"]:
            return {
                "message": "Facial attendance module disabled successfully",
                "organization_id": request.organization_id,
                "module_name": "facial_attendance",
                "status": "inactive"
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling facial attendance module: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disable module: {str(e)}")

@router.get("/modules/{organization_id}")
async def get_organization_modules(
    organization_id: str,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Get all module subscriptions for an organization"""
    try:
        organization_service = get_organization_service()
        result = await organization_service.get_organization_modules(organization_id)
        
        if result["success"]:
            return {
                "organization_id": organization_id,
                "modules": result["modules"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization modules: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get modules: {str(e)}")

@router.get("/modules/facial-attendance/validate/{organization_id}")
async def validate_facial_attendance_access(
    organization_id: str,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Validate if organization has access to facial attendance features - used by facial recognition endpoints"""
    try:
        organization_service = get_organization_service()
        has_access = await organization_service.validate_facial_attendance_access(organization_id)
        
        return {
            "organization_id": organization_id,
            "module_name": "facial_attendance",
            "has_access": has_access,
            "message": "Access granted" if has_access else "Facial attendance module not enabled for this organization"
        }
        
    except Exception as e:
        logger.error(f"Error validating facial attendance access: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to validate access: {str(e)}")

@router.get("/features/{organization_id}")
async def get_organization_features(
    organization_id: str,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Get all available features for an organization - used by frontend for UI rendering"""
    try:
        from app.utils.feature_gating import get_feature_gate
        feature_gate = get_feature_gate()
        
        features = await feature_gate.get_organization_features(organization_id)
        return features
        
    except Exception as e:
        logger.error(f"Error getting organization features: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get features: {str(e)}")

@router.get("/attendance-methods/{organization_id}")
async def get_available_attendance_methods(
    organization_id: str,
    current_user: UserResponse = Depends(get_current_user_supabase)
):
    """Get available attendance methods for an organization - used by frontend attendance UI"""
    try:
        from app.utils.feature_gating import get_feature_gate
        feature_gate = get_feature_gate()
        
        methods = await feature_gate.get_available_attendance_methods(organization_id)
        return methods
        
    except Exception as e:
        logger.error(f"Error getting attendance methods: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get attendance methods: {str(e)}")