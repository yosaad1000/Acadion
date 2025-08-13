from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import date
from pydantic import BaseModel
from app.models.user import UserResponse
from app.routers.auth import get_current_user
from app.services.local_supabase import LocalSupabase
# from app.services.face_recognition import face_recognition_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
db = LocalSupabase()

class AttendanceRecord(BaseModel):
    student_id: str
    subject_id: str
    date: date
    status: str
    confidence_score: float = None
    method: str = "manual"

class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    subject_id: str
    subject_name: str
    date: date
    status: str
    confidence_score: float = None
    method: str
    created_at: str

@router.post("/mark-face")
async def mark_attendance_by_face(
    subject_id: str,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """Mark attendance using face recognition"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Recognize student using face recognition
        from app.services.face_recognition import face_recognition_service
        result = face_recognition_service.recognize_student(image_data)
        
        if result["success"]:
            student_id = result["student_id"]
            confidence_score = result["similarity_score"]
            
            print(f"🎯 Recognized student: {student_id}")
            print(f"📚 Subject ID: {subject_id}")
            
            # Check if student is enrolled in this subject
            is_enrolled = await db.is_student_enrolled(subject_id, student_id)
            print(f"📝 Student enrolled: {is_enrolled}")
            
            if not is_enrolled:
                # Still return the face detection results even if student not enrolled
                return {
                    **result,  # Include all face detection results
                    "success": False,
                    "message": "Student not enrolled in this subject."
                }
            
            # Mark attendance with timestamp to allow multiple per day
            from datetime import datetime
            attendance_data = {
                "subject_id": subject_id,
                "student_id": student_id,
                "date": str(date.today()),
                "status": "present",
                "marked_by": current_user.user_id,
                "confidence_score": confidence_score,
                "method": "face_recognition",
                "session_time": datetime.now().strftime("%H:%M:%S")
            }
            
            print(f"📊 Marking attendance with data: {attendance_data}")
            success = await db.mark_attendance(attendance_data)
            print(f"✅ Attendance marking result: {success}")
            
            if success:
                return {
                    **result,  # Include all face detection results
                    "message": "Attendance marked successfully!",
                    "attendance_marked": True,
                    "student_id": student_id
                }
            else:
                return {
                    **result,  # Include all face detection results
                    "success": False,
                    "message": "Failed to mark attendance. Please try again."
                }
        else:
            # Return all the detailed face detection results even on failure
            return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark attendance")

@router.get("/{subject_id}")
async def get_attendance(
    subject_id: str,
    attendance_date: date = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get attendance records for a subject"""
    try:
        # Verify access
        if current_user.user_type == "teacher":
            subject = await db.get_subject_by_id(subject_id)
            if not subject or subject["teacher_id"] != current_user.user_id:
                raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.user_type == "student":
            is_enrolled = await db.is_student_enrolled(subject_id, current_user.user_id)
            if not is_enrolled:
                raise HTTPException(status_code=403, detail="Not enrolled in this subject")
        
        # Get attendance records
        if attendance_date:
            records = await db.get_attendance_by_date(subject_id, attendance_date)
        else:
            records = await db.get_attendance_by_subject(subject_id)
        
        return records
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance")

@router.get("/{subject_id}/dashboard")
async def get_attendance_dashboard(
    subject_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get attendance dashboard with statistics"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view attendance dashboard")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all attendance records
        records = await db.get_attendance_by_subject(subject_id)
        
        # Get enrolled students
        students = await db.get_subject_students(subject_id)
        
        # Calculate statistics
        total_students = len(students)
        total_sessions = len(set(record.get('date') for record in records)) if records else 0
        present_count = len([r for r in records if r.get('status') == 'present'])
        
        return {
            "subject": subject,
            "total_students": total_students,
            "total_sessions": total_sessions,
            "total_present_records": present_count,
            "attendance_records": records,
            "enrolled_students": students
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get attendance dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance dashboard")

@router.post("/manual")
async def mark_manual_attendance(
    attendance: AttendanceRecord,
    current_user: UserResponse = Depends(get_current_user)
):
    """Manually mark attendance (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(attendance.subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if student is enrolled
        is_enrolled = await db.is_student_enrolled(attendance.subject_id, attendance.student_id)
        if not is_enrolled:
            raise HTTPException(status_code=400, detail="Student not enrolled in this subject")
        
        # Mark attendance
        attendance_data = {
            "subject_id": attendance.subject_id,
            "student_id": attendance.student_id,
            "date": str(attendance.date),
            "status": attendance.status,
            "marked_by": current_user.user_id,
            "method": "manual"
        }
        
        success = await db.mark_attendance(attendance_data)
        if success:
            return {"message": "Attendance marked successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to mark attendance")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark attendance")