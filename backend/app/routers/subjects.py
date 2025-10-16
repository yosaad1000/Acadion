from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from datetime import datetime
from app.models.subject import SubjectCreate, SubjectUpdate, SubjectResponse, SubjectJoin, SubjectEnrollmentResponse
from app.models.user import UserResponse
from app.models.notification import NotificationCreate, NotificationType
from app.middleware.supabase_auth import get_current_user_supabase as get_current_user
from app.services.local_supabase import LocalSupabase
from app.services.notification_service import NotificationService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
db = LocalSupabase()

# Lazy initialization - only create when needed
_notification_service = None

def get_notification_service():
    """Get notification service with lazy initialization"""
    global _notification_service
    if _notification_service is None:
        try:
            _notification_service = NotificationService()
            logger.info("NotificationService initialized successfully")
        except Exception as e:
            logger.warning(f"NotificationService unavailable: {e}")
            _notification_service = False  # Mark as failed
    return _notification_service if _notification_service is not False else None

@router.post("/test")
async def test_endpoint():
    """Test endpoint without authentication"""
    logger.info("🧪 Test endpoint called - no auth required")
    return {"message": "Test endpoint working", "status": "success"}

@router.post("/debug")
async def debug_create_subject(subject: SubjectCreate, request: Request):
    """Debug endpoint without authentication to test frontend connectivity"""
    from fastapi import Request
    logger.info("� DRebug create subject called - no auth required")
    logger.info(f"📝 Received data: {subject}")
    logger.info(f"🔍 Request headers: {dict(request.headers)}")
    logger.info(f"🌐 Request URL: {request.url}")
    
    # Check for Authorization header specifically
    auth_header = request.headers.get("authorization")
    logger.info(f"🔑 Authorization header: {auth_header[:50] if auth_header else 'MISSING'}...")
    
    return {
        "message": "Debug endpoint reached", 
        "data": subject.dict(), 
        "status": "success",
        "has_auth_header": bool(auth_header),
        "headers_count": len(request.headers)
    }

