"""
Unit tests for Calendar service.
Tests calendar operations with mocked Google Calendar API responses.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta

try:
    from googleapiclient.errors import HttpError
except ImportError:
    # Create a mock HttpError for testing when googleapiclient is not available
    class HttpError(Exception):
        def __init__(self, resp, content):
            self.resp = resp
            self.content = content
            super().__init__(f"HTTP Error {resp.status}: {content}")

from app.services.calendar_service import (
    CalendarService, CalendarError, RateLimitError, ConflictError, RetryConfig
)
from app.models.calendar import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse,
    RecurrencePattern, RecurrenceType
)


class TestCalendarService:
    """Test cases for CalendarService functionality."""
    
    def test_calendar_service_initialization(self):
        """Test CalendarService can be initialized with default configuration."""
        service = CalendarService()
        
        assert service.retry_config.max_retries == 3
        assert service.retry_config.base_delay == 1.0
        assert service.retry_config.max_delay == 60.0
        assert service.retry_config.exponential_base == 2.0
        assert service.retry_config.jitter is True
        assert service._rate_limit_tracker == {}
    
    def test_calendar_error_creation(self):
        """Test CalendarError exception creation."""
        error = CalendarError(
            message="Test error",
            error_code="TEST_ERROR",
            retry_after=60
        )
        
        assert str(error) == "Test error"
        assert error.message == "Test error"
        assert error.error_code == "TEST_ERROR"
        assert error.retry_after == 60
    
    def test_rate_limit_error_creation(self):
        """Test RateLimitError exception creation."""
        error = RateLimitError(
            message="Rate limit exceeded",
            error_code="RATE_LIMIT_EXCEEDED",
            retry_after=120
        )
        
        assert str(error) == "Rate limit exceeded"
        assert error.error_code == "RATE_LIMIT_EXCEEDED"
        assert error.retry_after == 120
    
    def test_conflict_error_creation(self):
        """Test ConflictError exception creation."""
        error = ConflictError(
            message="Event conflicts",
            error_code="EVENT_CONFLICT"
        )
        
        assert str(error) == "Event conflicts"
        assert error.error_code == "EVENT_CONFLICT"
    
    def test_retry_config_creation(self):
        """Test RetryConfig dataclass creation."""
        config = RetryConfig(
            max_retries=5,
            base_delay=2.0,
            max_delay=120.0,
            exponential_base=3.0,
            jitter=False
        )
        
        assert config.max_retries == 5
        assert config.base_delay == 2.0
        assert config.max_delay == 120.0
        assert config.exponential_base == 3.0
        assert config.jitter is False
    
    @pytest.mark.asyncio
    async def test_create_event_success(self):
        """Test successful event creation."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service
            mock_service = Mock()
            mock_events = Mock()
            mock_insert = Mock()
            mock_insert.execute.return_value = {'id': 'test_event_id_123'}
            mock_events.insert.return_value = mock_insert
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create test event data
            event_data = CalendarEventCreate(
                title="Test Event",
                description="Test Description",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60,
                location="Test Location",
                attendees=["test@example.com"]
            )
            
            # Mock conflict check to return no conflicts
            service = CalendarService()
            with patch.object(service, 'check_conflicts', return_value=[]):
                # Test
                event_id = await service.create_event(user_id=1, event_data=event_data)
                
                assert event_id == "test_event_id_123"
                
                # Verify service calls
                mock_oauth.get_valid_token.assert_called_once_with(1)
                mock_build.assert_called_once()
                mock_events.insert.assert_called_once()
                
                # Verify event data structure
                call_args = mock_events.insert.call_args
                assert call_args[1]['calendarId'] == 'primary'
                event_body = call_args[1]['body']
                assert event_body['summary'] == 'Test Event'
                assert event_body['description'] == 'Test Description'
                assert event_body['location'] == 'Test Location'
                assert len(event_body['attendees']) == 1
                assert event_body['attendees'][0]['email'] == 'test@example.com'
    
    @pytest.mark.asyncio
    async def test_create_event_with_conflicts(self):
        """Test event creation with conflicts raises ConflictError."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            mock_build.return_value = Mock()
            
            # Create test event data
            event_data = CalendarEventCreate(
                title="Test Event",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            # Mock conflict check to return conflicts
            conflicts = [
                {
                    'event_id': 'existing_event_123',
                    'title': 'Existing Event',
                    'start_datetime': '2024-12-25T10:30:00',
                    'end_datetime': '2024-12-25T11:30:00'
                }
            ]
            
            service = CalendarService()
            with patch.object(service, 'check_conflicts', return_value=conflicts):
                # Test
                with pytest.raises(ConflictError) as exc_info:
                    await service.create_event(user_id=1, event_data=event_data)
                
                assert "Event conflicts with 1 existing events" in str(exc_info.value)
                assert exc_info.value.error_code == "EVENT_CONFLICT"
    
    @pytest.mark.asyncio
    async def test_create_event_no_token(self):
        """Test event creation fails when no valid token is available."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth:
            
            # Setup mocks - no valid token
            mock_oauth.get_valid_token = AsyncMock(return_value=None)
            
            # Create test event data
            event_data = CalendarEventCreate(
                title="Test Event",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            service = CalendarService()
            
            # Test
            with pytest.raises(CalendarError) as exc_info:
                await service.create_event(user_id=1, event_data=event_data)
            
            assert exc_info.value.error_code == "TOKEN_NOT_FOUND"
            assert "No valid calendar access token found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_create_recurring_event_success(self):
        """Test successful recurring event creation."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service
            mock_service = Mock()
            mock_events = Mock()
            mock_insert = Mock()
            mock_insert.execute.return_value = {'id': 'recurring_event_123'}
            mock_events.insert.return_value = mock_insert
            
            # Mock instances call
            mock_instances = Mock()
            mock_instances.execute.return_value = {
                'items': [
                    {'id': 'instance_1'},
                    {'id': 'instance_2'},
                    {'id': 'instance_3'}
                ]
            }
            mock_events.instances.return_value = mock_instances
            
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create test data
            event_data = CalendarEventCreate(
                title="Weekly Meeting",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            recurrence_pattern = RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                interval=1,
                days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
                occurrence_count=10
            )
            
            service = CalendarService()
            
            # Test
            event_ids = await service.create_recurring_event(
                user_id=1,
                event_data=event_data,
                recurrence_pattern=recurrence_pattern
            )
            
            assert len(event_ids) == 3
            assert event_ids == ['instance_1', 'instance_2', 'instance_3']
            
            # Verify service calls
            mock_oauth.get_valid_token.assert_called_once_with(1)
            mock_build.assert_called_once()
            mock_events.insert.assert_called_once()
            mock_events.instances.assert_called_once()
            
            # Verify recurrence rule in event body
            call_args = mock_events.insert.call_args
            event_body = call_args[1]['body']
            assert 'recurrence' in event_body
            assert len(event_body['recurrence']) == 1
            rrule = event_body['recurrence'][0]
            assert 'FREQ=WEEKLY' in rrule
            assert 'BYDAY=MO,WE,FR' in rrule
            assert 'COUNT=10' in rrule
    
    @pytest.mark.asyncio
    async def test_update_event_success(self):
        """Test successful event update."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service
            mock_service = Mock()
            mock_events = Mock()
            
            # Mock get existing event
            existing_event = {
                'id': 'test_event_123',
                'summary': 'Old Title',
                'description': 'Old Description',
                'start': {'dateTime': '2024-12-25T10:00:00Z'},
                'end': {'dateTime': '2024-12-25T11:00:00Z'}
            }
            mock_get = Mock()
            mock_get.execute.return_value = existing_event
            mock_events.get.return_value = mock_get
            
            # Mock update
            mock_update = Mock()
            mock_update.execute.return_value = {'id': 'test_event_123'}
            mock_events.update.return_value = mock_update
            
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create update data
            updates = CalendarEventUpdate(
                title="New Title",
                description="New Description",
                duration_minutes=90
            )
            
            service = CalendarService()
            with patch.object(service, 'check_conflicts', return_value=[]):
                # Test
                result = await service.update_event(
                    user_id=1,
                    event_id="test_event_123",
                    updates=updates
                )
                
                assert result is True
                
                # Verify service calls
                mock_oauth.get_valid_token.assert_called_once_with(1)
                mock_events.get.assert_called_once_with(
                    calendarId='primary',
                    eventId='test_event_123'
                )
                mock_events.update.assert_called_once()
                
                # Verify updated event data
                call_args = mock_events.update.call_args
                updated_event = call_args[1]['body']
                assert updated_event['summary'] == 'New Title'
                assert updated_event['description'] == 'New Description'
    
    @pytest.mark.asyncio
    async def test_delete_event_success(self):
        """Test successful event deletion."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service
            mock_service = Mock()
            mock_events = Mock()
            mock_delete = Mock()
            mock_delete.execute.return_value = None
            mock_events.delete.return_value = mock_delete
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            service = CalendarService()
            
            # Test
            result = await service.delete_event(
                user_id=1,
                event_id="test_event_123"
            )
            
            assert result is True
            
            # Verify service calls
            mock_oauth.get_valid_token.assert_called_once_with(1)
            mock_events.delete.assert_called_once_with(
                calendarId='primary',
                eventId='test_event_123'
            )
    
    @pytest.mark.asyncio
    async def test_get_events_success(self):
        """Test successful event retrieval."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service
            mock_service = Mock()
            mock_events = Mock()
            mock_list = Mock()
            mock_list.execute.return_value = {
                'items': [
                    {
                        'id': 'event_1',
                        'summary': 'Event 1',
                        'description': 'Description 1',
                        'start': {'dateTime': '2024-12-25T10:00:00Z'},
                        'end': {'dateTime': '2024-12-25T11:00:00Z'},
                        'location': 'Location 1',
                        'attendees': [{'email': 'test1@example.com'}],
                        'created': '2024-12-20T10:00:00Z',
                        'updated': '2024-12-20T10:00:00Z'
                    },
                    {
                        'id': 'event_2',
                        'summary': 'Event 2',
                        'description': 'Description 2',
                        'start': {'dateTime': '2024-12-25T14:00:00Z'},
                        'end': {'dateTime': '2024-12-25T15:30:00Z'},
                        'created': '2024-12-20T10:00:00Z',
                        'updated': '2024-12-20T10:00:00Z'
                    }
                ]
            }
            mock_events.list.return_value = mock_list
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            service = CalendarService()
            
            # Test
            start_date = datetime(2024, 12, 25, 0, 0)
            end_date = datetime(2024, 12, 25, 23, 59)
            
            events = await service.get_events(
                user_id=1,
                start_date=start_date,
                end_date=end_date
            )
            
            assert len(events) == 2
            
            # Verify first event
            event1 = events[0]
            assert event1.event_id == 'event_1'
            assert event1.title == 'Event 1'
            assert event1.description == 'Description 1'
            assert event1.location == 'Location 1'
            assert event1.attendees == ['test1@example.com']
            
            # Verify second event
            event2 = events[1]
            assert event2.event_id == 'event_2'
            assert event2.title == 'Event 2'
            assert event2.description == 'Description 2'
            
            # Verify service calls
            mock_oauth.get_valid_token.assert_called_once_with(1)
            mock_events.list.assert_called_once_with(
                calendarId='primary',
                timeMin=start_date.isoformat(),
                timeMax=end_date.isoformat(),
                singleEvents=True,
                orderBy='startTime'
            )
    
    @pytest.mark.asyncio
    async def test_check_conflicts_with_conflicts(self):
        """Test conflict detection with overlapping events."""
        service = CalendarService()
        
        # Mock existing events
        existing_events = [
            CalendarEventResponse(
                event_id='existing_1',
                title='Existing Event 1',
                description='',
                start_datetime=datetime(2024, 12, 25, 10, 30),
                end_datetime=datetime(2024, 12, 25, 11, 30),
                location='',
                attendees=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            ),
            CalendarEventResponse(
                event_id='existing_2',
                title='Existing Event 2',
                description='',
                start_datetime=datetime(2024, 12, 25, 14, 0),
                end_datetime=datetime(2024, 12, 25, 15, 0),
                location='',
                attendees=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        with patch.object(service, 'get_events', return_value=existing_events):
            # Test - event that overlaps with first existing event
            conflicts = await service.check_conflicts(
                user_id=1,
                event_start=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            assert len(conflicts) == 1
            assert conflicts[0]['event_id'] == 'existing_1'
            assert conflicts[0]['title'] == 'Existing Event 1'
            assert 'overlap_start' in conflicts[0]
            assert 'overlap_end' in conflicts[0]
    
    @pytest.mark.asyncio
    async def test_check_conflicts_no_conflicts(self):
        """Test conflict detection with no overlapping events."""
        service = CalendarService()
        
        # Mock existing events that don't overlap
        existing_events = [
            CalendarEventResponse(
                event_id='existing_1',
                title='Existing Event 1',
                description='',
                start_datetime=datetime(2024, 12, 25, 8, 0),
                end_datetime=datetime(2024, 12, 25, 9, 0),
                location='',
                attendees=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        ]
        
        with patch.object(service, 'get_events', return_value=existing_events):
            # Test - event that doesn't overlap
            conflicts = await service.check_conflicts(
                user_id=1,
                event_start=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            assert len(conflicts) == 0
    
    @pytest.mark.asyncio
    async def test_http_error_handling_unauthorized(self):
        """Test handling of 401 Unauthorized HTTP errors."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            mock_oauth.refresh_access_token = AsyncMock(return_value="new_token")
            
            # Mock Google Calendar service to raise 401 error
            mock_service = Mock()
            mock_events = Mock()
            mock_insert = Mock()
            
            # Create mock HTTP error
            mock_response = Mock()
            mock_response.status = 401
            http_error = HttpError(mock_response, b'Unauthorized')
            
            mock_insert.execute.side_effect = http_error
            mock_events.insert.return_value = mock_insert
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create test event data
            event_data = CalendarEventCreate(
                title="Test Event",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            service = CalendarService()
            with patch.object(service, 'check_conflicts', return_value=[]):
                # Test
                with pytest.raises(CalendarError) as exc_info:
                    await service.create_event(user_id=1, event_data=event_data)
                
                assert exc_info.value.error_code == "UNAUTHORIZED"
                assert "Calendar access unauthorized" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_http_error_handling_rate_limit(self):
        """Test handling of 403 rate limit HTTP errors."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service to raise rate limit error
            mock_service = Mock()
            mock_events = Mock()
            mock_insert = Mock()
            
            # Create mock HTTP error for rate limit
            mock_response = Mock()
            mock_response.status = 403
            mock_response.headers = {}
            http_error = HttpError(mock_response, b'quotaExceeded')
            
            mock_insert.execute.side_effect = http_error
            mock_events.insert.return_value = mock_insert
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create test event data
            event_data = CalendarEventCreate(
                title="Test Event",
                start_datetime=datetime(2024, 12, 25, 10, 0),
                duration_minutes=60
            )
            
            service = CalendarService()
            with patch.object(service, 'check_conflicts', return_value=[]):
                # Test
                with pytest.raises(RateLimitError) as exc_info:
                    await service.create_event(user_id=1, event_data=event_data)
                
                assert exc_info.value.error_code == "RATE_LIMIT_EXCEEDED"
                assert "Google Calendar API rate limit exceeded" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_http_error_handling_not_found(self):
        """Test handling of 404 Not Found HTTP errors."""
        with patch('app.services.calendar_service.oauth_service') as mock_oauth, \
             patch('app.services.calendar_service.build') as mock_build:
            
            # Setup mocks
            mock_oauth.get_valid_token = AsyncMock(return_value="valid_token")
            
            # Mock Google Calendar service to raise 404 error
            mock_service = Mock()
            mock_events = Mock()
            mock_get = Mock()
            
            # Create mock HTTP error
            mock_response = Mock()
            mock_response.status = 404
            http_error = HttpError(mock_response, b'Not Found')
            
            mock_get.execute.side_effect = http_error
            mock_events.get.return_value = mock_get
            mock_service.events.return_value = mock_events
            mock_build.return_value = mock_service
            
            # Create update data
            updates = CalendarEventUpdate(title="New Title")
            
            service = CalendarService()
            
            # Test
            with pytest.raises(CalendarError) as exc_info:
                await service.update_event(
                    user_id=1,
                    event_id="nonexistent_event",
                    updates=updates
                )
            
            assert exc_info.value.error_code == "NOT_FOUND"
            assert "Calendar or event not found" in str(exc_info.value)
    
    def test_build_recurrence_rule_weekly(self):
        """Test building RRULE for weekly recurrence."""
        service = CalendarService()
        
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=2,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            occurrence_count=10
        )
        
        rrule = service._build_recurrence_rule(pattern)
        
        assert 'FREQ=WEEKLY' in rrule
        assert 'INTERVAL=2' in rrule
        assert 'BYDAY=MO,WE,FR' in rrule
        assert 'COUNT=10' in rrule
    
    def test_build_recurrence_rule_with_end_date(self):
        """Test building RRULE with end date."""
        service = CalendarService()
        
        from datetime import date
        # Use a future date
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            end_date=date(2025, 12, 31)
        )
        
        rrule = service._build_recurrence_rule(pattern)
        
        assert 'FREQ=WEEKLY' in rrule
        assert 'UNTIL=20251231' in rrule
        assert 'COUNT' not in rrule
    
    def test_calculate_duration_minutes(self):
        """Test calculating event duration from Google Calendar event."""
        service = CalendarService()
        
        google_event = {
            'start': {'dateTime': '2024-12-25T10:00:00Z'},
            'end': {'dateTime': '2024-12-25T11:30:00Z'}
        }
        
        duration = service._calculate_duration_minutes(google_event)
        assert duration == 90  # 1.5 hours
    
    def test_calculate_duration_minutes_invalid_format(self):
        """Test calculating duration with invalid event format returns default."""
        service = CalendarService()
        
        google_event = {
            'start': {'invalid': 'format'},
            'end': {'invalid': 'format'}
        }
        
        duration = service._calculate_duration_minutes(google_event)
        assert duration == 60  # Default 1 hour
    
    def test_convert_google_event_to_response(self):
        """Test converting Google Calendar event to CalendarEventResponse."""
        service = CalendarService()
        
        google_event = {
            'id': 'test_event_123',
            'summary': 'Test Event',
            'description': 'Test Description',
            'start': {'dateTime': '2024-12-25T10:00:00Z'},
            'end': {'dateTime': '2024-12-25T11:00:00Z'},
            'location': 'Test Location',
            'attendees': [
                {'email': 'test1@example.com'},
                {'email': 'test2@example.com'}
            ],
            'created': '2024-12-20T10:00:00Z',
            'updated': '2024-12-20T11:00:00Z'
        }
        
        response = service._convert_google_event_to_response(google_event)
        
        assert response.event_id == 'test_event_123'
        assert response.title == 'Test Event'
        assert response.description == 'Test Description'
        assert response.location == 'Test Location'
        assert response.attendees == ['test1@example.com', 'test2@example.com']
        assert response.start_datetime.year == 2024
        assert response.start_datetime.month == 12
        assert response.start_datetime.day == 25
        assert response.start_datetime.hour == 10
    
    def test_convert_google_event_invalid_format(self):
        """Test converting invalid Google Calendar event raises ValueError."""
        service = CalendarService()
        
        google_event = {
            'id': 'test_event_123',
            # Missing required fields
        }
        
        with pytest.raises(ValueError, match="Invalid Google Calendar event format"):
            service._convert_google_event_to_response(google_event)
    
    def test_get_retry_delay(self):
        """Test retry delay calculation with exponential backoff."""
        service = CalendarService()
        
        # Test exponential backoff
        delay_0 = service._get_retry_delay(0)
        delay_1 = service._get_retry_delay(1)
        delay_2 = service._get_retry_delay(2)
        
        # Base delay is 1.0, exponential base is 2.0
        assert delay_0 >= 0.5  # With jitter, should be at least 50% of base
        assert delay_0 <= 1.5  # With jitter, should be at most 150% of base
        assert delay_1 >= 1.0  # 2^1 * 1.0 * 0.5
        assert delay_1 <= 3.0  # 2^1 * 1.0 * 1.5
        assert delay_2 >= 2.0  # 2^2 * 1.0 * 0.5
        assert delay_2 <= 6.0  # 2^2 * 1.0 * 1.5
    
    def test_get_retry_delay_max_limit(self):
        """Test retry delay respects maximum limit."""
        service = CalendarService()
        
        # Test with high attempt number
        delay = service._get_retry_delay(10)
        
        # Should not exceed max_delay (60.0)
        assert delay <= 60.0
    
    @pytest.mark.asyncio
    async def test_rate_limit_tracking(self):
        """Test rate limit tracking functionality."""
        service = CalendarService()
        
        # Test initial state
        await service._check_rate_limits(user_id=1)
        assert 1 in service._rate_limit_tracker
        assert len(service._rate_limit_tracker[1]['requests']) == 1
        
        # Test multiple requests
        for _ in range(5):
            await service._check_rate_limits(user_id=1)
        
        assert len(service._rate_limit_tracker[1]['requests']) == 6
    
    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self):
        """Test rate limit exceeded raises RateLimitError."""
        service = CalendarService()
        
        # Simulate many requests
        service._rate_limit_tracker[1] = {
            'requests': [datetime.utcnow()] * 51,  # Exceed limit of 50
            'consecutive_errors': 0,
            'last_error_time': None
        }
        
        with pytest.raises(RateLimitError) as exc_info:
            await service._check_rate_limits(user_id=1)
        
        assert exc_info.value.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc_info.value.retry_after == 60