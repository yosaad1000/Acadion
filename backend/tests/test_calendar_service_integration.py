"""
Integration tests for Calendar service.
Tests calendar service integration with other components.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from app.services.calendar_service import calendar_service
from app.models.calendar import CalendarEventCreate, RecurrencePattern, RecurrenceType


class TestCalendarServiceIntegration:
    """Integration test cases for CalendarService."""
    
    def test_calendar_service_global_instance(self):
        """Test that global calendar service instance is available."""
        assert calendar_service is not None
        assert hasattr(calendar_service, 'create_event')
        assert hasattr(calendar_service, 'update_event')
        assert hasattr(calendar_service, 'delete_event')
        assert hasattr(calendar_service, 'get_events')
        assert hasattr(calendar_service, 'check_conflicts')
        assert hasattr(calendar_service, 'create_recurring_event')
    
    def test_calendar_event_create_model_integration(self):
        """Test CalendarEventCreate model integration."""
        event_data = CalendarEventCreate(
            title="Integration Test Event",
            description="Test Description",
            start_datetime=datetime(2024, 12, 25, 10, 0),
            duration_minutes=60,
            location="Test Location",
            attendees=["test@example.com"]
        )
        
        assert event_data.title == "Integration Test Event"
        assert event_data.description == "Test Description"
        assert event_data.duration_minutes == 60
        assert event_data.location == "Test Location"
        assert event_data.attendees == ["test@example.com"]
    
    def test_recurrence_pattern_integration(self):
        """Test RecurrencePattern model integration."""
        from datetime import date
        
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=2,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            end_date=date(2025, 12, 31)  # Use future date
        )
        
        assert pattern.type == RecurrenceType.WEEKLY
        assert pattern.interval == 2
        assert pattern.days_of_week == [0, 2, 4]
        assert pattern.end_date == date(2025, 12, 31)
    
    @pytest.mark.asyncio
    async def test_calendar_service_error_handling_integration(self):
        """Test calendar service error handling integration."""
        from app.services.calendar_service import CalendarError
        
        # Test that CalendarError can be raised and caught
        try:
            raise CalendarError(
                message="Test integration error",
                error_code="INTEGRATION_TEST_ERROR"
            )
        except CalendarError as e:
            assert e.message == "Test integration error"
            assert e.error_code == "INTEGRATION_TEST_ERROR"
    
    def test_calendar_service_retry_config_integration(self):
        """Test retry configuration integration."""
        assert calendar_service.retry_config.max_retries == 3
        assert calendar_service.retry_config.base_delay == 1.0
        assert calendar_service.retry_config.max_delay == 60.0
        assert calendar_service.retry_config.exponential_base == 2.0
        assert calendar_service.retry_config.jitter is True
    
    def test_calendar_service_rate_limit_tracker_integration(self):
        """Test rate limit tracker integration."""
        # Initially empty
        assert calendar_service._rate_limit_tracker == {}
        
        # Can be modified
        calendar_service._rate_limit_tracker[999] = {
            'requests': [],
            'consecutive_errors': 0,
            'last_error_time': None
        }
        
        assert 999 in calendar_service._rate_limit_tracker
        
        # Clean up
        del calendar_service._rate_limit_tracker[999]
    
    def test_calendar_service_utility_methods_integration(self):
        """Test utility methods integration."""
        # Test recurrence rule building
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 4],  # Monday, Friday
            occurrence_count=5
        )
        
        rrule = calendar_service._build_recurrence_rule(pattern)
        
        assert 'FREQ=WEEKLY' in rrule
        assert 'BYDAY=MO,FR' in rrule
        assert 'COUNT=5' in rrule
    
    def test_calendar_service_google_event_conversion_integration(self):
        """Test Google event conversion integration."""
        google_event = {
            'id': 'integration_test_event',
            'summary': 'Integration Test Event',
            'description': 'Test Description',
            'start': {'dateTime': '2024-12-25T10:00:00Z'},
            'end': {'dateTime': '2024-12-25T11:00:00Z'},
            'location': 'Test Location',
            'attendees': [{'email': 'test@example.com'}],
            'created': '2024-12-20T10:00:00Z',
            'updated': '2024-12-20T11:00:00Z'
        }
        
        response = calendar_service._convert_google_event_to_response(google_event)
        
        assert response.event_id == 'integration_test_event'
        assert response.title == 'Integration Test Event'
        assert response.description == 'Test Description'
        assert response.location == 'Test Location'
        assert response.attendees == ['test@example.com']
    
    def test_calendar_service_duration_calculation_integration(self):
        """Test duration calculation integration."""
        google_event = {
            'start': {'dateTime': '2024-12-25T10:00:00Z'},
            'end': {'dateTime': '2024-12-25T12:30:00Z'}
        }
        
        duration = calendar_service._calculate_duration_minutes(google_event)
        assert duration == 150  # 2.5 hours
    
    def test_calendar_service_retry_delay_integration(self):
        """Test retry delay calculation integration."""
        # Test various attempt numbers
        delay_0 = calendar_service._get_retry_delay(0)
        delay_1 = calendar_service._get_retry_delay(1)
        delay_2 = calendar_service._get_retry_delay(2)
        
        # Should increase with attempts (with jitter, so approximate)
        assert delay_0 < delay_2
        assert delay_1 < delay_2 * 1.5  # Account for jitter
        
        # Should respect max delay
        delay_high = calendar_service._get_retry_delay(10)
        assert delay_high <= 60.0  # max_delay