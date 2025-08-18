# Customization and Advanced Scheduling Features

This document describes the implementation of Task 11: "Add customization and advanced scheduling features" for the Google Calendar Class Scheduling system.

## Overview

The customization features provide teachers with advanced scheduling capabilities including:

1. **Default Duration Preferences** - Customizable default class durations
2. **Custom Day-of-Week Selection** - Flexible weekly recurring patterns
3. **Buffer Time Settings** - Configurable time gaps between consecutive classes
4. **Timezone Handling** - Multi-timezone support for global institutions
5. **CSV Import Functionality** - Bulk schedule creation from CSV files
6. **Bulk Operations** - Mass operations on multiple schedules

## Requirements Addressed

- **Requirement 5.1**: Default duration preferences in user settings
- **Requirement 5.2**: Custom day-of-week selection for weekly recurring patterns
- **Requirement 5.3**: Buffer time settings between consecutive classes
- **Requirement 5.4**: Timezone handling for multi-timezone scenarios
- **Requirement 5.6**: CSV import functionality for bulk schedule creation

## Implementation Details

### 1. User Preferences Model (`app/models/user_preferences.py`)

#### SchedulingPreferences
```python
class SchedulingPreferences(BaseModel):
    default_duration_minutes: int = Field(default=60, ge=15, le=480)
    buffer_time_minutes: int = Field(default=15, ge=0, le=120)
    preferred_start_time: Optional[time] = None
    preferred_end_time: Optional[time] = None
    default_days_of_week: List[DayOfWeek] = [MONDAY, WEDNESDAY, FRIDAY]
    timezone: TimezoneEnum = TimezoneEnum.UTC
    auto_sync_to_calendar: bool = True
    conflict_detection_enabled: bool = True
```

#### CalendarCustomization
```python
class CalendarCustomization(BaseModel):
    event_color: str = "#4285f4"
    show_student_count: bool = True
    include_subject_code: bool = True
    notification_minutes_before: List[int] = [15, 60]
    event_title_template: str = "{subject_code}: {title}"
```

### 2. User Preferences Service (`app/services/user_preferences_service.py`)

The service provides comprehensive functionality for:

- **Preference Management**: CRUD operations for user preferences
- **Timezone Conversion**: Converting datetime between different timezones
- **Conflict Detection**: Checking for scheduling conflicts with buffer time
- **CSV Import**: Bulk schedule creation from CSV data
- **Bulk Operations**: Mass operations on multiple schedules

#### Key Methods

```python
async def get_user_preferences(user_id: str) -> UserPreferencesResponse
async def create_user_preferences(user_id: str, preferences: UserPreferencesCreate)
async def update_user_preferences(user_id: str, updates: UserPreferencesUpdate)
async def convert_timezone(conversion: TimezoneConversion) -> ConvertedDateTime
async def check_schedule_conflicts(conflict_check: ConflictCheck) -> ConflictCheckResult
async def import_schedules_from_csv(user_id: str, import_request: CSVImportRequest)
async def perform_bulk_operation(user_id: str, operation: BulkScheduleOperation)
```

### 3. Database Schema (`database/migration_user_preferences.sql`)

