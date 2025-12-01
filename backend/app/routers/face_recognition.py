"""
Face Recognition Service Management Router
Endpoints for managing face recognition microservice integration
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel

from app.middleware.supabase_auth import get_current_user_supabase
from app.middleware.organization_auth import (
    get_organization_context, 
    validate_teacher_facial_access,
    validate_student_facial_access,
    OrganizationContext
)
from app.services.face_recognition_client import face_recognition_client
from app.services.local_supabase import LocalSupabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
db = LocalSupabase()

class FaceRegistrationRequest(BaseModel):
    """Request model for face registration"""
    user_id: str
    subject_ids: Optional[List[str]] = None

class ServiceStatusResponse(BaseModel):
    """Service status response"""
    service_available: bool
    circuit_breaker_state: str
    last_health_check: Optional[str] = None
    fallback_enabled: bool
    metrics: Optional[dict] = None

@router.get("/service/status")
async def get_service_status(
    current_user = Depends(get_current_user_supabase)
):
    """
    Get face recognition service status
    Available to teachers and admins for monitoring
    """
    try:
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check service health
        is_healthy = await face_recognition_client.health_check()
        
        # Get circuit breaker status
        cb_status = face_recognition_client.get_circuit_breaker_status()
        
        # Get service metrics if available
        metrics = await face_recognition_client.get_metrics()
        
        return ServiceStatusResponse(
            service_available=is_healthy,
            circuit_breaker_state=cb_status["state"],
            last_health_check=cb_status.get("last_failure_time"),
            fallback_enabled=face_recognition_client.fallback_enabled,
            metrics=metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting service status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service status")

@router.post("/register")
async def register_student_face(
    file: UploadFile = File(...),
    user_id: str = None,
    subject_ids: Optional[str] = None,  # Comma-separated subject IDs
    org_context: OrganizationContext = Depends(validate_teacher_facial_access)
):
    """
    Register a student's face for recognition - ORGANIZATION SCOPED
    Teachers can register faces for their students within their organization
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Parse subject IDs
        subject_list = []
        if subject_ids:
            subject_list = [s.strip() for s in subject_ids.split(',') if s.strip()]
        
        # Verify teacher has access to the subjects within their organization
        for subject_id in subject_list:
            subject = await db.get_subject_by_id(subject_id)
            if not subject or subject["teacher_id"] != org_context.auth_user_id:
                raise HTTPException(status_code=403, detail=f"Access denied to subject {subject_id}")
            
            # Verify subject belongs to the same organization
            if subject.get("organization_id") != org_context.organization_id:
                raise HTTPException(status_code=403, detail=f"Subject {subject_id} not in your organization")
        
        # Verify student exists and belongs to the same organization
        student = await db.get_user_by_id(user_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        if student.get("organization_id") != org_context.organization_id:
            raise HTTPException(status_code=403, detail="Student not in your organization")
        
        # Verify student is enrolled in the subjects
        for subject_id in subject_list:
            is_enrolled = await db.is_student_enrolled(subject_id, user_id)
            if not is_enrolled:
                raise HTTPException(status_code=400, detail=f"Student not enrolled in subject {subject_id}")
        
        # Read image data
        image_data = await file.read()
        
        # Register face using organization-scoped service
        from app.services.face_recognition import get_face_recognition_service
        result = get_face_recognition_service().process_student_photo(
            user_id, 
            image_data, 
            org_context.organization_id,
            subject_list
        )
        
        if result["success"]:
            return {
                "message": f"Face registered successfully for student {user_id} in organization {org_context.organization_name}",
                "user_id": user_id,
                "organization_id": org_context.organization_id,
                "encoding_stored": result["encoding_stored"],
                "subject_ids": result["subject_ids"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face: {e}")
        raise HTTPException(status_code=500, detail="Failed to register face")

@router.delete("/face/{user_id}")
async def delete_student_face(
    user_id: str,
    current_user = Depends(get_current_user_supabase)
):
    """
    Delete a student's face encoding
    Teachers can delete faces for their students
    """
    try:
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify student exists
        student = await db.get_user_by_id(user_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # For teachers, verify they have at least one subject with this student
        if current_user.user_type == "teacher":
            # Get all subjects taught by this teacher
            teacher_subjects = await db.get_teacher_subjects(current_user.user_id)
            
            # Check if student is enrolled in any of these subjects
            has_access = False
            for subject in teacher_subjects:
                is_enrolled = await db.is_student_enrolled(subject["subject_id"], user_id)
                if is_enrolled:
                    has_access = True
                    break
            
            if not has_access:
                raise HTTPException(status_code=403, detail="No access to this student")
        
        # Delete face using microservice
        success = await face_recognition_client.delete_face(user_id)
        
        if success:
            return {"message": f"Face encoding deleted for student {user_id}"}
        else:
            raise HTTPException(status_code=404, detail="Face encoding not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting face: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete face")

@router.put("/face/{user_id}/subjects")
async def update_face_subjects(
    user_id: str,
    subject_ids: List[str],
    current_user = Depends(get_current_user_supabase)
):
    """
    Update subject associations for a student's face
    Teachers can update subjects for their students
    """
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can update face subjects")
        
        # Verify student exists
        student = await db.get_user_by_id(user_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Verify teacher has access to all specified subjects
        for subject_id in subject_ids:
            subject = await db.get_subject_by_id(subject_id)
            if not subject or subject["teacher_id"] != current_user.user_id:
                raise HTTPException(status_code=403, detail=f"Access denied to subject {subject_id}")
            
            # Verify student is enrolled in the subject
            is_enrolled = await db.is_student_enrolled(subject_id, user_id)
            if not is_enrolled:
                raise HTTPException(status_code=400, detail=f"Student not enrolled in subject {subject_id}")
        
        # Update face subjects using microservice
        success = await face_recognition_client.update_face_subjects(user_id, subject_ids)
        
        if success:
            return {"message": f"Face subjects updated for student {user_id}"}
        else:
            raise HTTPException(status_code=404, detail="Face encoding not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating face subjects: {e}")
        raise HTTPException(status_code=500, detail="Failed to update face subjects")

@router.get("/metrics")
async def get_face_recognition_metrics(
    current_user = Depends(get_current_user_supabase)
):
    """
    Get face recognition service metrics
    Available to admins for monitoring and auto-scaling decisions
    """
    try:
        if current_user.user_type != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get service metrics
        metrics = await face_recognition_client.get_metrics()
        
        if metrics:
            return metrics
        else:
            raise HTTPException(status_code=503, detail="Face recognition service unavailable")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")

@router.post("/test-connection")
async def test_face_recognition_connection(
    current_user = Depends(get_current_user_supabase)
):
    """
    Test connection to face recognition service
    Available to teachers and admins for troubleshooting
    """
    try:
        if current_user.user_type not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Test service health
        is_healthy = await face_recognition_client.health_check()
        
        # Get circuit breaker status
        cb_status = face_recognition_client.get_circuit_breaker_status()
        
        return {
            "service_healthy": is_healthy,
            "circuit_breaker": cb_status,
            "base_url": face_recognition_client.base_url,
            "timeout": face_recognition_client.timeout,
            "fallback_enabled": face_recognition_client.fallback_enabled
        }
        
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to test connection")