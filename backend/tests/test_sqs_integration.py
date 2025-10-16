"""
Integration tests for SQS-based asynchronous processing system
"""

import pytest
import asyncio
import os
from unittest.mock import Mock, patch
import json
from datetime import datetime

# Test configuration
TEST_CONFIG = {
    "test_session_id": "test-session-123",
    "test_subject_id": "test-subject-456",
    "test_user_id": "test-user-789",
    "test_image_data": b"fake_image_data_for_testing"
}

@pytest.fixture
def mock_aws_credentials():
    """Mock AWS credentials for testing"""
    with patch.dict(os.environ, {
        'AWS_ACCESS_KEY_ID': 'test-key',
        'AWS_SECRET_ACCESS_KEY': 'test-secret',
        'AWS_DEFAULT_REGION': 'us-east-1'
    }):
        yield

@pytest.fixture
def mock_sqs_client():
    """Mock SQS client"""
    mock_client = Mock()
    
    # Mock SQS responses
    mock_client.list_queues.return_value = {'QueueUrls': []}
    mock_client.create_queue.return_value = {
        'QueueUrl': 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
    }
    mock_client.get_queue_url.return_value = {
        'QueueUrl': 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
    }
    mock_client.get_queue_attributes.return_value = {
        'Attributes': {
            'QueueArn': 'arn:aws:sqs:us-east-1:123456789:test-queue',
            'ApproximateNumberOfMessages': '0',
            'ApproximateNumberOfMessagesNotVisible': '0',
            'ApproximateNumberOfMessagesDelayed': '0'
        }
    }
    mock_client.send_message.return_value = {
        'MessageId': 'test-message-id-123'
    }
    mock_client.receive_message.return_value = {
        'Messages': [{
            'MessageId': 'test-message-id-123',
            'ReceiptHandle': 'test-receipt-handle',
            'Body': json.dumps({
                'job_id': 'test-job-123',
                'session_id': TEST_CONFIG['test_session_id'],
                'subject_id': TEST_CONFIG['test_subject_id'],
                'image_key': 'test-image-key'
            })
        }]
    }
    
    return mock_client

@pytest.mark.asyncio
class TestSQSService:
    """Test SQS service functionality"""
    
    async def test_sqs_service_initialization(self, mock_aws_credentials, mock_sqs_client):
        """Test SQS service initialization"""
        with patch('boto3.client', return_value=mock_sqs_client):
            from app.services.sqs_service import SQSService
            
            service = SQSService()
            await service.initialize()
            
            assert service._initialized is True
            assert len(service.queue_urls) == 2  # main queue + DLQ
            mock_sqs_client.create_queue.assert_called()
    
    async def test_submit_face_recognition_job(self, mock_aws_credentials, mock_sqs_client):
        """Test submitting a face recognition job"""
        with patch('boto3.client', return_value=mock_sqs_client):
            from app.services.sqs_service import SQSService
            
            service = SQSService()
            await service.initialize()
            
            job_id = await service.submit_face_recognition_job(
                session_id=TEST_CONFIG['test_session_id'],
                subject_id=TEST_CONFIG['test_subject_id'],
                image_data=TEST_CONFIG['test_image_data'],
                user_id=TEST_CONFIG['test_user_id']
            )
            
            assert job_id is not None
            assert isinstance(job_id, str)
            mock_sqs_client.send_message.assert_called_once()
    
    async def test_receive_face_recognition_jobs(self, mock_aws_credentials, mock_sqs_client):
        """Test receiving face recognition jobs"""
        with patch('boto3.client', return_value=mock_sqs_client):
            from app.services.sqs_service import SQSService
            
            service = SQSService()
            await service.initialize()
            
            # Mock image storage
            service._image_cache = {
                'test-image-key': {
                    'data': TEST_CONFIG['test_image_data'],
                    'stored_at': datetime.utcnow(),
                    'size': len(TEST_CONFIG['test_image_data'])
                }
            }
            
            jobs = await service.receive_face_recognition_jobs(max_messages=1)
            
            assert len(jobs) == 1
            assert jobs[0]['job_id'] == 'test-job-123'
            assert jobs[0]['session_id'] == TEST_CONFIG['test_session_id']
            assert 'image_data' in jobs[0]
            mock_sqs_client.receive_message.assert_called_once()
    
    async def test_get_queue_stats(self, mock_aws_credentials, mock_sqs_client):
        """Test getting queue statistics"""
        with patch('boto3.client', return_value=mock_sqs_client):
            from app.services.sqs_service import SQSService
            
            service = SQSService()
            await service.initialize()
            
            stats = await service.get_queue_stats()
            
            assert 'face_recognition_queue' in stats
            assert 'face_recognition_dlq' in stats
            assert stats['face_recognition_queue']['messages_available'] == 0
            mock_sqs_client.get_queue_attributes.assert_called()

