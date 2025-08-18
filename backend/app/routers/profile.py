from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ValidationError
from passlib.context import CryptContext
from app.models.user import UserResponse, ProfileUpdateRequest, PasswordChangeRequest, ProfileResponse
from app.services.local_supabase import LocalSupabase
from app.routers.auth import get_current_user, verify_password, get_password_hash
import logging
from datetime import datetime
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = LocalSupabase()

class MessageResponse(BaseModel):
    message: str

@router.get("/", response_model=ProfileResponse)
async def get_profile(current_user: UserResponse = Depends(get_current_user)):
    """Get current user profile information"""
    try:
        # Get fresh user data from database to ensure we have latest info
        user_data = await db.get_user_by_id(current_user.user_id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Parse updated_at if it exists
        updated_at = None
        if user_data.get("updated_at"):
            try:
                updated_at = datetime.fromisoformat(user_data["updated_at"].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                updated_at = None
        
        return ProfileResponse(
            user_id=user_data["user_id"],
            email=user_data["email"],
            name=user_data["name"],
            user_type=user_data["user_type"],
            is_face_registered=user_data.get("is_face_registered", False),
            created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00')) if user_data.get("created_at") else datetime.now(),
            updated_at=updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )

@router.put("/", response_model=MessageResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update current user profile information"""
    try:
        # Validate that at least one field is provided
        update_data = profile_data.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one field must be provided for update"
            )
        
        # Check if email is being changed and if it's already taken
        if "email" in update_data and update_data["email"] != current_user.email:
            existing_user = await db.get_user_by_email(update_data["email"])
            if existing_user and existing_user["user_id"] != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address is already registered"
                )
        
        # Update profile in database
        success = await db.update_user_profile(current_user.user_id, update_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        logger.info(f"Profile updated successfully for user {current_user.user_id}")
        return MessageResponse(message="Profile updated successfully")
        
    except HTTPException:
        raise
    except ValidationError as e:
        logger.error(f"Validation error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid profile data provided"
        )
    except Exception as e:
        logger.error(f"Error updating profile for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Change user password with current password verification"""
    try:
        # Validate password complexity
        new_password = password_data.new_password.strip()
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters long"
            )
        
        # Check for basic password complexity
        if not any(c.isupper() for c in new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must contain at least one uppercase letter"
            )
        
        if not any(c.islower() for c in new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must contain at least one lowercase letter"
            )
        
        if not any(c.isdigit() for c in new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must contain at least one number"
            )
        
        # Hash the new password
        new_password_hash = get_password_hash(new_password)
        
        # Change password in database with old password verification
        success = await db.change_user_password(
            current_user.user_id,
            password_data.current_password,
            new_password_hash,
            verify_password  # Pass the verification function
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect or password change failed"
            )
        
        logger.info(f"Password changed successfully for user {current_user.user_id}")
        return MessageResponse(message="Password changed successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.post("/face", response_model=MessageResponse)
async def update_face_registration(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """Update or register face for current user"""
    try:
        # Only students can register faces
        if current_user.user_type != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can register faces"
            )
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Validate file size (max 10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image file too large (max 10MB)"
            )
        
        # Read image data
        image_data = await file.read()
        
        if not image_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image file"
            )
        
        # Process face encoding with Pinecone
        from app.services.face_recognition import face_recognition_service
        
        # If user already has face registered, update it; otherwise create new
        if current_user.is_face_registered:
            # Extract face encoding first
            encoding = face_recognition_service.extract_face_encoding(image_data)
            if encoding is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No face detected in the image"
                )
            
            success = face_recognition_service.update_face_encoding(current_user.user_id, encoding)
            action = "updated"
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to update face encoding"
                )
        else:
            result = face_recognition_service.process_student_photo(current_user.user_id, image_data)
            action = "registered"
            
            if not result.get("success"):
                error_message = result.get("message", "Unknown error occurred")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Face registration failed: {error_message}"
                )
        
        # Update user's face registration status
        await db.update_user_face_status(current_user.user_id, True)
        
        logger.info(f"Face {action} successfully for user {current_user.user_id}")
        return MessageResponse(message=f"Face {action} successfully")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating face registration for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update face registration"
        )

@router.delete("/face", response_model=MessageResponse)
async def remove_face_registration(current_user: UserResponse = Depends(get_current_user)):
    """Remove face registration for current user"""
    try:
        # Only students can have face registrations
        if current_user.user_type != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only students can have face registrations"
            )
        
        # Check if user has face registered
        if not current_user.is_face_registered:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face registration found to remove"
            )
        
        # Remove face encoding from Pinecone
        from app.services.face_recognition import face_recognition_service
        success = face_recognition_service.delete_face_encoding(current_user.user_id)
        
        if not success:
            logger.warning(f"Failed to delete face encoding from Pinecone for user {current_user.user_id}")
            # Continue anyway to update database status
        
        # Update user's face registration status in database
        db_success = await db.update_user_face_status(current_user.user_id, False)
        
        if not db_success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update face registration status in database"
            )
        
        logger.info(f"Face registration removed successfully for user {current_user.user_id}")
        return MessageResponse(message="Face registration removed successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing face registration for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove face registration"
        )