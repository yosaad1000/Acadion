"""
Async Attendance Service
Integrates with SQS for asynchronous face recognition processing
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from .sqs_service import get_sqs_service
from .job_tracker import get_job_tracker, track_face_recognition_job, JobType
from .enhanced_attendance_service import get_enhanced_attendance_service
from ..settings import settings

logger = logging.getLogger(__name__)

class AsyncAttendanceService:
    """
    Attendance service with asynchronous face recognition processing
    """
    
    def __init__(self):
        self.sqs_service = None
        self.job_tracker = None
        self.enhanced_attendance_service = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the async attendance service"""
        try:
            self.sqs_service = await get_sqs_service()
            self.job_tracker = await get_job_tracker()
            self.enhanced_attendance_service = await get_enhanced_attendance_service()
            
            self._initialized = True
            logger.info("✅ Async attendance service initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize async attendance service: {e}")
            raise
    
    async def submit_attendance_processing(
        self,
        session_id: str,
        subject_id: str,
        image_data: bytes,
        user_id: Optional[str] = None,
        priority: int = 0,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submit attendance image for asynchronous processing
        
        Args:
            session_id: Attendance session ID
            subject_id: Subject ID for filtering
            image_data: Image bytes to process
            user_id: User who submitted the request
            priority: Processing priority (0 = normal, higher = more priority)
            callback_url: Optional webhook URL for completion notification
            
        Returns:
            Job submission result with job_id for tracking
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            # Validate input
            if not image_data or len(image_data) == 0:
                return {
                    "success": False,
                    "error": "No image data provided",
                    "job_id": None
                }
            
            if len(image_data) > settings.MAX_FILE_SIZE:
                return {
                    "success": False,
                    "error": f"Image size exceeds maximum allowed size ({settings.MAX_FILE_SIZE} bytes)",
                    "job_id": None
                }
            
            # Submit job to SQS
            job_id = await self.sqs_service.submit_face_recognition_job(
                session_id=session_id,
                subject_id=subject_id,
                image_data=image_data,
                user_id=user_id,
                priority=priority
            )
            
            # Set up job tracking with callback
            callback_func = None
            if callback_url:
                callback_func = self._create_webhook_callback(callback_url)
            
            await track_face_recognition_job(
                job_id=job_id,
                session_id=session_id,
                subject_id=subject_id,
                user_id=user_id,
                callback=callback_func
            )
            
            logger.info(f"✅ Submitted attendance processing job {job_id} for session {session_id}")
            
            return {
                "success": True,
                "job_id": job_id,
                "session_id": session_id,
                "subject_id": subject_id,
                "status": "submitted",
                "estimated_processing_time": "30-60 seconds",
                "submitted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to submit attendance processing: {e}")
            return {
                "success": False,
                "error": str(e),
                "job_id": None
            }
    
    def _create_webhook_callback(self, callback_url: str):
        """Create webhook callback function"""
        async def webhook_callback(job_id: str, status: str, metadata: Dict[str, Any]):
            try:
                import httpx
                
                payload = {
                    "job_id": job_id,
                    "status": status,
                    "completed_at": datetime.utcnow().isoformat(),
                    "metadata": metadata
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        callback_url,
                        json=payload,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Webhook callback sent for job {job_id}")
                    else:
                        logger.warning(f"⚠️ Webhook callback failed: {response.status_code}")
                        
            except Exception as e:
                logger.error(f"❌ Webhook callback error for job {job_id}: {e}")
        
        return webhook_callback
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and progress"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Get status from job tracker
            job_status = await self.job_tracker.get_job_status(job_id)
            
            if not job_status:
                return None
            
            # Enhance with additional information
            current_status = job_status.get("current_status", "unknown")
            
            # Calculate progress percentage
            progress = self._calculate_progress(current_status)
            
            # Get estimated completion time
            estimated_completion = self._estimate_completion_time(job_status)
            
            return {
                "job_id": job_id,
                "status": current_status,
                "progress_percentage": progress,
                "estimated_completion": estimated_completion,
                "created_at": job_status.get("created_at"),
                "last_updated": job_status.get("last_updated"),
                "metadata": job_status.get("metadata", {}),
                "status_history": job_status.get("status_history", [])
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get job status {job_id}: {e}")
            return None
    
    def _calculate_progress(self, status: str) -> int:
        """Calculate progress percentage based on status"""
        progress_map = {
            "pending": 10,
            "processing": 50,
            "completed": 100,
            "failed": 0,
            "retry": 25
        }
        return progress_map.get(status, 0)
    
    def _estimate_completion_time(self, job_status: Dict[str, Any]) -> Optional[str]:
        """Estimate job completion time"""
        try:
            current_status = job_status.get("current_status")
            created_at = job_status.get("created_at")
            
            if current_status in ["completed", "failed"]:
                return None
            
            if not created_at:
                return None
            
            # Parse creation time
            created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Estimate based on typical processing times
            if current_status == "pending":
                # Estimate 30-60 seconds from creation
                estimated = created_time.timestamp() + 45
            elif current_status == "processing":
                # Estimate 15-30 seconds from now
                estimated = datetime.utcnow().timestamp() + 22
            else:
                return None
            
            return datetime.fromtimestamp(estimated).isoformat()
            
        except Exception as e:
            logger.error(f"❌ Error estimating completion time: {e}")
            return None
    
    async def get_user_jobs(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get jobs for a specific user"""
        try:
            if not self._initialized:
                await self.initialize()
            
            jobs = await self.job_tracker.get_user_jobs(user_id, limit)
            
            # Enhance job information
            enhanced_jobs = []
            for job in jobs:
                enhanced_job = {
                    "job_id": job.get("job_id"),
                    "job_type": job.get("job_type"),
                    "status": job.get("current_status"),
                    "progress_percentage": self._calculate_progress(job.get("current_status", "")),
                    "created_at": job.get("created_at"),
                    "last_updated": job.get("last_updated"),
                    "session_id": job.get("metadata", {}).get("session_id"),
                    "subject_id": job.get("metadata", {}).get("subject_id")
                }
                enhanced_jobs.append(enhanced_job)
            
            return enhanced_jobs
            
        except Exception as e:
            logger.error(f"❌ Failed to get user jobs for {user_id}: {e}")
            return []
    
    async def cancel_job(self, job_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Cancel a pending job
        
        Args:
            job_id: Job ID to cancel
            user_id: User requesting cancellation (for authorization)
            
        Returns:
            Cancellation result
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            # Get current job status
            job_status = await self.job_tracker.get_job_status(job_id)
            
            if not job_status:
                return {
                    "success": False,
                    "error": "Job not found",
                    "job_id": job_id
                }
            
            current_status = job_status.get("current_status")
            
            # Check if job can be cancelled
            if current_status in ["completed", "failed"]:
                return {
                    "success": False,
                    "error": f"Cannot cancel job with status: {current_status}",
                    "job_id": job_id,
                    "current_status": current_status
                }
            
            # Check user authorization
            if user_id and job_status.get("user_id") != user_id:
                return {
                    "success": False,
                    "error": "Unauthorized to cancel this job",
                    "job_id": job_id
                }
            
            # Update job status to cancelled
            await self.job_tracker.update_job_status(
                job_id=job_id,
                status="cancelled",
                metadata={
                    "cancelled_at": datetime.utcnow().isoformat(),
                    "cancelled_by": user_id
                }
            )
            
            logger.info(f"✅ Job {job_id} cancelled by user {user_id}")
            
            return {
                "success": True,
                "job_id": job_id,
                "status": "cancelled",
                "cancelled_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to cancel job {job_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "job_id": job_id
            }
    
    async def get_service_statistics(self) -> Dict[str, Any]:
        """Get service statistics"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Get job tracker statistics
            job_stats = await self.job_tracker.get_job_statistics()
            
            # Get SQS queue statistics
            queue_stats = await self.sqs_service.get_queue_stats()
            
            return {
                "service": "async_attendance_service",
                "initialized": self._initialized,
                "job_statistics": job_stats,
                "queue_statistics": queue_stats,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get service statistics: {e}")
            return {"error": str(e)}
    
    async def process_attendance_synchronously(
        self,
        session_id: str,
        subject_id: str,
        image_data: bytes,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process attendance synchronously (fallback for when async is not available)
        
        Args:
            session_id: Attendance session ID
            subject_id: Subject ID for filtering
            image_data: Image bytes to process
            user_id: User who submitted the request
            
        Returns:
            Processing result
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            # Use enhanced attendance service for synchronous processing
            session_data = {
                "session_id": session_id,
                "subject_id": subject_id,
                "user_id": user_id
            }
            
            result = await self.enhanced_attendance_service.process_attendance_session(
                session_data=session_data,
                image_data=image_data
            )
            
            logger.info(f"✅ Synchronous attendance processing completed for session {session_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Synchronous attendance processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id,
                "subject_id": subject_id
            }

# Global service instance
_async_attendance_service: Optional[AsyncAttendanceService] = None

async def get_async_attendance_service() -> AsyncAttendanceService:
    """Get the global async attendance service instance"""
    global _async_attendance_service
    
    if _async_attendance_service is None:
        _async_attendance_service = AsyncAttendanceService()
        await _async_attendance_service.initialize()
    
    return _async_attendance_service