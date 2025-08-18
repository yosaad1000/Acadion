from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import date
from pydantic import BaseModel
from app.models.user import UserResponse
from app.routers.auth import get_current_user
from app.services.local_supabase import LocalSupabase
# from app.services.face_recognition import face_recognition_service
import logging
from datetime import datetime
import uuid

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
    session_id: str = None
    session_timestamp: str = None

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
    session_id: str = None
    session_timestamp: str = None

class BulkAttendanceRecord(BaseModel):
    subject_id: str
    date: date
    students: List[dict]  # List of {student_id, status}
    method: str = "manual"
    session_id: str = None

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
        
        if result["success"] and result.get("recognized_students"):
            # Mark attendance for ALL recognized students, not just the best match
            recognized_students = result["recognized_students"]
            attendance_marked_count = 0
            attendance_failed_count = 0
            marked_students = []
            
            # Generate session ID and timestamp for this face recognition session
            session_id = str(uuid.uuid4())
            session_timestamp = datetime.now().isoformat()
            
            print(f"🎯 Processing {len(recognized_students)} recognized students")
            
            for student_data in recognized_students:
                student_id = student_data["student_id"]
                confidence_score = student_data["similarity_score"]
                
                print(f"📝 Processing student: {student_id}")
                
                # Check if student is enrolled in this subject
                is_enrolled = await db.is_student_enrolled(subject_id, student_id)
                print(f"📝 Student {student_id} enrolled: {is_enrolled}")
                
                if is_enrolled:
                    # Mark attendance for this student with session tracking
                    attendance_data = {
                        "subject_id": subject_id,
                        "student_id": student_id,
                        "date": str(date.today()),
                        "status": "present",
                        "marked_by": current_user.user_id,
                        "confidence_score": confidence_score,
                        "method": "face_recognition",
                        "session_id": session_id,
                        "session_timestamp": session_timestamp
                    }
                    
                    print(f"📊 Marking attendance for student: {student_id}")
                    success = await db.mark_attendance(attendance_data)
                    print(f"✅ Attendance result for {student_id}: {success}")
                    
                    if success:
                        attendance_marked_count += 1
                        marked_students.append(student_id)
                    else:
                        attendance_failed_count += 1
                else:
                    print(f"⚠️ Student {student_id} not enrolled in this subject")
            
            # Return results based on how many students were marked
            if attendance_marked_count > 0:
                return {
                    **result,  # Include all face detection results
                    "message": f"Attendance marked successfully for {attendance_marked_count} student(s)!",
                    "attendance_marked": True,
                    "marked_students": marked_students,
                    "marked_count": attendance_marked_count
                }
            else:
                return {
                    **result,  # Include all face detection results
                    "success": False,
                    "message": "No students were enrolled in this subject or attendance marking failed."
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
        
        # Get optimized dashboard data in one call
        dashboard_data = await db.get_attendance_dashboard_data(subject_id)
        
        records = dashboard_data["records"]
        students = dashboard_data["students"]
        total_students = len(students)
        
        # Group records by session for better statistics
        sessions = {}
        for record in records:
            session_key = record.get('session_id') or f"{record.get('date')}_{record.get('session_timestamp', '')}"
            if session_key not in sessions:
                sessions[session_key] = {
                    'session_id': record.get('session_id'),
                    'date': record.get('date'),
                    'session_timestamp': record.get('session_timestamp'),
                    'records': []
                }
            sessions[session_key]['records'].append(record)
        
        # Calculate session-based statistics
        total_sessions = len(sessions)
        present_count = len([r for r in records if r.get('status') == 'present'])
        absent_count = len([r for r in records if r.get('status') == 'absent'])
        late_count = len([r for r in records if r.get('status') == 'late'])
        
        # Calculate attendance rate
        total_attendance_records = len(records)
        attendance_rate = (present_count + late_count) / total_attendance_records * 100 if total_attendance_records > 0 else 0
        
        # Group sessions by date for timeline view
        sessions_by_date = {}
        for session_key, session_data in sessions.items():
            date = session_data['date']
            if date not in sessions_by_date:
                sessions_by_date[date] = []
            sessions_by_date[date].append({
                'session_id': session_data['session_id'],
                'session_timestamp': session_data['session_timestamp'],
                'total_records': len(session_data['records']),
                'present_count': len([r for r in session_data['records'] if r.get('status') == 'present']),
                'absent_count': len([r for r in session_data['records'] if r.get('status') == 'absent']),
                'late_count': len([r for r in session_data['records'] if r.get('status') == 'late'])
            })
        
        return {
            "subject": subject,
            "total_students": total_students,
            "total_sessions": total_sessions,
            "total_attendance_records": total_attendance_records,
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count,
            "attendance_rate": round(attendance_rate, 2),
            "sessions_by_date": dict(sorted(sessions_by_date.items(), reverse=True)),  # Most recent first
            "attendance_records": records,
            "enrolled_students": students
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get attendance dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance dashboard")

@router.get("/{subject_id}/sessions")
async def get_attendance_sessions(
    subject_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get attendance records grouped by sessions"""
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
        
        # Get attendance sessions
        sessions = await db.get_attendance_sessions(subject_id)
        
        return {
            "subject_id": subject_id,
            "sessions": sessions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get attendance sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance sessions")

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
        
        # Mark attendance with session tracking
        attendance_data = {
            "subject_id": attendance.subject_id,
            "student_id": attendance.student_id,
            "date": str(attendance.date),
            "status": attendance.status,
            "marked_by": current_user.user_id,
            "method": "manual"
        }
        
        # Add session tracking if provided
        if attendance.session_id:
            attendance_data["session_id"] = attendance.session_id
        if attendance.session_timestamp:
            attendance_data["session_timestamp"] = attendance.session_timestamp
        
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

@router.post("/bulk")
async def mark_bulk_attendance(
    bulk_attendance: BulkAttendanceRecord,
    current_user: UserResponse = Depends(get_current_user)
):
    """Mark attendance for multiple students in a single session (Teachers only)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
        
        # Verify teacher owns this subject
        subject = await db.get_subject_by_id(bulk_attendance.subject_id)
        if not subject or subject["teacher_id"] != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate session ID if not provided
        session_id = bulk_attendance.session_id or str(uuid.uuid4())
        session_timestamp = datetime.now().isoformat()
        
        marked_count = 0
        failed_count = 0
        results = []
        
        for student_data in bulk_attendance.students:
            student_id = student_data.get("student_id")
            status = student_data.get("status", "present")
            
            if not student_id:
                failed_count += 1
                results.append({"student_id": None, "success": False, "error": "Missing student_id"})
                continue
            
            # Check if student is enrolled
            is_enrolled = await db.is_student_enrolled(bulk_attendance.subject_id, student_id)
            if not is_enrolled:
                failed_count += 1
                results.append({"student_id": student_id, "success": False, "error": "Student not enrolled"})
                continue
            
            # Mark attendance for this student
            attendance_data = {
                "subject_id": bulk_attendance.subject_id,
                "student_id": student_id,
                "date": str(bulk_attendance.date),
                "status": status,
                "marked_by": current_user.user_id,
                "method": bulk_attendance.method,
                "session_id": session_id,
                "session_timestamp": session_timestamp
            }
            
            success = await db.mark_attendance(attendance_data)
            if success:
                marked_count += 1
                results.append({"student_id": student_id, "success": True})
            else:
                failed_count += 1
                results.append({"student_id": student_id, "success": False, "error": "Database error"})
        
        return {
            "message": f"Bulk attendance completed: {marked_count} successful, {failed_count} failed",
            "session_id": session_id,
            "marked_count": marked_count,
            "failed_count": failed_count,
            "results": results
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark bulk attendance")