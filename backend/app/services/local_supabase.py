import logging
from typing import List, Dict, Any, Optional
from datetime import date
import httpx
from app.config import settings

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
                response = await client.get(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={
                        "teacher_id": f"eq.{teacher_id}",
                        "select": "*,teacher:users!teacher_id(name)"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    # Add teacher name and student count
                    for subject in subjects:
                        subject["teacher_name"] = subject.get("teacher", {}).get("name", "")
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
                        "select": "*,subject:subjects(*,teacher:users!teacher_id(name))"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    subjects = []
                    for enrollment in enrollments:
                        subject = enrollment["subject"]
                        subject["teacher_name"] = subject.get("teacher", {}).get("name", "")
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
                        "select": "*,teacher:users!teacher_id(name)"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    if subjects:
                        subject = subjects[0]
                        subject["teacher_name"] = subject.get("teacher", {}).get("name", "")
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
                        "select": "*,teacher:users!teacher_id(name)"
                    }
                )
                if response.status_code == 200:
                    subjects = response.json()
                    if subjects:
                        subject = subjects[0]
                        # Add teacher_name field
                        subject["teacher_name"] = subject.get("teacher", {}).get("name", "Unknown Teacher")
                        return subject
                    return None
                return None
        except Exception as e:
            logger.error(f"Error getting subject by ID: {e}")
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
                        "select": "*,student:users!student_id(user_id,name,email,is_face_registered)"
                    }
                )
                if response.status_code == 200:
                    enrollments = response.json()
                    return [enrollment["student"] for enrollment in enrollments]
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
                        "select": "*,student:users!student_id(name),subject:subjects!subject_id(name)"
                    }
                )
                if response.status_code == 200:
                    records = response.json()
                    for record in records:
                        record["student_name"] = record.get("student", {}).get("name", "")
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
                        "select": "*,student:users!student_id(name),subject:subjects!subject_id(name)"
                    }
                )
                if response.status_code == 200:
                    records = response.json()
                    for record in records:
                        record["student_name"] = record.get("student", {}).get("name", "")
                        record["subject_name"] = record.get("subject", {}).get("name", "")
                    return records
                return []
        except Exception as e:
            logger.error(f"Error getting attendance by date: {e}")
            return []