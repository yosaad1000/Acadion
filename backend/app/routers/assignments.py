from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from app.models.assignment import (
    AssignmentResponse, AssignmentSubmissionUpdate, AssignmentSubmission
)
from app.models.user import UserResponse
from app.middleware.supabase_auth import get_current_user_supabase as get_current_user
from app.services.assignment_service import AssignmentService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize service
assignment_service = AssignmentService()

@router.get("/my-assignments", response_model=List[AssignmentResponse])
async def get_my_assignments(
    subject_id: Optional[UUID] = Query(None, description="Filter by subject ID"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get assignments for the current user (student view)"""
    try:
        if current_user.user_type != "student":
            raise HTTPException(status_code=403, detail="Only students can view their assignments")
        
        # Get student assignments
        assignments = await assignment_service.get_student_assignments(
            UUID(current_user.user_id), subject_id
        )
        
        return [
            AssignmentResponse(
                assignment_id=a["assignment_id"],
                session_id=a["session_id"],
                title=a["title"],
                description=a.get("description"),
                due_date=a.get("due_date"),
                assignment_type=a["assignment_type"],
                google_drive_link=a.get("google_drive_link"),
                created_by=a.get("created_by"),
                created_at=a["created_at"],
                updated_at=a["updated_at"],
                session_name=a.get("session_name", ""),
                subject_name=a.get("subject_name", ""),
                submissions=a.get("submissions", []),
                is_overdue=a.get("is_overdue", False),
                submission_count=a.get("submission_count", 0),
                pending_count=a.get("pending_count", 0)
            )
            for a in assignments
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get my assignments error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assignments")

@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific assignment by ID"""
    try:
        # Get assignment
        assignment_data = await assignment_service.get_assignment_by_id(assignment_id)
        if not assignment_data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Check access permissions (simplified - could be enhanced with proper session access check)
        # For now, any authenticated user can view assignments they have access to
        
        return AssignmentResponse(
            assignment_id=assignment_data["assignment_id"],
            session_id=assignment_data["session_id"],
            title=assignment_data["title"],
            description=assignment_data.get("description"),
            due_date=assignment_data.get("due_date"),
            assignment_type=assignment_data["assignment_type"],
            google_drive_link=assignment_data.get("google_drive_link"),
            created_by=assignment_data.get("created_by"),
            created_at=assignment_data["created_at"],
            updated_at=assignment_data["updated_at"],
            session_name=assignment_data.get("session_name", ""),
            subject_name=assignment_data.get("subject_name", ""),
            submissions=assignment_data.get("submissions", []),
            is_overdue=assignment_data.get("is_overdue", False),
            submission_count=assignment_data.get("submission_count", 0),
            pending_count=assignment_data.get("pending_count", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get assignment error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assignment")

@router.get("/{assignment_id}/submissions")
async def get_assignment_submissions(
    assignment_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get submissions for an assignment (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view all submissions")
        
        # Get assignment to verify teacher access
        assignment_data = await assignment_service.get_assignment_by_id(assignment_id)
        if not assignment_data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # TODO: Add proper session/subject access check here
        
        # Get submissions
        submissions = await assignment_service.get_assignment_submissions(assignment_id)
        
        return submissions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get assignment submissions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get submissions")

@router.get("/{assignment_id}/my-submission", response_model=AssignmentSubmission)
async def get_my_submission(
    assignment_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get current user's submission for an assignment (Students only)"""
    try:
        if current_user.user_type != "student":
            raise HTTPException(status_code=403, detail="Only students can view their submissions")
        
        # Get student's submission
        submission = await assignment_service.get_student_submission(
            assignment_id, UUID(current_user.user_id)
        )
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        return AssignmentSubmission(
            submission_id=submission["submission_id"],
            assignment_id=submission["assignment_id"],
            student_id=submission["student_id"],
            submission_status=submission["submission_status"],
            submission_date=submission.get("submission_date"),
            google_drive_link=submission.get("google_drive_link"),
            grade=submission.get("grade"),
            feedback=submission.get("feedback"),
            created_at=submission["created_at"],
            updated_at=submission["updated_at"],
            student_name=submission.get("student_name", ""),
            assignment_title=submission.get("assignment_title", "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get my submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get submission")

@router.put("/{assignment_id}/my-submission", response_model=AssignmentSubmission)
async def update_my_submission(
    assignment_id: UUID,
    submission_update: AssignmentSubmissionUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update current user's submission for an assignment (Students only)"""
    try:
        if current_user.user_type != "student":
            raise HTTPException(status_code=403, detail="Only students can update their submissions")
        
        # Get student's submission
        submission = await assignment_service.get_student_submission(
            assignment_id, UUID(current_user.user_id)
        )
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Update submission
        updated_submission = await assignment_service.update_submission(
            UUID(submission["submission_id"]), submission_update
        )
        
        if not updated_submission:
            raise HTTPException(status_code=500, detail="Failed to update submission")
        
        return AssignmentSubmission(
            submission_id=updated_submission["submission_id"],
            assignment_id=updated_submission["assignment_id"],
            student_id=updated_submission["student_id"],
            submission_status=updated_submission["submission_status"],
            submission_date=updated_submission.get("submission_date"),
            google_drive_link=updated_submission.get("google_drive_link"),
            grade=updated_submission.get("grade"),
            feedback=updated_submission.get("feedback"),
            created_at=updated_submission["created_at"],
            updated_at=updated_submission["updated_at"],
            student_name=updated_submission.get("student_name", ""),
            assignment_title=updated_submission.get("assignment_title", "")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update my submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update submission")