@pytest.mark.asyncio
class TestJobTracker:
    """Test job tracker functionality"""
    
    async def test_job_tracker_initialization(self):
        """Test job tracker initialization"""
        with patch('app.services.job_tracker.get_sqs_service'):
            from app.services.job_tracker import JobTracker
            
            tracker = JobTracker()
            await tracker.initialize()
            
            assert tracker._initialized is True
            assert len(tracker.notification_channels) >= 0
    
    async def test_track_job(self):
        """Test tracking a job"""
        with patch('app.services.job_tracker.get_sqs_service'):
            from app.services.job_tracker import JobTracker, JobType
            
            tracker = JobTracker()
            await tracker.initialize()
            
            job_id = "test-job-123"
            await tracker.track_job(
                job_id=job_id,
                job_type=JobType.FACE_RECOGNITION,
                user_id=TEST_CONFIG['test_user_id'],
                metadata={'session_id': TEST_CONFIG['test_session_id']}
            )
            
            assert job_id in tracker.job_history
            assert tracker.job_history[job_id]['job_type'] == JobType.FACE_RECOGNITION.value
            assert tracker.job_history[job_id]['user_id'] == TEST_CONFIG['test_user_id']
    
    async def test_update_job_status(self):
        """Test updating job status"""
        with patch('app.services.job_tracker.get_sqs_service'):
            from app.services.job_tracker import JobTracker, JobType
            
            tracker = JobTracker()
            await tracker.initialize()
            
            job_id = "test-job-123"
            
            # First track the job
            await tracker.track_job(
                job_id=job_id,
                job_type=JobType.FACE_RECOGNITION,
                user_id=TEST_CONFIG['test_user_id']
            )
            
            # Then update status
            await tracker.update_job_status(
                job_id=job_id,
                status="processing",
                metadata={'worker_id': 'worker-1'},
                notify=False  # Skip notifications for test
            )
            
            job_history = tracker.job_history[job_id]
            assert job_history['current_status'] == 'processing'
            assert len(job_history['status_history']) == 2  # pending + processing
    
    async def test_get_job_statistics(self):
        """Test getting job statistics"""
        with patch('app.services.job_tracker.get_sqs_service'):
            from app.services.job_tracker import JobTracker, JobType
            
            tracker = JobTracker()
            await tracker.initialize()
            
            # Add some test jobs
            for i in range(3):
                await tracker.track_job(
                    job_id=f"test-job-{i}",
                    job_type=JobType.FACE_RECOGNITION,
                    user_id=TEST_CONFIG['test_user_id']
                )
            
            stats = await tracker.get_job_statistics()
            
            assert stats['total_jobs'] == 3
            assert 'status_breakdown' in stats
            assert 'job_type_breakdown' in stats

