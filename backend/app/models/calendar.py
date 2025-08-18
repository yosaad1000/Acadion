from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class CalendarProvider(str, Enum):
    GOOGLE = "google"

class UserType(str, Enum):
    STUDENT = "student"
    FACULTY = "faculty"

class RecurrenceType(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    CUSTOM = "custom"

class ScheduleStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    MODIFIED = "modified"

# Calendar Connection Models
class CalendarConnectionCreate(BaseModel):
    provider: CalendarProvider = CalendarProvider.GOOGLE
    calendar_id: Optional[str] = None

class CalendarConnectionResponse(BaseModel):
    id: int
    user_id: str
    user_type: UserType
    provider: CalendarProvider
    calendar_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CalendarConnectionStatus(BaseModel):
    is_connected: bool
    provider: Optional[CalendarProvider] = None
    calendar_id: Optional[str] = None
    connected_at: Optional[datetime] = None

# Recurrence Pattern Models
class RecurrencePattern(BaseModel):
    type: RecurrenceType
    interval: int = Field(default=1, ge=1, description="Interval between occurrences")
    days_of_week: Optional[List[int]] = Field(default=None, description="Days of week (0=Monday, 6=Sunday)")
    end_date: Optional[date] = None
    occurrence_count: Optional[int] = Field(default=None, ge=1)
    custom_days_selection: Optional[List[int]] = Field(default=None, description="Custom day selection for weekly patterns")
    
    @field_validator('days_of_week', 'custom_days_selection')
    @classmethod
    def validate_days_of_week(cls, v):
        if v is not None:
            if not all(0 <= day <= 6 for day in v):
                raise ValueError('Days of week must be between 0 (Monday) and 6 (Sunday)')
            if len(set(v)) != len(v):
                raise ValueError('Days of week must be unique')
        return v
    
    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v):
        if v is not None and v <= date.today():
            raise ValueError('End date must be in the future')
        return v

# Class Schedule Models
class ClassScheduleCreate(BaseModel):
    subject_id: str
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480, description="Duration in minutes (15 min to 8 hours)")
    recurrence_pattern: Optional[RecurrencePattern] = None
    timezone: Optional[str] = Field(default="UTC", description="Timezone for the schedule")
    buffer_time_minutes: Optional[int] = Field(default=15, ge=0, le=120, description="Buffer time before/after class")
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        if v <= datetime.now():
            raise ValueError('Start datetime must be in the future')
        return v
    
    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v):
        if v is not None:
            try:
                import pytz
                pytz.timezone(v)
            except pytz.exceptions.UnknownTimeZoneError:
                raise ValueError(f'Unknown timezone: {v}')
        return v

class ClassScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=480)
    recurrence_pattern: Optional[RecurrencePattern] = None
    is_active: Optional[bool] = None
    
    @field_validator('start_datetime')
    @classmethod
    def validate_start_datetime(cls, v):
        if v is not None and v <= datetime.now():
            raise ValueError('Start datetime must be in the future')
        return v

class ClassScheduleResponse(BaseModel):
    id: int
    teacher_id: str
    subject_id: str
    title: str
    description: Optional[str]
    start_datetime: datetime
    duration_minutes: int
    recurrence_pattern: Optional[RecurrencePattern]
    google_event_id: Optional[str]
    google_recurring_event_id: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Additional computed fields
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None
    enrolled_student_count: Optional[int] = None

# Schedule Instance Models
class ScheduleInstanceCreate(BaseModel):
    schedule_id: int
    instance_datetime: datetime
    google_event_id: Optional[str] = None
    modifications: Optional[Dict[str, Any]] = None

class ScheduleInstanceUpdate(BaseModel):
    instance_datetime: Optional[datetime] = None
    status: Optional[ScheduleStatus] = None
    modifications: Optional[Dict[str, Any]] = None
    google_event_id: Optional[str] = None

class ScheduleInstanceResponse(BaseModel):
    id: int
    schedule_id: int
    instance_datetime: datetime
    google_event_id: Optional[str]
    status: ScheduleStatus
    modifications: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    
    # Additional fields from parent schedule
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None

# Student Schedule Access Models
class StudentScheduleAccessCreate(BaseModel):
    student_id: str
    schedule_id: int
    sync_to_personal_calendar: bool = False

class StudentScheduleAccessUpdate(BaseModel):
    sync_to_personal_calendar: Optional[bool] = None

class StudentScheduleAccessResponse(BaseModel):
    id: int
    student_id: str
    schedule_id: int
    sync_to_personal_calendar: bool
    access_granted_at: datetime
    created_at: datetime

# Calendar Event Models (for Google Calendar API integration)
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    duration_minutes: int = 60
    attendees: Optional[List[str]] = None  # Email addresses
    location: Optional[str] = None

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    attendees: Optional[List[str]] = None
    location: Optional[str] = None

class CalendarEventResponse(BaseModel):
    event_id: str
    title: str
    description: Optional[str]
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str]
    attendees: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

# Bulk Operations Models
class BulkScheduleCreate(BaseModel):
    schedules: List[ClassScheduleCreate]
    
    @field_validator('schedules')
    @classmethod
    def validate_schedules_not_empty(cls, v):
        if not v:
            raise ValueError('At least one schedule must be provided')
        return v

class BulkScheduleResponse(BaseModel):
    created_count: int
    failed_count: int
    created_schedules: List[ClassScheduleResponse]
    errors: List[Dict[str, Any]]

# Sync Models
class SyncRequest(BaseModel):
    schedule_ids: Optional[List[int]] = None  # If None, sync all schedules
    force_sync: bool = False

class SyncResponse(BaseModel):
    success: bool
    synced_count: int
    failed_count: int
    errors: List[Dict[str, Any]]
    last_sync_at: datetime

# Query Models
class ScheduleQuery(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    is_active: Optional[bool] = True
    include_instances: bool = False

class StudentScheduleQuery(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    subject_id: Optional[str] = None
    sync_enabled_only: Optional[bool] = None

# OAuth Models
class OAuthInitiateResponse(BaseModel):
    auth_url: str
    state: str

class OAuthCallbackRequest(BaseModel):
    code: str
    state: str

class OAuthCallbackResponse(BaseModel):
    success: bool
    message: str
    connection_id: Optional[int] = None

# Error Models
class CalendarError(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None

# Update Scope Enum for recurring events
class UpdateScope(str, Enum):
    THIS_INSTANCE = "this_instance"
    THIS_AND_FUTURE = "this_and_future"
    ALL_INSTANCES = "all_instances"

class RecurringScheduleUpdate(BaseModel):
    scope: UpdateScope
    updates: ClassScheduleUpdate
    instance_datetime: Optional[datetime] = None  # Required for THIS_INSTANCE scope
    
    @field_validator('instance_datetime')
    @classmethod
    def validate_instance_datetime(cls, v, info):
        if info.data.get('scope') == UpdateScope.THIS_INSTANCE and v is None:
            raise ValueError('instance_datetime is required for THIS_INSTANCE scope')
        return v