#### User Preferences Table
```sql
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    scheduling_preferences JSONB NOT NULL DEFAULT '{...}',
    calendar_preferences JSONB NOT NULL DEFAULT '{...}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

#### Enhanced Class Schedules
```sql
ALTER TABLE class_schedules 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN buffer_time_minutes INTEGER DEFAULT 15;
```

#### Utility Functions
- `check_schedule_conflicts()` - Conflict detection with buffer time
- `suggest_alternative_times()` - Generate alternative time suggestions

### 4. API Endpoints (`app/routers/user_preferences.py`)

#### Preference Management
- `GET /api/preferences/` - Get user preferences
- `POST /api/preferences/` - Create user preferences
- `PUT /api/preferences/` - Update user preferences

#### Timezone Operations
- `POST /api/preferences/timezone/convert` - Convert datetime between timezones

#### Conflict Detection
- `POST /api/preferences/conflicts/check` - Check for scheduling conflicts

#### CSV Import
- `POST /api/preferences/import/csv` - Import schedules from CSV data
- `POST /api/preferences/import/csv-file` - Import schedules from uploaded CSV file
- `GET /api/preferences/csv-template` - Get CSV template information

#### Bulk Operations
- `POST /api/preferences/bulk-operations` - Perform bulk operations on schedules

## Feature Details

### 1. Default Duration Preferences (Requirement 5.1)

Teachers can set default class durations that are automatically applied when creating new schedules:

```json
{
  "scheduling": {
    "default_duration_minutes": 90,
    "preferred_start_time": "09:00",
    "preferred_end_time": "17:00"
  }
}
```

**Benefits:**
- Reduces repetitive input when creating similar classes
- Ensures consistency across schedules
- Customizable per teacher's teaching style

### 2. Custom Day-of-Week Selection (Requirement 5.2)

Enhanced recurrence patterns support custom day selections:

```json
{
  "recurrence_pattern": {
    "type": "weekly",
    "interval": 1,
    "days_of_week": [0, 2, 4],
    "custom_days_selection": [1, 3]
  }
}
```

**Features:**
- Flexible weekly patterns (e.g., MWF, TTh, custom combinations)
- Support for biweekly and custom interval patterns
- Validation ensures valid day values (0-6)

### 3. Buffer Time Settings (Requirement 5.3)

Configurable buffer time between consecutive classes:

```json
{
  "scheduling": {
    "buffer_time_minutes": 20,
    "conflict_detection_enabled": true
  }
}
```

**Functionality:**
- Prevents back-to-back scheduling conflicts
- Allows time for room changes, preparation
- Customizable per teacher (0-120 minutes)
- Integrated with conflict detection

### 4. Timezone Handling (Requirement 5.4)

Multi-timezone support for global institutions:

```python
# Supported timezones
class TimezoneEnum(str, Enum):
    UTC = "UTC"
    US_EASTERN = "US/Eastern"
    US_CENTRAL = "US/Central"
    US_MOUNTAIN = "US/Mountain"
    US_PACIFIC = "US/Pacific"
    EUROPE_LONDON = "Europe/London"
    EUROPE_PARIS = "Europe/Paris"
    ASIA_TOKYO = "Asia/Tokyo"
    # ... more timezones
```

**Features:**
- Automatic timezone conversion for schedules
- User-specific timezone preferences
- API endpoint for timezone conversion
- Proper handling of daylight saving time

### 5. CSV Import Functionality (Requirement 5.6)

Bulk schedule creation from CSV files:

#### CSV Format
```csv
subject_id,title,description,start_date,start_time,duration_minutes,recurrence_type,recurrence_interval,days_of_week,end_date,occurrence_count
MATH101,Algebra Basics,Introduction to algebra,2024-01-15,09:00,60,weekly,1,"0,2,4",2024-05-15,
PHYS201,Physics Lab,Laboratory session,2024-01-16,14:00,90,weekly,1,"1,3",,20
```

**Features:**
- Supports all schedule fields including recurrence
- Timezone conversion during import
- Detailed error reporting for invalid rows
- Optional automatic calendar synchronization
- Batch processing with transaction safety

#### Import Results
```json
{
  "total_rows": 10,
  "successful_imports": 8,
  "failed_imports": 2,
  "created_schedules": [1, 2, 3, 4, 5, 6, 7, 8],
  "errors": [
    {
      "row": 3,
      "data": {...},
      "error": "Invalid date format"
    }
  ]
}
```

### 6. Bulk Operations

Mass operations on multiple schedules:

```json
{
  "schedule_ids": [1, 2, 3, 4, 5],
  "operation": "sync",
  "parameters": {}
}
```

**Supported Operations:**
- `sync` - Synchronize schedules with Google Calendar
- `delete` - Delete multiple schedules
- `update` - Bulk update operations (extensible)

## Conflict Detection

Advanced conflict detection with buffer time consideration:

```python
async def check_schedule_conflicts(conflict_check: ConflictCheck):
    # Checks for:
    # 1. Direct time overlaps
    # 2. Buffer time conflicts
    # 3. Generates alternative time suggestions
