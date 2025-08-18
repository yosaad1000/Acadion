"""
Tests for calendar models and database operations
"""

import pytest
from datetime import datetime, date, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.calendar import (
    CalendarConnectionCreate, CalendarConnectionResponse,
    ClassScheduleCreate, ClassScheduleResponse,
    RecurrencePattern, RecurrenceType, UserType, CalendarProvider,
    ScheduleInstanceCreate, StudentScheduleAccessCreate
)

class TestCalendarModels:
    """Test calendar Pydantic models"""
    
    def test_recurrence_pattern_validation(self):
        """Test recurrence pattern validation"""
        # Valid weekly pattern
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            end_date=date.today() + timedelta(days=90)
        )
        assert pattern.type == RecurrenceType.WEEKLY
        assert pattern.days_of_week == [0, 2, 4]
        
        # Invalid days of week
        with pytest.raises(ValueError):
            RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                days_of_week=[7, 8]  # Invalid days
            )
        
        # Duplicate days
        with pytest.raises(ValueError):
            RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                days_of_week=[0, 0, 1]  # Duplicate Monday
            )
    
    def test_class_schedule_create_validation(self):
        """Test class schedule creation validation"""
        future_datetime = datetime.now() + timedelta(hours=2)
        
        # Valid schedule
        schedule = ClassScheduleCreate(
            subject_id="CS101",
            title="Introduction to Programming",
            description="Basic programming concepts",
            start_datetime=future_datetime,
            duration_minutes=90
        )
        assert schedule.subject_id == "CS101"
        assert schedule.duration_minutes == 90
        
        # Invalid start time (in the past)
        with pytest.raises(ValueError):
            ClassScheduleCreate(
                subject_id="CS101",
                title="Test Class",
                start_datetime=datetime.now() - timedelta(hours=1),
                duration_minutes=60
            )
        
        # Invalid duration (too short)
        with pytest.raises(ValueError):
            ClassScheduleCreate(
                subject_id="CS101",
                title="Test Class",
                start_datetime=future_datetime,
                duration_minutes=10  # Less than 15 minutes
            )
    
    def test_calendar_connection_models(self):
        """Test calendar connection models"""
        # Connection creation
        connection_create = CalendarConnectionCreate(
            provider=CalendarProvider.GOOGLE,
            calendar_id="primary"
        )
        assert connection_create.provider == CalendarProvider.GOOGLE
        
        # Connection response
        connection_response = CalendarConnectionResponse(
            id=1,
            user_id="FAC001",
            user_type=UserType.FACULTY,
            provider=CalendarProvider.GOOGLE,
            calendar_id="primary",
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        assert connection_response.user_type == UserType.FACULTY
        assert connection_response.is_active is True
    
    def test_schedule_instance_models(self):
        """Test schedule instance models"""
        instance_datetime = datetime.now() + timedelta(days=1)
        
        instance_create = ScheduleInstanceCreate(
            schedule_id=1,
            instance_datetime=instance_datetime,
            google_event_id="event_123"
        )
        assert instance_create.schedule_id == 1
        assert instance_create.google_event_id == "event_123"
    
    def test_student_schedule_access_models(self):
        """Test student schedule access models"""
        access_create = StudentScheduleAccessCreate(
            student_id="STU001",
            schedule_id=1,
            sync_to_personal_calendar=True
        )
        assert access_create.student_id == "STU001"
        assert access_create.sync_to_personal_calendar is True

class TestRecurrencePatternEdgeCases:
    """Test edge cases for recurrence patterns"""
    
    def test_biweekly_pattern(self):
        """Test biweekly recurrence pattern"""
        pattern = RecurrencePattern(
            type=RecurrenceType.BIWEEKLY,
            interval=2,
            days_of_week=[1, 3],  # Tuesday, Thursday
            occurrence_count=10
        )
        assert pattern.type == RecurrenceType.BIWEEKLY
        assert pattern.interval == 2
        assert pattern.occurrence_count == 10
    
    def test_custom_pattern(self):
        """Test custom recurrence pattern"""
        pattern = RecurrencePattern(
            type=RecurrenceType.CUSTOM,
            interval=3,  # Every 3 weeks
            days_of_week=[0],  # Monday only
            end_date=date.today() + timedelta(days=180)
        )
        assert pattern.type == RecurrenceType.CUSTOM
        assert pattern.interval == 3
    
    def test_end_date_validation(self):
        """Test end date validation"""
        # Valid future end date
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            end_date=date.today() + timedelta(days=30)
        )
        assert pattern.end_date > date.today()
        
        # Invalid past end date
        with pytest.raises(ValueError):
            RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                end_date=date.today() - timedelta(days=1)
            )