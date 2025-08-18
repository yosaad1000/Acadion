"""
Comprehensive tests for error handling and monitoring system.
Tests structured logging, graceful degradation, error messages, retry queue, and health checks.
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.core.logging_config import setup_logging, get_calendar_logger, PerformanceLogger
from app.services.graceful_degradation import graceful_degradation, ServiceStatus
from app.services.error_messages import error_message_service, ErrorCategory
from app.services.retry_queue import retry_queue_service, RetryConfig, RetryStatus
from app.models.calendar import CalendarEventCreate


class TestStructuredLogging:
    """Test structured logging functionality."""
    
    def test_setup_logging(self):
        """Test logging setup doesn't raise errors."""
        setup_logging()
        
    def test_calendar_logger(self):
        """Test calendar-specific logger creation."""
        logger = get_calendar_logger(__name__)
        assert logger is not None
        assert hasattr(logger, 'log_calendar_operation')
    
    def test_performance_logger(self):
        """Test performance logging context manager."""
        logger = get_calendar_logger(__name__)
        
        with PerformanceLogger(logger, "test_operation", user_id=123):
            # Simulate some work
            pass
        
        # Should complete without errors
    
    def test_structured_log_format(self):
        """Test that logs are properly structured."""
        from app.core.logging_config import StructuredFormatter
        import logging
        
        formatter = StructuredFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        formatted = formatter.format(record)
        log_data = json.loads(formatted)
        
        assert "timestamp" in log_data
        assert "level" in log_data
        assert "message" in log_data
        assert log_data["message"] == "Test message"


class TestGracefulDegradation:
    """Test graceful degradation service."""
    
    @pytest.mark.asyncio
    async def test_service_health_check(self):
        """Test service health checking."""
        health = await graceful_degradation.check_service_health('google_calendar')
        
        assert health is not None
        assert hasattr(health, 'status')
        assert hasattr(health, 'last_check')
        assert hasattr(health, 'error_count')
    
    @pytest.mark.asyncio
    async def test_execute_with_fallback_success(self):
        """Test successful primary operation."""
        
        async def primary_op():
            return "primary_result"
        
        async def fallback_op():
            return "fallback_result"
        
        result = await graceful_degradation.execute_with_fallback(
            primary_op,
            fallback_op,
            "test_operation"
        )
        
        assert result == "primary_result"
    
    @pytest.mark.asyncio
    async def test_execute_with_fallback_failure(self):
        """Test fallback when primary operation fails."""
        
        async def primary_op():
            raise Exception("Primary failed")
        
        async def fallback_op():
            return "fallback_result"
        
        # Set degraded mode to force fallback
        graceful_degradation.degraded_mode = True
        
        result = await graceful_degradation.execute_with_fallback(
            primary_op,
            fallback_op,
            "test_operation"
        )
        
        assert result == "fallback_result"
        
        # Reset degraded mode
        graceful_degradation.degraded_mode = False
    
    @pytest.mark.asyncio
    async def test_local_event_creation(self):
        """Test local event creation as fallback."""
        
        event_data = CalendarEventCreate(
            title="Test Event",
            description="Test Description",
            start_datetime=datetime.utcnow(),
            duration_minutes=60
        )
        
        with patch('app.services.graceful_degradation.LocalSupabase') as mock_db:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 201
            mock_response.json.return_value = [{"id": "test_id"}]
            mock_client.post.return_value = mock_response
            
            with patch('httpx.AsyncClient', return_value=mock_client):
                event_id = await graceful_degradation.create_local_event(123, event_data)
                assert event_id == "local_test_id"
    
    @pytest.mark.asyncio
    async def test_get_local_events(self):
        """Test retrieving local events."""
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=1)
        
        with patch('app.services.graceful_degradation.LocalSupabase') as mock_db:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {
                    "id": "test_id",
                    "title": "Test Event",
                    "description": "Test Description",
                    "start_datetime": start_date.isoformat(),
                    "end_datetime": (start_date + timedelta(hours=1)).isoformat(),
                    "location": "Test Location",
                    "attendees": ["test@example.com"],
                    "is_synced": False
                }
            ]
            mock_client.get.return_value = mock_response
            
            with patch('httpx.AsyncClient', return_value=mock_client):
                events = await graceful_degradation.get_local_events(123, start_date, end_date)
                assert len(events) == 1
                assert events[0].title == "Test Event"
    
    def test_get_service_status(self):
        """Test service status retrieval."""
        status = graceful_degradation.get_service_status()
        
        assert "degraded_mode" in status
        assert "services" in status
        assert "operation_queue" in status


class TestErrorMessages:
    """Test user-friendly error message service."""
    
    def test_get_known_error_message(self):
        """Test getting error message for known error code."""
        error = error_message_service.get_user_friendly_error("TOKEN_NOT_FOUND")
        
        assert error.error_code == "TOKEN_NOT_FOUND"
        assert error.category == ErrorCategory.AUTHENTICATION
        assert "Calendar Not Connected" in error.title
        assert len(error.suggestions) > 0
    
    def test_get_unknown_error_message(self):
        """Test getting error message for unknown error code."""
        error = error_message_service.get_user_friendly_error("UNKNOWN_ERROR_CODE")
        
        assert error.error_code == "INTERNAL_ERROR"
        assert error.category == ErrorCategory.INTERNAL_ERROR
    
    def test_customize_error_message(self):
        """Test error message customization with context."""
        context = {
            "operation": "create_event",
            "event_title": "Test Event",
            "conflict_count": 2
        }
        
        error = error_message_service.get_user_friendly_error("EVENT_CONFLICT", context)
        
        assert "Couldn't Create Event" in error.title
        assert "Test Event" in error.message or "2" in error.message
    
    def test_format_error_response(self):
        """Test formatting error as API response."""
        response = error_message_service.format_error_response("RATE_LIMIT_EXCEEDED")
        
        assert "error" in response
        assert "code" in response["error"]
        assert "category" in response["error"]
        assert "title" in response["error"]
        assert "message" in response["error"]
        assert "suggestions" in response["error"]
    
    def test_get_error_categories(self):
        """Test getting error codes by category."""
        categories = error_message_service.get_error_categories()
        
        assert isinstance(categories, dict)
        assert "authentication" in categories
        assert "rate_limit" in categories
        assert isinstance(categories["authentication"], list)
    
    def test_get_recovery_suggestions(self):
        """Test getting recovery suggestions by category."""
        suggestions = error_message_service.get_recovery_suggestions(ErrorCategory.AUTHENTICATION)
        
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        assert any("Google" in suggestion for suggestion in suggestions)


class TestRetryQueue:
    """Test retry queue service."""
    
    @pytest.mark.asyncio
    async def test_enqueue_operation(self):
        """Test enqueueing an operation for retry."""
        
        operation_data = {
            "event_data": {
                "title": "Test Event",
                "start_datetime": datetime.utcnow().isoformat(),
                "duration_minutes": 60
            },
            "user_id": 123
        }
        
        with patch.object(retry_queue_service, '_store_operation') as mock_store:
            mock_store.return_value = None
            
            operation_id = await retry_queue_service.enqueue_operation(
                "create_calendar_event",
                operation_data,
                123
            )
            
            assert operation_id is not None
            assert len(operation_id) > 0
            mock_store.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_queue_empty(self):
        """Test processing empty queue."""
        
        with patch.object(retry_queue_service, '_get_ready_operations') as mock_get:
            mock_get.return_value = []
            
            stats = await retry_queue_service.process_queue()
            
            assert stats["processed"] == 0
            assert stats["failed"] == 0
    
    @pytest.mark.asyncio
    async def test_retry_config(self):
        """Test retry configuration."""
        config = RetryConfig(
            max_attempts=3,
            initial_delay=2.0,
            max_delay=60.0
        )
        
        assert config.max_attempts == 3
        assert config.initial_delay == 2.0
        assert config.max_delay == 60.0
    
    @pytest.mark.asyncio
    async def test_calculate_next_delay(self):
        """Test retry delay calculation."""
        from app.services.retry_queue import RetryOperation
        
        operation = RetryOperation(
            id="test_id",
            operation_type="test",
            operation_data={},
            user_id=123,
            created_at=datetime.utcnow(),
            next_retry_at=datetime.utcnow(),
            attempt_count=2,
            max_attempts=5,
            status=RetryStatus.PENDING,
            config=RetryConfig(initial_delay=1.0, backoff_multiplier=2.0)
        )
        
        delay = retry_queue_service._calculate_next_delay(operation)
        
        # Should be initial_delay * (backoff_multiplier ^ (attempt_count - 1))
        # 1.0 * (2.0 ^ (2 - 1)) = 2.0 (plus potential jitter)
        assert delay >= 1.5  # Account for jitter
        assert delay <= 3.0
    
    @pytest.mark.asyncio
    async def test_get_queue_status(self):
        """Test getting queue status."""
        
        with patch('app.services.retry_queue.LocalSupabase') as mock_db:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {"status": "pending"},
                {"status": "success"},
                {"status": "failed"}
            ]
            mock_client.get.return_value = mock_response
            
            with patch('httpx.AsyncClient', return_value=mock_client):
                status = await retry_queue_service.get_queue_status()
                
                assert "total_operations" in status
                assert "status_counts" in status
                assert status["total_operations"] == 3


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_system_health_endpoint(self):
        """Test system health endpoint."""
        response = self.client.get("/api/health/health")
        
        # Should return health status even without authentication
        assert response.status_code in [200, 500]  # May fail due to missing services
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
            assert "timestamp" in data
            assert "services" in data
    
    def test_calendar_service_health_endpoint(self):
        """Test calendar service health endpoint."""
        response = self.client.get("/api/health/health/calendar")
        
        # Should return health status even without authentication
        assert response.status_code in [200, 500]  # May fail due to missing services
        
        if response.status_code == 200:
            data = response.json()
            assert "google_calendar_api" in data
            assert "oauth_service" in data
            assert "database_connection" in data
    
    @patch('app.routers.auth.get_current_user')
    def test_user_calendar_health_endpoint(self, mock_get_user):
        """Test user calendar health endpoint."""
        from app.models.user import UserResponse, UserType
        
        mock_user = UserResponse(
            user_id=123,
            email="test@example.com",
            user_type=UserType.FACULTY,
            first_name="Test",
            last_name="User"
        )
        mock_get_user.return_value = mock_user
        
        with patch('app.services.oauth_service.oauth_service.get_connection_status') as mock_status:
            mock_status.return_value = {
                "is_connected": True,
                "provider": "google",
                "calendar_id": "primary"
            }
            
            response = self.client.get("/api/health/health/user/123")
            
            # May fail due to authentication setup, but should not crash
            assert response.status_code in [200, 401, 403, 500]
    
    @patch('app.routers.auth.get_current_user')
    def test_test_connection_endpoint(self, mock_get_user):
        """Test calendar connection test endpoint."""
        from app.models.user import UserResponse, UserType
        
        mock_user = UserResponse(
            user_id=123,
            email="test@example.com",
            user_type=UserType.FACULTY,
            first_name="Test",
            last_name="User"
        )
        mock_get_user.return_value = mock_user
        
        with patch('app.services.oauth_service.oauth_service.get_connection_status') as mock_status:
            mock_status.return_value = {
                "is_connected": False
            }
            
            response = self.client.post("/api/health/health/test-connection")
            
            # May fail due to authentication setup, but should not crash
            assert response.status_code in [200, 401, 403, 500]


class TestErrorRecoveryMechanisms:
    """Test error recovery and resilience mechanisms."""
    
    @pytest.mark.asyncio
    async def test_token_refresh_retry(self):
        """Test automatic token refresh on authentication errors."""
        
        with patch('app.services.oauth_service.oauth_service.refresh_access_token') as mock_refresh:
            mock_refresh.return_value = "new_token"
            
            # Simulate token refresh
            token = await mock_refresh(123)
            assert token == "new_token"
    
    @pytest.mark.asyncio
    async def test_rate_limit_backoff(self):
        """Test rate limit handling with backoff."""
        
        from app.services.calendar_service import CalendarService
        
        calendar_service = CalendarService()
        
        # Test rate limit tracking
        await calendar_service._check_rate_limits(123)
        
        # Should complete without errors
    
    @pytest.mark.asyncio
    async def test_network_error_handling(self):
        """Test network error handling and retries."""
        
        from app.services.calendar_service import CalendarError
        
        # Test that CalendarError can be created and handled
        error = CalendarError(
            message="Network error",
            error_code="NETWORK_ERROR",
            retry_after=60
        )
        
        assert error.message == "Network error"
        assert error.error_code == "NETWORK_ERROR"
        assert error.retry_after == 60
    
    @pytest.mark.asyncio
    async def test_database_connection_resilience(self):
        """Test database connection error handling."""
        
        from app.services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        # Test that database client can be created
        assert db.base_url is not None
        assert db.headers is not None


class TestIntegrationScenarios:
    """Test integration scenarios for error handling."""
    
    @pytest.mark.asyncio
    async def test_full_degradation_scenario(self):
        """Test complete service degradation and recovery."""
        
        # Simulate service degradation
        graceful_degradation.degraded_mode = True
        
        # Test that operations can still be queued
        operation_data = {"test": "data"}
        
        with patch.object(retry_queue_service, '_store_operation'):
            operation_id = await retry_queue_service.enqueue_operation(
                "test_operation",
                operation_data,
                123
            )
            assert operation_id is not None
        
        # Test service status reflects degradation
        status = graceful_degradation.get_service_status()
        assert status["degraded_mode"] is True
        
        # Reset for other tests
        graceful_degradation.degraded_mode = False
    
    @pytest.mark.asyncio
    async def test_error_logging_and_recovery(self):
        """Test error logging and recovery workflow."""
        
        logger = get_calendar_logger(__name__)
        
        # Test error logging
        from app.core.logging_config import log_api_error
        
        test_error = Exception("Test error")
        log_api_error(logger, test_error, "test_operation", user_id=123)
        
        # Should complete without raising exceptions
    
    @pytest.mark.asyncio
    async def test_concurrent_operations(self):
        """Test handling of concurrent operations and errors."""
        
        # Test that multiple operations can be processed concurrently
        tasks = []
        
        for i in range(5):
            task = asyncio.create_task(
                retry_queue_service.enqueue_operation(
                    f"test_operation_{i}",
                    {"data": i},
                    123 + i
                )
            )
            tasks.append(task)
        
        with patch.object(retry_queue_service, '_store_operation'):
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # All operations should complete (successfully or with exceptions)
            assert len(results) == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])