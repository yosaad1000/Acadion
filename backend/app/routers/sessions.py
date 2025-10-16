from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from uuid import UUID
from app.models.session import (
    SessionCreate, SessionUpdate, SessionResponse, SessionListResponse
)
from app.models.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentResponse, 
    AssignmentListResponse, AssignmentSubmissionUpdate
)
from app.models.user import UserResponse
from app.middleware.supabase_auth import get_current_user_supabase as get_current_user
from app.services.session_service import SessionService
from app.services.assignment_service import AssignmentService
from app.services.local_supabase import LocalSupabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
session_service = SessionService()
assignment_service = AssignmentService()
db = LocalSupabase()

@router.post("", response_model=SessionResponse)
async def create_session(
    session: SessionCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create sessions")
        
        # Verify teacher owns the subject
        subject = await db.get_subject_by_id(str(session.subject_id))
        if not subject or subject["teacher_id"] != current_user.auth_user_id:
            raise HTTPException(status_code=403, detail="Access denied - you don't own this subject")
        
        # Create session with smart defaults
        created_session = await session_service.create_session_with_defaults(session, UUID(current_user.auth_user_id))
        if not created_session:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        return SessionResponse(
            session_id=created_session["session_id"],
            subject_id=created_session["subject_id"],
            name=created_session["name"],
            description=created_session.get("description"),
            session_date=created_session.get("session_date"),
            notes=created_session.get("notes"),
            attendance_taken=created_session.get("attendance_taken", False),
            created_by=created_session.get("created_by"),
            created_at=created_session["created_at"],
            updated_at=created_session["updated_at"],
            assignments=created_session.get("assignments", []),
            subject_name=created_session.get("subject_name", ""),
            teacher_name=created_session.get("teacher_name", ""),
            assignment_count=created_session.get("assignment_count", 0),
            has_overdue_assignments=created_session.get("has_overdue_assignments", False)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@router.get("/subject/{subject_id}", response_model=SessionListResponse)
async def get_sessions_by_subject_id(
    subject_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get sessions for a subject - cleaner REST endpoint"""
    try:
        # Verify access through subject
        subject = await db.get_subject_by_id(str(subject_id))
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        has_access = False
        if current_user.user_type == "teacher" and subject["teacher_id"] == current_user.auth_user_id:
            has_access = True
        elif current_user.user_type == "student":
            # Use auth_user_id directly for enrollment check (student_id in enrollments is auth_user_id)
            logger.info(f"🔍 Student access check - auth_user_id: {current_user.auth_user_id}, subject_id: {subject_id}")
            is_enrolled = await db.is_student_enrolled(str(subject_id), current_user.auth_user_id)
            logger.info(f"📊 Enrollment check result: {is_enrolled}")
            has_access = is_enrolled
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get sessions
        result = await session_service.get_sessions_by_subject(subject_id, page, page_size)
        
        sessions = [
            SessionResponse(
                session_id=s["session_id"],
                subject_id=s["subject_id"],
                name=s["name"],
                description=s.get("description"),
                session_date=s.get("session_date"),
                notes=s.get("notes"),
                attendance_taken=s.get("attendance_taken", False),
                created_by=s.get("created_by"),
                created_at=s["created_at"],
                updated_at=s["updated_at"],
                assignments=s.get("assignments", []),
                subject_name=s.get("subject_name", ""),
                teacher_name=s.get("teacher_name", ""),
                assignment_count=s.get("assignment_count", 0),
                has_overdue_assignments=s.get("has_overdue_assignments", False)
            )
            for s in result["sessions"]
        ]
        
        return SessionListResponse(
            sessions=sessions,
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get sessions by subject error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.get("", response_model=SessionListResponse)
async def get_sessions(
    subject_id: UUID = Query(..., description="Subject ID to get sessions for"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get sessions for a subject with pagination (legacy endpoint)"""
    try:
        # Check user access to subject
        access_check = await session_service.check_user_access_to_session(
            UUID("00000000-0000-0000-0000-000000000000"),  # Dummy session ID for subject check
            UUID(current_user.user_id), 
            current_user.user_type
        )
        
        # Verify access through subject
        subject = await db.get_subject_by_id(str(subject_id))
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        has_access = False
        if current_user.user_type == "teacher" and subject["teacher_id"] == current_user.auth_user_id:
            has_access = True
        elif current_user.user_type == "student":
            # Use auth_user_id directly for enrollment check (student_id in enrollments is auth_user_id)
            logger.info(f"🔍 Student access check (legacy) - auth_user_id: {current_user.auth_user_id}, subject_id: {subject_id}")
            is_enrolled = await db.is_student_enrolled(str(subject_id), current_user.auth_user_id)
            logger.info(f"📊 Enrollment check result (legacy): {is_enrolled}")
            has_access = is_enrolled
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get sessions
        result = await session_service.get_sessions_by_subject(subject_id, page, page_size)
        
        sessions = [
            SessionResponse(
                session_id=s["session_id"],
                subject_id=s["subject_id"],
                name=s["name"],
                description=s.get("description"),
                session_date=s.get("session_date"),
                notes=s.get("notes"),
                attendance_taken=s.get("attendance_taken", False),
                created_by=s.get("created_by"),
                created_at=s["created_at"],
                updated_at=s["updated_at"],
                assignments=s.get("assignments", []),
                subject_name=s.get("subject_name", ""),
                teacher_name=s.get("teacher_name", ""),
                assignment_count=s.get("assignment_count", 0),
                has_overdue_assignments=s.get("has_overdue_assignments", False)
            )
            for s in result["sessions"]
        ]
        
        return SessionListResponse(
            sessions=sessions,
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific session by ID"""
    try:
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"]:
            raise HTTPException(status_code=403, detail=access_check["reason"])
        
        session_data = access_check["session"]
        
        return SessionResponse(
            session_id=session_data["session_id"],
            subject_id=session_data["subject_id"],
            name=session_data["name"],
            description=session_data.get("description"),
            session_date=session_data.get("session_date"),
            notes=session_data.get("notes"),
            attendance_taken=session_data.get("attendance_taken", False),
            created_by=session_data.get("created_by"),
            created_at=session_data["created_at"],
            updated_at=session_data["updated_at"],
            assignments=session_data.get("assignments", []),
            subject_name=session_data.get("subject_name", ""),
            teacher_name=session_data.get("teacher_name", ""),
            assignment_count=session_data.get("assignment_count", 0),
            has_overdue_assignments=session_data.get("has_overdue_assignments", False)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session")

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    session_update: SessionUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update a session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can update sessions")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update session
        updated_session = await session_service.update_session(session_id, session_update)
        if not updated_session:
            raise HTTPException(status_code=500, detail="Failed to update session")
        
        return SessionResponse(
            session_id=updated_session["session_id"],
            subject_id=updated_session["subject_id"],
            name=updated_session["name"],
            description=updated_session.get("description"),
            session_date=updated_session.get("session_date"),
            notes=updated_session.get("notes"),
            attendance_taken=updated_session.get("attendance_taken", False),
            created_by=updated_session.get("created_by"),
            created_at=updated_session["created_at"],
            updated_at=updated_session["updated_at"],
            assignments=updated_session.get("assignments", []),
            subject_name=updated_session.get("subject_name", ""),
            teacher_name=updated_session.get("teacher_name", ""),
            assignment_count=updated_session.get("assignment_count", 0),
            has_overdue_assignments=updated_session.get("has_overdue_assignments", False)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update session")

@router.delete("/{session_id}")
async def delete_session(
    session_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can delete sessions")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete session
        success = await session_service.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete session")
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# Assignment endpoints within sessions
@router.post("/{session_id}/assignments", response_model=AssignmentResponse)
async def create_assignment(
    session_id: UUID,
    assignment: AssignmentCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new assignment in a session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create assignments")
        
        # Verify session_id matches the one in the URL
        if assignment.session_id != session_id:
            raise HTTPException(status_code=400, detail="Session ID mismatch")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create assignment
        created_assignment = await assignment_service.create_assignment(assignment, UUID(current_user.auth_user_id))
        if not created_assignment:
            raise HTTPException(status_code=500, detail="Failed to create assignment")
        
        return AssignmentResponse(
            assignment_id=created_assignment["assignment_id"],
            session_id=created_assignment["session_id"],
            title=created_assignment["title"],
            description=created_assignment.get("description"),
            due_date=created_assignment.get("due_date"),
            assignment_type=created_assignment["assignment_type"],
            google_drive_link=created_assignment.get("google_drive_link"),
            created_by=created_assignment.get("created_by"),
            created_at=created_assignment["created_at"],
            updated_at=created_assignment["updated_at"],
            session_name=created_assignment.get("session_name", ""),
            subject_name=created_assignment.get("subject_name", ""),
            submissions=created_assignment.get("submissions", []),
            is_overdue=created_assignment.get("is_overdue", False),
            submission_count=created_assignment.get("submission_count", 0),
            pending_count=created_assignment.get("pending_count", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create assignment error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create assignment")

@router.get("/{session_id}/assignments", response_model=AssignmentListResponse)
async def get_session_assignments(
    session_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get assignments for a session"""
    try:
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"]:
            raise HTTPException(status_code=403, detail=access_check["reason"])
        
        # Get assignments
        result = await assignment_service.get_assignments_by_session(session_id, page, page_size)
        
        assignments = [
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
            for a in result["assignments"]
        ]
        
        return AssignmentListResponse(
            assignments=assignments,
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session assignments error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assignments")

@router.get("/{session_id}/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    session_id: UUID,
    assignment_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific assignment"""
    try:
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"]:
            raise HTTPException(status_code=403, detail=access_check["reason"])
        
        # Get assignment
        assignment_data = await assignment_service.get_assignment_by_id(assignment_id)
        if not assignment_data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Verify assignment belongs to the session
        if assignment_data["session_id"] != str(session_id):
            raise HTTPException(status_code=404, detail="Assignment not found in this session")
        
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

@router.put("/{session_id}/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    session_id: UUID,
    assignment_id: UUID,
    assignment_update: AssignmentUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update an assignment (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can update assignments")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify assignment exists and belongs to session
        assignment_data = await assignment_service.get_assignment_by_id(assignment_id)
        if not assignment_data or assignment_data["session_id"] != str(session_id):
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Update assignment
        updated_assignment = await assignment_service.update_assignment(assignment_id, assignment_update)
        if not updated_assignment:
            raise HTTPException(status_code=500, detail="Failed to update assignment")
        
        return AssignmentResponse(
            assignment_id=updated_assignment["assignment_id"],
            session_id=updated_assignment["session_id"],
            title=updated_assignment["title"],
            description=updated_assignment.get("description"),
            due_date=updated_assignment.get("due_date"),
            assignment_type=updated_assignment["assignment_type"],
            google_drive_link=updated_assignment.get("google_drive_link"),
            created_by=updated_assignment.get("created_by"),
            created_at=updated_assignment["created_at"],
            updated_at=updated_assignment["updated_at"],
            session_name=updated_assignment.get("session_name", ""),
            subject_name=updated_assignment.get("subject_name", ""),
            submissions=updated_assignment.get("submissions", []),
            is_overdue=updated_assignment.get("is_overdue", False),
            submission_count=updated_assignment.get("submission_count", 0),
            pending_count=updated_assignment.get("pending_count", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update assignment error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update assignment")

@router.delete("/{session_id}/assignments/{assignment_id}")
async def delete_assignment(
    session_id: UUID,
    assignment_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete an assignment (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can delete assignments")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify assignment exists and belongs to session
        assignment_data = await assignment_service.get_assignment_by_id(assignment_id)
        if not assignment_data or assignment_data["session_id"] != str(session_id):
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Delete assignment
        success = await assignment_service.delete_assignment(assignment_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete assignment")
        
        return {"message": "Assignment deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete assignment error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete assignment")

@router.post("/{session_id}/attendance")
async def mark_attendance_taken(
    session_id: UUID,
    current_user: UserResponse = Depends(get_current_user)
):
    """Mark that attendance has been taken for a session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
        
        # Check user access to session
        access_check = await session_service.check_user_access_to_session(
            session_id, UUID(current_user.auth_user_id if current_user.user_type == "teacher" else current_user.user_id), current_user.user_type
        )
        
        if not access_check["has_access"] or not access_check.get("can_edit", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Mark attendance as taken
        success = await session_service.mark_attendance_taken(session_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to mark attendance")
        
        return {"message": "Attendance marked as taken"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark attendance")
