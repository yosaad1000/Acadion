"""
Integration test for calendar models - Docker compatible
Tests that don't require external dependencies
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
    ScheduleInstanceCreate, StudentScheduleAccessCreate,
    CalendarEventCreate, BulkScheduleCreate
)

class TestCalendarIntegration:
    """Test calendar models integration without external dependencies"""
    
    def test_complete_schedule_workflow(self):
        """Test a complete schedule creation workflow"""
        # Create recurrence pattern
        recurrence = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            end_date=date.today() + timedelta(days=90)
        )
        
        # Create class schedule
        schedule = ClassScheduleCreate(
            subject_id="CS101",
            title="Introduction to Programming",
            description="Basic programming concepts and problem solving",
            start_datetime=datetime.now() + timedelta(days=1),
            duration_minutes=90,
            recurrence_pattern=recurrence
        )
        
        # Validate schedule data
        assert schedule.subject_id == "CS101"
        assert schedule.title == "Introduction to Programming"
        assert schedule.duration_minutes == 90
        assert schedule.recurrence_pattern.type == RecurrenceType.WEEKLY
        assert schedule.recurrence_pattern.days_of_week == [0, 2, 4]
        
        # Create student access
        student_access = StudentScheduleAccessCreate(
            student_id="STU001",
            schedule_id=1,
            sync_to_personal_calendar=True
        )
        
        assert student_access.student_id == "STU001"
        assert student_access.sync_to_personal_calendar is True
    
    def test_calendar_connection_workflow(self):
        """Test calendar connection creation workflow"""
        # Create connection request
        connection_create = CalendarConnectionCreate(
            provider=CalendarProvider.GOOGLE,
            calendar_id="primary"
        )
        
        assert connection_create.provider == CalendarProvider.GOOGLE
        assert connection_create.calendar_id == "primary"
        
        # Simulate connection response
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
    
    def test_bulk_schedule_creation(self):
        """Test bulk schedule creation"""
        schedules = []
        
        # Create multiple schedules
        for i in range(3):
            schedule = ClassScheduleCreate(
                subject_id=f"CS10{i+1}",
                title=f"Computer Science {i+1}",
                start_datetime=datetime.now() + timedelta(days=i+1),
                duration_minutes=60
            )
            schedules.append(schedule)
        
        bulk_create = BulkScheduleCreate(schedules=schedules)
        
        assert len(bulk_create.schedules) == 3
        assert bulk_create.schedules[0].subject_id == "CS101"
        assert bulk_create.schedules[1].subject_id == "CS102"
        assert bulk_create.schedules[2].subject_id == "CS103"
    
    def test_calendar_event_models(self):
        """Test calendar event models"""
        event_create = CalendarEventCreate(
            title="Programming Lecture",
            description="Introduction to Python programming",
            start_datetime=datetime.now() + timedelta(hours=2),
            duration_minutes=90,
            attendees=["student1@example.com", "student2@example.com"],
            location="Room 101"
        )
        
        assert event_create.title == "Programming Lecture"
        assert event_create.duration_minutes == 90
        assert len(event_create.attendees) == 2
        assert event_create.location == "Room 101"
    
    def test_schedule_instance_creation(self):
        """Test schedule instance creation"""
        instance_datetime = datetime.now() + timedelta(days=7)
        
        instance = ScheduleInstanceCreate(
            schedule_id=1,
            instance_datetime=instance_datetime,
            google_event_id="event_abc123",
            modifications={"location": "Room 202", "duration_minutes": 120}
        )
        
        assert instance.schedule_id == 1
        assert instance.google_event_id == "event_abc123"
        assert instance.modifications["location"] == "Room 202"
        assert instance.modifications["duration_minutes"] == 120
    
    def test_validation_edge_cases(self):
        """Test validation edge cases"""
        # Test invalid recurrence pattern
        with pytest.raises(ValueError):
            RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                days_of_week=[7, 8]  # Invalid days
            )
        
        # Test invalid schedule duration
        with pytest.raises(ValueError):
            ClassScheduleCreate(
                subject_id="CS101",
                title="Test",
                start_datetime=datetime.now() + timedelta(hours=1),
                duration_minutes=5  # Too short
            )
        
        # Test past start datetime
        with pytest.raises(ValueError):
            ClassScheduleCreate(
                subject_id="CS101",
                title="Test",
                start_datetime=datetime.now() - timedelta(hours=1),  # In the past
                duration_minutes=60
            )
    
    def test_model_serialization(self):
        """Test that models can be serialized to dict"""
        recurrence = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[1, 3, 5],
            end_date=date.today() + timedelta(days=60)
        )
        
        schedule = ClassScheduleCreate(
            subject_id="MATH101",
            title="Calculus I",
            start_datetime=datetime.now() + timedelta(days=1),
            duration_minutes=75,
            recurrence_pattern=recurrence
        )
        
        # Test serialization
        schedule_dict = schedule.model_dump()
        
        assert schedule_dict["subject_id"] == "MATH101"
        assert schedule_dict["title"] == "Calculus I"
        assert schedule_dict["duration_minutes"] == 75
        assert schedule_dict["recurrence_pattern"]["type"] == "weekly"
        assert schedule_dict["recurrence_pattern"]["days_of_week"] == [1, 3, 5]