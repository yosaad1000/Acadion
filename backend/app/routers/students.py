from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import logging
from ..services.face_recognition import face_recognition_service
from ..models.user import UserResponse
from ..middleware.supabase_auth import get_current_user_supabase as get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    department_id: str
    batch_year: int
    current_semester: int

class StudentResponse(BaseModel):
    student_id: str
    name: str
    email: str
    department_id: str
    batch_year: int
    current_semester: int
    created_at: datetime

class StudentSession(BaseModel):
    session_id: UUID = Field(..., description="Unique session identifier")
    name: str = Field(..., description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    session_date: Optional[datetime] = Field(None, description="Session date and time")
    subject_id: UUID = Field(..., description="Subject ID")
    subject_name: str = Field(..., description="Subject name")
    subject_code: Optional[str] = Field(None, description="Subject code")
    teacher_name: str = Field(..., description="Teacher name")
    attendance_status: str = Field(..., description="Student's attendance status: present, absent, pending, processing")
    attendance_taken: bool = Field(default=False, description="Whether attendance has been taken for this session")
    assignment_count: int = Field(default=0, description="Number of assignments in this session")
    has_overdue_assignments: bool = Field(default=False, description="Whether session has overdue assignments")
    created_at: datetime = Field(..., description="Session creation timestamp")
    updated_at: datetime = Field(..., description="Session last update timestamp")

class AttendanceStats(BaseModel):
    total_sessions: int = Field(default=0, description="Total number of sessions")
    attended_sessions: int = Field(default=0, description="Number of sessions attended")
    attendance_rate: float = Field(default=0.0, description="Attendance rate as percentage")
    streak_days: int = Field(default=0, description="Current attendance streak in days")
    missed_sessions: int = Field(default=0, description="Number of missed sessions")

class StudentSessionsResponse(BaseModel):
    sessions: List[StudentSession] = Field(..., description="List of student sessions")
    attendance_stats: AttendanceStats = Field(..., description="Student attendance statistics")
    total_count: int = Field(..., description="Total number of sessions")
    page: int = Field(default=1, description="Current page number")
    page_size: int = Field(default=50, description="Page size")

# Initialize database connection
try:
    from app.services.local_supabase import LocalSupabase
    db = LocalSupabase()
    logger.info("Local Supabase connection initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize local Supabase: {e}")
    db = None

@router.get("", response_model=List[StudentResponse])
async def get_students():
    """Get all students"""
    try:
        if db:
            students_data = await db.get_all_students()
            return [StudentResponse(
                student_id=s.get("student_id", ""),
                name=s.get("name", ""),
                email=s.get("email", ""),
                department_id=s.get("department_id", ""),
                batch_year=s.get("batch_year", 2024),
                current_semester=s.get("current_semester", 1),
                created_at=datetime.fromisoformat(s.get("created_at", datetime.now().isoformat()).replace('Z', '+00:00')) if s.get("created_at") else datetime.now()
            ) for s in students_data]
        else:
            # Return empty list if database is not available
            logger.warning("Database not available, returning empty list")
            return []
    except Exception as e:
        logger.error(f"Error fetching students: {e}")
        return []

@router.post("", response_model=StudentResponse)
async def create_student(student: StudentCreate):
    """Create a new student"""
    logger.info(f"Received student data: {student}")
    
    try:
        if db:
            # Check if student already exists
            exists = await db.student_exists(student.student_id)
            if exists:
                raise HTTPException(status_code=400, detail=f"Student with ID {student.student_id} already exists")
            
            # Prepare student data for database
            student_data = {
                "student_id": student.student_id,
                "name": student.name,
                "email": student.email,
                "department_id": student.department_id,
                "batch_year": student.batch_year,
                "current_semester": student.current_semester,
                "course_enrolled_ids": [],
                "face_encoding_id": None
            }
            
            # Insert into database
            success = await db.insert_student(student_data)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to create student in database")
            
            logger.info(f"Student {student.student_id} created successfully in database")
        else:
            logger.warning(f"Database not available, student {student.student_id} not saved")
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        # Return the created student
        return StudentResponse(
            **student.dict(),
            created_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str):
    """Get a specific student"""
    # TODO: Implement actual student retrieval
    raise HTTPException(status_code=404, detail="Student not found")

@router.post("/{student_id}/upload-photo")
async def upload_student_photo(student_id: str, file: UploadFile = File(...)):
    """Upload student photo for face recognition"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check if student exists
        if db:
            exists = await db.student_exists(student_id)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        # Read image data
        image_data = await file.read()
        
        # Get all subjects the student is enrolled in
        student_subjects = []
        if db:
            try:
                subjects = await db.get_student_subjects(student_id)
                student_subjects = [subject['subject_id'] for subject in subjects]
                logger.info(f"Student {student_id} is enrolled in subjects: {student_subjects}")
            except Exception as e:
                logger.warning(f"Could not get subjects for student {student_id}: {e}")
                student_subjects = []
        
        # Process face encoding with subject metadata
        result = face_recognition_service.process_student_photo(student_id, image_data, student_subjects)
        
        if result["success"]:
            # Update student record with face encoding status
            if db:
                await db.update_student_face_encoding(student_id, True)
            
            logger.info(f"Face encoding stored for student {student_id}")
            return {
                "message": "Photo uploaded and face encoding stored successfully",
                "student_id": student_id,
                "face_encoding_stored": True
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process photo: {str(e)}")

@router.post("/recognize")
async def recognize_student(file: UploadFile = File(...)):
    """Recognize student from uploaded photo"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Recognize student
        result = face_recognition_service.recognize_student(image_data)
        
        if result["success"]:
            student_id = result["student_id"]
            
            # Get student details from database
            if db:
                student_data = await db.get_student_by_id(student_id)
                if student_data:
                    return {
                        "success": True,
                        "student": {
                            "student_id": student_data.get("student_id"),
                            "name": student_data.get("name"),
                            "email": student_data.get("email"),
                            "department_id": student_data.get("department_id"),
                            "batch_year": student_data.get("batch_year"),
                            "current_semester": student_data.get("current_semester")
                        },
                        "similarity_score": result["similarity_score"],
                        "message": result["message"]
                    }
            
            return {
                "success": True,
                "student_id": student_id,
                "similarity_score": result["similarity_score"],
                "message": result["message"]
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Error recognizing student: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to recognize student: {str(e)}")

@router.delete("/{student_id}")
async def delete_student(student_id: str):
    """Delete a student"""
    try:
        if db:
            # Check if student exists
            exists = await db.student_exists(student_id)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
            
            # Delete face encoding from Pinecone
            face_recognition_service.delete_face_encoding(student_id)
            
            # Delete student from database
            success = await db.delete_student(student_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to delete student from database")
            
            logger.info(f"Student {student_id} deleted successfully")
            return {"message": "Student deleted successfully", "student_id": student_id}
        else:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")

@router.get("/{student_id}/sessions", response_model=StudentSessionsResponse)
async def get_student_sessions(
    student_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    filter_status: Optional[str] = Query(None, description="Filter by attendance status: present, absent, pending, processing"),
    filter_subject: Optional[UUID] = Query(None, description="Filter by subject ID"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Get sessions for a student with attendance status and filtering"""
    try:
        # Verify access - students can only access their own sessions, teachers/admins can access any
        if current_user.user_type == "student" and current_user.user_id != student_id:
            raise HTTPException(status_code=403, detail="Access denied - you can only view your own sessions")
        
        if not db:
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        # For students, use auth_user_id for enrollment checks (student_id in enrollments is auth_user_id)
        # The student_id parameter from the URL is actually user_id, but we need auth_user_id for enrollments
        if current_user.user_type == "student":
            # Use the current user's auth_user_id for enrollment lookups
            enrollment_id = current_user.auth_user_id
        else:
            # For teachers/admins, we need to map the provided student_id (user_id) to auth_user_id
            # Get the user by user_id to find their auth_user_id
            user_data = await db.get_user_by_id(student_id)
            if not user_data:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
            enrollment_id = user_data.get("auth_user_id")
            if not enrollment_id:
                raise HTTPException(status_code=404, detail=f"No auth_user_id found for student {student_id}")
        
        # Get student's enrolled subjects using auth_user_id
        enrolled_subjects = await db.get_student_subjects(enrollment_id)
        if not enrolled_subjects:
            # Return empty response if student is not enrolled in any subjects
            return StudentSessionsResponse(
                sessions=[],
                attendance_stats=AttendanceStats(),
                total_count=0,
                page=page,
                page_size=page_size
            )
        
        subject_ids = [subject['subject_id'] for subject in enrolled_subjects]
        
        # Apply subject filter if provided
        if filter_subject:
            if str(filter_subject) not in subject_ids:
                raise HTTPException(status_code=403, detail="Student is not enrolled in the specified subject")
            subject_ids = [str(filter_subject)]
        
        # Get sessions for enrolled subjects with pagination
        all_sessions = []
        total_sessions = 0
        
        for subject_id in subject_ids:
            try:
                # Get sessions for this subject
                subject_sessions = await db.get_sessions_by_subject_id(subject_id)
                
                # Get subject and teacher info
                subject_info = await db.get_subject_by_id(subject_id)
                teacher_info = await db.get_teacher_by_id(subject_info.get('teacher_id', '')) if subject_info else None
                
                for session in subject_sessions:
                    # Get attendance status for this student and session
                    attendance_status = await db.get_student_attendance_status(student_id, session['session_id'])
                    
                    # Get assignment count and overdue status
                    assignments = await db.get_assignments_by_session_id(session['session_id'])
                    assignment_count = len(assignments) if assignments else 0
                    has_overdue_assignments = False
                    
                    if assignments:
                        current_time = datetime.now()
                        has_overdue_assignments = any(
                            assignment.get('due_date') and 
                            datetime.fromisoformat(assignment['due_date'].replace('Z', '+00:00')) < current_time
                            for assignment in assignments
                        )
                    
                    session_data = StudentSession(
                        session_id=session['session_id'],
                        name=session['name'],
                        description=session.get('description'),
                        session_date=datetime.fromisoformat(session['session_date'].replace('Z', '+00:00')) if session.get('session_date') else None,
                        subject_id=session['subject_id'],
                        subject_name=subject_info.get('name', 'Unknown Subject') if subject_info else 'Unknown Subject',
                        subject_code=subject_info.get('code') if subject_info else None,
                        teacher_name=teacher_info.get('name', 'Unknown Teacher') if teacher_info else 'Unknown Teacher',
                        attendance_status=attendance_status,
                        attendance_taken=session.get('attendance_taken', False),
                        assignment_count=assignment_count,
                        has_overdue_assignments=has_overdue_assignments,
                        created_at=datetime.fromisoformat(session['created_at'].replace('Z', '+00:00')),
                        updated_at=datetime.fromisoformat(session['updated_at'].replace('Z', '+00:00'))
                    )
                    
                    # Apply status filter if provided
                    if filter_status is None or session_data.attendance_status == filter_status:
                        all_sessions.append(session_data)
                        
            except Exception as e:
                logger.warning(f"Error processing sessions for subject {subject_id}: {e}")
                continue
        
        # Sort sessions by date (upcoming first, then chronological)
        current_time = datetime.now()
        all_sessions.sort(key=lambda s: (
            s.session_date < current_time if s.session_date else True,  # Past sessions last
            s.session_date if s.session_date else datetime.min  # Then by date
        ))
        
        total_sessions = len(all_sessions)
        
        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_sessions = all_sessions[start_idx:end_idx]
        
        # Calculate attendance statistics
        attendance_stats = await calculate_attendance_stats(student_id, all_sessions)
        
        return StudentSessionsResponse(
            sessions=paginated_sessions,
            attendance_stats=attendance_stats,
            total_count=total_sessions,
            page=page,
            page_size=page_size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sessions for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get student sessions: {str(e)}")

async def calculate_attendance_stats(student_id: str, sessions: List[StudentSession]) -> AttendanceStats:
    """Calculate attendance statistics for a student"""
    try:
        total_sessions = len([s for s in sessions if s.attendance_taken])  # Only count sessions where attendance was taken
        attended_sessions = len([s for s in sessions if s.attendance_status == 'present'])
        missed_sessions = len([s for s in sessions if s.attendance_status == 'absent'])
        
        attendance_rate = (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0.0
        
        # Calculate streak (consecutive days with attendance)
        streak_days = 0
        current_time = datetime.now()
        
        # Sort sessions by date (most recent first) and calculate streak
        recent_sessions = [s for s in sessions if s.session_date and s.session_date <= current_time and s.attendance_taken]
        recent_sessions.sort(key=lambda s: s.session_date, reverse=True)
        
        for session in recent_sessions:
            if session.attendance_status == 'present':
                streak_days += 1
            else:
                break  # Streak broken
        
        return AttendanceStats(
            total_sessions=total_sessions,
            attended_sessions=attended_sessions,
            attendance_rate=round(attendance_rate, 1),
            streak_days=streak_days,
            missed_sessions=missed_sessions
        )
        
    except Exception as e:
        logger.error(f"Error calculating attendance stats for student {student_id}: {e}")
        return AttendanceStats()  # Return empty stats on error