"""
Face Recognition Worker Service
Background worker for processing face recognition jobs from SQS
"""

import asyncio
import logging
import signal
import sys
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
import json

from .sqs_service import get_sqs_service, SQSJobStatus
from ..settings import settings

logger = logging.getLogger(__name__)

class FaceRecognitionWorker:
    """
    Background worker for processing face recognition jobs
    """
    
    def __init__(self, worker_id: str = "worker-1"):
        self.worker_id = worker_id
        self.sqs_service = None
        self.face_service_client = None
        self.running = False
        self.current_job = None
        self.processed_jobs = 0
        self.failed_jobs = 0
        self.start_time = None
        
        # Worker configuration
        self.config = {
            "poll_interval": 5,  # seconds between polls when no messages
            "max_concurrent_jobs": 1,  # process one job at a time
            "job_timeout": 300,  # 5 minutes max per job
            "health_check_interval": 60,  # health check every minute
            "face_service_timeout": 30  # face service request timeout
        }
    
    async def initialize(self):
        """Initialize the worker"""
        try:
            # Initialize SQS service
            self.sqs_service = await get_sqs_service()
            
            # Initialize face service client
            self.face_service_client = httpx.AsyncClient(
                base_url=settings.FACE_RECOGNITION_SERVICE_URL,
                timeout=self.config["face_service_timeout"]
            )
            
            # Test face service connection
            await self._test_face_service()
            
            self.start_time = datetime.utcnow()
            logger.info(f"✅ Face recognition worker {self.worker_id} initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize worker {self.worker_id}: {e}")
            raise
    
    async def _test_face_service(self):
        """Test connection to face recognition service"""
        try:
            response = await self.face_service_client.get("/health")
            if response.status_code == 200:
                logger.info("✅ Face recognition service connection test successful")
            else:
                logger.warning(f"⚠️ Face service health check returned {response.status_code}")
        except Exception as e:
            logger.error(f"❌ Face service connection test failed: {e}")
            raise
    
    async def start(self):
        """Start the worker"""
        try:
            if not self.sqs_service:
                await self.initialize()
            
            self.running = True
            logger.info(f"🚀 Starting face recognition worker {self.worker_id}")
            
            # Set up signal handlers for graceful shutdown
            self._setup_signal_handlers()
            
            # Start worker loop
            await self._worker_loop()
            
        except Exception as e:
            logger.error(f"❌ Worker {self.worker_id} failed to start: {e}")
            raise
        finally:
            await self.cleanup()
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            logger.info(f"📡 Received signal {signum}, initiating graceful shutdown...")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def _worker_loop(self):
        """Main worker processing loop"""
        logger.info(f"🔄 Worker {self.worker_id} entering processing loop")
        
        last_health_check = datetime.utcnow()
        
        while self.running:
            try:
                # Periodic health check
                now = datetime.utcnow()
                if (now - last_health_check).seconds >= self.config["health_check_interval"]:
                    await self._health_check()
                    last_health_check = now
                
                # Receive jobs from SQS
                jobs = await self.sqs_service.receive_face_recognition_jobs(
                    max_messages=self.config["max_concurrent_jobs"]
                )
                
                if not jobs:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(self.config["poll_interval"])
                    continue
                
                # Process jobs
                for job in jobs:
                    if not self.running:
                        break
                    
                    await self._process_job(job)
                
            except Exception as e:
                logger.error(f"❌ Error in worker loop: {e}")
                await asyncio.sleep(self.config["poll_interval"])
        
        logger.info(f"🛑 Worker {self.worker_id} stopped")
    
    async def _process_job(self, job: Dict[str, Any]):
        """Process a single face recognition job"""
        job_id = job.get("job_id")
        receipt_handle = job.get("receipt_handle")
        
        try:
            self.current_job = job_id
            logger.info(f"🔍 Processing job {job_id}")
            
            # Update job status to processing
            await self.sqs_service._update_job_status(job_id, SQSJobStatus.PROCESSING, {
                "worker_id": self.worker_id,
                "started_at": datetime.utcnow().isoformat()
            })
            
            # Validate job data
            if not self._validate_job(job):
                await self.sqs_service.fail_job(
                    job_id, receipt_handle, "Invalid job data", retry=False
                )
                return
            
            # Process the face recognition
            result = await self._process_face_recognition(job)
            
            if result.get("success"):
                # Job completed successfully
                await self.sqs_service.complete_job(job_id, receipt_handle, result)
                self.processed_jobs += 1
                logger.info(f"✅ Job {job_id} completed successfully")
            else:
                # Job failed
                error_msg = result.get("error", "Unknown error")
                retry = result.get("retry", True)
                await self.sqs_service.fail_job(job_id, receipt_handle, error_msg, retry)
                self.failed_jobs += 1
                logger.error(f"❌ Job {job_id} failed: {error_msg}")
            
        except asyncio.TimeoutError:
            logger.error(f"⏰ Job {job_id} timed out")
            await self.sqs_service.fail_job(job_id, receipt_handle, "Job timeout", retry=True)
            self.failed_jobs += 1
            
        except Exception as e:
            logger.error(f"❌ Unexpected error processing job {job_id}: {e}")
            await self.sqs_service.fail_job(job_id, receipt_handle, str(e), retry=True)
            self.failed_jobs += 1
            
        finally:
            self.current_job = None    

    def _validate_job(self, job: Dict[str, Any]) -> bool:
        """Validate job data"""
        required_fields = ["job_id", "session_id", "subject_id", "image_data"]
        
        for field in required_fields:
            if field not in job or job[field] is None:
                logger.error(f"❌ Job validation failed: missing {field}")
                return False
        
        # Validate image data
        image_data = job.get("image_data")
        if not isinstance(image_data, bytes) or len(image_data) == 0:
            logger.error("❌ Job validation failed: invalid image data")
            return False
        
        return True
    
    async def _process_face_recognition(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Process face recognition for the job"""
        try:
            job_id = job["job_id"]
            session_id = job["session_id"]
            subject_id = job["subject_id"]
            image_data = job["image_data"]
            
            logger.info(f"🧠 Processing face recognition for job {job_id}")
            
            # Prepare request to face recognition service
            files = {"image": ("image.jpg", image_data, "image/jpeg")}
            params = {"subject_id": subject_id}
            
            # Call face recognition service
            response = await asyncio.wait_for(
                self.face_service_client.post("/process-image", files=files, params=params),
                timeout=self.config["job_timeout"]
            )
            
            if response.status_code == 200:
                face_result = response.json()
                
                # Process the face recognition result
                processed_result = await self._process_face_result(
                    job, face_result
                )
                
                return {
                    "success": True,
                    "job_id": job_id,
                    "session_id": session_id,
                    "face_recognition_result": face_result,
                    "attendance_result": processed_result,
                    "processed_at": datetime.utcnow().isoformat()
                }
            else:
                error_msg = f"Face service error: {response.status_code} - {response.text}"
                logger.error(f"❌ {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "retry": response.status_code >= 500  # Retry on server errors
                }
                
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": "Face recognition service timeout",
                "retry": True
            }
        except Exception as e:
            logger.error(f"❌ Error in face recognition processing: {e}")
            return {
                "success": False,
                "error": str(e),
                "retry": True
            }
    
    async def _process_face_result(self, job: Dict[str, Any], face_result: Dict[str, Any]) -> Dict[str, Any]:
        """Process face recognition result and update attendance"""
        try:
            session_id = job["session_id"]
            subject_id = job["subject_id"]
            
            # Extract recognized students from face result
            recognized_students = face_result.get("recognized_students", [])
            
            if not recognized_students:
                logger.info(f"No students recognized in session {session_id}")
                return {
                    "attendance_updated": False,
                    "students_marked": 0,
                    "message": "No students recognized"
                }
            
            # Update attendance records
            attendance_records = []
            
            for student in recognized_students:
                user_id = student.get("user_id")
                similarity_score = student.get("similarity_score", 0.0)
                
                if user_id:
                    # Create attendance record
                    attendance_data = {
                        "session_id": session_id,
                        "subject_id": subject_id,
                        "student_id": user_id,
                        "status": "present",
                        "confidence": similarity_score,
                        "date": datetime.utcnow().date().isoformat(),
                        "created_at": datetime.utcnow().isoformat(),
                        "processed_by": "face_recognition_worker"
                    }
                    
                    # Save attendance record (this would call the attendance service)
                    saved = await self._save_attendance_record(attendance_data)
                    
                    attendance_records.append({
                        **attendance_data,
                        "saved": saved
                    })
            
            successful_records = [r for r in attendance_records if r.get("saved")]
            
            logger.info(f"✅ Updated attendance for {len(successful_records)} students in session {session_id}")
            
            return {
                "attendance_updated": True,
                "students_marked": len(successful_records),
                "total_recognized": len(recognized_students),
                "attendance_records": attendance_records
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing face result: {e}")
            return {
                "attendance_updated": False,
                "error": str(e)
            }
    
    async def _save_attendance_record(self, attendance_data: Dict[str, Any]) -> bool:
        """Save attendance record to database"""
        try:
            # This would integrate with the attendance service
            # For now, simulate saving
            await asyncio.sleep(0.1)  # Simulate database operation
            
            logger.debug(f"Saved attendance for student {attendance_data['student_id']}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save attendance record: {e}")
            return False
    
    async def _health_check(self):
        """Perform health check"""
        try:
            # Check face service health
            response = await self.face_service_client.get("/health")
            face_service_healthy = response.status_code == 200
            
            # Check SQS connection
            queue_stats = await self.sqs_service.get_queue_stats()
            sqs_healthy = "error" not in queue_stats
            
            if face_service_healthy and sqs_healthy:
                logger.debug(f"✅ Worker {self.worker_id} health check passed")
            else:
                logger.warning(f"⚠️ Worker {self.worker_id} health check issues: face_service={face_service_healthy}, sqs={sqs_healthy}")
            
        except Exception as e:
            logger.error(f"❌ Health check failed for worker {self.worker_id}: {e}")
    
    async def stop(self):
        """Stop the worker gracefully"""
        logger.info(f"🛑 Stopping worker {self.worker_id}")
        self.running = False
        
        # Wait for current job to complete
        if self.current_job:
            logger.info(f"⏳ Waiting for current job {self.current_job} to complete...")
            timeout = 30  # 30 seconds max wait
            while self.current_job and timeout > 0:
                await asyncio.sleep(1)
                timeout -= 1
            
            if self.current_job:
                logger.warning(f"⚠️ Current job {self.current_job} did not complete in time")
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.face_service_client:
                await self.face_service_client.aclose()
            
            logger.info(f"🧹 Worker {self.worker_id} cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Error during worker cleanup: {e}")
    
    def get_worker_stats(self) -> Dict[str, Any]:
        """Get worker statistics"""
        uptime = None
        if self.start_time:
            uptime = (datetime.utcnow() - self.start_time).total_seconds()
        
        return {
            "worker_id": self.worker_id,
            "running": self.running,
            "current_job": self.current_job,
            "processed_jobs": self.processed_jobs,
            "failed_jobs": self.failed_jobs,
            "success_rate": (
                self.processed_jobs / (self.processed_jobs + self.failed_jobs) * 100
                if (self.processed_jobs + self.failed_jobs) > 0 else 0
            ),
            "uptime_seconds": uptime,
            "start_time": self.start_time.isoformat() if self.start_time else None
        }

class WorkerManager:
    """
    Manages multiple face recognition workers
    """
    
    def __init__(self, num_workers: int = 1):
        self.num_workers = num_workers
        self.workers = []
        self.running = False
    
    async def start_workers(self):
        """Start all workers"""
        try:
            logger.info(f"🚀 Starting {self.num_workers} face recognition workers")
            
            self.running = True
            tasks = []
            
            for i in range(self.num_workers):
                worker_id = f"worker-{i+1}"
                worker = FaceRecognitionWorker(worker_id)
                self.workers.append(worker)
                
                # Start worker in background task
                task = asyncio.create_task(worker.start())
                tasks.append(task)
            
            # Wait for all workers to complete
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"❌ Error starting workers: {e}")
            raise
        finally:
            await self.stop_workers()
    
    async def stop_workers(self):
        """Stop all workers gracefully"""
        logger.info(f"🛑 Stopping {len(self.workers)} workers")
        
        self.running = False
        
        # Stop all workers
        stop_tasks = []
        for worker in self.workers:
            task = asyncio.create_task(worker.stop())
            stop_tasks.append(task)
        
        # Wait for all workers to stop
        await asyncio.gather(*stop_tasks, return_exceptions=True)
        
        logger.info("✅ All workers stopped")
    
    def get_manager_stats(self) -> Dict[str, Any]:
        """Get manager and all worker statistics"""
        worker_stats = [worker.get_worker_stats() for worker in self.workers]
        
        total_processed = sum(w["processed_jobs"] for w in worker_stats)
        total_failed = sum(w["failed_jobs"] for w in worker_stats)
        
        return {
            "num_workers": self.num_workers,
            "running": self.running,
            "total_processed_jobs": total_processed,
            "total_failed_jobs": total_failed,
            "overall_success_rate": (
                total_processed / (total_processed + total_failed) * 100
                if (total_processed + total_failed) > 0 else 0
            ),
            "workers": worker_stats
        }

# CLI entry point for running workers
async def main():
    """Main entry point for running face recognition workers"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Face Recognition Worker")
    parser.add_argument("--workers", type=int, default=1, help="Number of workers to start")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Start worker manager
    manager = WorkerManager(num_workers=args.workers)
    
    try:
        await manager.start_workers()
    except KeyboardInterrupt:
        logger.info("🛑 Received interrupt signal")
    except Exception as e:
        logger.error(f"❌ Worker manager error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())