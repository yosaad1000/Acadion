"""
User preferences models for customization and advanced scheduling features.
Handles default duration preferences, buffer time settings, timezone handling,
and other user-specific customization options.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import time
from enum import Enum
import pytz

class TimezoneEnum(str, Enum):
    """Common timezone options."""
    UTC = "UTC"
    US_EASTERN = "US/Eastern"
    US_CENTRAL = "US/Central"
    US_MOUNTAIN = "US/Mountain"
    US_PACIFIC = "US/Pacific"
    EUROPE_LONDON = "Europe/London"
    EUROPE_PARIS = "Europe/Paris"
    ASIA_TOKYO = "Asia/Tokyo"
    ASIA_SHANGHAI = "Asia/Shanghai"
    AUSTRALIA_SYDNEY = "Australia/Sydney"

class DayOfWeek(int, Enum):
    """Days of the week (0=Monday, 6=Sunday)."""
    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6

class SchedulingPreferences(BaseModel):
    """User preferences for scheduling behavior."""
    default_duration_minutes: int = Field(
        default=60, 
        ge=15, 
        le=480, 
        description="Default class duration in minutes (15 min to 8 hours)"
    )
    buffer_time_minutes: int = Field(
        default=15, 
        ge=0, 
        le=120, 
        description="Buffer time between consecutive classes in minutes"
    )
    preferred_start_time: Optional[time] = Field(
        default=None,
        description="Preferred start time for classes (e.g., 09:00)"
    )
    preferred_end_time: Optional[time] = Field(
        default=None,
        description="Preferred end time for classes (e.g., 17:00)"
    )
    default_days_of_week: List[DayOfWeek] = Field(
        default=[DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
        description="Default days of the week for recurring classes"
    )
    timezone: TimezoneEnum = Field(
        default=TimezoneEnum.UTC,
        description="User's timezone for scheduling"
    )
    auto_sync_to_calendar: bool = Field(
        default=True,
        description="Automatically sync new schedules to Google Calendar"
    )
    conflict_detection_enabled: bool = Field(
        default=True,
        description="Enable conflict detection when scheduling"
    )
    
    @field_validator('default_days_of_week')
    @classmethod
    def validate_days_of_week(cls, v):
        if not v:
            raise ValueError('At least one day of the week must be selected')
        if len(set(v)) != len(v):
            raise ValueError('Days of week must be unique')
        return v
    
    @field_validator('preferred_start_time', 'preferred_end_time')
    @classmethod
    def validate_time_format(cls, v):
        if v is not None:
            # Ensure time is within reasonable bounds (6 AM to 11 PM)
            if v.hour < 6 or v.hour > 23:
                raise ValueError('Time must be between 06:00 and 23:00')
        return v

class CalendarCustomization(BaseModel):
    """Customization options for calendar display and behavior."""
    event_color: Optional[str] = Field(
        default="#4285f4",
        description="Default color for calendar events (hex color)"
    )
    show_student_count: bool = Field(
        default=True,
        description="Show enrolled student count in event titles"
    )
    include_subject_code: bool = Field(
        default=True,
        description="Include subject code in event titles"
    )
    notification_minutes_before: List[int] = Field(
        default=[15, 60],
        description="Minutes before event to send notifications"
    )
    event_title_template: str = Field(
        default="{subject_code}: {title}",
        description="Template for event titles (supports {subject_code}, {title}, {student_count})"
    )
    
    @field_validator('event_color')
    @classmethod
    def validate_color(cls, v):
        if v is not None:
            import re
            if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
                raise ValueError('Color must be a valid hex color (e.g., #4285f4)')
        return v
    
    @field_validator('notification_minutes_before')
    @classmethod
    def validate_notifications(cls, v):
        if v:
            for minutes in v:
                if minutes < 0 or minutes > 10080:  # Max 1 week
                    raise ValueError('Notification minutes must be between 0 and 10080 (1 week)')
        return v

class UserPreferences(BaseModel):
    """Complete user preferences model."""
    user_id: str
    scheduling: SchedulingPreferences = Field(default_factory=SchedulingPreferences)
    calendar: CalendarCustomization = Field(default_factory=CalendarCustomization)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserPreferencesCreate(BaseModel):
    """Model for creating user preferences."""
    scheduling: Optional[SchedulingPreferences] = None
    calendar: Optional[CalendarCustomization] = None

class UserPreferencesUpdate(BaseModel):
    """Model for updating user preferences."""
    scheduling: Optional[SchedulingPreferences] = None
    calendar: Optional[CalendarCustomization] = None

class UserPreferencesResponse(BaseModel):
    """Response model for user preferences."""
    user_id: str
    scheduling: SchedulingPreferences
    calendar: CalendarCustomization
    created_at: str
    updated_at: str

# CSV Import Models
class CSVScheduleRow(BaseModel):
    """Model for a single row in CSV schedule import."""
    subject_id: str = Field(description="Subject ID")
    title: str = Field(description="Class title")
    description: Optional[str] = Field(default="", description="Class description")
    start_date: str = Field(description="Start date (YYYY-MM-DD)")
    start_time: str = Field(description="Start time (HH:MM)")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="Duration in minutes")
    recurrence_type: Optional[str] = Field(default=None, description="weekly, biweekly, or custom")
    recurrence_interval: Optional[int] = Field(default=1, description="Recurrence interval")
    days_of_week: Optional[str] = Field(default=None, description="Comma-separated days (0-6)")
    end_date: Optional[str] = Field(default=None, description="End date for recurrence (YYYY-MM-DD)")
    occurrence_count: Optional[int] = Field(default=None, description="Number of occurrences")
    
    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        if v is not None and v != "":
            from datetime import datetime
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @field_validator('start_time')
    @classmethod
    def validate_time_format(cls, v):
        from datetime import datetime
        try:
            datetime.strptime(v, '%H:%M')
        except ValueError:
            raise ValueError('Time must be in HH:MM format')
        return v
    
    @field_validator('days_of_week')
    @classmethod
    def validate_days_of_week(cls, v):
        if v is not None and v != "":
            try:
                days = [int(day.strip()) for day in v.split(',')]
                if not all(0 <= day <= 6 for day in days):
                    raise ValueError('Days of week must be between 0 (Monday) and 6 (Sunday)')
            except ValueError as e:
                if "invalid literal" in str(e):
                    raise ValueError('Days of week must be comma-separated integers (0-6)')
                raise
        return v

class CSVImportRequest(BaseModel):
    """Request model for CSV import."""
    csv_data: str = Field(description="CSV data as string")
    skip_header: bool = Field(default=True, description="Skip first row as header")
    timezone: TimezoneEnum = Field(default=TimezoneEnum.UTC, description="Timezone for imported schedules")
    auto_sync: bool = Field(default=True, description="Auto-sync imported schedules to calendar")

class CSVImportResult(BaseModel):
    """Result of CSV import operation."""
    total_rows: int
    successful_imports: int
    failed_imports: int
    created_schedules: List[int] = Field(description="IDs of created schedules")
    errors: List[Dict[str, Any]] = Field(description="Import errors with row details")
    warnings: List[Dict[str, Any]] = Field(description="Import warnings")

# Timezone Conversion Models
class TimezoneConversion(BaseModel):
    """Model for timezone conversion operations."""
    from_timezone: str
    to_timezone: str
    datetime_str: str
    
    @field_validator('from_timezone', 'to_timezone')
    @classmethod
    def validate_timezone(cls, v):
        try:
            pytz.timezone(v)
        except pytz.exceptions.UnknownTimeZoneError:
            raise ValueError(f'Unknown timezone: {v}')
        return v

class ConvertedDateTime(BaseModel):
    """Result of timezone conversion."""
    original_datetime: str
    converted_datetime: str
    from_timezone: str
    to_timezone: str
    utc_offset_hours: float

# Conflict Detection Models
class ConflictCheck(BaseModel):
    """Model for checking scheduling conflicts."""
    user_id: str
    start_datetime: str
    duration_minutes: int
    exclude_schedule_id: Optional[int] = None
    include_buffer_time: bool = True

class ScheduleConflict(BaseModel):
    """Model representing a scheduling conflict."""
    conflicting_schedule_id: int
    conflicting_title: str
    conflicting_start: str
    conflicting_end: str
    overlap_minutes: int
    conflict_type: str  # "direct_overlap", "buffer_conflict"

class ConflictCheckResult(BaseModel):
    """Result of conflict detection."""
    has_conflicts: bool
    conflicts: List[ScheduleConflict]
    suggested_times: List[str] = Field(description="Alternative time suggestions")

# Bulk Operations Models
class BulkScheduleOperation(BaseModel):
    """Model for bulk schedule operations."""
    schedule_ids: List[int]
    operation: str  # "update", "delete", "sync"
    parameters: Optional[Dict[str, Any]] = None

class BulkOperationResult(BaseModel):
    """Result of bulk operations."""
    total_schedules: int
    successful_operations: int
    failed_operations: int
    results: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]