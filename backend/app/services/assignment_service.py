import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
import httpx
from app.settings import settings
from app.models.assignment import (
    AssignmentCreate, AssignmentUpdate, AssignmentSubmissionCreate, 
    AssignmentSubmissionUpdate, SubmissionStatus
)

logger = logging.getLogger(__name__)

class AssignmentService:
    """Assignment management service using direct HTTP requests to Supabase"""
    
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
            logger.info("✅ AssignmentService initialized successfully with HTTP client")
        except Exception as e:
            logger.error(f"❌ Error initializing AssignmentService: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize AssignmentService: {e}")
    
    async def create_assignment(self, assignment_data: AssignmentCreate, created_by: UUID) -> Optional[Dict[str, Any]]:
        """Create a new assignment"""
        try:
            assignment_dict = assignment_data.model_dump()
            assignment_dict["created_by"] = str(created_by)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    json=assignment_dict
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    assignment = result[0] if result else None
                    if assignment:
                        logger.info(f"✅ Assignment '{assignment_data.title}' created successfully")
                        return assignment
                    return None
                else:
                    logger.error(f"❌ Failed to create assignment: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error creating assignment: {e}")
            return None
    
    async def get_assignment_by_id(self, assignment_id: UUID) -> Optional[Dict[str, Any]]:
        """Get an assignment by ID with related data"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    params={
                        "assignment_id": f"eq.{assignment_id}",
                        "select": "*,session:sessions(name,subject_id,subject:subjects(name)),submissions:assignment_submissions(*)"
                    }
                )
                
                if response.status_code == 200:
                    assignments = response.json()
                    if assignments:
                        assignment = assignments[0]
                        # Add computed fields
                        session = assignment.get("session", {})
                        assignment["session_name"] = session.get("name", "")
                        assignment["subject_name"] = session.get("subject", {}).get("name", "")
                        assignment["teacher_name"] = ""  # Will be populated by session data if needed
                        
                        # Check if overdue
                        if assignment.get("due_date"):
                            due_date = datetime.fromisoformat(assignment["due_date"].replace("Z", "+00:00"))
                            assignment["is_overdue"] = due_date < datetime.utcnow()
                        else:
                            assignment["is_overdue"] = False
                        
                        # Submission statistics
                        submissions = assignment.get("submissions", [])
                        assignment["submission_count"] = len([s for s in submissions if s["submission_status"] == "submitted"])
                        assignment["pending_count"] = len([s for s in submissions if s["submission_status"] == "pending"])
                        
                        logger.info(f"✅ Retrieved assignment {assignment_id}")
                        return assignment
                    return None
                else:
                    logger.error(f"❌ Failed to get assignment: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting assignment: {e}")
            return None
    
    async def get_assignments_by_session(self, session_id: UUID, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Get assignments for a session with pagination"""
        try:
            offset = (page - 1) * page_size
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignments",
                    headers={**self.headers, "Prefer": "count=exact"},
                    params={
                        "session_id": f"eq.{session_id}",
                        "select": "*,submissions:assignment_submissions(*)",
                        "order": "due_date.asc.nullslast,created_at.desc",
                        "limit": page_size,
                        "offset": offset
                    }
                )
                
                if response.status_code == 200:
                    assignments = response.json()
                    total_count = int(response.headers.get("Content-Range", "0").split("/")[-1])
                    
                    # Add computed fields
                    now = datetime.utcnow()
                    for assignment in assignments:
                        assignment["teacher_name"] = ""  # Will be populated by session data if needed
                        
                        # Check if overdue
                        if assignment.get("due_date"):
                            due_date = datetime.fromisoformat(assignment["due_date"].replace("Z", "+00:00"))
                            assignment["is_overdue"] = due_date < now
                        else:
                            assignment["is_overdue"] = False
                        
                        # Submission statistics
                        submissions = assignment.get("submissions", [])
                        assignment["submission_count"] = len([s for s in submissions if s["submission_status"] == "submitted"])
                        assignment["pending_count"] = len([s for s in submissions if s["submission_status"] == "pending"])
                    
                    logger.info(f"✅ Retrieved {len(assignments)} assignments for session {session_id}")
                    return {
                        "assignments": assignments,
                        "total_count": total_count,
                        "page": page,
                        "page_size": page_size
                    }
                else:
                    logger.error(f"❌ Failed to get assignments: {response.status_code} - {response.text}")
                    return {"assignments": [], "total_count": 0, "page": page, "page_size": page_size}
                    
        except Exception as e:
            logger.error(f"❌ Error getting assignments by session: {e}")
            return {"assignments": [], "total_count": 0, "page": page, "page_size": page_size}
    
    async def update_assignment(self, assignment_id: UUID, assignment_data: AssignmentUpdate) -> Optional[Dict[str, Any]]:
        """Update an assignment"""
        try:
            # Only include non-None fields
            update_dict = {k: v for k, v in assignment_data.model_dump().items() if v is not None}
            
            if not update_dict:
                logger.warning("No fields to update")
                return await self.get_assignment_by_id(assignment_id)
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    params={"assignment_id": f"eq.{assignment_id}"},
                    json=update_dict
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Assignment {assignment_id} updated successfully")
                    return await self.get_assignment_by_id(assignment_id)
                else:
                    logger.error(f"❌ Failed to update assignment: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error updating assignment: {e}")
            return None
    
    async def delete_assignment(self, assignment_id: UUID) -> bool:
        """Delete an assignment"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    params={"assignment_id": f"eq.{assignment_id}"}
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Assignment {assignment_id} deleted successfully")
                    return True
                else:
                    logger.error(f"❌ Failed to delete assignment: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error deleting assignment: {e}")
            return False
    
    async def get_assignment_submissions(self, assignment_id: UUID) -> List[Dict[str, Any]]:
        """Get all submissions for an assignment"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignment_submissions",
                    headers=self.headers,
                    params={
                        "assignment_id": f"eq.{assignment_id}",
                        "select": "*,assignment:assignments(title,due_date)",
                        "order": "submission_status.asc,student.name.asc"
                    }
                )
                
                if response.status_code == 200:
                    submissions = response.json()
                    for submission in submissions:
                        submission["student_name"] = ""  # Will need to be populated separately if needed
                        submission["assignment_title"] = submission.get("assignment", {}).get("title", "")
                    
                    logger.info(f"✅ Retrieved {len(submissions)} submissions for assignment {assignment_id}")
                    return submissions
                else:
                    logger.error(f"❌ Failed to get submissions: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error getting assignment submissions: {e}")
            return []
    
    async def get_student_submission(self, assignment_id: UUID, student_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a student's submission for an assignment"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignment_submissions",
                    headers=self.headers,
                    params={
                        "assignment_id": f"eq.{assignment_id}",
                        "student_id": f"eq.{student_id}",
                        "select": "*,assignment:assignments(title,due_date)"
                    }
                )
                
                if response.status_code == 200:
                    submissions = response.json()
                    if submissions:
                        submission = submissions[0]
                        submission["assignment_title"] = submission.get("assignment", {}).get("title", "")
                        logger.info(f"✅ Retrieved submission for student {student_id}")
                        return submission
                    return None
                else:
                    logger.error(f"❌ Failed to get student submission: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting student submission: {e}")
            return None
    
    async def update_submission(self, submission_id: UUID, submission_data: AssignmentSubmissionUpdate) -> Optional[Dict[str, Any]]:
        """Update an assignment submission"""
        try:
            # Only include non-None fields
            update_dict = {k: v for k, v in submission_data.model_dump().items() if v is not None}
            
            if not update_dict:
                logger.warning("No fields to update")
                return None
            
            # If marking as submitted, set submission_date
            if update_dict.get("submission_status") == SubmissionStatus.SUBMITTED and "submission_date" not in update_dict:
                update_dict["submission_date"] = datetime.utcnow().isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/assignment_submissions",
                    headers=self.headers,
                    params={"submission_id": f"eq.{submission_id}"},
                    json=update_dict
                )
                
                if response.status_code in [200, 204]:
                    logger.info(f"✅ Submission {submission_id} updated successfully")
                    # Get updated submission
                    get_response = await client.get(
                        f"{self.base_url}/rest/v1/assignment_submissions",
                        headers=self.headers,
                        params={
                            "submission_id": f"eq.{submission_id}",
                            "select": "*,assignment:assignments(title)"
                        }
                    )
                    if get_response.status_code == 200 and get_response.json():
                        return get_response.json()[0]
                    return None
                else:
                    logger.error(f"❌ Failed to update submission: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error updating submission: {e}")
            return None
    
    async def get_student_assignments(self, student_id: UUID, subject_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
        """Get assignments for a student, optionally filtered by subject"""
        try:
            async with httpx.AsyncClient() as client:
                # Build the query to get assignments through enrollments
                params = {
                    "select": "*,session:sessions(name,subject_id,subject:subjects(name)),submissions:assignment_submissions!inner(submission_status,submission_date,grade)",
                    "submissions.student_id": f"eq.{student_id}",
                    "order": "due_date.asc.nullslast,created_at.desc"
                }
                
                if subject_id:
                    params["session.subject_id"] = f"eq.{subject_id}"
                
                response = await client.get(
                    f"{self.base_url}/rest/v1/assignments",
                    headers=self.headers,
                    params=params
                )
                
                if response.status_code == 200:
                    assignments = response.json()
                    now = datetime.utcnow()
                    
                    for assignment in assignments:
                        # Add computed fields
                        session = assignment.get("session", {})
                        assignment["session_name"] = session.get("name", "")
                        assignment["subject_name"] = session.get("subject", {}).get("name", "")
                        
                        # Check if overdue
                        if assignment.get("due_date"):
                            due_date = datetime.fromisoformat(assignment["due_date"].replace("Z", "+00:00"))
                            assignment["is_overdue"] = due_date < now
                        else:
                            assignment["is_overdue"] = False
                        
                        # Add submission info
                        submissions = assignment.get("submissions", [])
                        if submissions:
                            submission = submissions[0]  # Should only be one per student
                            assignment["submission_status"] = submission["submission_status"]
                            assignment["submission_date"] = submission["submission_date"]
                            assignment["grade"] = submission["grade"]
                        else:
                            assignment["submission_status"] = "pending"
                            assignment["submission_date"] = None
                            assignment["grade"] = None
                    
                    logger.info(f"✅ Retrieved {len(assignments)} assignments for student {student_id}")
                    return assignments
                else:
                    logger.error(f"❌ Failed to get student assignments: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error getting student assignments: {e}")
            return []
    
    async def update_overdue_assignments(self) -> int:
        """Update assignment submissions that are overdue"""
        try:
            async with httpx.AsyncClient() as client:
                # Get assignments that are overdue
                now = datetime.utcnow().isoformat()
                response = await client.patch(
                    f"{self.base_url}/rest/v1/assignment_submissions",
                    headers=self.headers,
                    params={
                        "submission_status": "eq.pending",
                        "assignment.due_date": f"lt.{now}"
                    },
                    json={"submission_status": "overdue"}
                )
                
                if response.status_code in [200, 204]:
                    # Count updated records (this is approximate)
                    logger.info("✅ Updated overdue assignments")
                    return 1  # Return success indicator
                else:
                    logger.error(f"❌ Failed to update overdue assignments: {response.status_code} - {response.text}")
                    return 0
                    
        except Exception as e:
            logger.error(f"❌ Error updating overdue assignments: {e}")
            return 0