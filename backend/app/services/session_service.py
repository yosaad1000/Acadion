import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
import httpx
from app.settings import settings
from app.models.session import SessionCreate, SessionUpdate, Session

logger = logging.getLogger(__name__)

class SessionService:
    """Session management service using direct HTTP requests to Supabase"""
    
    def __init__(self):
        try:
            # Use direct HTTP requests like LocalSupabase to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self._connection_healthy = True
            logger.info("✅ SessionService initialized successfully with HTTP client")
        except Exception as e:
            logger.error(f"❌ Error initializing SessionService: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize SessionService: {e}")
    
    async def generate_session_name(self, subject_id: UUID) -> str:
        """Generate smart session names like 'Session 1', 'Session 2' based on existing sessions"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/sessions",
                    headers={**self.headers, "Prefer": "count=exact"},
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "session_id"
                    }
                )
                
                if response.status_code == 200:
                    total_count = int(response.headers.get("Content-Range", "0").split("/")[-1])
                    session_number = total_count + 1
                    generated_name = f"Session {session_number}"
                    logger.info(f"✅ Generated session name: {generated_name} for subject {subject_id}")
                    return generated_name
                else:
                    logger.warning(f"Failed to count sessions, using default name: {response.status_code}")
                    return "Session 1"
                    
        except Exception as e:
            logger.error(f"❌ Error generating session name: {e}")
            return "Session 1"
    
    async def create_session_with_defaults(self, session_data: SessionCreate, created_by: UUID) -> Optional[Dict[str, Any]]:
        """Create session with smart defaults applied"""
        try:
            # Auto-generate session name if not provided or empty
            if not session_data.name:
                session_data.name = await self.generate_session_name(session_data.subject_id)
            
            # Set current datetime as default if not provided
            if not session_data.session_date:
                session_data.session_date = datetime.utcnow()
            
            return await self.create_session(session_data, created_by)
            
        except Exception as e:
            logger.error(f"❌ Error creating session with defaults: {e}")
            return None

    async def create_session(self, session_data: SessionCreate, created_by: UUID) -> Optional[Dict[str, Any]]:
        """Create a new session"""
        try:
            session_dict = session_data.model_dump()
            session_dict["created_by"] = str(created_by)
            
            # Convert UUID fields to strings
            if session_dict.get("subject_id"):
                session_dict["subject_id"] = str(session_dict["subject_id"])
            
            # Convert datetime to ISO string if present
            if session_dict.get("session_date") and hasattr(session_dict["session_date"], "isoformat"):
                session_dict["session_date"] = session_dict["session_date"].isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    json=session_dict
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    session = result[0] if result else None
                    if session:
                        logger.info(f"✅ Session '{session_data.name}' created successfully")
                        return session
                    return None
                else:
                    logger.error(f"❌ Failed to create session: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error creating session: {e}")
            return None
    
    async def get_session_by_id(self, session_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a session by ID with related data"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={
                        "session_id": f"eq.{session_id}",
                        "select": "*,subject:subjects(name,teacher_id),assignments(*)"
                    }
                )
                
                if response.status_code == 200:
                    sessions = response.json()
                    if sessions:
                        session = sessions[0]
                        # Add computed fields
                        session["subject_name"] = session.get("subject", {}).get("name", "")
                        session["teacher_name"] = ""  # Can't get from auth.users join
                        session["assignment_count"] = len(session.get("assignments", []))
                        logger.info(f"✅ Retrieved session {session_id}")
                        return session
                    return None
                else:
                    logger.error(f"❌ Failed to get session: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting session: {e}")
            return None
    
    async def get_sessions_by_subject(self, subject_id: UUID, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Get sessions for a subject with pagination"""
        try:
            offset = (page - 1) * page_size
            
            async with httpx.AsyncClient() as client:
                # Get sessions with count
                response = await client.get(
                    f"{self.base_url}/rest/v1/sessions",
                    headers={**self.headers, "Prefer": "count=exact"},
                    params={
                        "subject_id": f"eq.{subject_id}",
                        "select": "*,assignments(*)",
                        "order": "session_date.desc.nullslast,created_at.desc",
                        "limit": page_size,
                        "offset": offset
                    }
                )
                
                if response.status_code == 200:
                    sessions = response.json()
                    total_count = int(response.headers.get("Content-Range", "0").split("/")[-1])
                    
                    # Add computed fields
                    for session in sessions:
                        session["teacher_name"] = ""  # Can't get from auth.users join
                        session["assignment_count"] = len(session.get("assignments", []))
                        
                        # Check for overdue assignments
                        now = datetime.utcnow()
                        session["has_overdue_assignments"] = any(
                            assignment.get("due_date") and 
                            datetime.fromisoformat(assignment["due_date"].replace("Z", "+00:00")) < now
                            for assignment in session.get("assignments", [])
                        )
                    
                    logger.info(f"✅ Retrieved {len(sessions)} sessions for subject {subject_id}")
                    return {
                        "sessions": sessions,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size
                    }
                else:
                    logger.error(f"❌ Failed to get sessions: {response.status_code} - {response.text}")
                    return {"sessions": [], "total_count": 0, "page": page, "page_size": page_size}
                    
        except Exception as e:
            logger.error(f"❌ Error getting sessions by subject: {e}")
            return {"sessions": [], "total_count": 0, "page": page, "page_size": page_size}
    
    async def update_session(self, session_id: UUID, session_data: SessionUpdate) -> Optional[Dict[str, Any]]:
        """Update a session"""
        try:
            # Only include non-None fields
            update_dict = {k: v for k, v in session_data.model_dump().items() if v is not None}
            
            if not update_dict:
                logger.warning("No fields to update")
                return await self.get_session_by_id(session_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={"session_id": f"eq.{session_id}"},
                    json=update_dict
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Session {session_id} updated successfully")
                    return await self.get_session_by_id(session_id)
                else:
                    logger.error(f"❌ Failed to update session: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error updating session: {e}")
            return None
    
    async def delete_session(self, session_id: UUID) -> bool:
        """Delete a session"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={"session_id": f"eq.{session_id}"}
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Session {session_id} deleted successfully")
                    return True
                else:
                    logger.error(f"❌ Failed to delete session: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error deleting session: {e}")
            return False
    
    async def check_user_access_to_session(self, session_id: UUID, user_id: UUID, user_role: str) -> Dict[str, Any]:
        """Check if user has access to a session and return access details"""
        try:
            async with httpx.AsyncClient() as client:
                # Get session with subject info
                response = await client.get(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={
                        "session_id": f"eq.{session_id}",
                        "select": "*,subject:subjects(subject_id,teacher_id,name)"
                    }
                )
                
                if response.status_code != 200 or not response.json():
                    return {"has_access": False, "reason": "Session not found"}
                
                session = response.json()[0]
                subject = session.get("subject", {})
                
                # Check teacher access
                if user_role == "teacher" and subject.get("teacher_id") == str(user_id):
                    return {
                        "has_access": True,
                        "access_type": "teacher",
                        "can_edit": True,
                        "session": session
                    }
                
                # Check student access (enrolled in subject)
                if user_role == "student":
                    enrollment_response = await client.get(
                        f"{self.base_url}/rest/v1/subject_enrollments",
                        headers=self.headers,
                        params={
                            "subject_id": f"eq.{subject['subject_id']}",
                            "student_id": f"eq.{user_id}",
                            "is_active": "eq.true"
                        }
                    )
                    
                    if enrollment_response.status_code == 200 and enrollment_response.json():
                        return {
                            "has_access": True,
                            "access_type": "student",
                            "can_edit": False,
                            "session": session
                        }
                
                return {"has_access": False, "reason": "User not authorized for this session"}
                
        except Exception as e:
            logger.error(f"❌ Error checking session access: {e}")
            return {"has_access": False, "reason": "Error checking access"}
    
    async def get_recent_sessions(self, user_id: UUID, user_role: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent sessions for a user based on their role"""
        try:
            async with httpx.AsyncClient() as client:
                if user_role == "teacher":
                    # Get sessions from subjects taught by the teacher
                    response = await client.get(
                        f"{self.base_url}/rest/v1/sessions",
                        headers=self.headers,
                        params={
                            "select": "*,subject:subjects!inner(name,teacher_id)",
                            "subject.teacher_id": f"eq.{user_id}",
                            "order": "created_at.desc",
                            "limit": limit
                        }
                    )
                else:
                    # Get sessions from subjects the student is enrolled in
                    response = await client.get(
                        f"{self.base_url}/rest/v1/sessions",
                        headers=self.headers,
                        params={
                            "select": "*,subject:subjects!inner(name,subject_enrollments!inner(student_id))",
                            "subject.subject_enrollments.student_id": f"eq.{user_id}",
                            "subject.subject_enrollments.is_active": "eq.true",
                            "order": "created_at.desc",
                            "limit": limit
                        }
                    )
                
                if response.status_code == 200:
                    sessions = response.json()
                    for session in sessions:
                        session["subject_name"] = session.get("subject", {}).get("name", "")
                    
                    logger.info(f"✅ Retrieved {len(sessions)} recent sessions for user {user_id}")
                    return sessions
                else:
                    logger.error(f"❌ Failed to get recent sessions: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error getting recent sessions: {e}")
            return []
    
    async def mark_attendance_taken(self, session_id: UUID) -> bool:
        """Mark that attendance has been taken for a session"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/sessions",
                    headers=self.headers,
                    params={"session_id": f"eq.{session_id}"},
                    json={"attendance_taken": True}
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Attendance marked as taken for session {session_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to mark attendance taken: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error marking attendance taken: {e}")
            return False