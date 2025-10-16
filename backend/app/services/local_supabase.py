import logging
from typing import List, Dict, Any, Optional
from datetime import date
import httpx
from app.settings import settings

logger = logging.getLogger(__name__)

class LocalSupabase:
    """Supabase adapter using direct HTTP requests (works with both local and cloud)"""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        logger.info(f"Supabase initialized with URL: {self.base_url}")
        logger.info(f"Using API key: {self.api_key[:20]}...")
    
    async def get_all_students(self) -> List[Dict[str, Any]]:
        """Get all students from local Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers
                )
                if response.status_code == 200:
                    students = response.json()
                    logger.info(f"Retrieved {len(students)} students from local Supabase")
                    return students
                else:
                    logger.error(f"Failed to get students: {response.status_code} - {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Error getting students from local Supabase: {e}")
            return []
    
    async def insert_student(self, student_data: Dict[str, Any]) -> bool:
        """Insert student into local Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    json=student_data
                )
                if response.status_code in [200, 201]:
                    logger.info(f"Student {student_data.get('student_id')} inserted successfully into local Supabase")
                    return True
                else:
                    logger.error(f"Failed to insert student: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error inserting student into local Supabase: {e}")
            return False
    
    async def student_exists(self, student_id: str) -> bool:
        """Check if student exists in local Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    params={"student_id": f"eq.{student_id}"}
                )
                if response.status_code == 200:
                    students = response.json()
                    exists = len(students) > 0
                    logger.info(f"Student {student_id} exists check: {exists}")
                    return exists
                else:
                    logger.error(f"Failed to check student existence: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error checking student existence in local Supabase: {e}")
            return False
    
    async def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get a student by ID from local Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    params={"student_id": f"eq.{student_id}"}
                )
                if response.status_code == 200:
                    students = response.json()
                    if students:
                        logger.info(f"Retrieved student {student_id} from local Supabase")
                        return students[0]
                    else:
                        logger.info(f"Student {student_id} not found in local Supabase")
                        return None
                else:
                    logger.error(f"Failed to get student: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Error getting student from local Supabase: {e}")
            return None
    
    async def get_student_by_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_student method"""
        return await self.get_student(student_id)
    
    async def get_student_id_by_user_id(self, user_id: str) -> Optional[str]:
        """Get student_id from user_id by looking up the user's email in students table"""
        try:
            logger.info(f"🔍 Getting student_id for user_id: {user_id}")
            # First get the user's email from users table
            user_data = await self.get_user_by_id(user_id)
            if not user_data:
                logger.warning(f"❌ No user data found for user_id: {user_id}")
                return None
            
            user_email = user_data.get("email")
            if not user_email:
                logger.warning(f"❌ No email found for user_id: {user_id}")
                return None
            
            logger.info(f"📧 Looking up student with email: {user_email}")
            
            # Then find the student with matching email
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    params={"email": f"eq.{user_email}"}
                )
                if response.status_code == 200:
                    students = response.json()
                    logger.info(f"📝 Found {len(students)} students with email {user_email}")
                    if students:
                        student_id = students[0].get("student_id")
                        logger.info(f"✅ Found student_id: {student_id}")
                        return student_id
                else:
                    logger.error(f"❌ Failed to query students: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error getting student_id for user_id {user_id}: {e}")
            return None
    
    async def update_student_face_encoding(self, student_id: str, has_face_encoding: bool) -> bool:
        """Update student's face encoding status"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    params={"student_id": f"eq.{student_id}"},
                    json={"face_encoding_id": student_id if has_face_encoding else None}
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Updated face encoding status for student {student_id}")
                    return True
                else:
                    logger.error(f"Failed to update face encoding: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error updating face encoding for student {student_id}: {e}")
            return False
    
    async def delete_student(self, student_id: str) -> bool:
        """Delete student from local Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/rest/v1/students",
                    headers=self.headers,
                    params={"student_id": f"eq.{student_id}"}
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Deleted student {student_id} from local Supabase")
                    return True
                else:
                    logger.error(f"Failed to delete student: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error deleting student {student_id}: {e}")
            return False    

    # User management methods
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"email": f"eq.{email}"}
                )
                if response.status_code == 200:
                    users = response.json()
                    return users[0] if users else None
                return None
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"}
                )
                if response.status_code == 200:
                    users = response.json()
                    return users[0] if users else None
                return None
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    async def create_user(self, user_data: Dict[str, Any]) -> bool:
        """Create a new user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    json=user_data
                )
                return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return False
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Google ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"google_id": f"eq.{google_id}"}
                )
                if response.status_code == 200:
                    users = response.json()
                    return users[0] if users else None
                return None
        except Exception as e:
            logger.error(f"Error getting user by Google ID: {e}")
            return None
    
    async def get_user_by_auth_id(self, auth_user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by Supabase auth user ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"auth_user_id": f"eq.{auth_user_id}"}
                )
                if response.status_code == 200:
                    users = response.json()
                    return users[0] if users else None
                return None
        except Exception as e:
            logger.error(f"Error getting user by auth ID: {e}")
            return None
    
    async def update_user_face_status(self, user_id: str, is_registered: bool) -> bool:
        """Update user's face registration status"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json={"is_face_registered": is_registered}
                )
                return response.status_code in [200, 204]
        except Exception as e:
            logger.error(f"Error updating face status: {e}")
            return False
    
    # Subject management methods
    async def create_subject(self, subject_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    json=subject_data
                )
                if response.status_code in [200, 201]:
                    return response.json()[0] if response.json() else None
                return None
        except Exception as e:
            logger.error(f"Error creating subject: {e}")
            return None
    
    async def get_teacher_subjects(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get subjects created by a teacher"""
        try:
            async with httpx.AsyncClient() as client:
                # First get the subjects
                response = await client.get(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={
                        "teacher_id": f"eq.{teacher_id}",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    # Get teacher name from users table and add student count
                    for subject in subjects:
                        # Get teacher name by looking up the teacher_id in users table
                        teacher_response = await client.get(
                            f"{self.base_url}/rest/v1/users",
                            headers=self.headers,
                            params={"auth_user_id": f"eq.{subject['teacher_id']}"}
                        )
                        if teacher_response.status_code == 200:
                            teacher_data = teacher_response.json()
                            subject["teacher_name"] = teacher_data[0]["name"] if teacher_data else "Unknown Teacher"
                        else:
                            subject["teacher_name"] = "Unknown Teacher"
                        
                        subject["student_count"] = await self.get_subject_student_count(subject["subject_id"])
                    return subjects
                return []
        except Exception as e:
            logger.error(f"Error getting teacher subjects: {e}")
            return []
    
    async def get_student_subjects(self, student_id: str) -> List[Dict[str, Any]]:
        """Get subjects a student is enrolled in"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "student_id": f"eq.{student_id}",
                        "is_active": "eq.true",
                        "select": "*,subject:subjects(*)"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    subjects = []
                    for enrollment in enrollments:
                        subject = enrollment["subject"]
                        
                        # Get teacher name by looking up the teacher_id in users table
                        teacher_response = await client.get(
                            f"{self.base_url}/rest/v1/users",
                            headers=self.headers,
                            params={"auth_user_id": f"eq.{subject['teacher_id']}"}
                        )
                        if teacher_response.status_code == 200:
                            teacher_data = teacher_response.json()
                            subject["teacher_name"] = teacher_data[0]["name"] if teacher_data else "Unknown Teacher"
                        else:
                            subject["teacher_name"] = "Unknown Teacher"
                        
                        subject["student_count"] = await self.get_subject_student_count(subject["subject_id"])
                        subjects.append(subject)
                    return subjects
                return []
        except Exception as e:
            logger.error(f"Error getting student subjects: {e}")
            return []
    
    async def get_subject_by_invite_code(self, invite_code: str) -> Optional[Dict[str, Any]]:
        """Get subject by invite code"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={
                        "invite_code": f"eq.{invite_code}",
                        "is_active": "eq.true",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    if subjects:
                        subject = subjects[0]
                        # Get teacher name by looking up the teacher_id in users table
                        teacher_response = await client.get(
                            f"{self.base_url}/rest/v1/users",
                            headers=self.headers,
                            params={"auth_user_id": f"eq.{subject['teacher_id']}"}
                        )
                        if teacher_response.status_code == 200:
                            teacher_data = teacher_response.json()
                            subject["teacher_name"] = teacher_data[0]["name"] if teacher_data else "Unknown Teacher"
                        else:
                            subject["teacher_name"] = "Unknown Teacher"
                        return subject
                return None
        except Exception as e:
            logger.error(f"Error getting subject by invite code: {e}")
            return None
    
    async def get_subject_by_id(self, subject_id: str) -> Optional[Dict[str, Any]]:
        """Get subject by ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    if subjects:
                        subject = subjects[0]
                        # Get teacher name by looking up the teacher_id in users table
                        teacher_response = await client.get(
                            f"{self.base_url}/rest/v1/users",
                            headers=self.headers,
                            params={"auth_user_id": f"eq.{subject['teacher_id']}"}
                        )
                        if teacher_response.status_code == 200:
                            teacher_data = teacher_response.json()
                            subject["teacher_name"] = teacher_data[0]["name"] if teacher_data else "Unknown Teacher"
                        else:
                            subject["teacher_name"] = "Unknown Teacher"
                        return subject
                    return None
                return None
        except Exception as e:
            logger.error(f"Error getting subject by ID: {e}")
            return None
    
    async def get_subject_by_code(self, subject_code: str) -> Optional[Dict[str, Any]]:
        """Get subject by subject code"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={
                        "subject_code": f"eq.{subject_code}",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    return subjects[0] if subjects else None
                return None
        except Exception as e:
            logger.error(f"Error getting subject by code: {e}")
            return None
    
    async def is_student_enrolled(self, subject_id: str, student_id: str) -> bool:
        """Check if student is enrolled in subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "student_id": f"eq.{student_id}",
                        "is_active": "eq.true"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    return len(enrollments) > 0
                return False
        except Exception as e:
            logger.error(f"Error checking enrollment: {e}")
            return False
    
    async def enroll_student(self, subject_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        """Enroll student in subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    json={
                        "subject_id": subject_id,
                        "student_id": student_id,
                        "is_active": True
                    }
                )
                if response.status_code in [200, 201]:
                    return response.json()[0] if response.json() else None
                return None
        except Exception as e:
            logger.error(f"Error enrolling student: {e}")
            return None
    
    async def get_subject_students(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get students enrolled in a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "is_active": "eq.true",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    # Since we can't join with users table, return enrollment data with student_id
                    return [{"user_id": enrollment["student_id"], "name": "", "email": "", "is_face_registered": False} for enrollment in enrollments]
                return []
        except Exception as e:
            logger.error(f"Error getting subject students: {e}")
            return []
    
    async def get_subject_student_count(self, subject_id: str) -> int:
        """Get count of students in a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "is_active": "eq.true"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    count = len(enrollments)
                    print(f"📊 Subject {subject_id} has {count} students enrolled")
                    return count
                return 0
        except Exception as e:
            logger.error(f"Error getting student count: {e}")
            return 0
    
    async def update_subject(self, subject_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={"subject_id": f"eq.{subject_id}"},
                    json=update_data
                )
                
                if response.status_code == 200:
                    updated_subjects = response.json()
                    if updated_subjects:
                        # Get the updated subject with teacher name
                        updated_subject = updated_subjects[0]
                        
                        # Fetch teacher name
                        teacher_response = await client.get(
                            f"{self.base_url}/rest/v1/users",
                            headers=self.headers,
                            params={"auth_user_id": f"eq.{updated_subject['teacher_id']}"}
                        )
                        
                        if teacher_response.status_code == 200:
                            teachers = teacher_response.json()
                            if teachers:
                                updated_subject["teacher_name"] = teachers[0]["name"]
                        
                        # Get student count
                        updated_subject["student_count"] = await self.get_subject_student_count(subject_id)
                        
                        logger.info(f"Updated subject: {updated_subject['name']}")
                        return updated_subject
                else:
                    logger.error(f"Failed to update subject: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Error updating subject: {e}")
            return None

    async def delete_subject(self, subject_id: str) -> bool:
        """Delete a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={"subject_id": f"eq.{subject_id}"}
                )
                return response.status_code in [200, 204]
        except Exception as e:
            logger.error(f"Error deleting subject: {e}")
            return False    

    # Attendance methods
    async def mark_attendance(self, attendance_data: Dict[str, Any]) -> bool:
        """Mark attendance for a student"""
        try:
            # DEBUG: Log what we're trying to save
            print(f"🔍 DATABASE SAVE ATTEMPT:")
            print(f"   - Student: {attendance_data.get('student_id')}")
            print(f"   - Status: {attendance_data.get('status')}")
            print(f"   - Date: {attendance_data.get('date')}")
            print(f"   - Session: {attendance_data.get('session_id')}")
            print(f"   - Full data: {attendance_data}")
            
            async with httpx.AsyncClient() as client:
                # Always try to insert new record (allow multiple per day)
                response = await client.post(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    json=attendance_data
                )
                
                print(f"📊 Attendance API Response: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    print(f"✅ Attendance marked successfully in database")
                    return True
                elif response.status_code == 409:  # Duplicate key error
                    print(f"🔄 Duplicate found - this means attendance already exists for today")
                    print(f"✅ Treating as successful (attendance already recorded)")
                    return True  # Treat as success since attendance is already recorded
                else:
                    print(f"❌ Attendance API Error: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error marking attendance: {e}")
            print(f"💥 Exception marking attendance: {e}")
            return False
    
    async def get_attendance_by_subject(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get all attendance records for a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*,subject:subjects!subject_id(name)"
                    }
                )
                if response.status_code == 200:
                    records = response.json()
                    for record in records:
                        record["student_name"] = ""  # Can't get from auth.users join
                        record["subject_name"] = record.get("subject", {}).get("name", "")
                    return records
                return []
        except Exception as e:
            logger.error(f"Error getting attendance by subject: {e}")
            return []
    
    async def get_attendance_by_date(self, subject_id: str, attendance_date: date) -> List[Dict[str, Any]]:
        """Get attendance records for a subject on a specific date"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "date": f"eq.{attendance_date}",
                        "select": "*,subject:subjects!subject_id(name)"
                    }
                )
                if response.status_code == 200:
                    records = response.json()
                    for record in records:
                        record["student_name"] = ""  # Can't get from auth.users join
                        record["subject_name"] = record.get("subject", {}).get("name", "")
                    return records
                return []
        except Exception as e:
            logger.error(f"Error getting attendance by date: {e}")
            return []
    
    async def get_attendance_sessions(self, subject_id: str, attendance_date: date = None) -> List[Dict[str, Any]]:
        """Get unique attendance sessions for a subject on a specific date"""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "subject_id": f"eq.{subject_id}",
                    "select": "session_id,session_name,session_time,date"
                }
                if attendance_date:
                    params["date"] = f"eq.{attendance_date}"
                
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params=params
                )
                if response.status_code == 200:
                    records = response.json()
                    # Get unique sessions
                    sessions = {}
                    for record in records:
                        session_key = f"{record['date']}_{record['session_id']}"
                        if session_key not in sessions:
                            sessions[session_key] = {
                                "session_id": record["session_id"],
                                "session_name": record["session_name"],
                                "session_time": record["session_time"],
                                "date": record["date"],
                                "student_count": 0
                            }
                        sessions[session_key]["student_count"] += 1
                    
                    return list(sessions.values())
                return []
        except Exception as e:
            logger.error(f"Error getting attendance sessions: {e}")
            return []
    
    async def get_attendance_by_session(self, subject_id: str, session_id: str, attendance_date: date = None) -> List[Dict[str, Any]]:
        """Get attendance records for a specific session"""
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "subject_id": f"eq.{subject_id}",
                    "session_id": f"eq.{session_id}",
                    "select": "*,subject:subjects!subject_id(name)"
                }
                if attendance_date:
                    params["date"] = f"eq.{attendance_date}"
                
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params=params
                )
                if response.status_code == 200:
                    records = response.json()
                    for record in records:
                        record["student_name"] = ""  # Can't get from auth.users join
                        record["subject_name"] = record.get("subject", {}).get("name", "")
                    return records
                return []
        except Exception as e:
            logger.error(f"Error getting attendance by session: {e}")
            return []
    
    # Additional methods needed for student sessions API
    async def get_sessions_by_subject_id(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get all sessions for a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get sessions: {response.status_code} - {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Error getting sessions by subject ID: {e}")
            return []
    
    async def get_teacher_by_id(self, teacher_id: str) -> Optional[Dict[str, Any]]:
        """Get teacher information by ID"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"auth_user_id": f"eq.{teacher_id}"}
                )
                if response.status_code == 200:
                    users = response.json()
                    return users[0] if users else None
                return None
        except Exception as e:
            logger.error(f"Error getting teacher by ID: {e}")
            return None
    
    async def get_student_attendance_status(self, student_id: str, session_id: str) -> str:
        """Get attendance status for a student in a specific session"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params={
                        "student_id": f"eq.{student_id}",
                        "session_id": f"eq.{session_id}"
                    }
                )
                if response.status_code == 200:
                    records = response.json()
                    if records:
                        # Return the most recent attendance status
                        latest_record = max(records, key=lambda x: x.get('created_at', ''))
                        return latest_record.get('status', 'pending')
                    else:
                        return 'pending'  # No attendance record found
                else:
                    logger.error(f"Failed to get attendance status: {response.status_code} - {response.text}")
                    return 'pending'
        except Exception as e:
            logger.error(f"Error getting student attendance status: {e}")
            return 'pending'
    
    async def get_assignments_by_session_id(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all assignments for a session"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    params={
                        "session_id": f"eq.{session_id}",
                        "select": "*"
                    }
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get assignments: {response.status_code} - {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Error getting assignments by session ID: {e}")
            return []