```

**Features:**
- Real-time conflict detection
- Buffer time consideration
- Alternative time suggestions
- Integration with user preferences

## Testing

Comprehensive test suite covering:

### Unit Tests (`backend/tests/test_user_preferences.py`)
- Model validation
- Service functionality
- Timezone conversion
- CSV import logic
- Bulk operations
- Conflict detection

### Integration Tests (`backend/tests/test_customization_integration.py`)
- API endpoint testing
- End-to-end workflows
- File upload handling
- Error scenarios

### Basic Functionality Test (`backend/test_basic_functionality.py`)
- Model validation
- Timezone conversion
- CSV parsing
- Custom day selection

## Usage Examples

### 1. Setting Up User Preferences

```python
# Create preferences with custom settings
preferences = UserPreferencesCreate(
    scheduling=SchedulingPreferences(
        default_duration_minutes=90,
        buffer_time_minutes=20,
        timezone=TimezoneEnum.US_EASTERN,
        default_days_of_week=[DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY]
    ),
    calendar=CalendarCustomization(
        event_color="#ff5722",
        show_student_count=True,
        event_title_template="{subject_code}: {title} ({student_count} students)"
    )
)
```

### 2. CSV Import

```python
# Import schedules from CSV
import_request = CSVImportRequest(
    csv_data=csv_content,
    skip_header=True,
    timezone=TimezoneEnum.US_EASTERN,
    auto_sync=True
)

result = await preferences_service.import_schedules_from_csv(user_id, import_request)
```

### 3. Conflict Detection

```python
# Check for conflicts with buffer time
conflict_check = ConflictCheck(
    user_id="teacher123",
    start_datetime="2024-01-15T10:00:00Z",
    duration_minutes=60,
    include_buffer_time=True
)

result = await preferences_service.check_schedule_conflicts(conflict_check)
if result.has_conflicts:
    print(f"Found {len(result.conflicts)} conflicts")
    print(f"Suggested alternatives: {result.suggested_times}")
```

### 4. Timezone Conversion

```python
# Convert between timezones
conversion = TimezoneConversion(
    from_timezone="UTC",
    to_timezone="US/Eastern",
    datetime_str="2024-01-15T14:00:00Z"
)

result = await preferences_service.convert_timezone(conversion)
print(f"Converted: {result.converted_datetime}")
```

## Security Considerations

- **Input Validation**: All user inputs are validated using Pydantic models
- **Access Control**: Users can only modify their own preferences and schedules
- **SQL Injection Prevention**: Using parameterized queries and ORM
- **File Upload Security**: CSV files are validated and processed safely
- **Rate Limiting**: Bulk operations are designed to prevent abuse

## Performance Optimizations

- **Database Indexing**: Indexes on user_id and timezone columns
- **Batch Processing**: CSV import processes multiple records efficiently
- **Caching**: User preferences can be cached for frequent access
- **Async Operations**: All database operations are asynchronous
- **Transaction Safety**: Bulk operations use database transactions

## Future Enhancements

1. **Advanced Recurrence Patterns**: Support for monthly, yearly patterns
2. **Smart Scheduling**: AI-powered optimal time suggestions
3. **Calendar Integration**: Enhanced Google Calendar features
4. **Notification System**: Customizable notification preferences
5. **Analytics**: Usage analytics and scheduling insights
6. **Mobile Support**: Mobile-optimized scheduling interfaces

## Conclusion

The customization and advanced scheduling features provide a comprehensive solution for flexible class scheduling with:

- ✅ Default duration preferences (Requirement 5.1)
- ✅ Custom day-of-week selection (Requirement 5.2)  
- ✅ Buffer time settings (Requirement 5.3)
- ✅ Timezone handling (Requirement 5.4)
- ✅ CSV import functionality (Requirement 5.6)
- ✅ Comprehensive testing and validation
- ✅ Security and performance considerations
- ✅ Extensible architecture for future enhancements

The implementation follows best practices for API design, data validation, error handling, and testing, providing a robust foundation for advanced scheduling capabilities.