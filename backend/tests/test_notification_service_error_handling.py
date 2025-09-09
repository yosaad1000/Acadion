import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from postgrest.exceptions import APIError

from app.services.notification_service import (
    NotificationService,
    NotificationServiceError,
    NotificationConnectionError,
    NotificationValidationError
)
from app.models.notification import NotificationCreate, NotificationType


class TestNotificationServiceErrorHandling:
    """Test error handling and resilience in NotificationService"""

    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client"""
        mock_client = Mock()
        mock_table = Mock()
        mock_client.table.return_value = mock_table
        return mock_client, mock_table

    @pytest.fixture
    def notification_service(self, mock_supabase):
        """Create NotificationService with mocked Supabase"""
        mock_client, mock_table = mock_supabase
        
        with patch('app.services.notification_service.create_client', return_value=mock_client):
            service = NotificationService()
            service._mock_table = mock_table  # Store for test access
            return service

    @pytest.fixture
    def sample_notification(self):
        """Sample notification for testing"""
        return NotificationCreate(
            recipient_id="user-123",
            sender_id="sender-456",
            type=NotificationType.STUDENT_JOINED,
            title="Test Notification",
            message="This is a test notification",
            data={
                "student_name": "John Doe",
                "subject_name": "Mathematics",
                "subject_code": "MATH101",
                "joined_at": "2023-01-01T00:00:00Z"
            }
        )

    def test_initialization_failure(self):
        """Test service initialization failure"""
        with patch('app.services.notification_service.create_client', side_effect=Exception("Connection failed")):
            with pytest.raises(NotificationConnectionError, match="Failed to initialize Supabase client"):
                NotificationService()

    def test_service_health_status(self, notification_service):
        """Test service health status tracking"""
        assert notification_service.is_healthy() is True
        
        # Simulate connection failure
        notification_service._connection_healthy = False
        assert notification_service.is_healthy() is False

    @pytest.mark.asyncio
    async def test_retry_mechanism_success_after_failure(self, notification_service, sample_notification):
        """Test retry mechanism succeeds after initial failure"""
        mock_table = notification_service._mock_table
        
        # Mock first call to fail, second to succeed
        mock_execute = Mock()
        mock_execute.side_effect = [
            APIError({"message": "Temporary failure"}),
            Mock(data=[{"id": "notification-123"}])
        ]
        
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            result = await notification_service.create_notification(sample_notification)
        
        assert result is True
        assert mock_execute.call_count == 2
        assert notification_service.is_healthy() is True

    @pytest.mark.asyncio
    async def test_retry_mechanism_max_attempts_exceeded(self, notification_service, sample_notification):
        """Test retry mechanism fails after max attempts"""
        mock_table = notification_service._mock_table
        
        # Mock all calls to fail
        mock_execute = Mock()
        mock_execute.side_effect = APIError({"message": "Persistent failure"})
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            with pytest.raises(NotificationConnectionError, match="Database operation failed after 3 attempts"):
                await notification_service.create_notification(sample_notification)
        
        assert mock_execute.call_count == 3
        assert notification_service.is_healthy() is False

    @pytest.mark.asyncio
    async def test_exponential_backoff_timing(self, notification_service, sample_notification):
        """Test exponential backoff timing in retry mechanism"""
        mock_table = notification_service._mock_table
        
        # Mock calls to fail then succeed
        mock_execute = Mock()
        mock_execute.side_effect = [
            APIError({"message": "Failure 1"}),
            APIError({"message": "Failure 2"}),
            Mock(data=[{"id": "notification-123"}])
        ]
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            # Mock asyncio.sleep to track delays
            with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
                result = await notification_service.create_notification(sample_notification)
        
        assert result is True
        assert mock_execute.call_count == 3
        
        # Check exponential backoff: 1s, 2s
        expected_delays = [1.0, 2.0]
        actual_delays = [call[0][0] for call in mock_sleep.call_args_list]
        assert actual_delays == expected_delays

    @pytest.mark.asyncio
    async def test_validation_error_no_retry(self, notification_service):
        """Test validation errors are not retried"""
        invalid_notification = NotificationCreate(
            recipient_id="",  # Invalid empty recipient_id
            type=NotificationType.STUDENT_JOINED,
            title="Test",
            message="Test message"
        )
        
        with pytest.raises(NotificationValidationError, match="Missing required notification fields"):
            await notification_service.create_notification(invalid_notification)

    @pytest.mark.asyncio
    async def test_client_error_no_retry(self, notification_service, sample_notification):
        """Test 4xx client errors are not retried"""
        mock_table = notification_service._mock_table
        
        # Mock 400 error (client error)
        client_error = APIError({"message": "Bad request", "code": "400"})
        
        mock_execute = Mock()
        mock_execute.side_effect = client_error
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            with pytest.raises(NotificationValidationError, match="Invalid request"):
                await notification_service.create_notification(sample_notification)
        
        # Should only be called once (no retry)
        assert mock_execute.call_count == 1

    @pytest.mark.asyncio
    async def test_get_notifications_validation_errors(self, notification_service):
        """Test validation errors in get_user_notifications"""
        # Test empty user_id
        with pytest.raises(NotificationValidationError, match="User ID is required"):
            await notification_service.get_user_notifications("")
        
        # Test invalid limit
        with pytest.raises(NotificationValidationError, match="Limit must be between 1 and 100"):
            await notification_service.get_user_notifications("user-123", limit=0)
        
        with pytest.raises(NotificationValidationError, match="Limit must be between 1 and 100"):
            await notification_service.get_user_notifications("user-123", limit=101)
        
        # Test negative offset
        with pytest.raises(NotificationValidationError, match="Offset must be non-negative"):
            await notification_service.get_user_notifications("user-123", offset=-1)

    @pytest.mark.asyncio
    async def test_get_notifications_with_retry(self, notification_service):
        """Test get_user_notifications with retry mechanism"""
        mock_table = notification_service._mock_table
        
        # Mock first call to fail, second to succeed
        mock_execute = Mock()
        mock_execute.side_effect = [
            APIError({"message": "Temporary failure"}),
            Mock(data=[{
                'id': 'notif-123',
                'recipient_id': 'user-123',
                'sender_id': 'sender-456',
                'type': 'student_joined',
                'title': 'Test',
                'message': 'Test message',
                'data': None,
                'is_read': False,
                'created_at': '2023-01-01T00:00:00+00:00',
                'updated_at': '2023-01-01T00:00:00+00:00'
            }])
        ]
        
        mock_select = Mock()
        mock_select.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute = mock_execute
        mock_table.select.return_value = mock_select
        
        notifications = await notification_service.get_user_notifications("user-123")
        
        assert len(notifications) == 1
        assert notifications[0].id == 'notif-123'
        assert mock_execute.call_count == 2
        assert notification_service.is_healthy() is True

    @pytest.mark.asyncio
    async def test_malformed_notification_data_handling(self, notification_service):
        """Test handling of malformed notification data from database"""
        mock_table = notification_service._mock_table
        
        # Mock response with malformed data
        mock_execute = Mock()
        mock_execute.return_value = Mock(data=[
            {
                'id': 'notif-123',
                'recipient_id': 'user-123',
                'type': 'invalid_type',  # Invalid notification type
                'title': 'Test',
                'message': 'Test message',
                'is_read': False,
                'created_at': '2023-01-01T00:00:00+00:00'
            },
            {
                'id': 'notif-456',
                'recipient_id': 'user-123',
                'type': 'student_joined',  # Valid notification
                'title': 'Test 2',
                'message': 'Test message 2',
                'is_read': False,
                'created_at': '2023-01-01T00:00:00+00:00'
            }
        ])
        
        mock_select = Mock()
        mock_select.eq.return_value.order.return_value.limit.return_value.offset.return_value.execute = mock_execute
        mock_table.select.return_value = mock_select
        
        notifications = await notification_service.get_user_notifications("user-123")
        
        # Should only return valid notification, skip malformed one
        assert len(notifications) == 1
        assert notifications[0].id == 'notif-456'

    @pytest.mark.asyncio
    async def test_title_truncation(self, notification_service):
        """Test title truncation for long titles"""
        # Create notification with valid data but we'll test truncation in service
        notification = NotificationCreate(
            recipient_id="user-123",
            type=NotificationType.STUDENT_JOINED,
            title="Valid Title",  # We'll modify this in the service
            message="Test message",
            data={
                "student_name": "John Doe",
                "subject_name": "Mathematics",
                "subject_code": "MATH101",
                "joined_at": "2023-01-01T00:00:00Z"
            }
        )
        
        # Override the title to be long for testing
        notification.title = "A" * 300
        
        mock_table = notification_service._mock_table
        mock_execute = Mock()
        mock_execute.return_value = Mock(data=[{"id": "notification-123"}])
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            result = await notification_service.create_notification(notification)
        
        assert result is True
        
        # Check that title was truncated
        call_args = mock_table.insert.call_args[0][0]
        assert len(call_args['title']) == 255
        assert call_args['title'] == "A" * 255

    @pytest.mark.asyncio
    async def test_concurrent_operations_resilience(self, notification_service, sample_notification):
        """Test service resilience under concurrent operations"""
        mock_table = notification_service._mock_table
        
        # Mock some operations to fail, others to succeed
        mock_execute = Mock()
        mock_execute.side_effect = [
            Mock(data=[{"id": "notification-1"}]),
            APIError("Temporary failure"),
            Mock(data=[{"id": "notification-2"}]),
            Mock(data=[{"id": "notification-3"}])
        ]
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            # Run concurrent operations
            tasks = [
                notification_service.create_notification(sample_notification),
                notification_service.create_notification(sample_notification),
                notification_service.create_notification(sample_notification)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # First and third should succeed, second should fail and retry
        assert results[0] is True
        assert isinstance(results[1], NotificationConnectionError)
        assert results[2] is True

    @pytest.mark.asyncio
    async def test_unexpected_exception_handling(self, notification_service, sample_notification):
        """Test handling of unexpected exceptions"""
        mock_table = notification_service._mock_table
        
        # Mock unexpected exception
        mock_execute = Mock()
        mock_execute.side_effect = ValueError("Unexpected error")
        mock_table.insert.return_value.execute = mock_execute
        
        # Mock preference check
        with patch.object(notification_service, '_is_notification_enabled', return_value=True):
            with pytest.raises(NotificationServiceError, match="Failed to create notification"):
                await notification_service.create_notification(sample_notification)
        
        # Should have retried 3 times
        assert mock_execute.call_count == 3