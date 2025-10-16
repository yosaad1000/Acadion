"""
SQS Service for Asynchronous Face Recognition Processing
Handles job queuing, processing, and status tracking
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import uuid
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import httpx

from ..settings import settings

logger = logging.getLogger(__name__)

class SQSJobStatus:
    """Job status constants"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY = "retry"

class SQSService:
    """
    SQS service for managing face recognition job queues
    """
    
    def __init__(self):
        self.sqs_client = None
        self.queue_urls = {}
        self.job_status_cache = {}
        self._initialized = False
        
        # Queue configuration
        self.queue_config = {
            "face_recognition_queue": {
                "name": f"acadion-face-recognition-{settings.ENVIRONMENT}",
                "visibility_timeout": 300,  # 5 minutes
                "message_retention_period": 1209600,  # 14 days
                "receive_message_wait_time": 20,  # Long polling
                "max_receive_count": 3  # Max retries before DLQ
            },
            "face_recognition_dlq": {
                "name": f"acadion-face-recognition-dlq-{settings.ENVIRONMENT}",
                "visibility_timeout": 300,
                "message_retention_period": 1209600,
                "receive_message_wait_time": 0
            }
        }
    
    async def initialize(self):
        """Initialize SQS service and create queues"""
        try:
            # Initialize SQS client
            self.sqs_client = boto3.client(
                'sqs',
                region_name=getattr(settings, 'AWS_REGION', 'us-east-1')
            )
            
            # Test SQS connection
            await self._test_sqs_connection()
            
            # Create or get queue URLs
            await self._setup_queues()
            
            self._initialized = True
            logger.info("✅ SQS service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize SQS service: {e}")
            raise
    
    async def _test_sqs_connection(self):
        """Test SQS connection"""
        try:
            # Use asyncio to run sync boto3 call
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.sqs_client.list_queues)
            logger.info("✅ SQS connection test successful")
        except NoCredentialsError:
            logger.error("❌ AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"❌ SQS connection test failed: {e}")
            raise 
   
    async def _setup_queues(self):
        """Create or get SQS queues"""
        try:
            # Create dead letter queue first
            dlq_url = await self._create_or_get_queue("face_recognition_dlq")
            self.queue_urls["face_recognition_dlq"] = dlq_url
            
            # Get DLQ ARN for main queue configuration
            dlq_arn = await self._get_queue_arn(dlq_url)
            
            # Create main queue with DLQ configuration
            main_queue_url = await self._create_or_get_queue(
                "face_recognition_queue", 
                dlq_arn=dlq_arn
            )
            self.queue_urls["face_recognition_queue"] = main_queue_url
            
            logger.info(f"✅ Queues configured: {list(self.queue_urls.keys())}")
            
        except Exception as e:
            logger.error(f"❌ Failed to setup queues: {e}")
            raise
    
    async def _create_or_get_queue(self, queue_key: str, dlq_arn: Optional[str] = None) -> str:
        """Create or get existing queue URL"""
        try:
            config = self.queue_config[queue_key]
            queue_name = config["name"]
            
            # Queue attributes
            attributes = {
                'VisibilityTimeoutSeconds': str(config["visibility_timeout"]),
                'MessageRetentionPeriod': str(config["message_retention_period"]),
                'ReceiveMessageWaitTimeSeconds': str(config["receive_message_wait_time"])
            }
            
            # Add DLQ configuration for main queue
            if dlq_arn and queue_key == "face_recognition_queue":
                redrive_policy = {
                    "deadLetterTargetArn": dlq_arn,
                    "maxReceiveCount": config["max_receive_count"]
                }
                attributes['RedrivePolicy'] = json.dumps(redrive_policy)
            
            # Create queue
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.sqs_client.create_queue(
                    QueueName=queue_name,
                    Attributes=attributes
                )
            )
            
            queue_url = response['QueueUrl']
            logger.info(f"✅ Queue ready: {queue_name} -> {queue_url}")
            return queue_url
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'QueueAlreadyExists':
                # Get existing queue URL
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.sqs_client.get_queue_url(QueueName=config["name"])
                )
                return response['QueueUrl']
            else:
                raise
    
    async def _get_queue_arn(self, queue_url: str) -> str:
        """Get queue ARN from URL"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.sqs_client.get_queue_attributes(
                    QueueUrl=queue_url,
                    AttributeNames=['QueueArn']
                )
            )
            return response['Attributes']['QueueArn']
        except Exception as e:
            logger.error(f"❌ Failed to get queue ARN: {e}")
            raise
    
    async def submit_face_recognition_job(
        self, 
        session_id: str,
        subject_id: str,
        image_data: bytes,
        user_id: Optional[str] = None,
        priority: int = 0
    ) -> str:
        """
        Submit face recognition job to SQS queue
        
        Args:
            session_id: Attendance session ID
            subject_id: Subject ID for filtering
            image_data: Image bytes to process
            user_id: Optional user ID who submitted the job
            priority: Job priority (0 = normal, higher = more priority)
            
        Returns:
            Job ID for tracking
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            job_id = str(uuid.uuid4())
            
            # Prepare job message
            job_message = {
                "job_id": job_id,
                "session_id": session_id,
                "subject_id": subject_id,
                "user_id": user_id,
                "priority": priority,
                "submitted_at": datetime.utcnow().isoformat(),
                "image_size": len(image_data),
                "retry_count": 0
            }
            
            # Store image data separately (could be S3 in production)
            image_key = f"face_job_{job_id}"
            await self._store_job_image(image_key, image_data)
            job_message["image_key"] = image_key
            
            # Send message to SQS
            queue_url = self.queue_urls["face_recognition_queue"]
            loop = asyncio.get_event_loop()
            
            await loop.run_in_executor(
                None,
                lambda: self.sqs_client.send_message(
                    QueueUrl=queue_url,
                    MessageBody=json.dumps(job_message),
                    MessageAttributes={
                        'Priority': {
                            'StringValue': str(priority),
                            'DataType': 'Number'
                        },
                        'JobType': {
                            'StringValue': 'face_recognition',
                            'DataType': 'String'
                        }
                    }
                )
            )
            
            # Update job status
            await self._update_job_status(job_id, SQSJobStatus.PENDING, {
                "session_id": session_id,
                "subject_id": subject_id,
                "submitted_at": job_message["submitted_at"]
            })
            
            logger.info(f"✅ Face recognition job submitted: {job_id}")
            return job_id
            
        except Exception as e:
            logger.error(f"❌ Failed to submit face recognition job: {e}")
            raise
    
    async def _store_job_image(self, image_key: str, image_data: bytes):
        """Store job image data (placeholder - could use S3)"""
        # For now, store in memory cache
        # In production, this should use S3 or similar storage
        if not hasattr(self, '_image_cache'):
            self._image_cache = {}
        
        self._image_cache[image_key] = {
            "data": image_data,
            "stored_at": datetime.utcnow(),
            "size": len(image_data)
        }
        
        # Clean up old images (keep for 1 hour)
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        keys_to_remove = [
            key for key, value in self._image_cache.items()
            if value["stored_at"] < cutoff_time
        ]
        
        for key in keys_to_remove:
            del self._image_cache[key]
        
        logger.debug(f"Stored image data: {image_key} ({len(image_data)} bytes)")
    
    async def _get_job_image(self, image_key: str) -> Optional[bytes]:
        """Retrieve job image data"""
        if hasattr(self, '_image_cache') and image_key in self._image_cache:
            return self._image_cache[image_key]["data"]
        return None 
   
    async def receive_face_recognition_jobs(self, max_messages: int = 1) -> List[Dict[str, Any]]:
        """
        Receive face recognition jobs from SQS queue
        
        Args:
            max_messages: Maximum number of messages to receive
            
        Returns:
            List of job messages
        """
        try:
            if not self._initialized:
                await self.initialize()
            
            queue_url = self.queue_urls["face_recognition_queue"]
            loop = asyncio.get_event_loop()
            
            response = await loop.run_in_executor(
                None,
                lambda: self.sqs_client.receive_message(
                    QueueUrl=queue_url,
                    MaxNumberOfMessages=min(max_messages, 10),
                    WaitTimeSeconds=20,  # Long polling
                    MessageAttributeNames=['All']
                )
            )
            
            messages = response.get('Messages', [])
            jobs = []
            
            for message in messages:
                try:
                    job_data = json.loads(message['Body'])
                    job_data['receipt_handle'] = message['ReceiptHandle']
                    job_data['message_id'] = message['MessageId']
                    
                    # Get image data
                    image_key = job_data.get('image_key')
                    if image_key:
                        image_data = await self._get_job_image(image_key)
                        job_data['image_data'] = image_data
                    
                    jobs.append(job_data)
                    
                except Exception as e:
                    logger.error(f"❌ Failed to parse job message: {e}")
                    # Delete malformed message
                    await self._delete_message(queue_url, message['ReceiptHandle'])
            
            if jobs:
                logger.info(f"📥 Received {len(jobs)} face recognition jobs")
            
            return jobs
            
        except Exception as e:
            logger.error(f"❌ Failed to receive face recognition jobs: {e}")
            return []
    
    async def complete_job(self, job_id: str, receipt_handle: str, result: Dict[str, Any]):
        """
        Mark job as completed and delete from queue
        
        Args:
            job_id: Job ID
            receipt_handle: SQS message receipt handle
            result: Job processing result
        """
        try:
            # Delete message from queue
            queue_url = self.queue_urls["face_recognition_queue"]
            await self._delete_message(queue_url, receipt_handle)
            
            # Update job status
            await self._update_job_status(job_id, SQSJobStatus.COMPLETED, {
                "completed_at": datetime.utcnow().isoformat(),
                "result": result
            })
            
            # Clean up image data
            await self._cleanup_job_image(job_id)
            
            logger.info(f"✅ Job completed: {job_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to complete job {job_id}: {e}")
            raise
    
    async def fail_job(self, job_id: str, receipt_handle: str, error: str, retry: bool = True):
        """
        Mark job as failed
        
        Args:
            job_id: Job ID
            receipt_handle: SQS message receipt handle
            error: Error message
            retry: Whether to allow retry
        """
        try:
            if retry:
                # Let SQS handle retry by not deleting the message
                # It will be retried based on visibility timeout
                await self._update_job_status(job_id, SQSJobStatus.RETRY, {
                    "error": error,
                    "retry_at": datetime.utcnow().isoformat()
                })
                logger.warning(f"⚠️ Job will be retried: {job_id} - {error}")
            else:
                # Delete message to prevent further retries
                queue_url = self.queue_urls["face_recognition_queue"]
                await self._delete_message(queue_url, receipt_handle)
                
                await self._update_job_status(job_id, SQSJobStatus.FAILED, {
                    "failed_at": datetime.utcnow().isoformat(),
                    "error": error
                })
                
                # Clean up image data
                await self._cleanup_job_image(job_id)
                
                logger.error(f"❌ Job failed permanently: {job_id} - {error}")
            
        except Exception as e:
            logger.error(f"❌ Failed to handle job failure {job_id}: {e}")
    
    async def _delete_message(self, queue_url: str, receipt_handle: str):
        """Delete message from SQS queue"""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.sqs_client.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=receipt_handle
                )
            )
        except Exception as e:
            logger.error(f"❌ Failed to delete SQS message: {e}")
            raise
    
    async def _cleanup_job_image(self, job_id: str):
        """Clean up job image data"""
        try:
            image_key = f"face_job_{job_id}"
            if hasattr(self, '_image_cache') and image_key in self._image_cache:
                del self._image_cache[image_key]
                logger.debug(f"Cleaned up image data: {image_key}")
        except Exception as e:
            logger.error(f"❌ Failed to cleanup job image {job_id}: {e}")
    
    async def _update_job_status(self, job_id: str, status: str, metadata: Dict[str, Any]):
        """Update job status in cache/database"""
        try:
            self.job_status_cache[job_id] = {
                "job_id": job_id,
                "status": status,
                "updated_at": datetime.utcnow().isoformat(),
                **metadata
            }
            
            # In production, this should also update a database
            logger.debug(f"Updated job status: {job_id} -> {status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update job status {job_id}: {e}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status by ID"""
        return self.job_status_cache.get(job_id)
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            if not self._initialized:
                return {"error": "SQS service not initialized"}
            
            stats = {}
            
            for queue_name, queue_url in self.queue_urls.items():
                try:
                    loop = asyncio.get_event_loop()
                    response = await loop.run_in_executor(
                        None,
                        lambda url=queue_url: self.sqs_client.get_queue_attributes(
                            QueueUrl=url,
                            AttributeNames=[
                                'ApproximateNumberOfMessages',
                                'ApproximateNumberOfMessagesNotVisible',
                                'ApproximateNumberOfMessagesDelayed'
                            ]
                        )
                    )
                    
                    attributes = response['Attributes']
                    stats[queue_name] = {
                        "messages_available": int(attributes.get('ApproximateNumberOfMessages', 0)),
                        "messages_in_flight": int(attributes.get('ApproximateNumberOfMessagesNotVisible', 0)),
                        "messages_delayed": int(attributes.get('ApproximateNumberOfMessagesDelayed', 0))
                    }
                    
                except Exception as e:
                    stats[queue_name] = {"error": str(e)}
            
            # Add job status cache stats
            status_counts = {}
            for job_status in self.job_status_cache.values():
                status = job_status.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
            
            stats["job_status_cache"] = {
                "total_jobs": len(self.job_status_cache),
                "status_breakdown": status_counts
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get queue stats: {e}")
            return {"error": str(e)}

# Global SQS service instance
_sqs_service: Optional[SQSService] = None

async def get_sqs_service() -> SQSService:
    """Get the global SQS service instance"""
    global _sqs_service
    
    if _sqs_service is None:
        _sqs_service = SQSService()
        await _sqs_service.initialize()
    
    return _sqs_service