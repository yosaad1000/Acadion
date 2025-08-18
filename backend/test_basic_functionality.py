#!/usr/bin/env python3
"""
Basic functionality test for user preferences models and timezone conversion.
Tests the core functionality without requiring database connections.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, time, date
from app.models.user_preferences import (
    SchedulingPreferences, CalendarCustomization, UserPreferencesCreate,
    TimezoneEnum, DayOfWeek, CSVScheduleRow, TimezoneConversion
)

def test_scheduling_preferences():
    """Test scheduling preferences model."""
    print("Testing SchedulingPreferences...")
    
    # Test valid preferences
    prefs = SchedulingPreferences(
        default_duration_minutes=90,
        buffer_time_minutes=20,
        preferred_start_time=time(9, 0),
        preferred_end_time=time(17, 0),
        default_days_of_week=[DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
        timezone=TimezoneEnum.US_EASTERN
    )
    
    assert prefs.default_duration_minutes == 90
    assert prefs.buffer_time_minutes == 20
    assert prefs.timezone == TimezoneEnum.US_EASTERN
    print("✓ SchedulingPreferences validation passed")
    
    # Test validation errors
    try:
        SchedulingPreferences(default_duration_minutes=10)  # Too short
        assert False, "Should have raised validation error"
    except ValueError:
        print("✓ Duration validation works")
    
    try:
        SchedulingPreferences(default_days_of_week=[])  # Empty list
        assert False, "Should have raised validation error"
    except ValueError:
        print("✓ Days of week validation works")

def test_calendar_customization():
    """Test calendar customization model."""
    print("\nTesting CalendarCustomization...")
    
    # Test valid customization
    custom = CalendarCustomization(
        event_color="#ff5722",
        show_student_count=True,
        include_subject_code=True,
        notification_minutes_before=[15, 60, 1440],
        event_title_template="{subject_code}: {title} ({student_count} students)"
    )
    
    assert custom.event_color == "#ff5722"
    assert custom.show_student_count == True
    print("✓ CalendarCustomization validation passed")
    
    # Test color validation
    try:
        CalendarCustomization(event_color="invalid-color")
        assert False, "Should have raised validation error"
    except ValueError:
        print("✓ Color validation works")

def test_csv_schedule_row():
    """Test CSV schedule row model."""
    print("\nTesting CSVScheduleRow...")
    
    # Test valid CSV row
    row = CSVScheduleRow(
        subject_id="MATH101",
        title="Algebra Basics",
        description="Introduction to algebra",
        start_date="2024-01-15",
        start_time="09:00",
        duration_minutes=60,
        recurrence_type="weekly",
        recurrence_interval=1,
        days_of_week="0,2,4",
        end_date="2024-05-15"
    )
    
    assert row.subject_id == "MATH101"
    assert row.start_date == "2024-01-15"
    assert row.start_time == "09:00"
    print("✓ CSVScheduleRow validation passed")
    
    # Test date validation
    try:
        CSVScheduleRow(
            subject_id="MATH101",
            title="Test",
            start_date="invalid-date",
            start_time="09:00"
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("✓ Date validation works")

def test_timezone_conversion_model():
    """Test timezone conversion model."""
    print("\nTesting TimezoneConversion...")
    
    # Test valid conversion
    conversion = TimezoneConversion(
        from_timezone="UTC",
        to_timezone="US/Eastern",
        datetime_str="2024-01-15T14:00:00Z"
    )
    
    assert conversion.from_timezone == "UTC"
    assert conversion.to_timezone == "US/Eastern"
    print("✓ TimezoneConversion model validation passed")

def test_timezone_conversion_logic():
    """Test actual timezone conversion logic."""
    print("\nTesting timezone conversion logic...")
    
    try:
        from zoneinfo import ZoneInfo
        
        # Test UTC to Eastern conversion
        dt_str = "2024-01-15T14:00:00Z"
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        
        # Convert to US/Eastern
        eastern_tz = ZoneInfo("US/Eastern")
        converted_dt = dt.astimezone(eastern_tz)
        
        # In January, Eastern time is UTC-5 (EST)
        expected_hour = 9  # 14:00 UTC - 5 hours = 09:00 EST
        assert converted_dt.hour == expected_hour
        print(f"✓ Timezone conversion: {dt} -> {converted_dt}")
        
    except ImportError:
        print("⚠ zoneinfo not available, skipping timezone conversion test")

def test_user_preferences_create():
    """Test user preferences creation model."""
    print("\nTesting UserPreferencesCreate...")
    
    # Test with custom preferences
    scheduling = SchedulingPreferences(
        default_duration_minutes=90,
        buffer_time_minutes=20,
        timezone=TimezoneEnum.US_EASTERN
    )
    
    calendar = CalendarCustomization(
        event_color="#ff5722",
        show_student_count=False
    )
    
    prefs_create = UserPreferencesCreate(
        scheduling=scheduling,
        calendar=calendar
    )
    
    assert prefs_create.scheduling.default_duration_minutes == 90
    assert prefs_create.calendar.event_color == "#ff5722"
    print("✓ UserPreferencesCreate validation passed")

def test_custom_day_selection():
    """Test custom day-of-week selection."""
    print("\nTesting custom day selection...")
    
    from app.models.calendar import RecurrencePattern, RecurrenceType
    
    # Test valid custom days
    pattern = RecurrencePattern(
        type=RecurrenceType.WEEKLY,
        interval=1,
        days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
        custom_days_selection=[1, 3]  # Tuesday, Thursday
    )
    
    assert pattern.days_of_week == [0, 2, 4]
    assert pattern.custom_days_selection == [1, 3]
    print("✓ Custom day selection works")
    
    # Test invalid day values
    try:
        RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            days_of_week=[0, 7]  # 7 is invalid
        )
        assert False, "Should have raised validation error"
    except ValueError:
        print("✓ Day validation works")

def main():
    """Run all tests."""
    print("Running basic functionality tests for user preferences...\n")
    
    try:
        test_scheduling_preferences()
        test_calendar_customization()
        test_csv_schedule_row()
        test_timezone_conversion_model()
        test_timezone_conversion_logic()
        test_user_preferences_create()
        test_custom_day_selection()
        
        print("\n🎉 All tests passed! The customization features are working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)