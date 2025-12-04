"""
Async Attendance API Router
Endpoints for asynchronous attendance processing
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging

from ..services.async_attendance_service import get_async_attendance_service
from ..services.job_tracker import get_job_tracker
from ..middleware.supabase_auth import get_current_user_supabase as get_current_user
from ..models.attendance import AttendanceJobResponse, JobStatusResponse, UserJobsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/async-attendance", tags=["Async Attendance"])

@router.post("/submit", response_model=AttendanceJobResponse)
async def submit_attendance_processing(
    session_id: str = Form(...),
    subject_id: str = Form(...),
    priority: int = Form(0),
    callback_url: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit attendance image for asynchronous processing
    
    Args:
        session_id: Attendance session ID
        subject_id: Subject ID for filtering
        priority: Processing priority (0=normal, higher=more priority)
        callback_url: Optional webhook URL for completion notification
        image: Attendance image file
        current_user: Current authenticated user
        
    Returns:
        Job submission result with job_id for tracking
    """
    try:
        # Validate image file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Read image data
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty image file"
            )
        
        # Get async attendance service
        service = await get_async_attendance_service()
        
        # Submit job
        result = await service.submit_attendance_processing(
            session_id=session_id,
            subject_id=subject_id,
            image_data=image_data,
            user_id=current_user.get("user_id"),
            priority=priority,
            callback_url=callback_url
        )
        
        if result["success"]:
            return JSONResponse(
                status_code=202,  # Accepted
                content=result
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to submit job")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting attendance processing: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/job/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get job status and progress
    
    Args:
        job_id: Job identifier
        current_user: Current authenticated user
        
    Returns:
        Job status and progress information
    """
    try:
        service = await get_async_attendance_service()
        
        job_status = await service.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )
        
        # Check if user has access to this job
        job_user_id = job_status.get("metadata", {}).get("user_id")
        current_user_id = current_user.get("user_id")
        
        if job_user_id and job_user_id != current_user_id:
            # Check if user is admin or teacher
            user_role = current_user.get("role", "")
            if user_role not in ["admin", "teacher"]:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied"
                )
        
        return job_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting job status {job_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/jobs", response_model=UserJobsResponse)
async def get_user_jobs(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Get jobs for the current user
    
    Args:
        limit: Maximum number of jobs to return
        current_user: Current authenticated user
        
    Returns:
        List of user's jobs
    """
    try:
        service = await get_async_attendance_service()
        
        user_id = current_user.get("user_id")
        jobs = await service.get_user_jobs(user_id, limit)
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "user_id": user_id
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting user jobs: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.delete("/job/{job_id}")
async def cancel_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a pending job
    
    Args:
        job_id: Job identifier to cancel
        current_user: Current authenticated user
        
    Returns:
        Cancellation result
    """
    try:
        service = await get_async_attendance_service()
        
        result = await service.cancel_job(
            job_id=job_id,
            user_id=current_user.get("user_id")
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to cancel job")
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error cancelling job {job_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.post("/process-sync")
async def process_attendance_sync(
    session_id: str = Form(...),
    subject_id: str = Form(...),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Process attendance synchronously (fallback)
    
    Args:
        session_id: Attendance session ID
        subject_id: Subject ID for filtering
        image: Attendance image file
        current_user: Current authenticated user
        
    Returns:
        Processing result
    """
    try:
        # Validate image file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Read image data
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty image file"
            )
        
        # Get async attendance service
        service = await get_async_attendance_service()
        
        # Process synchronously
        result = await service.process_attendance_synchronously(
            session_id=session_id,
            subject_id=subject_id,
            image_data=image_data,
            user_id=current_user.get("user_id")
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in synchronous attendance processing: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/stats")
async def get_service_statistics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get async attendance service statistics
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Service statistics
    """
    try:
        # Check if user is admin
        user_role = current_user.get("role", "")
        if user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )
        
        service = await get_async_attendance_service()
        stats = await service.get_service_statistics()
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting service statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/health")
async def health_check():
    """
    Health check endpoint for async attendance service
    
    Returns:
        Service health status
    """
    try:
        service = await get_async_attendance_service()
        
        # Basic health check
        stats = await service.get_service_statistics()
        
        return {
            "status": "healthy",
            "service": "async_attendance_service",
            "initialized": stats.get("initialized", False),
            "timestamp": stats.get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "service": "async_attendance_service"
        }