@router.post("", response_model=SubjectResponse)
async def create_subject(
    subject: SubjectCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new subject/classroom (Teachers only)"""
    try:
        logger.info(f"🎯 Creating subject for user: {current_user.email} (type: {current_user.user_type})")
        logger.info(f"🔑 User auth_user_id: {current_user.auth_user_id}")
        
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can create subjects")
        
        # Generate unique codes
        import secrets
        import string
        
        # Generate unique subject code (SUB + 6 digits)
        subject_code = None
        counter = 1
        while subject_code is None:
            potential_code = f"SUB{counter:06d}"
            # Check if this code already exists
            existing = await db.get_subject_by_code(potential_code)
            if not existing:
                subject_code = potential_code
            else:
                counter += 1
        
        # Generate unique invite code (8 random alphanumeric characters)
        invite_code = None
        max_attempts = 10
        for _ in range(max_attempts):
            potential_invite = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            # Check if this invite code already exists
            existing = await db.get_subject_by_invite_code(potential_invite)
            if not existing:
                invite_code = potential_invite
                break
        
        if invite_code is None:
            raise HTTPException(status_code=500, detail="Failed to generate unique invite code")
        
        # Create subject data
        subject_data = {
            "name": subject.name,
            "description": subject.description,
            "teacher_id": current_user.auth_user_id,
            "subject_code": subject_code,
            "invite_code": invite_code
        }
        
        logger.info(f"📝 Subject data to create: {subject_data}")
        
        # Insert subject into database
        created_subject = await db.create_subject(subject_data)
        if not created_subject:
            raise HTTPException(status_code=500, detail="Failed to create subject")
        
        # Create notification for successful class creation
        notification_service = get_notification_service()
        if notification_service:
            try:
                class_created_notification = NotificationCreate(
                    recipient_id=current_user.auth_user_id,
                    type=NotificationType.CLASS_JOINED,  # Reusing this type for class creation confirmation
                    title="Class Created Successfully",
                    message=f"Your class '{created_subject['name']}' has been created successfully",
                    data={
                        "subject_name": created_subject["name"],
                        "subject_code": created_subject.get("subject_code", ""),
                        "invite_code": created_subject["invite_code"],
                        "teacher_name": current_user.name,
                        "created_at": created_subject["created_at"],
                        "action": "class_created"
                    }
                )
                success = await notification_service.create_notification(class_created_notification)
                if success:
                    logger.info(f"Created class creation notification for teacher {current_user.auth_user_id}")
                else:
                    logger.warning(f"Failed to create class creation notification for teacher {current_user.auth_user_id}")
                    
            except Exception as e:
                logger.error(f"Failed to create class creation notification: {e}")
                # Don't fail the class creation if notification fails
        
        return SubjectResponse(
            subject_id=created_subject["subject_id"],
            subject_code=created_subject.get("subject_code", ""),
            name=created_subject["name"],
            description=created_subject.get("description"),
            teacher_id=current_user.auth_user_id,
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
            subjects = await db.get_teacher_subjects(current_user.auth_user_id)
        else:
            subjects = await db.get_student_subjects(current_user.auth_user_id)
        
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
            # Create notification for failed join attempt
            notification_service = get_notification_service()
            if notification_service:
                try:
                    failed_join_notification = NotificationCreate(
                        recipient_id=current_user.auth_user_id,
                        type=NotificationType.JOIN_FAILED,
                        title="Failed to Join Class",
                        message="The invite code you entered is invalid or expired",
                        data={
                            "reason": "Invalid invite code",
                            "invite_code": join_data.invite_code,
                            "attempted_at": datetime.utcnow().isoformat()
                        }
                    )
                    success = await notification_service.create_notification(failed_join_notification)
                    if success:
                        logger.info(f"✅ Created join failure notification for {current_user.auth_user_id}")
                    else:
                        logger.warning(f"⚠️ Failed to create join failure notification for {current_user.auth_user_id}")
                except Exception as e:
                    logger.error(f"❌ Exception creating join failure notification: {e}")
            
            raise HTTPException(status_code=404, detail="Invalid invite code")
        
        # Check if already enrolled
        is_enrolled = await db.is_student_enrolled(subject["subject_id"], current_user.auth_user_id)
        if is_enrolled:
            # Create notification for already enrolled attempt
            notification_service = get_notification_service()
            if notification_service:
                try:
                    already_enrolled_notification = NotificationCreate(
                        recipient_id=current_user.auth_user_id,
                        type=NotificationType.JOIN_FAILED,
                        title="Already Enrolled",
                        message=f"You are already enrolled in {subject['name']}",
                        data={
                            "reason": "Already enrolled in this subject",
                            "subject_name": subject["name"],
                            "subject_code": subject["subject_code"],
                            "teacher_name": subject["teacher_name"],
                            "attempted_at": datetime.utcnow().isoformat()
                        }
                    )
                    success = await notification_service.create_notification(already_enrolled_notification)
                    if success:
                        logger.info(f"✅ Created already enrolled notification for {current_user.auth_user_id}")
                    else:
                        logger.warning(f"⚠️ Failed to create already enrolled notification for {current_user.auth_user_id}")
                except Exception as e:
                    logger.error(f"❌ Exception creating already enrolled notification: {e}")
            
            raise HTTPException(status_code=400, detail="Already enrolled in this subject")
        
        # Enroll student
        enrollment = await db.enroll_student(subject["subject_id"], current_user.auth_user_id)
        if not enrollment:
            raise HTTPException(status_code=500, detail="Failed to join subject")
        
        # Update face encoding with new subject enrollment
        try:
            from app.services.face_recognition import get_face_recognition_service
            
            # Get all subjects the student is now enrolled in
            all_subjects = await db.get_student_subjects(current_user.auth_user_id)
            subject_ids = [subj['subject_id'] for subj in all_subjects]
            
            # Update the face encoding metadata in Pinecone
            success = get_face_recognition_service().update_face_encoding_subjects(current_user.auth_user_id, subject_ids)
            if success:
                logger.info(f"Updated face encoding subjects for student {current_user.auth_user_id}: {subject_ids}")
            else:
                logger.warning(f"Face encoding not found for student {current_user.auth_user_id} - they may need to register their face")
        except Exception as e:
            logger.warning(f"Failed to update face encoding subjects for student {current_user.auth_user_id}: {e}")
            # Don't fail the enrollment if face encoding update fails
        
        # Create notifications for successful enrollment
        notification_service = get_notification_service()
        if notification_service:
            try:
                # Notification for the student (class joined successfully)
                student_notification = NotificationCreate(
                    recipient_id=current_user.auth_user_id,
                    sender_id=subject["teacher_id"],
                    type=NotificationType.CLASS_JOINED,
                    title="Successfully Joined Class",
                    message=f"You have successfully joined {subject['name']}",
                    data={
                        "subject_name": subject["name"],
                        "subject_code": subject["subject_code"],
                        "teacher_name": subject["teacher_name"],
                        "invite_code": join_data.invite_code,
                        "joined_at": enrollment["enrolled_at"]
                    }
                )
                student_success = await notification_service.create_notification(student_notification)
                if student_success:
                    logger.info(f"✅ Created student notification for {current_user.auth_user_id}")
                else:
                    logger.warning(f"⚠️ Failed to create student notification for {current_user.auth_user_id}")
                
                # Notification for the teacher (student joined class)
                teacher_notification = NotificationCreate(
                    recipient_id=subject["teacher_id"],
                    sender_id=current_user.auth_user_id,
                    type=NotificationType.STUDENT_JOINED,
                    title="New Student Joined",
                    message=f"{current_user.name} joined your class {subject['name']}",
                    data={
                        "student_name": current_user.name,
                        "student_id": current_user.auth_user_id,
                        "subject_name": subject["name"],
                        "subject_code": subject["subject_code"],
                        "joined_at": enrollment["enrolled_at"]
                    }
                )
                teacher_success = await notification_service.create_notification(teacher_notification)
                if teacher_success:
                    logger.info(f"✅ Created teacher notification for {subject['teacher_id']}")
                else:
                    logger.warning(f"⚠️ Failed to create teacher notification for {subject['teacher_id']}")
                
                logger.info(f"Enrollment notification creation completed - Student: {student_success}, Teacher: {teacher_success}")
                
            except Exception as e:
                logger.error(f"❌ Exception during enrollment notification creation: {e}")
                logger.error(f"   - Student ID: {current_user.auth_user_id}")
                logger.error(f"   - Teacher ID: {subject['teacher_id']}")
                logger.error(f"   - Subject: {subject['name']}")
                # Don't fail the enrollment if notification creation fails
        
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
        if not subject or subject["teacher_id"] != current_user.auth_user_id:
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
            if subject["teacher_id"] != current_user.auth_user_id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.user_type == "student":
            is_enrolled = await db.is_student_enrolled(subject_id, current_user.auth_user_id)
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

@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_update: SubjectUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update a subject (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can update subjects")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(subject_id)
        if not subject or subject["teacher_id"] != current_user.auth_user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update subject
        updated_subject = await db.update_subject(subject_id, subject_update.dict(exclude_unset=True))
        if not updated_subject:
            raise HTTPException(status_code=500, detail="Failed to update subject")
        
        return SubjectResponse(
            subject_id=updated_subject["subject_id"],
            subject_code=updated_subject.get("subject_code", ""),
            name=updated_subject["name"],
            description=updated_subject.get("description"),
            teacher_id=updated_subject["teacher_id"],
            teacher_name=updated_subject["teacher_name"],
            invite_code=updated_subject.get("invite_code", ""),
            is_active=updated_subject["is_active"],
            student_count=updated_subject.get("student_count", 0),
            created_at=updated_subject["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update subject error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update subject")

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
        if not subject or subject["teacher_id"] != current_user.auth_user_id:
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