@pytest.mark.asyncio
class TestAsyncAttendanceService:
    """Test async attendance service functionality"""
    
    async def test_service_initialization(self):
        """Test async attendance service initialization"""
        with patch('app.services.async_attendance_service.get_sqs_service'), \
             patch('app.services.async_attendance_service.get_job_tracker'), \
             patch('app.services.async_attendance_service.get_enhanced_attendance_service'):
            
            from app.services.async_attendance_service import AsyncAttendanceService
            
            service = AsyncAttendanceService()
            await service.initialize()
            
            assert service._initialized is True
    
    async def test_submit_attendance_processing(self):
        """Test submitting attendance processing job"""
        mock_sqs_service = Mock()
        mock_sqs_service.submit_face_recognition_job.return_value = "test-job-123"
        
        with patch('app.services.async_attendance_service.get_sqs_service', return_value=mock_sqs_service), \
             patch('app.services.async_attendance_service.get_job_tracker'), \
             patch('app.services.async_attendance_service.get_enhanced_attendance_service'), \
             patch('app.services.async_attendance_service.track_face_recognition_job'):
            
            from app.services.async_attendance_service import AsyncAttendanceService
            
            service = AsyncAttendanceService()
            await service.initialize()
            
            result = await service.submit_attendance_processing(
                session_id=TEST_CONFIG['test_session_id'],
                subject_id=TEST_CONFIG['test_subject_id'],
                image_data=TEST_CONFIG['test_image_data'],
                user_id=TEST_CONFIG['test_user_id']
            )
            
            assert result['success'] is True
            assert result['job_id'] == "test-job-123"
            assert result['session_id'] == TEST_CONFIG['test_session_id']
            mock_sqs_service.submit_face_recognition_job.assert_called_once()
    
    async def test_get_job_status(self):
        """Test getting job status"""
        mock_job_tracker = Mock()
        mock_job_tracker.get_job_status.return_value = {
            'job_id': 'test-job-123',
            'current_status': 'processing',
            'created_at': datetime.utcnow().isoformat(),
            'metadata': {}
        }
        
        with patch('app.services.async_attendance_service.get_sqs_service'), \
             patch('app.services.async_attendance_service.get_job_tracker', return_value=mock_job_tracker), \
             patch('app.services.async_attendance_service.get_enhanced_attendance_service'):
            
            from app.services.async_attendance_service import AsyncAttendanceService
            
            service = AsyncAttendanceService()
            await service.initialize()
            
            status = await service.get_job_status('test-job-123')
            
            assert status is not None
            assert status['job_id'] == 'test-job-123'
            assert status['status'] == 'processing'
            assert 'progress_percentage' in status
            mock_job_tracker.get_job_status.assert_called_once_with('test-job-123')

@pytest.mark.asyncio
class TestFaceRecognitionWorker:
    """Test face recognition worker functionality"""
    
    async def test_worker_initialization(self):
        """Test worker initialization"""
        with patch('app.services.face_recognition_worker.get_sqs_service'), \
             patch('httpx.AsyncClient'):
            
            from app.services.face_recognition_worker import FaceRecognitionWorker
            
            worker = FaceRecognitionWorker("test-worker")
            await worker.initialize()
            
            assert worker.worker_id == "test-worker"
            assert worker.start_time is not None
    
    async def test_job_validation(self):
        """Test job validation"""
        with patch('app.services.face_recognition_worker.get_sqs_service'), \
             patch('httpx.AsyncClient'):
            
            from app.services.face_recognition_worker import FaceRecognitionWorker
            
            worker = FaceRecognitionWorker("test-worker")
            
            # Valid job
            valid_job = {
                'job_id': 'test-job-123',
                'session_id': TEST_CONFIG['test_session_id'],
                'subject_id': TEST_CONFIG['test_subject_id'],
                'image_data': TEST_CONFIG['test_image_data']
            }
            assert worker._validate_job(valid_job) is True
            
            # Invalid job (missing image_data)
            invalid_job = {
                'job_id': 'test-job-123',
                'session_id': TEST_CONFIG['test_session_id'],
                'subject_id': TEST_CONFIG['test_subject_id']
            }
            assert worker._validate_job(invalid_job) is False

# Integration test that requires actual AWS resources
@pytest.mark.integration
@pytest.mark.asyncio
async def test_end_to_end_job_processing():
    """
    End-to-end integration test for job processing
    This test requires actual AWS credentials and resources
    """
    # Skip if not in integration test environment
    if not os.getenv('RUN_INTEGRATION_TESTS'):
        pytest.skip("Integration tests not enabled")
    
    from app.services.async_attendance_service import get_async_attendance_service
    
    # Get service
    service = await get_async_attendance_service()
    
    # Submit a test job
    result = await service.submit_attendance_processing(
        session_id="integration-test-session",
        subject_id="integration-test-subject",
        image_data=b"test_image_data",
        user_id="integration-test-user"
    )
    
    assert result['success'] is True
    job_id = result['job_id']
    
    # Check job status
    status = await service.get_job_status(job_id)
    assert status is not None
    assert status['job_id'] == job_id
    
    # Wait a bit and check again (job should be processed by workers)
    await asyncio.sleep(5)
    
    final_status = await service.get_job_status(job_id)
    assert final_status['status'] in ['processing', 'completed', 'failed']

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])