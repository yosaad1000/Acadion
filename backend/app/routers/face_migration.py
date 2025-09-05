"""
Face Migration Router
Endpoints for migrating face encodings to include subject metadata
"""

from fastapi import APIRouter, Depends, HTTPException
from app.models.user import UserResponse
from app.routers.auth import get_current_user
from app.services.face_migration_service import face_migration_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/face-migration", tags=["face-migration"])

@router.post("/migrate")
async def migrate_face_encodings(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Migrate existing face encodings to include subject metadata
    Only accessible by teachers/admins
    """
    try:
        # Only allow teachers and admins to run migration
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Only teachers and admins can run migration")
        
        logger.info(f"Face encoding migration started by user {current_user.user_id}")
        
        result = await face_migration_service.migrate_existing_face_encodings()
        
        if result["success"]:
            logger.info(f"Migration completed successfully: {result['migrated_count']} encodings updated")
        else:
            logger.error(f"Migration failed: {result['message']}")
        
        return result
        
    except Exception as e:
        logger.error(f"Migration endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@router.get("/stats")
async def get_migration_stats(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get statistics about face encodings and migration status
    """
    try:
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Only teachers and admins can view migration stats")
        
        stats = await face_migration_service.get_face_encoding_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Stats endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.post("/update-student/{student_id}")
async def update_student_face_subjects(
    student_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update a specific student's face encoding with current subject enrollment
    """
    try:
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Only teachers and admins can update face encodings")
        
        success = await face_migration_service.update_student_face_subjects(student_id)
        
        if success:
            return {
                "success": True,
                "message": f"Updated face encoding subjects for student {student_id}"
            }
        else:
            return {
                "success": False,
                "message": f"Failed to update face encoding for student {student_id}"
            }
        
    except Exception as e:
        logger.error(f"Update student face subjects error: {e}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")