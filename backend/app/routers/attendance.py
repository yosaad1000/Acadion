from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import date
from pydantic import BaseModel
from app.models.user import UserResponse
from app.models.notification import NotificationCreate, NotificationType
from app.middleware.supabase_auth import get_current_user_supabase
from app.services.local_supabase import LocalSupabase
from app.services.notification_service import NotificationService
from app.services.face_recognition_client import face_recognition_client
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

class AttendanceRecord(BaseModel):
    student_id: str
    subject_id: str
    date: date
    status: str
    confidence_score: float = None
    method: str = "manual"
    session_id: str = "default"
    session_name: str = "Default Session"
    session_time: str = None

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
    session_id: str = "default"
    session_name: str = "Default Session"
    session_time: str = None
    created_at: str

@router.post("/mark-face")
async def mark_attendance_by_face(
    subject_id: str,
    file: UploadFile = File(...),
    session_id: str = "default",
    session_name: str = "Default Session",
    session_time: str = None,
    current_user = Depends(get_current_user_supabase)
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
        
        # Recognize student using face recognition microservice (filtered by subject)
        result_response = await face_recognition_client.process_image(image_data, subject_id)
        result = result_response.dict()
        
        print(f"🔍 Face recognition result: success={result.get('success')}")
        print(f"🔍 Recognized students count: {len(result.get('recognized_students', []))}")
        
        if result["success"] and result.get("recognized_students"):
            # Only identify students, don't save attendance yet
            recognized_students = result["recognized_students"]
            enrolled_students = []
            
            print(f"🎯 Processing {len(recognized_students)} recognized students")
            print(f"🔍 Raw recognized_students from face service:")
            for i, student in enumerate(recognized_students):
                print(f"   Student {i+1}: {student.get('student_id')} - Score: {student.get('similarity_score')}")
            
            for student_data in recognized_students:
                student_id = student_data["student_id"]
                confidence_score = student_data["similarity_score"]
                
                print(f"📝 Processing student: {student_id}")
                
                # Check if student is enrolled in this subject
                is_enrolled = await db.is_student_enrolled(subject_id, student_id)
                print(f"📝 Student {student_id} enrolled: {is_enrolled}")
                
                if is_enrolled:
                    # Get student details - try users table instead of students
                    try:
                        student = await db.get_user_by_id(student_id)
                        print(f"📋 Found student in users table: {student.get('name') if student else 'None'}")
                    except Exception as e:
                        print(f"❌ Error getting student from users table: {e}")
                        student = {"name": "Unknown Student"}
                    
                    # Keep the original format from face recognition service
                    enrolled_student = {
                        "face_index": student_data.get("face_index", 1),
                        "student_id": student_id,
                        "similarity_score": confidence_score,
                        "location": student_data.get("location", []),
                        "recognized": True,
                        # Add additional fields for attendance
                        "student_name": student.get("name", "Unknown") if student else "Unknown",
                        "suggested_status": "present"
                    }
                    enrolled_students.append(enrolled_student)
                    print(f"✅ Student {student_id} identified and enrolled")
                else:
                    print(f"⚠️ Student {student_id} not enrolled in this subject")
            
            # Return results without saving to database
            if enrolled_students:
                response_data = {
                    **result,  # Include all face detection results
                    "message": f"Identified {len(enrolled_students)} enrolled student(s). Please review and save attendance.",
                    "attendance_marked": False,  # Not saved yet
                    "identified_students": enrolled_students,
                    "recognized_students": enrolled_students,  # Keep backward compatibility
                    "identified_count": len(enrolled_students),
                    "requires_save": True  # Frontend should show save button
                }
                
                # DEBUG: Log the complete response
                print(f"🔍 COMPLETE API RESPONSE BEING SENT TO FRONTEND:")
                print(f"   - success: {response_data.get('success')}")
                print(f"   - message: {response_data.get('message')}")
                print(f"   - attendance_marked: {response_data.get('attendance_marked')}")
                print(f"   - identified_count: {response_data.get('identified_count')}")
                print(f"   - requires_save: {response_data.get('requires_save')}")
                print(f"   - recognized_students count: {len(response_data.get('recognized_students', []))}")
                
                print(f"🎯 FRONTEND SHOULD RECEIVE THESE {len(enrolled_students)} STUDENTS:")
                for i, student in enumerate(enrolled_students):
                    print(f"   - Student {i+1}:")
                    print(f"     * student_id: {student.get('student_id')}")
                    print(f"     * student_name: {student.get('student_name')}")
                    print(f"     * similarity_score: {student.get('similarity_score')}")
                    print(f"     * suggested_status: {student.get('suggested_status')}")
                    print(f"     * recognized: {student.get('recognized')}")
                    print(f"     * face_index: {student.get('face_index')}")
                
                print(f"🚨 FRONTEND DEBUGGING:")
                print(f"   Frontend console shows both students received correctly.")
                print(f"   But manual attendance UI only updates 1 student.")
                print(f"   ISSUE: Frontend code that updates manual attendance is broken!")
                print(f"   CHECK: Frontend function that processes 'recognized_students' array")
                print(f"   FIX: Ensure frontend loops through ALL students and updates ALL statuses")
                
                return response_data
            else:
                return {
                    **result,  # Include all face detection results
                    "success": False,
                    "message": "No enrolled students were identified in the image."
                }
        else:
            # Return all the detailed face detection results even on failure
            print(f"❌ Face recognition failed or no students recognized")
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
    current_user = Depends(get_current_user_supabase)
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
    current_user = Depends(get_current_user_supabase)
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

@router.post("/save-batch")
async def save_batch_attendance(
    attendance_records: List[AttendanceRecord],
    current_user = Depends(get_current_user_supabase)
):
    """Save multiple attendance records at once (for face recognition results)"""
    try:
        if current_user.user_type != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
        
        saved_count = 0
        failed_count = 0
        results = []
        
        for attendance in attendance_records:
            try:
                # Verify teacher owns this subject
                subject = await db.get_subject_by_id(attendance.subject_id)
                if not subject or subject["teacher_id"] != current_user.user_id:
                    results.append({
                        "student_id": attendance.student_id,
                        "success": False,
                        "error": "Access denied"
                    })
                    failed_count += 1
                    continue
                
                # Check if student is enrolled
                is_enrolled = await db.is_student_enrolled(attendance.subject_id, attendance.student_id)
                if not is_enrolled:
                    results.append({
                        "student_id": attendance.student_id,
                        "success": False,
                        "error": "Student not enrolled in this subject"
                    })
                    failed_count += 1
                    continue
                
                # Mark attendance
                attendance_data = {
                    "subject_id": attendance.subject_id,
                    "student_id": attendance.student_id,
                    "date": str(attendance.date),
                    "status": attendance.status,
                    "marked_by": current_user.user_id,
                    "confidence_score": attendance.confidence_score,
                    "method": attendance.method,
                    "session_id": attendance.session_id,
                    "session_name": attendance.session_name,
                    "session_time": attendance.session_time
                }
                
                success = await db.mark_attendance(attendance_data)
                if success:
                    results.append({
                        "student_id": attendance.student_id,
                        "success": True
                    })
                    saved_count += 1
                    
                    # Create notification for successful attendance marking
                    if notification_service:
                        try:
                            # Get student details for notification
                            student = await db.get_user_by_id(attendance.student_id)
                            student_name = student.get("name", "Unknown Student") if student else "Unknown Student"
                            
                            # Notification for the student
                            student_notification = NotificationCreate(
                                recipient_id=attendance.student_id,
                                sender_id=current_user.user_id,
                                type=NotificationType.ATTENDANCE_MARKED,
                                title="Attendance Marked",
                                message=f"Your attendance has been marked as {attendance.status} for {subject['name']}",
                                data={
                                    "subject_name": subject["name"],
                                    "subject_code": subject.get("subject_code", ""),
                                    "session_name": attendance.session_name,
                                    "session_time": attendance.session_time,
                                    "status": attendance.status,
                                    "date": str(attendance.date),
                                    "method": attendance.method,
                                    "confidence_score": attendance.confidence_score
                                }
                            )
                            await notification_service.create_notification(student_notification)
                            
                            logger.info(f"Created attendance notification for student {attendance.student_id}")
                            
                        except Exception as e:
                            logger.error(f"Failed to create attendance notification for student {attendance.student_id}: {e}")
                            # Don't fail the attendance marking if notification creation fails
                        
                else:
                    results.append({
                        "student_id": attendance.student_id,
                        "success": False,
                        "error": "Database error"
                    })
                    failed_count += 1
                    
                    # Create notification for failed attendance marking
                    if notification_service:
                        try:
                            failed_attendance_notification = NotificationCreate(
                                recipient_id=attendance.student_id,
                                sender_id=current_user.user_id,
                                type=NotificationType.ATTENDANCE_FAILED,
                                title="Attendance Marking Failed",
                                message=f"Failed to mark attendance for {subject['name']}",
                                data={
                                    "reason": "Database error occurred while marking attendance",
                                    "subject_name": subject["name"],
                                    "subject_code": subject.get("subject_code", ""),
                                    "session_name": attendance.session_name,
                                    "date": str(attendance.date)
                                }
                            )
                            await notification_service.create_notification(failed_attendance_notification)
                            
                        except Exception as e:
                            logger.error(f"Failed to create attendance failure notification: {e}")
                    
            except Exception as e:
                results.append({
                    "student_id": attendance.student_id,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1
        
        # Create summary notification for the teacher
        if saved_count > 0 and notification_service:
            try:
                # Get subject details for the first successful attendance record
                first_successful = next((r for r in attendance_records if any(res["success"] for res in results if res["student_id"] == r.student_id)), None)
                if first_successful:
                    subject = await db.get_subject_by_id(first_successful.subject_id)
                    if subject:
                        teacher_notification = NotificationCreate(
                            recipient_id=current_user.user_id,
                            type=NotificationType.ATTENDANCE_MARKED,
                            title="Attendance Processing Complete",
                            message=f"Processed attendance for {saved_count} students in {subject['name']}",
                            data={
                                "subject_name": subject["name"],
                                "subject_code": subject.get("subject_code", ""),
                                "session_name": first_successful.session_name,
                                "session_time": first_successful.session_time,
                                "total_students": len(attendance_records),
                                "present_count": saved_count,
                                "failed_count": failed_count,
                                "date": str(first_successful.date),
                                "method": first_successful.method
                            }
                        )
                        await notification_service.create_notification(teacher_notification)
                        
                        logger.info(f"Created attendance summary notification for teacher {current_user.user_id}")
                        
            except Exception as e:
                logger.error(f"Failed to create teacher attendance summary notification: {e}")
        
        return {
            "message": f"Saved {saved_count} attendance records, {failed_count} failed",
            "saved_count": saved_count,
            "failed_count": failed_count,
            "results": results
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save attendance")

@router.post("/manual")
async def mark_manual_attendance(
    attendance: AttendanceRecord,
    current_user = Depends(get_current_user_supabase)
):
    """Manually mark attendance (Teachers only)"""
    try:
        # DEBUG: Log all attendance requests
        print(f"🔍 MANUAL ATTENDANCE REQUEST:")
        print(f"   - Student ID: {attendance.student_id}")
        print(f"   - Subject ID: {attendance.subject_id}")
        print(f"   - Status: {attendance.status}")
        print(f"   - Date: {attendance.date}")
        print(f"   - Method: {attendance.method}")
        print(f"   - Session: {attendance.session_id}")
        
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
            "method": "manual",
            "session_id": attendance.session_id,
            "session_name": attendance.session_name,
            "session_time": attendance.session_time
        }
        
        success = await db.mark_attendance(attendance_data)
        if success:
            # Create notification for successful manual attendance marking
            if notification_service:
                try:
                    # Get student details for notification
                    student = await db.get_user_by_id(attendance.student_id)
                    student_name = student.get("name", "Unknown Student") if student else "Unknown Student"
                    
                    # Notification for the student
                    student_notification = NotificationCreate(
                        recipient_id=attendance.student_id,
                        sender_id=current_user.user_id,
                        type=NotificationType.ATTENDANCE_MARKED,
                        title="Attendance Marked",
                        message=f"Your attendance has been manually marked as {attendance.status} for {subject['name']}",
                        data={
                            "subject_name": subject["name"],
                            "subject_code": subject.get("subject_code", ""),
                            "session_name": attendance.session_name,
                            "session_time": attendance.session_time,
                            "status": attendance.status,
                            "date": str(attendance.date),
                            "method": "manual"
                        }
                    )
                    await notification_service.create_notification(student_notification)
                    
                    logger.info(f"Created manual attendance notification for student {attendance.student_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to create manual attendance notification: {e}")
                    # Don't fail the attendance marking if notification creation fails
            
            return {"message": "Attendance marked successfully"}
        else:
            # Create notification for failed manual attendance marking
            if notification_service:
                try:
                    failed_attendance_notification = NotificationCreate(
                        recipient_id=attendance.student_id,
                        sender_id=current_user.user_id,
                        type=NotificationType.ATTENDANCE_FAILED,
                        title="Attendance Marking Failed",
                        message=f"Failed to manually mark attendance for {subject['name']}",
                        data={
                            "reason": "Database error occurred while marking attendance",
                            "subject_name": subject["name"],
                            "subject_code": subject.get("subject_code", ""),
                            "session_name": attendance.session_name,
                            "date": str(attendance.date),
                            "method": "manual"
                        }
                    )
                    await notification_service.create_notification(failed_attendance_notification)
                    
                except Exception as e:
                    logger.error(f"Failed to create manual attendance failure notification: {e}")
            
            raise HTTPException(status_code=500, detail="Failed to mark attendance")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark attendance")

@router.get("/{subject_id}/sessions")
async def get_attendance_sessions(
    subject_id: str,
    attendance_date: date = None,
    current_user = Depends(get_current_user_supabase)
):
    """Get attendance sessions for a subject on a specific date"""
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
        
        # Get sessions for the date
        sessions = await db.get_attendance_sessions(subject_id, attendance_date)
        return sessions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get attendance sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get attendance sessions")

@router.get("/{subject_id}/sessions/{session_id}")
async def get_session_attendance(
    subject_id: str,
    session_id: str,
    attendance_date: date = None,
    current_user = Depends(get_current_user_supabase)
):
    """Get attendance records for a specific session"""
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
        
        # Get attendance for the session
        records = await db.get_attendance_by_session(subject_id, session_id, attendance_date)
        return records
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get session attendance error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session attendance")
