from fastapi import APIRouter, Depends
from app.middleware.supabase_auth import get_current_user_supabase
from app.models.user import UserResponse
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user_supabase)):
    """Get current user information using Supabase auth"""
    try:
        user_response = UserResponse(
            user_id=current_user["user_id"],
            email=current_user["email"],
            name=current_user["name"],
            user_type=current_user["user_type"],
            auth_provider=current_user.get("auth_provider", "email"),
            is_face_registered=current_user.get("is_face_registered", False),
            created_at=datetime.fromisoformat(current_user["created_at"].replace('Z', '+00:00')) if current_user.get("created_at") else datetime.now()
        )
        return user_response
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise