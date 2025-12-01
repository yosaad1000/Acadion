"""
Organization-scoped Authentication Middleware - FACIAL RECOGNITION SCOPE ONLY

This middleware handles organization context validation for facial recognition operations.
It ensures users can only perform facial attendance operations within their organization.

All general authentication is handled by Supabase + React frontend.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.settings import settings
from app.services.user_profile_service import user_profile_service

logger = logging.getLogger(__name__)
security = HTTPBearer()

class OrganizationContext:
    """Container for organization context needed by facial recognition"""
    
    def __init__(self, user_id: str, auth_user_id: str, organization_id: str, 
                 organization_name: str, user_role: str):
        self.user_id = user_id
        self.auth_user_id = auth_user_id
        self.organization_id = organization_id
        self.organization_name = organization_name
        self.user_role = user_role

async def get_organization_context(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> OrganizationContext:
    """
    Get organization context for facial recognition operations
    
    This dependency ensures:
    1. User is authenticated
    2. User profile exists with organization context
    3. Organization is active and valid
    
    Used by facial recognition endpoints that need organization scoping.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials for organization context",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT to get basic user info
        payload = jwt.decode(
            credentials.credentials, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        auth_user_id: str = payload.get("sub")
        if auth_user_id is None:
            raise credentials_exception
        
        # Get user profile with organization context
        profile_result = await user_profile_service.get_user_profile_with_context(auth_user_id)
        
        if not profile_result.get("success"):
            logger.error(f"Failed to get organization context: {profile_result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile not found or organization inactive"
            )
        
        # Extract organization context
        organization = profile_result.get("organization", {})
        
        return OrganizationContext(
            user_id=profile_result.get("user_id"),
            auth_user_id=auth_user_id,
            organization_id=organization.get("id"),
            organization_name=organization.get("name"),
            user_role=profile_result.get("active_role")
        )
        
    except JWTError:
        logger.error("JWT decode error in organization context")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Error getting organization context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate organization context"
        )

async def validate_facial_recognition_access(
    org_context: OrganizationContext = Depends(get_organization_context)
) -> OrganizationContext:
    """
    Validate user has access to facial recognition features
    
    Currently allows both teachers and students, but can be extended
    with more granular permissions if needed.
    """
    if org_context.user_role not in ["teacher", "student"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid role for facial recognition access"
        )
    
    logger.info(f"✅ Facial recognition access validated for user {org_context.user_id} "
                f"in organization {org_context.organization_name}")
    
    return org_context

async def validate_teacher_facial_access(
    org_context: OrganizationContext = Depends(get_organization_context)
) -> OrganizationContext:
    """
    Validate user is a teacher for facial recognition operations that require teacher role
    (e.g., processing group photos for attendance)
    """
    if org_context.user_role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher role required for this facial recognition operation"
        )
    
    logger.info(f"✅ Teacher facial recognition access validated for user {org_context.user_id} "
                f"in organization {org_context.organization_name}")
    
    return org_context

async def validate_student_facial_access(
    org_context: OrganizationContext = Depends(get_organization_context)
) -> OrganizationContext:
    """
    Validate user is a student for facial recognition operations that require student role
    (e.g., face registration)
    """
    if org_context.user_role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student role required for this facial recognition operation"
        )
    
    logger.info(f"✅ Student facial recognition access validated for user {org_context.user_id} "
                f"in organization {org_context.organization_name}")
    
    return org_context

def create_facial_recognition_token(user_data: Dict[str, Any], organization_id: str) -> str:
    """
    Create JWT token with organization context for facial recognition operations
    
    This is used when the facial recognition service needs to make calls
    with organization context included.
    """
    from datetime import datetime, timedelta
    
    to_encode = {
        "sub": user_data.get("auth_user_id"),
        "user_id": user_data.get("user_id"),
        "organization_id": organization_id,
        "user_role": user_data.get("active_role"),
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "facial_recognition": True  # Flag to identify tokens for facial recognition
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt