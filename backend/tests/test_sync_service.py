"""
Unit tests for Sync service.
Tests sync operations and conflict resolution with mocked dependencies.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.services.sync_service import (
    SyncService, SyncError, ConflictResolutionStrategy, SyncDirection,
    SyncConfig, SyncResult
)
from app.models.calendar import (
    ClassScheduleResponse, CalendarEventResponse, SyncResponse, SyncRequest,
    RecurrencePattern, RecurrenceType, ScheduleStatus, UpdateScope,
    CalendarEventCreate, CalendarEventUpdate, ClassScheduleUpdate
)


class TestSyncService:
    """Test cases for SyncService functionality."""
    
    def test_sync_service_initialization(self):
        """Test SyncService can be initialized with default configuration."""
        service = SyncService()
        
        assert service.config.batch_size == 50
        assert service.config.max_retries == 3
        assert service.config.retry_delay == 2.0
        assert service.config.conflict_resolution == ConflictResolutionStrategy.SCHEDULE_WINS
        assert service.config.sync_window_days == 365
        # Note: calendar_service and scheduling_service might be None if dependencies are not available
        # This is expected behavior for testing environments
    
    def test_sync_error_creation(self):
        """Test SyncError exception creation."""
        error = SyncError(
            message="Test sync error",
            error_code="TEST_SYNC_ERROR",
            details={"key": "value"}
        )
        
        assert error.message == "Test sync error"
        assert error.error_code == "TEST_SYNC_ERROR"
        assert error.details == {"key": "value"}
        assert str(error) == "Test sync error"
    
    def test_sync_result_creation(self):
        """Test SyncResult dataclass creation."""
        result = SyncResult(
            success=True,
            schedule_id=123,
            event_id="event_123",
            action="created",
            conflict_detected=False
        )
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "created"
        assert result.error is None
        assert result.conflict_detected is False
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    async def test_sync_schedule_to_calendar_success(self, mock_oauth_service):
        """Test successful sync of schedule to calendar."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.title = "Test Class"
        mock_schedule.description = "Test Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        mock_schedule.google_event_id = None
        mock_schedule.recurrence_pattern = None
        mock_schedule.teacher_id = "teacher_123"
        
        mock_scheduling_service = AsyncMock()
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        mock_calendar_service = AsyncMock()
        mock_calendar_service.create_event = AsyncMock(return_value="event_123")
        
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": True})
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        service.calendar_service = mock_calendar_service
        
        with patch.object(service, '_update_schedule_google_ids', new_callable=AsyncMock) as mock_update:
            result = await service.sync_schedule_to_calendar(123, 456)
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "created"
        
        mock_scheduling_service.get_schedule_by_id.assert_called_once_with(123)
        mock_oauth_service.get_connection_status.assert_called_once_with(456)
        mock_calendar_service.create_event.assert_called_once()
        mock_update.assert_called_once_with(123, "event_123", None)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_sync_schedule_to_calendar_recurring(self, mock_calendar_service, mock_scheduling_service, mock_oauth_service):
        """Test successful sync of recurring schedule to calendar."""
        # Setup mocks
        mock_recurrence = Mock()
        mock_recurrence.type = RecurrenceType.WEEKLY
        mock_recurrence.interval = 1
        
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.title = "Weekly Class"
        mock_schedule.description = "Weekly Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        mock_schedule.google_event_id = None
        mock_schedule.recurrence_pattern = mock_recurrence
        mock_schedule.teacher_id = "teacher_123"
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": True})
        mock_calendar_service.create_recurring_event = AsyncMock(return_value=["event_123", "event_124", "event_125"])
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        service.calendar_service = mock_calendar_service
        
        with patch.object(service, '_update_schedule_google_ids', new_callable=AsyncMock) as mock_update_schedule:
            with patch.object(service, '_update_schedule_instances_google_ids', new_callable=AsyncMock) as mock_update_instances:
                result = await service.sync_schedule_to_calendar(123, 456)
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "created"
        
        mock_calendar_service.create_recurring_event.assert_called_once()
        mock_update_schedule.assert_called_once_with(123, "event_123", "event_123")
        mock_update_instances.assert_called_once_with(123, ["event_123", "event_124", "event_125"])
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_sync_schedule_to_calendar_no_connection(self, mock_scheduling_service, mock_oauth_service):
        """Test sync failure when user has no calendar connection."""
        mock_schedule = Mock()
        mock_schedule.id = 123
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": False})
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        result = await service.sync_schedule_to_calendar(123, 456)
        
        assert result.success is False
        assert result.schedule_id == 123
        assert "No calendar connection" in result.error
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_sync_schedule_to_calendar_already_synced(self, mock_calendar_service, mock_scheduling_service, mock_oauth_service):
        """Test sync skipping when schedule already has Google event ID."""
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.google_event_id = "existing_event_123"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        
        mock_event = Mock()
        mock_event.event_id = "existing_event_123"
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": True})
        mock_calendar_service.get_events = AsyncMock(return_value=[mock_event])
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        service.calendar_service = mock_calendar_service
        
        result = await service.sync_schedule_to_calendar(123, 456, force_sync=False)
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "existing_event_123"
        assert result.action == "skipped"
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_sync_calendar_to_schedule_success(self, mock_calendar_service, mock_scheduling_service, mock_oauth_service):
        """Test successful sync from calendar to schedules."""
        # Setup mocks
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Test Event"
        mock_calendar_event.description = "Test Description"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)
        
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.google_event_id = "event_123"
        mock_schedule.title = "Old Title"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        mock_schedule.description = "Old Description"
        
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": True})
        mock_calendar_service.get_events = AsyncMock(return_value=[mock_calendar_event])
        mock_scheduling_service.get_teacher_schedules = AsyncMock(return_value=[mock_schedule])
        
        service = SyncService()
        service.calendar_service = mock_calendar_service
        service.scheduling_service = mock_scheduling_service
        
        with patch.object(service, '_should_update_schedule', return_value=True) as mock_should_update:
            with patch.object(service, '_update_schedule_from_calendar_event', new_callable=AsyncMock) as mock_update:
                result = await service.sync_calendar_to_schedule(456)
        
        assert result.success is True
        assert result.synced_count == 1
        assert result.failed_count == 0
        
        mock_oauth_service.get_connection_status.assert_called_once_with(456)
        mock_calendar_service.get_events.assert_called_once()
        mock_scheduling_service.get_teacher_schedules.assert_called_once_with("456")
        mock_should_update.assert_called_once_with(mock_schedule, mock_calendar_event)
        mock_update.assert_called_once_with(mock_schedule, mock_calendar_event)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.oauth_service')
    async def test_sync_calendar_to_schedule_no_connection(self, mock_oauth_service):
        """Test sync failure when user has no calendar connection."""
        mock_oauth_service.get_connection_status = AsyncMock(return_value={"is_connected": False})
        
        service = SyncService()
        
        with pytest.raises(SyncError) as exc_info:
            await service.sync_calendar_to_schedule(456)
        
        assert exc_info.value.error_code == "NO_CALENDAR_CONNECTION"
    
    @pytest.mark.asyncio
    async def test_handle_calendar_webhook_sync_notification(self):
        """Test handling of sync notification webhook."""
        webhook_data = {
            "resourceId": "resource_123",
            "resourceState": "sync",
            "channelId": "channel_123"
        }
        
        service = SyncService()
        
        with patch.object(service, '_get_user_from_webhook_channel', return_value=456) as mock_get_user:
            result = await service.handle_calendar_webhook(webhook_data)
        
        assert result is True
        mock_get_user.assert_called_once_with("channel_123")
    
    @pytest.mark.asyncio
    async def test_handle_calendar_webhook_change_notification(self):
        """Test handling of change notification webhook."""
        webhook_data = {
            "resourceId": "resource_123",
            "resourceState": "exists",
            "channelId": "channel_123"
        }
        
        service = SyncService()
        
        with patch.object(service, '_get_user_from_webhook_channel', return_value=456) as mock_get_user:
            with patch.object(service, 'sync_calendar_to_schedule', new_callable=AsyncMock) as mock_sync:
                mock_sync_response = Mock()
                mock_sync_response.synced_count = 2
                mock_sync_response.failed_count = 0
                mock_sync.return_value = mock_sync_response
                
                result = await service.handle_calendar_webhook(webhook_data)
        
        assert result is True
        mock_get_user.assert_called_once_with("channel_123")
        mock_sync.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_calendar_webhook_invalid_data(self):
        """Test handling of webhook with invalid data."""
        webhook_data = {
            "resourceId": "resource_123",
            # Missing resourceState and channelId
        }
        
        service = SyncService()
        result = await service.handle_calendar_webhook(webhook_data)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_handle_calendar_webhook_no_user(self):
        """Test handling of webhook when no user found for channel."""
        webhook_data = {
            "resourceId": "resource_123",
            "resourceState": "exists",
            "channelId": "channel_123"
        }
        
        service = SyncService()
        
        with patch.object(service, '_get_user_from_webhook_channel', return_value=None) as mock_get_user:
            result = await service.handle_calendar_webhook(webhook_data)
        
        assert result is False
        mock_get_user.assert_called_once_with("channel_123")
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_batch_sync_schedules_success(self, mock_scheduling_service):
        """Test successful batch synchronization of schedules."""
        # Setup mocks
        mock_schedule1 = Mock()
        mock_schedule1.id = 123
        mock_schedule2 = Mock()
        mock_schedule2.id = 124
        
        mock_scheduling_service.get_teacher_schedules = AsyncMock(return_value=[mock_schedule1, mock_schedule2])
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        # Mock sync_schedule_to_calendar to return successful results
        async def mock_sync_schedule(schedule_id, user_id, force_sync=False):
            return SyncResult(success=True, schedule_id=schedule_id, action="created")
        
        with patch.object(service, 'sync_schedule_to_calendar', side_effect=mock_sync_schedule) as mock_sync:
            result = await service.batch_sync_schedules(456)
        
        assert result.success is True
        assert result.synced_count == 2
        assert result.failed_count == 0
        assert len(result.errors) == 0
        
        mock_scheduling_service.get_teacher_schedules.assert_called_once_with("456")
        assert mock_sync.call_count == 2
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_batch_sync_schedules_with_failures(self, mock_scheduling_service):
        """Test batch synchronization with some failures."""
        # Setup mocks
        mock_schedule1 = Mock()
        mock_schedule1.id = 123
        mock_schedule2 = Mock()
        mock_schedule2.id = 124
        
        mock_scheduling_service.get_teacher_schedules = AsyncMock(return_value=[mock_schedule1, mock_schedule2])
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        # Mock sync_schedule_to_calendar to return mixed results
        async def mock_sync_schedule(schedule_id, user_id, force_sync=False):
            if schedule_id == 123:
                return SyncResult(success=True, schedule_id=schedule_id, action="created")
            else:
                return SyncResult(success=False, schedule_id=schedule_id, error="Test error")
        
        with patch.object(service, 'sync_schedule_to_calendar', side_effect=mock_sync_schedule) as mock_sync:
            result = await service.batch_sync_schedules(456)
        
        assert result.success is True
        assert result.synced_count == 1
        assert result.failed_count == 1
        assert len(result.errors) == 1
        assert result.errors[0]["schedule_id"] == 124
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_batch_sync_schedules_specific_ids(self, mock_scheduling_service):
        """Test batch synchronization with specific schedule IDs."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        sync_request = SyncRequest(schedule_ids=[123], force_sync=True)
        
        async def mock_sync_schedule(schedule_id, user_id, force_sync=False):
            return SyncResult(success=True, schedule_id=schedule_id, action="created")
        
        with patch.object(service, 'sync_schedule_to_calendar', side_effect=mock_sync_schedule) as mock_sync:
            result = await service.batch_sync_schedules(456, sync_request)
        
        assert result.success is True
        assert result.synced_count == 1
        assert result.failed_count == 0
        
        mock_scheduling_service.get_schedule_by_id.assert_called_once_with(123)
        mock_sync.assert_called_once_with(123, 456, force_sync=True)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_resolve_sync_conflict_calendar_wins(self, mock_calendar_service, mock_scheduling_service):
        """Test conflict resolution with calendar wins strategy."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.title = "Old Title"
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "New Title"
        mock_calendar_event.description = "New Description"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        with patch.object(service, '_update_schedule_from_calendar_event', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = SyncResult(success=True, schedule_id=123, action="updated")
            
            result = await service.resolve_sync_conflict(
                123, mock_calendar_event, ConflictResolutionStrategy.CALENDAR_WINS
            )
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.action == "updated"
        
        mock_scheduling_service.get_schedule_by_id.assert_called_once_with(123)
        mock_update.assert_called_once_with(mock_schedule, mock_calendar_event)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_resolve_sync_conflict_schedule_wins(self, mock_calendar_service, mock_scheduling_service):
        """Test conflict resolution with schedule wins strategy."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.teacher_id = "456"
        mock_schedule.title = "Schedule Title"
        mock_schedule.description = "Schedule Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Calendar Title"
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        mock_calendar_service.update_event = AsyncMock(return_value=True)
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        service.calendar_service = mock_calendar_service
        
        result = await service.resolve_sync_conflict(
            123, mock_calendar_event, ConflictResolutionStrategy.SCHEDULE_WINS
        )
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "updated"
        
        mock_calendar_service.update_event.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_resolve_sync_conflict_manual_review(self, mock_scheduling_service):
        """Test conflict resolution with manual review strategy."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        with patch.object(service, '_flag_for_manual_review', new_callable=AsyncMock) as mock_flag:
            result = await service.resolve_sync_conflict(
                123, mock_calendar_event, ConflictResolutionStrategy.MANUAL_REVIEW
            )
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "flagged_for_review"
        assert result.conflict_detected is True
        
        mock_flag.assert_called_once_with(123, mock_calendar_event)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    async def test_resolve_sync_conflict_merge(self, mock_scheduling_service):
        """Test conflict resolution with merge strategy."""
        # Setup mocks
        mock_schedule = Mock()
        mock_schedule.id = 123
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(return_value=mock_schedule)
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        with patch.object(service, '_merge_schedule_and_event', new_callable=AsyncMock) as mock_merge:
            mock_merge.return_value = SyncResult(success=True, schedule_id=123, action="merged")
            
            result = await service.resolve_sync_conflict(
                123, mock_calendar_event, ConflictResolutionStrategy.MERGE
            )
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.action == "merged"
        
        mock_merge.assert_called_once_with(mock_schedule, mock_calendar_event)
    
    def test_find_matching_schedule_by_google_id(self):
        """Test finding matching schedule by Google event ID."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Test Event"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        
        mock_schedule1 = Mock()
        mock_schedule1.google_event_id = "event_456"
        mock_schedule1.title = "Other Event"
        
        mock_schedule2 = Mock()
        mock_schedule2.google_event_id = "event_123"
        mock_schedule2.title = "Test Event"
        
        schedules = [mock_schedule1, mock_schedule2]
        
        service = SyncService()
        result = service._find_matching_schedule(mock_calendar_event, schedules)
        
        assert result == mock_schedule2
    
    def test_find_matching_schedule_by_title_and_time(self):
        """Test finding matching schedule by title and time when no Google ID match."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Test Event"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        
        mock_schedule1 = Mock()
        mock_schedule1.google_event_id = None
        mock_schedule1.title = "Other Event"
        mock_schedule1.start_datetime = datetime(2024, 3, 15, 10, 0)
        
        mock_schedule2 = Mock()
        mock_schedule2.google_event_id = None
        mock_schedule2.title = "Test Event"
        mock_schedule2.start_datetime = datetime(2024, 3, 15, 10, 2)  # 2 minutes difference
        
        schedules = [mock_schedule1, mock_schedule2]
        
        service = SyncService()
        result = service._find_matching_schedule(mock_calendar_event, schedules)
        
        assert result == mock_schedule2
    
    def test_find_matching_schedule_no_match(self):
        """Test finding matching schedule when no match exists."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Test Event"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        
        mock_schedule = Mock()
        mock_schedule.google_event_id = "event_456"
        mock_schedule.title = "Other Event"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 11, 0)
        
        schedules = [mock_schedule]
        
        service = SyncService()
        result = service._find_matching_schedule(mock_calendar_event, schedules)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_should_update_schedule_differences_detected(self):
        """Test should_update_schedule when differences are detected."""
        # Setup test data
        mock_schedule = Mock()
        mock_schedule.title = "Old Title"
        mock_schedule.description = "Old Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        
        mock_calendar_event = Mock()
        mock_calendar_event.title = "New Title"  # Different title
        mock_calendar_event.description = "Old Description"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)
        
        service = SyncService()
        result = await service._should_update_schedule(mock_schedule, mock_calendar_event)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_should_update_schedule_no_differences(self):
        """Test should_update_schedule when no differences are detected."""
        # Setup test data
        mock_schedule = Mock()
        mock_schedule.title = "Same Title"
        mock_schedule.description = "Same Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        
        mock_calendar_event = Mock()
        mock_calendar_event.title = "Same Title"
        mock_calendar_event.description = "Same Description"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)
        
        service = SyncService()
        result = await service._should_update_schedule(mock_schedule, mock_calendar_event)
        
        assert result is False
    
    def test_is_class_schedule_event_with_keywords(self):
        """Test identifying class schedule events by keywords."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.title = "Math Class - Algebra"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)  # 60 minutes
        
        service = SyncService()
        result = service._is_class_schedule_event(mock_calendar_event)
        
        assert result is True
    
    def test_is_class_schedule_event_no_keywords(self):
        """Test identifying non-class events without keywords."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.title = "Team Meeting"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)  # 60 minutes
        
        service = SyncService()
        result = service._is_class_schedule_event(mock_calendar_event)
        
        assert result is False
    
    def test_is_class_schedule_event_unreasonable_duration(self):
        """Test identifying events with unreasonable duration for classes."""
        # Setup test data
        mock_calendar_event = Mock()
        mock_calendar_event.title = "Math Class"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 10, 15)  # 15 minutes (too short)
        
        service = SyncService()
        result = service._is_class_schedule_event(mock_calendar_event)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_user_from_webhook_channel_not_implemented(self):
        """Test get_user_from_webhook_channel returns None (not implemented)."""
        service = SyncService()
        result = await service._get_user_from_webhook_channel("channel_123")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_flag_for_manual_review(self):
        """Test flagging conflict for manual review."""
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.title = "Test Event"
        mock_calendar_event.description = "Test Description"
        mock_calendar_event.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_calendar_event.end_datetime = datetime(2024, 3, 15, 11, 0)
        
        service = SyncService()
        
        # This should not raise an exception
        await service._flag_for_manual_review(123, mock_calendar_event)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_merge_schedule_and_event_calendar_newer(self, mock_calendar_service, mock_scheduling_service):
        """Test merging when calendar event is newer."""
        # Setup test data
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.updated_at = datetime(2024, 3, 15, 9, 0)  # Older
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.updated_at = datetime(2024, 3, 15, 10, 0)  # Newer
        
        service = SyncService()
        service.scheduling_service = mock_scheduling_service
        
        with patch.object(service, '_update_schedule_from_calendar_event', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = SyncResult(success=True, schedule_id=123, action="updated")
            
            result = await service._merge_schedule_and_event(mock_schedule, mock_calendar_event)
        
        assert result.success is True
        assert result.action == "updated"
        mock_update.assert_called_once_with(mock_schedule, mock_calendar_event)
    
    @pytest.mark.asyncio
    @patch('app.services.sync_service.SyncService.scheduling_service')
    @patch('app.services.sync_service.SyncService.calendar_service')
    async def test_merge_schedule_and_event_schedule_newer(self, mock_calendar_service, mock_scheduling_service):
        """Test merging when schedule is newer."""
        # Setup test data
        mock_schedule = Mock()
        mock_schedule.id = 123
        mock_schedule.teacher_id = "456"
        mock_schedule.title = "Schedule Title"
        mock_schedule.description = "Schedule Description"
        mock_schedule.start_datetime = datetime(2024, 3, 15, 10, 0)
        mock_schedule.duration_minutes = 60
        mock_schedule.updated_at = datetime(2024, 3, 15, 10, 0)  # Newer
        
        mock_calendar_event = Mock()
        mock_calendar_event.event_id = "event_123"
        mock_calendar_event.updated_at = datetime(2024, 3, 15, 9, 0)  # Older
        
        mock_calendar_service.update_event = AsyncMock(return_value=True)
        
        service = SyncService()
        service.calendar_service = mock_calendar_service
        
        result = await service._merge_schedule_and_event(mock_schedule, mock_calendar_event)
        
        assert result.success is True
        assert result.schedule_id == 123
        assert result.event_id == "event_123"
        assert result.action == "merged"
        
        mock_calendar_service.update_event.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__])