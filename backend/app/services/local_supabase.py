import logging
from typing import List, Dict, Any, Optional
from datetime import date
import httpx
import time
import asyncio
from contextlib import asynccontextmanager
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
        # Enhanced caching system for performance optimization
        self._cache = {}
        self._cache_ttl = {
            'student_count': 300,      # 5 minutes for student counts
            'subject_data': 600,       # 10 minutes for subject data
            'user_data': 900,          # 15 minutes for user data
            'attendance_stats': 180,   # 3 minutes for attendance stats
            'dashboard_data': 120      # 2 minutes for dashboard data
        }
        # Connection pool settings
        self._connection_limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
        self._timeout = httpx.Timeout(30.0, connect=10.0)
        logger.info(f"Supabase initialized with URL: {self.base_url}")
        logger.info(f"Using API key: {self.api_key[:20]}...")
        logger.info("Enhanced caching and connection pooling enabled")
    
    def _get_cache_key(self, prefix: str, *args) -> str:
        """Generate cache key from prefix and arguments"""
        return f"{prefix}:{'_'.join(str(arg) for arg in args)}"
    
    def _get_from_cache(self, key: str, cache_type: str = 'default') -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            ttl = self._cache_ttl.get(cache_type, 300)
            if time.time() - timestamp < ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def _set_cache(self, key: str, value: Any, cache_type: str = 'default') -> None:
        """Set value in cache with timestamp"""
        self._cache[key] = (value, time.time())
        
        # Implement cache size limit to prevent memory issues
        if len(self._cache) > 1000:
            # Remove oldest 20% of cache entries
            sorted_cache = sorted(self._cache.items(), key=lambda x: x[1][1])
            for old_key, _ in sorted_cache[:200]:
                del self._cache[old_key]
    
    def _invalidate_cache_pattern(self, pattern: str) -> None:
        """Invalidate cache entries matching pattern"""
        keys_to_delete = [key for key in self._cache.keys() if pattern in key]
        for key in keys_to_delete:
            del self._cache[key]
    
    @asynccontextmanager
    async def _performance_monitor(self, operation_name: str, subject_id: str = None):
        """Context manager to monitor query performance"""
        start_time = time.time()
        try:
            yield
        finally:
            execution_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
            
            # Log slow queries
            if execution_time > 100:  # Log queries taking more than 100ms
                logger.warning(f"Slow query detected: {operation_name} took {execution_time}ms")
                
                # Optionally log to database for monitoring
                try:
                    await self._log_performance_metric(operation_name, execution_time, subject_id)
                except Exception as log_error:
                    logger.error(f"Failed to log performance metric: {log_error}")
    
    async def _log_performance_metric(self, operation_name: str, execution_time_ms: int, subject_id: str = None):
        """Log performance metrics to database"""
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                await client.post(
                    f"{self.base_url}/rest/v1/rpc/log_query_performance",
                    headers=self.headers,
                    json={
                        "p_query_type": operation_name,
                        "p_execution_time_ms": execution_time_ms,
                        "p_subject_id": subject_id
                    }
                )
        except Exception as e:
            # Don't let performance logging affect main operations
            logger.debug(f"Performance logging failed: {e}")
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/query_performance_log",
                    headers=self.headers,
                    params={
                        "select": "query_type,avg(execution_time_ms),count(*)",
                        "created_at": f"gte.{(time.time() - 86400):.0f}",  # Last 24 hours
                        "order": "avg.desc"
                    }
                )
                
                if response.status_code == 200:
                    return {"performance_stats": response.json()}
                return {"performance_stats": []}
        except Exception as e:
            logger.error(f"Error getting performance stats: {e}")
            return {"performance_stats": []}
    
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
        """Update user's face registration status with validation"""
        try:
            # Verify user exists
            user = await self.get_user_by_id(user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json={"is_face_registered": is_registered}
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Updated face registration status for user {user_id}: {is_registered}")
                    return True
                else:
                    logger.error(f"Failed to update face status: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.RequestError as e:
            logger.error(f"Network error during face status update: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error updating face status: {e}")
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
        """Get subjects created by a teacher with optimized student count queries"""
        async with self._performance_monitor("get_teacher_subjects"):
            try:
                # Check cache first
                cache_key = self._get_cache_key("teacher_subjects", teacher_id)
                cached_subjects = self._get_from_cache(cache_key, 'subject_data')
                if cached_subjects is not None:
                    return cached_subjects
                
                async with httpx.AsyncClient(
                    limits=self._connection_limits,
                    timeout=self._timeout
                ) as client:
                    # Get subjects with teacher info
                    response = await client.get(
                        f"{self.base_url}/rest/v1/subjects",
                        headers=self.headers,
                        params={
                            "teacher_id": f"eq.{teacher_id}",
                            "is_active": "eq.true",
                            "select": "*,teacher:users!teacher_id(name)",
                            "order": "created_at.desc"
                        }
                    )
                    if response.status_code == 200:
                        subjects = response.json()
                        
                        if not subjects:
                            return []
                        
                        # Get student counts for all subjects in one optimized query
                        subject_ids = [s["subject_id"] for s in subjects]
                        student_counts = await self._get_multiple_subject_student_counts(subject_ids)
                        
                        # Add teacher name and student count
                        for subject in subjects:
                            subject["teacher_name"] = subject.get("teacher", {}).get("name", "")
                            subject["student_count"] = student_counts.get(subject["subject_id"], 0)
                        
                        # Cache the result
                        self._set_cache(cache_key, subjects, 'subject_data')
                        return subjects
                    return []
            except Exception as e:
                logger.error(f"Error getting teacher subjects: {e}")
                return []
    
    async def get_student_subjects(self, student_id: str) -> List[Dict[str, Any]]:
        """Get subjects a student is enrolled in with optimized student count queries"""
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
                    if not enrollments:
                        return []
                    
                    subjects = []
                    subject_ids = []
                    
                    for enrollment in enrollments:
                        subject = enrollment["subject"]
                        subject["teacher_name"] = subject.get("teacher", {}).get("name", "")
                        subjects.append(subject)
                        subject_ids.append(subject["subject_id"])
                    
                    # Get student counts for all subjects in one query
                    student_counts = await self._get_multiple_subject_student_counts(subject_ids)
                    
                    # Add student counts to subjects
                    for subject in subjects:
                        subject["student_count"] = student_counts.get(subject["subject_id"], 0)
                    
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
                    # Invalidate related caches
                    self._invalidate_cache_pattern(f"student_count:{subject_id}")
                    self._invalidate_cache_pattern(f"subject_students:{subject_id}")
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
                    # Filter out enrollments with null/missing student data
                    students = []
                    for enrollment in enrollments:
                        student = enrollment.get("student")
                        if student and student.get("user_id"):
                            students.append(student)
                        else:
                            logger.warning(f"Enrollment {enrollment.get('id')} has missing student data")
                    return students
                return []
        except Exception as e:
            logger.error(f"Error getting subject students: {e}")
            return []
    
    async def get_subject_student_count(self, subject_id: str) -> int:
        """Get count of students in a subject with enhanced caching"""
        try:
            # Check cache first
            cache_key = self._get_cache_key("student_count", subject_id)
            cached_count = self._get_from_cache(cache_key, 'student_count')
            if cached_count is not None:
                return cached_count
            
            # Use optimized count query instead of fetching all students
            async with httpx.AsyncClient(
                limits=self._connection_limits,
                timeout=self._timeout
            ) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers={**self.headers, "Prefer": "count=exact"},
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "is_active": "eq.true",
                        "select": "count"
                    }
                )
                
                if response.status_code == 200:
                    # Extract count from Content-Range header
                    content_range = response.headers.get('content-range', '')
                    if content_range:
                        count = int(content_range.split('/')[-1])
                    else:
                        count = 0
                    
                    # Cache the result
                    self._set_cache(cache_key, count, 'student_count')
                    
                    print(f"📊 Subject {subject_id} has {count} students enrolled (optimized query)")
                    return count
                else:
                    logger.error(f"Failed to get student count: {response.status_code}")
                    return 0
                    
        except Exception as e:
            logger.error(f"Error getting student count: {e}")
            return 0
    
    async def _get_multiple_subject_student_counts(self, subject_ids: List[str]) -> Dict[str, int]:
        """Optimized method to get student counts for multiple subjects in one query"""
        try:
            if not subject_ids:
                return {}
            
            async with httpx.AsyncClient() as client:
                # Get all enrollments for the subjects in one query
                response = await client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"in.({','.join(subject_ids)})",
                        "is_active": "eq.true",
                        "select": "subject_id"
                    }
                )
                
                if response.status_code == 200:
                    enrollments = response.json()
                    # Count enrollments per subject
                    counts = {}
                    for subject_id in subject_ids:
                        counts[subject_id] = 0
                    
                    for enrollment in enrollments:
                        subject_id = enrollment.get("subject_id")
                        if subject_id in counts:
                            counts[subject_id] += 1
                    
                    return counts
                return {subject_id: 0 for subject_id in subject_ids}
        except Exception as e:
            logger.error(f"Error getting multiple subject student counts: {e}")
            return {subject_id: 0 for subject_id in subject_ids}
    
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
        """Mark attendance for a student with session tracking"""
        try:
            # Ensure session tracking fields are included
            if "session_id" not in attendance_data:
                import uuid
                attendance_data["session_id"] = str(uuid.uuid4())
            
            if "session_timestamp" not in attendance_data:
                from datetime import datetime
                attendance_data["session_timestamp"] = datetime.now().isoformat()
            
            async with httpx.AsyncClient() as client:
                # Always insert new record (multiple sessions per day allowed)
                response = await client.post(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    json=attendance_data
                )
                
                print(f"📊 Attendance API Response: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    print(f"✅ Attendance marked successfully with session ID: {attendance_data['session_id']}")
                    return True
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
    
    async def get_attendance_dashboard_data(self, subject_id: str) -> Dict[str, Any]:
        """Get optimized attendance dashboard data with caching and database function"""
        try:
            # Check cache first
            cache_key = self._get_cache_key("dashboard_data", subject_id)
            cached_data = self._get_from_cache(cache_key, 'dashboard_data')
            if cached_data is not None:
                return cached_data
            
            async with httpx.AsyncClient(
                limits=self._connection_limits,
                timeout=self._timeout
            ) as client:
                # Try to use the optimized database function first
                try:
                    response = await client.post(
                        f"{self.base_url}/rest/v1/rpc/get_attendance_dashboard_data",
                        headers=self.headers,
                        json={"p_subject_id": subject_id}
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        # Cache the result
                        self._set_cache(cache_key, result, 'dashboard_data')
                        return result
                except Exception as db_func_error:
                    logger.warning(f"Database function failed, falling back to individual queries: {db_func_error}")
                
                # Fallback to individual optimized queries with connection reuse
                attendance_task = client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*,student:users!student_id(user_id,name,email)",
                        "order": "date.desc,session_timestamp.desc",
                        "limit": "1000"  # Limit to prevent excessive data transfer
                    }
                )
                
                students_task = client.get(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "is_active": "eq.true",
                        "select": "*,student:users!student_id(user_id,name,email,is_face_registered)"
                    }
                )
                
                # Execute queries concurrently
                import asyncio
                attendance_response, students_response = await asyncio.gather(
                    attendance_task, students_task, return_exceptions=True
                )
                
                records = []
                students = []
                
                # Handle attendance response
                if not isinstance(attendance_response, Exception) and attendance_response.status_code == 200:
                    records = attendance_response.json()
                else:
                    logger.error(f"Attendance query failed: {attendance_response}")
                
                # Handle students response
                if not isinstance(students_response, Exception) and students_response.status_code == 200:
                    enrollments = students_response.json()
                    for enrollment in enrollments:
                        student = enrollment.get("student")
                        if student and student.get("user_id"):
                            students.append(student)
                else:
                    logger.error(f"Students query failed: {students_response}")
                
                # Calculate statistics
                total_sessions = len(set((r.get('date'), r.get('session_id')) for r in records))
                present_count = sum(1 for r in records if r.get('status') == 'present')
                absent_count = sum(1 for r in records if r.get('status') == 'absent')
                late_count = sum(1 for r in records if r.get('status') == 'late')
                
                result = {
                    "records": records,
                    "students": students,
                    "stats": {
                        "total_students": len(students),
                        "total_sessions": total_sessions,
                        "present_count": present_count,
                        "absent_count": absent_count,
                        "late_count": late_count,
                        "attendance_rate": round((present_count / max(len(records), 1)) * 100, 2)
                    }
                }
                
                # Cache the result
                self._set_cache(cache_key, result, 'dashboard_data')
                return result
                
        except Exception as e:
            logger.error(f"Error getting attendance dashboard data: {e}")
            return {"records": [], "students": [], "stats": {}}
    
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

    async def get_attendance_sessions(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get attendance sessions grouped by date and session for a subject"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/attendance",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*,student:users!student_id(name),subject:subjects!subject_id(name)",
                        "order": "date.desc,session_timestamp.desc"
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
            logger.error(f"Error getting attendance sessions: {e}")
            return []

    # User profile management methods
    async def update_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Update user profile information with validation"""
        try:
            # Verify user exists
            user = await self.get_user_by_id(user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            # Validate profile data
            allowed_fields = {"name", "email"}
            filtered_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
            
            if not filtered_data:
                logger.warning(f"No valid profile fields to update for user {user_id}")
                return False
            
            # Add updated timestamp
            from datetime import datetime
            filtered_data["updated_at"] = datetime.now().isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json=filtered_data
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Successfully updated profile for user {user_id}: {list(filtered_data.keys())}")
                    return True
                else:
                    logger.error(f"Failed to update profile: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.RequestError as e:
            logger.error(f"Network error during profile update: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error updating user profile: {e}")
            return False

    async def change_user_password(self, user_id: str, old_password: str, new_password_hash: str, verify_old_password_func=None) -> bool:
        """Change user password after verifying old password"""
        try:
            # First verify the user exists
            user = await self.get_user_by_id(user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            # Verify old password if verification function is provided
            if verify_old_password_func:
                current_password_hash = user.get("password_hash")
                if not current_password_hash:
                    logger.error(f"No password hash found for user {user_id}")
                    return False
                
                if not verify_old_password_func(old_password, current_password_hash):
                    logger.error(f"Old password verification failed for user {user_id}")
                    return False
            
            # Update password and updated_at timestamp
            from datetime import datetime
            update_data = {
                "password_hash": new_password_hash,
                "updated_at": datetime.now().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json=update_data
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Password changed successfully for user {user_id}")
                    return True
                else:
                    logger.error(f"Failed to change password: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.RequestError as e:
            logger.error(f"Network error during password change: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error changing password: {e}")
            return False

    async def update_user_face_encoding(self, user_id: str, face_encoding_id: Optional[str]) -> bool:
        """Update user's face encoding ID and registration status"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users",
                    headers=self.headers,
                    params={"user_id": f"eq.{user_id}"},
                    json={
                        "face_encoding_id": face_encoding_id,
                        "is_face_registered": face_encoding_id is not None
                    }
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Updated face encoding for user {user_id}")
                    return True
                else:
                    logger.error(f"Failed to update face encoding: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Error updating face encoding: {e}")
            return False

    # Class management methods
    async def update_subject_info(self, subject_id: str, subject_data: Dict[str, Any], teacher_id: str = None) -> bool:
        """Update subject information with authorization checks"""
        try:
            # Verify subject exists
            subject = await self.get_subject_by_id(subject_id)
            if not subject:
                logger.error(f"Subject {subject_id} not found")
                return False
            
            # Authorization check: verify teacher owns the subject
            if teacher_id and subject.get("teacher_id") != teacher_id:
                logger.error(f"Teacher {teacher_id} not authorized to update subject {subject_id}")
                return False
            
            # Validate and filter allowed fields
            allowed_fields = {"name", "description", "is_active"}
            filtered_data = {k: v for k, v in subject_data.items() if k in allowed_fields}
            
            if not filtered_data:
                logger.warning(f"No valid subject fields to update for subject {subject_id}")
                return False
            
            # Add updated timestamp
            from datetime import datetime
            filtered_data["updated_at"] = datetime.now().isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/subjects",
                    headers=self.headers,
                    params={"subject_id": f"eq.{subject_id}"},
                    json=filtered_data
                )
                if response.status_code in [200, 204]:
                    logger.info(f"Successfully updated subject {subject_id}: {list(filtered_data.keys())}")
                    return True
                else:
                    logger.error(f"Failed to update subject: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.RequestError as e:
            logger.error(f"Network error during subject update: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error updating subject: {e}")
            return False

    async def unenroll_student(self, subject_id: str, student_id: str) -> bool:
        """Remove student enrollment from a subject with proper validation and transaction management"""
        try:
            # First verify the enrollment exists
            enrollment_exists = await self.is_student_enrolled(subject_id, student_id)
            if not enrollment_exists:
                logger.warning(f"Student {student_id} is not enrolled in subject {subject_id}")
                return False
            
            # Verify the subject exists
            subject = await self.get_subject_by_id(subject_id)
            if not subject:
                logger.error(f"Subject {subject_id} not found")
                return False
            
            # Verify the user exists
            user = await self.get_user_by_id(student_id)
            if not user:
                logger.error(f"User {student_id} not found")
                return False
            
            async with httpx.AsyncClient() as client:
                # Use transaction-like approach by setting is_active to false instead of deleting
                # This preserves historical data while effectively unenrolling the student
                response = await client.patch(
                    f"{self.base_url}/rest/v1/subject_enrollments",
                    headers=self.headers,
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "student_id": f"eq.{student_id}",
                        "is_active": "eq.true"
                    },
                    json={"is_active": False}
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"Successfully unenrolled student {student_id} from subject {subject_id}")
                    return True
                else:
                    logger.error(f"Failed to unenroll student: {response.status_code} - {response.text}")
                    return False
                    
        except httpx.RequestError as e:
            logger.error(f"Network error during unenrollment: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error unenrolling student: {e}")
            return False

    async def remove_student_from_subject(self, subject_id: str, student_id: str, teacher_id: str = None) -> bool:
        """Remove student from subject (teacher action) with authorization checks"""
        try:
            # Verify subject exists and get subject info
            subject = await self.get_subject_by_id(subject_id)
            if not subject:
                logger.error(f"Subject {subject_id} not found")
                return False
            
            # Authorization check: verify teacher owns the subject
            if teacher_id and subject.get("teacher_id") != teacher_id:
                logger.error(f"Teacher {teacher_id} not authorized to remove students from subject {subject_id}")
                return False
            
            # Verify student is enrolled
            is_enrolled = await self.is_student_enrolled(subject_id, student_id)
            if not is_enrolled:
                logger.warning(f"Student {student_id} is not enrolled in subject {subject_id}")
                return False
            
            # Use the unenroll_student method which has proper validation
            result = await self.unenroll_student(subject_id, student_id)
            
            if result:
                logger.info(f"Teacher action: Successfully removed student {student_id} from subject {subject_id}")
            else:
                logger.error(f"Teacher action: Failed to remove student {student_id} from subject {subject_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Unexpected error removing student from subject: {e}")
            return False