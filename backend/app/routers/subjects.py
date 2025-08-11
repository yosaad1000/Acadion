from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.models.subject import SubjectCreate, SubjectResponse, SubjectJoin, SubjectEnrollmentResponse
from app.models.user import UserResponse
from app.routers.auth import get_current_user
from app.services.local_supabase import LocalSupabase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
db = LocalSupabase()

@router.post("", response_model=SubjectResponse)
async def create_subject(
    subject: SubjectCreate,
    current_user = Depends(get_current_user)
):
    """Create a new subject/classroom (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create subjects")
        
        # Create subject data
        subject_data = {
            "name": subject.name,
            "description": subject.description,
            "teacher_id": current_user.user_id
        }
        
        # Insert subject into database
        created_subject = await db.create_subject(subject_data)
        if not created_subject:
            raise HTTPException(status_code=500, detail="Failed to create subject")
        
        return SubjectResponse(
            subject_id=created_subject["subject_id"],
            subject_code=created_subject.get("subject_code", ""),
            name=created_subject["name"],
            description=created_subject.get("description"),
            teacher_id=current_user.user_id,
            teacher_name=current_user.name,
            invite_code=created_subject["invite_code"],
            is_active=created_subject["is_active"],
            student_count=0,
            created_at=created_subject["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subject creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subject")

@router.get("", response_model=List[SubjectResponse])
async def get_my_subjects(current_user: UserResponse = Depends(get_current_user)):
    """Get subjects - teachers see their created subjects, students see enrolled subjects"""
    try:
        if current_user.user_type == "teacher":
            subjects = await db.get_teacher_subjects(current_user.user_id)
        else:
            subjects = await db.get_student_subjects(current_user.user_id)
        
        return [
            SubjectResponse(
                subject_id=s["subject_id"],
                subject_code=s["subject_code"],
                name=s["name"],
                description=s.get("description"),
                teacher_id=s["teacher_id"],
                teacher_name=s["teacher_name"],
                invite_code=s.get("invite_code", ""),
                is_active=s["is_active"],
                student_count=s.get("student_count", 0),
                created_at=s["created_at"]
            )
            for s in subjects
        ]
        
    except Exception as e:
        logger.error(f"Get subjects error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subjects")

@router.post("/join", response_model=SubjectEnrollmentResponse)
async def join_subject(
    join_data: SubjectJoin,
    current_user: UserResponse = Depends(get_current_user)
):
    """Join a subject using invite code (Students only)"""
    try:
        if current_user.user_type != "student":
            raise HTTPException(status_code=403, detail="Only students can join subjects")
        
        # Find subject by invite code
        subject = await db.get_subject_by_invite_code(join_data.invite_code)
        if not subject:
            raise HTTPException(status_code=404, detail="Invalid invite code")
        
        # Check if already enrolled
        is_enrolled = await db.is_student_enrolled(subject["subject_id"], current_user.user_id)
        if is_enrolled:
            raise HTTPException(status_code=400, detail="Already enrolled in this subject")
        
        # Enroll student
        enrollment = await db.enroll_student(subject["subject_id"], current_user.user_id)
        if not enrollment:
            raise HTTPException(status_code=500, detail="Failed to join subject")
        
        return SubjectEnrollmentResponse(
            subject_id=subject["subject_id"],
            subject_name=subject["name"],
            subject_code=subject["subject_code"],
            teacher_name=subject["teacher_name"],
            enrolled_at=enrollment["enrolled_at"],
            is_active=enrollment["is_active"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Join subject error: {e}")
        raise HTTPException(status_code=500, detail="Failed to join subject")

@router.get("/{subject_id}/students")
async def get_subject_students(
    subject_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get students enrolled in a subject (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view student lists")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        students = await db.get_subject_students(subject_id)
        return students
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get subject students error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get students")

@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific subject by ID"""
    try:
        subject = await db.get_subject_by_id(subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        # Check access permissions
        if current_user.user_type == "teacher":
            if subject["teacher_id"] != current_user.user_id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.user_type == "student":
            is_enrolled = await db.is_student_enrolled(subject_id, current_user.user_id)
            if not is_enrolled:
                raise HTTPException(status_code=403, detail="Not enrolled in this subject")
        
        return SubjectResponse(
            subject_id=subject["subject_id"],
            subject_code=subject.get("subject_code", ""),
            name=subject["name"],
            description=subject.get("description"),
            teacher_id=subject["teacher_id"],
            teacher_name=subject["teacher_name"],
            invite_code=subject.get("invite_code", ""),
            is_active=subject["is_active"],
            student_count=subject.get("student_count", 0),
            created_at=subject["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get subject error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subject")

@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a subject (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can delete subjects")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await db.delete_subject(subject_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete subject")
        
        return {"message": "Subject deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete subject error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete subject")