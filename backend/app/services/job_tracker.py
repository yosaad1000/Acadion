"""
Job Tracker Service
Tracks job status and provides notifications for asynchronous processing
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
import json
from enum import Enum

from .sqs_service import get_sqs_service, SQSJobStatus
from ..settings import settings

logger = logging.getLogger(__name__)

class JobType(Enum):
    """Job type enumeration"""
    FACE_RECOGNITION = "face_recognition"
    ATTENDANCE_PROCESSING = "attendance_processing"

class NotificationChannel(Enum):
    """Notification channel enumeration"""
    WEBSOCKET = "websocket"
    EMAIL = "email"
    WEBHOOK = "webhook"
    DATABASE = "database"

class JobTracker:
    """
    Service for tracking job status and sending notifications
    """
    
    def __init__(self):
        self.sqs_service = None
        self.job_callbacks = {}  # job_id -> callback function
        self.notification_channels = {}  # channel -> handler function
        self.job_history = {}  # job_id -> job history
        self.active_subscriptions = {}  # user_id -> list of job_ids
        self._initialized = False
        
        # Tracker configuration
        self.config = {
            "history_retention_days": 7,
            "notification_retry_attempts": 3,
            "notification_timeout": 10,
            "cleanup_interval": 3600,  # 1 hour
            "max_history_entries": 1000
        }
    
    async def initialize(self):
        """Initialize the job tracker"""
        try:
            self.sqs_service = await get_sqs_service()
            
            # Start background cleanup task
            asyncio.create_task(self._cleanup_loop())
            
            self._initialized = True
            logger.info("✅ Job tracker initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize job tracker: {e}")
            raise
    
    async def track_job(
        self, 
        job_id: str, 
        job_type: JobType,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        callback: Optional[Callable] = None
    ):
        """
        Start tracking a job
        
        Args:
            job_id: Unique job identifier
            job_type: Type of job being tracked
            user_id: User who submitted the job
            metadata: Additional job metadata
            callback: Optional callback function for job completion
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            # Store job callback if provided
            if callback:
                self.job_callbacks[job_id] = callback
            
            # Initialize job history
            self.job_history[job_id] = {
                "job_id": job_id,
                "job_type": job_type.value,
                "user_id": user_id,
                "metadata": metadata or {},
                "status_history": [],
                "created_at": datetime.utcnow().isoformat(),
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Add to user subscriptions
            if user_id:
                if user_id not in self.active_subscriptions:
                    self.active_subscriptions[user_id] = []
                self.active_subscriptions[user_id].append(job_id)
            
            # Record initial status
            await self._record_status_change(job_id, SQSJobStatus.PENDING, {
                "message": "Job submitted for processing"
            })
            
            logger.info(f"📊 Started tracking job {job_id} for user {user_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to start tracking job {job_id}: {e}")
            raise
    
    async def update_job_status(
        self, 
        job_id: str, 
        status: str, 
        metadata: Optional[Dict[str, Any]] = None,
        notify: bool = True
    ):
        """
        Update job status and send notifications
        
        Args:
            job_id: Job identifier
            status: New job status
            metadata: Additional status metadata
            notify: Whether to send notifications
        """
        try:
            if job_id not in self.job_history:
                logger.warning(f"⚠️ Job {job_id} not found in tracker")
                return
            
            # Record status change
            await self._record_status_change(job_id, status, metadata or {})
            
            # Send notifications if enabled
            if notify:
                await self._send_notifications(job_id, status, metadata or {})
            
            # Execute callback if job is completed or failed
            if status in [SQSJobStatus.COMPLETED, SQSJobStatus.FAILED]:
                await self._execute_callback(job_id, status, metadata or {})
            
            logger.info(f"📊 Updated job {job_id} status to {status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update job status {job_id}: {e}")
    
    async def _record_status_change(self, job_id: str, status: str, metadata: Dict[str, Any]):
        """Record status change in job history"""
        try:
            if job_id in self.job_history:
                job_history = self.job_history[job_id]
                
                # Add status change to history
                status_entry = {
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": metadata
                }
                
                job_history["status_history"].append(status_entry)
                job_history["current_status"] = status
                job_history["last_updated"] = datetime.utcnow().isoformat()
                
                # Update metadata
                if metadata:
                    job_history["metadata"].update(metadata)
                
                logger.debug(f"Recorded status change for job {job_id}: {status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to record status change for job {job_id}: {e}")
    
    async def _send_notifications(self, job_id: str, status: str, metadata: Dict[str, Any]):
        """Send notifications for job status change"""
        try:
            job_history = self.job_history.get(job_id)
            if not job_history:
                return
            
            user_id = job_history.get("user_id")
            job_type = job_history.get("job_type")
            
            notification_data = {
                "job_id": job_id,
                "job_type": job_type,
                "status": status,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata
            }
            
            # Send notifications through all configured channels
            for channel, handler in self.notification_channels.items():
                try:
                    await asyncio.wait_for(
                        handler(notification_data),
                        timeout=self.config["notification_timeout"]
                    )
                    logger.debug(f"Sent notification via {channel} for job {job_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to send notification via {channel}: {e}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send notifications for job {job_id}: {e}")
    
    async def _execute_callback(self, job_id: str, status: str, metadata: Dict[str, Any]):
        """Execute job completion callback"""
        try:
            if job_id in self.job_callbacks:
                callback = self.job_callbacks[job_id]
                
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(job_id, status, metadata)
                    else:
                        callback(job_id, status, metadata)
                    
                    logger.debug(f"Executed callback for job {job_id}")
                    
                except Exception as e:
                    logger.error(f"❌ Error executing callback for job {job_id}: {e}")
                
                # Remove callback after execution
                del self.job_callbacks[job_id]
            
        except Exception as e:
            logger.error(f"❌ Failed to execute callback for job {job_id}: {e}")
    
    def register_notification_channel(self, channel: NotificationChannel, handler: Callable):
        """
        Register a notification channel handler
        
        Args:
            channel: Notification channel type
            handler: Async function to handle notifications
        """
        self.notification_channels[channel] = handler
        logger.info(f"📢 Registered notification channel: {channel.value}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current job status and history"""
        try:
            # Check local history first
            if job_id in self.job_history:
                return self.job_history[job_id]
            
            # Fallback to SQS service
            if self.sqs_service:
                sqs_status = await self.sqs_service.get_job_status(job_id)
                if sqs_status:
                    return {
                        "job_id": job_id,
                        "current_status": sqs_status.get("status"),
                        "last_updated": sqs_status.get("updated_at"),
                        "metadata": sqs_status,
                        "source": "sqs_service"
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get job status {job_id}: {e}")
            return None
    
    async def get_user_jobs(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get jobs for a specific user"""
        try:
            user_jobs = []
            
            # Get jobs from active subscriptions
            if user_id in self.active_subscriptions:
                job_ids = self.active_subscriptions[user_id]
                
                for job_id in job_ids[-limit:]:  # Get most recent jobs
                    job_status = await self.get_job_status(job_id)
                    if job_status:
                        user_jobs.append(job_status)
            
            # Sort by creation time (most recent first)
            user_jobs.sort(
                key=lambda x: x.get("created_at", ""), 
                reverse=True
            )
            
            return user_jobs
            
        except Exception as e:
            logger.error(f"❌ Failed to get user jobs for {user_id}: {e}")
            return []    
    
    async def get_job_statistics(self) -> Dict[str, Any]:
        """Get job processing statistics"""
        try:
            stats = {
                "total_jobs": len(self.job_history),
                "active_subscriptions": len(self.active_subscriptions),
                "active_callbacks": len(self.job_callbacks),
                "notification_channels": len(self.notification_channels)
            }
            
            # Status breakdown
            status_counts = {}
            job_type_counts = {}
            
            for job in self.job_history.values():
                current_status = job.get("current_status", "unknown")
                job_type = job.get("job_type", "unknown")
                
                status_counts[current_status] = status_counts.get(current_status, 0) + 1
                job_type_counts[job_type] = job_type_counts.get(job_type, 0) + 1
            
            stats["status_breakdown"] = status_counts
            stats["job_type_breakdown"] = job_type_counts
            
            # Recent activity (last 24 hours)
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            recent_jobs = 0
            
            for job in self.job_history.values():
                created_at = job.get("created_at")
                if created_at:
                    try:
                        job_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        if job_time >= cutoff_time:
                            recent_jobs += 1
                    except:
                        pass
            
            stats["recent_jobs_24h"] = recent_jobs
            
            # Get SQS queue stats
            if self.sqs_service:
                queue_stats = await self.sqs_service.get_queue_stats()
                stats["queue_stats"] = queue_stats
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get job statistics: {e}")
            return {"error": str(e)}
    
    async def cleanup_completed_jobs(self, older_than_hours: int = 24):
        """Clean up completed jobs older than specified hours"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            jobs_to_remove = []
            
            for job_id, job in self.job_history.items():
                # Check if job is completed and old enough
                current_status = job.get("current_status")
                last_updated = job.get("last_updated")
                
                if current_status in [SQSJobStatus.COMPLETED, SQSJobStatus.FAILED] and last_updated:
                    try:
                        update_time = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                        if update_time < cutoff_time:
                            jobs_to_remove.append(job_id)
                    except:
                        pass
            
            # Remove old jobs
            removed_count = 0
            for job_id in jobs_to_remove:
                try:
                    # Remove from history
                    del self.job_history[job_id]
                    
                    # Remove from callbacks
                    if job_id in self.job_callbacks:
                        del self.job_callbacks[job_id]
                    
                    # Remove from user subscriptions
                    for user_id, job_ids in self.active_subscriptions.items():
                        if job_id in job_ids:
                            job_ids.remove(job_id)
                    
                    removed_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Error removing job {job_id}: {e}")
            
            if removed_count > 0:
                logger.info(f"🧹 Cleaned up {removed_count} completed jobs")
            
            return removed_count
            
        except Exception as e:
            logger.error(f"❌ Failed to cleanup completed jobs: {e}")
            return 0
    
    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(self.config["cleanup_interval"])
                
                # Clean up old jobs
                await self.cleanup_completed_jobs(
                    older_than_hours=self.config["history_retention_days"] * 24
                )
                
                # Limit history size
                if len(self.job_history) > self.config["max_history_entries"]:
                    # Remove oldest entries
                    sorted_jobs = sorted(
                        self.job_history.items(),
                        key=lambda x: x[1].get("created_at", "")
                    )
                    
                    excess_count = len(self.job_history) - self.config["max_history_entries"]
                    for i in range(excess_count):
                        job_id = sorted_jobs[i][0]
                        del self.job_history[job_id]
                    
                    logger.info(f"🧹 Removed {excess_count} oldest job entries")
                
            except Exception as e:
                logger.error(f"❌ Error in cleanup loop: {e}")

# Notification channel handlers
class NotificationHandlers:
    """Collection of notification handlers for different channels"""
    
    @staticmethod
    async def websocket_handler(notification_data: Dict[str, Any]):
        """Handle WebSocket notifications"""
        try:
            # This would integrate with WebSocket manager
            user_id = notification_data.get("user_id")
            if user_id:
                logger.debug(f"📡 WebSocket notification for user {user_id}: {notification_data['job_id']}")
                # websocket_manager.send_to_user(user_id, notification_data)
        except Exception as e:
            logger.error(f"❌ WebSocket notification error: {e}")
    
    @staticmethod
    async def email_handler(notification_data: Dict[str, Any]):
        """Handle email notifications"""
        try:
            # This would integrate with email service
            status = notification_data.get("status")
            job_type = notification_data.get("job_type")
            
            if status in [SQSJobStatus.COMPLETED, SQSJobStatus.FAILED]:
                logger.debug(f"📧 Email notification: {job_type} job {status}")
                # email_service.send_job_notification(notification_data)
        except Exception as e:
            logger.error(f"❌ Email notification error: {e}")
    
    @staticmethod
    async def webhook_handler(notification_data: Dict[str, Any]):
        """Handle webhook notifications"""
        try:
            # This would send HTTP POST to configured webhook URL
            logger.debug(f"🔗 Webhook notification: {notification_data['job_id']}")
            # webhook_service.send_notification(notification_data)
        except Exception as e:
            logger.error(f"❌ Webhook notification error: {e}")
    
    @staticmethod
    async def database_handler(notification_data: Dict[str, Any]):
        """Handle database notifications (store in notifications table)"""
        try:
            # This would store notification in database
            logger.debug(f"💾 Database notification: {notification_data['job_id']}")
            # notification_service.create_notification(notification_data)
        except Exception as e:
            logger.error(f"❌ Database notification error: {e}")

# Global job tracker instance
_job_tracker: Optional[JobTracker] = None

async def get_job_tracker() -> JobTracker:
    """Get the global job tracker instance"""
    global _job_tracker
    
    if _job_tracker is None:
        _job_tracker = JobTracker()
        await _job_tracker.initialize()
        
        # Register default notification handlers
        _job_tracker.register_notification_channel(
            NotificationChannel.WEBSOCKET, 
            NotificationHandlers.websocket_handler
        )
        _job_tracker.register_notification_channel(
            NotificationChannel.EMAIL, 
            NotificationHandlers.email_handler
        )
        _job_tracker.register_notification_channel(
            NotificationChannel.WEBHOOK, 
            NotificationHandlers.webhook_handler
        )
        _job_tracker.register_notification_channel(
            NotificationChannel.DATABASE, 
            NotificationHandlers.database_handler
        )
    
    return _job_tracker

# Convenience functions for common operations
async def track_face_recognition_job(
    job_id: str,
    session_id: str,
    subject_id: str,
    user_id: Optional[str] = None,
    callback: Optional[Callable] = None
):
    """Convenience function to track a face recognition job"""
    tracker = await get_job_tracker()
    
    metadata = {
        "session_id": session_id,
        "subject_id": subject_id
    }
    
    await tracker.track_job(
        job_id=job_id,
        job_type=JobType.FACE_RECOGNITION,
        user_id=user_id,
        metadata=metadata,
        callback=callback
    )

async def update_face_recognition_job_status(
    job_id: str,
    status: str,
    result: Optional[Dict[str, Any]] = None
):
    """Convenience function to update face recognition job status"""
    tracker = await get_job_tracker()
    
    metadata = {}
    if result:
        metadata["result"] = result
    
    await tracker.update_job_status(job_id, status, metadata)

async def get_user_job_status(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Convenience function to get user's job status"""
    tracker = await get_job_tracker()
    return await tracker.get_user_jobs(user_id, limit)