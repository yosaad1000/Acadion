"""
Tests for user preferences and customization features.
Tests default duration preferences, buffer time settings, timezone handling,
CSV import functionality, and bulk operations.
"""

import pytest
from datetime import datetime, time, date, timedelta
from unittest.mock import Mock, patch, AsyncMock
import json
import io

from app.models.user_preferences import (
    UserPreferencesCreate, UserPreferencesUpdate, SchedulingPreferences,
    CalendarCustomization, TimezoneEnum, DayOfWeek, CSVImportRequest,
    TimezoneConversion, ConflictCheck, BulkScheduleOperation
)
from app.services.user_preferences_service import UserPreferencesService, UserPreferencesError


class TestUserPreferencesService:
    """Test cases for UserPreferencesService."""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client."""
        with patch('app.services.user_preferences_service.get_supabase_client') as mock:
            client = Mock()
            mock.return_value = client
            yield client
    
    @pytest.fixture
    def mock_scheduling_service(self):
        """Mock SchedulingService."""
        with patch('app.services.user_preferences_service.SchedulingService') as mock:
            service = Mock()
            mock.return_value = service
            yield service
    
    @pytest.fixture
    def preferences_service(self, mock_supabase_client, mock_scheduling_service):
        """UserPreferencesService instance with mocked dependencies."""
        return UserPreferencesService()
    
    @pytest.fixture
    def sample_user_id(self):
        """Sample user ID for testing."""
        return "user123"
    
    @pytest.fixture
    def sample_preferences_data(self):
        """Sample preferences data."""
        return {
            'user_id': 'user123',
            'scheduling_preferences': {
                'default_duration_minutes': 90,
                'buffer_time_minutes': 20,
                'preferred_start_time': '09:00',
                'preferred_end_time': '17:00',
                'default_days_of_week': [0, 2, 4],
                'timezone': 'US/Eastern',
                'auto_sync_to_calendar': True,
                'conflict_detection_enabled': True
            },
            'calendar_preferences': {
                'event_color': '#ff5722',
                'show_student_count': True,
                'include_subject_code': True,
                'notification_minutes_before': [15, 60],
                'event_title_template': '{subject_code}: {title}'
            },
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }


class TestGetUserPreferences:
    """Test getting user preferences."""
    
    @pytest.mark.asyncio
    async def test_get_existing_preferences(self, preferences_service, mock_supabase_client, sample_user_id, sample_preferences_data):
        """Test getting existing user preferences."""
        # Mock database response
        mock_result = Mock()
        mock_result.data = [sample_preferences_data]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result
        
        # Call service method
        result = await preferences_service.get_user_preferences(sample_user_id)
        
        # Verify result
        assert result.user_id == sample_user_id
        assert result.scheduling.default_duration_minutes == 90
        assert result.scheduling.buffer_time_minutes == 20
        assert result.scheduling.timezone == TimezoneEnum.US_EASTERN
        assert result.calendar.event_color == '#ff5722'
    
    @pytest.mark.asyncio
    async def test_get_preferences_creates_defaults(self, preferences_service, mock_supabase_client, sample_user_id):
        """Test that default preferences are created when none exist."""
        # Mock no existing preferences
        mock_result = Mock()
        mock_result.data = []
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_result
        
        # Mock creation response
        create_result = Mock()
        create_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': {
                'default_duration_minutes': 60,
                'buffer_time_minutes': 15,
                'preferred_start_time': None,
                'preferred_end_time': None,
                'default_days_of_week': [0, 2, 4],
                'timezone': 'UTC',
                'auto_sync_to_calendar': True,
                'conflict_detection_enabled': True
            },
            'calendar_preferences': {
                'event_color': '#4285f4',
                'show_student_count': True,
                'include_subject_code': True,
                'notification_minutes_before': [15, 60],
                'event_title_template': '{subject_code}: {title}'
            },
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = create_result
        
        # Call service method
        result = await preferences_service.get_user_preferences(sample_user_id)
        
        # Verify defaults were created
        assert result.user_id == sample_user_id
        assert result.scheduling.default_duration_minutes == 60
        assert result.scheduling.buffer_time_minutes == 15
        assert result.scheduling.timezone == TimezoneEnum.UTC


class TestCreateUserPreferences:
    """Test creating user preferences."""
    
    @pytest.mark.asyncio
    async def test_create_preferences_with_custom_values(self, preferences_service, mock_supabase_client, sample_user_id):
        """Test creating preferences with custom values."""
        # Prepare custom preferences
        scheduling_prefs = SchedulingPreferences(
            default_duration_minutes=90,
            buffer_time_minutes=20,
            timezone=TimezoneEnum.US_EASTERN
        )
        calendar_prefs = CalendarCustomization(
            event_color='#ff5722',
            show_student_count=False
        )
        preferences_create = UserPreferencesCreate(
            scheduling=scheduling_prefs,
            calendar=calendar_prefs
        )
        
        # Mock database response
        mock_result = Mock()
        mock_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': scheduling_prefs.model_dump(),
            'calendar_preferences': calendar_prefs.model_dump(),
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_result
        
        # Call service method
        result = await preferences_service.create_user_preferences(sample_user_id, preferences_create)
        
        # Verify result
        assert result.user_id == sample_user_id
        assert result.scheduling.default_duration_minutes == 90
        assert result.scheduling.buffer_time_minutes == 20
        assert result.calendar.event_color == '#ff5722'
        assert result.calendar.show_student_count == False


class TestTimezoneConversion:
    """Test timezone conversion functionality."""
    
    @pytest.mark.asyncio
    async def test_convert_timezone_utc_to_eastern(self, preferences_service):
        """Test converting from UTC to US/Eastern."""
        conversion = TimezoneConversion(
            from_timezone="UTC",
            to_timezone="US/Eastern",
            datetime_str="2024-01-15T14:00:00Z"
        )
        
        result = await preferences_service.convert_timezone(conversion)
        
        assert result.from_timezone == "UTC"
        assert result.to_timezone == "US/Eastern"
        assert "2024-01-15T09:00:00" in result.converted_datetime  # EST is UTC-5
        assert result.utc_offset_hours == -5.0
    
    @pytest.mark.asyncio
    async def test_convert_timezone_invalid_timezone(self, preferences_service):
        """Test timezone conversion with invalid timezone."""
        conversion = TimezoneConversion(
            from_timezone="Invalid/Timezone",
            to_timezone="UTC",
            datetime_str="2024-01-15T14:00:00Z"
        )
        
        with pytest.raises(UserPreferencesError) as exc_info:
            await preferences_service.convert_timezone(conversion)
        
        assert exc_info.value.error_code == "TIMEZONE_CONVERSION_FAILED"


class TestConflictDetection:
    """Test schedule conflict detection."""
    
    @pytest.mark.asyncio
    async def test_check_conflicts_with_buffer_time(self, preferences_service, mock_supabase_client, mock_scheduling_service, sample_user_id):
        """Test conflict detection with buffer time consideration."""
        # Mock user preferences with buffer time
        prefs_result = Mock()
        prefs_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': {
                'buffer_time_minutes': 30,
                'default_duration_minutes': 60,
                'timezone': 'UTC'
            },
            'calendar_preferences': {},
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = prefs_result
        
        # Mock existing schedules
        from app.models.calendar import ClassScheduleResponse
        existing_schedule = Mock(spec=ClassScheduleResponse)
        existing_schedule.id = 1
        existing_schedule.title = "Existing Class"
        existing_schedule.start_datetime = datetime(2024, 1, 15, 10, 0)
        existing_schedule.duration_minutes = 60
        
        mock_scheduling_service.get_teacher_schedules = AsyncMock(return_value=[existing_schedule])
        
        # Test conflict check
        conflict_check = ConflictCheck(
            user_id=sample_user_id,
            start_datetime="2024-01-15T10:30:00Z",  # 30 minutes after existing class starts
            duration_minutes=60,
            include_buffer_time=True
        )
        
        result = await preferences_service.check_schedule_conflicts(conflict_check)
        
        # Should detect conflict due to buffer time
        assert result.has_conflicts == True
        assert len(result.conflicts) > 0
    
    @pytest.mark.asyncio
    async def test_check_conflicts_no_buffer_time(self, preferences_service, mock_supabase_client, mock_scheduling_service, sample_user_id):
        """Test conflict detection without buffer time consideration."""
        # Mock user preferences without buffer time
        prefs_result = Mock()
        prefs_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': {
                'buffer_time_minutes': 0,
                'default_duration_minutes': 60,
                'timezone': 'UTC'
            },
            'calendar_preferences': {},
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = prefs_result
        
        # Mock no existing schedules
        mock_scheduling_service.get_teacher_schedules = AsyncMock(return_value=[])
        
        # Test conflict check
        conflict_check = ConflictCheck(
            user_id=sample_user_id,
            start_datetime="2024-01-15T10:00:00Z",
            duration_minutes=60,
            include_buffer_time=False
        )
        
        result = await preferences_service.check_schedule_conflicts(conflict_check)
        
        # Should not detect conflicts
        assert result.has_conflicts == False
        assert len(result.conflicts) == 0


class TestCSVImport:
    """Test CSV import functionality."""
    
    @pytest.fixture
    def sample_csv_data(self):
        """Sample CSV data for testing."""
        return """subject_id,title,description,start_date,start_time,duration_minutes,recurrence_type,recurrence_interval,days_of_week,end_date,occurrence_count
MATH101,Algebra Basics,Introduction to algebra,2024-01-15,09:00,60,weekly,1,"0,2,4",2024-05-15,
PHYS201,Physics Lab,Laboratory session,2024-01-16,14:00,90,weekly,1,"1,3",,20
CHEM301,Organic Chemistry,Advanced chemistry,2024-01-17,11:00,75,biweekly,2,"0,2",2024-04-15,"""
    
    @pytest.mark.asyncio
    async def test_csv_import_success(self, preferences_service, mock_supabase_client, mock_scheduling_service, sample_user_id, sample_csv_data):
        """Test successful CSV import."""
        # Mock user preferences
        prefs_result = Mock()
        prefs_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': {
                'timezone': 'UTC',
                'default_duration_minutes': 60
            },
            'calendar_preferences': {},
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = prefs_result
        
        # Mock successful schedule creation
        from app.models.calendar import ClassScheduleResponse
        created_schedule = Mock(spec=ClassScheduleResponse)
        created_schedule.id = 1
        mock_scheduling_service.create_class_schedule = AsyncMock(return_value=created_schedule)
        mock_scheduling_service.sync_with_calendar = AsyncMock(return_value=True)
        
        # Create import request
        import_request = CSVImportRequest(
            csv_data=sample_csv_data,
            skip_header=True,
            timezone=TimezoneEnum.UTC,
            auto_sync=True
        )
        
        # Call service method
        result = await preferences_service.import_schedules_from_csv(sample_user_id, import_request)
        
        # Verify results
        assert result.total_rows == 3
        assert result.successful_imports == 3
        assert result.failed_imports == 0
        assert len(result.created_schedules) == 3
    
    @pytest.mark.asyncio
    async def test_csv_import_with_errors(self, preferences_service, mock_supabase_client, mock_scheduling_service, sample_user_id):
        """Test CSV import with some invalid rows."""
        # Invalid CSV data (missing required fields)
        invalid_csv = """subject_id,title,description,start_date,start_time,duration_minutes
MATH101,Algebra Basics,Introduction to algebra,2024-01-15,09:00,60
,Missing Subject,,2024-01-16,14:00,90
CHEM301,Valid Class,Chemistry class,invalid-date,11:00,75"""
        
        # Mock user preferences
        prefs_result = Mock()
        prefs_result.data = [{
            'user_id': sample_user_id,
            'scheduling_preferences': {'timezone': 'UTC'},
            'calendar_preferences': {},
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z'
        }]
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = prefs_result
        
        # Mock schedule creation (first one succeeds, others fail)
        from app.models.calendar import ClassScheduleResponse
        created_schedule = Mock(spec=ClassScheduleResponse)
        created_schedule.id = 1
        
        async def mock_create_schedule(teacher_id, schedule_data):
            if schedule_data.subject_id == "MATH101":
                return created_schedule
            else:
                raise Exception("Invalid schedule data")
        
        mock_scheduling_service.create_class_schedule = AsyncMock(side_effect=mock_create_schedule)
        
        # Create import request
        import_request = CSVImportRequest(
            csv_data=invalid_csv,
            skip_header=True,
            timezone=TimezoneEnum.UTC,
            auto_sync=False
        )
        
        # Call service method
        result = await preferences_service.import_schedules_from_csv(sample_user_id, import_request)
        
        # Verify results
        assert result.total_rows == 3
        assert result.successful_imports == 1
        assert result.failed_imports == 2
        assert len(result.errors) == 2


class TestBulkOperations:
    """Test bulk operations functionality."""
    
    @pytest.mark.asyncio
    async def test_bulk_sync_operation(self, preferences_service, mock_scheduling_service, sample_user_id):
        """Test bulk sync operation."""
        # Mock schedule ownership verification
        from app.models.calendar import ClassScheduleResponse
        schedule1 = Mock(spec=ClassScheduleResponse)
        schedule1.teacher_id = sample_user_id
        schedule2 = Mock(spec=ClassScheduleResponse)
        schedule2.teacher_id = sample_user_id
        
        async def mock_get_schedule(schedule_id):
            if schedule_id == 1:
                return schedule1
            elif schedule_id == 2:
                return schedule2
            else:
                raise Exception("Schedule not found")
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(side_effect=mock_get_schedule)
        mock_scheduling_service.sync_with_calendar = AsyncMock(return_value=True)
        
        # Create bulk operation
        operation = BulkScheduleOperation(
            schedule_ids=[1, 2],
            operation="sync"
        )
        
        # Call service method
        result = await preferences_service.perform_bulk_operation(sample_user_id, operation)
        
        # Verify results
        assert result.total_schedules == 2
        assert result.successful_operations == 2
        assert result.failed_operations == 0
        assert len(result.results) == 2
    
    @pytest.mark.asyncio
    async def test_bulk_operation_access_denied(self, preferences_service, mock_scheduling_service, sample_user_id):
        """Test bulk operation with access denied for some schedules."""
        # Mock schedule with different owner
        from app.models.calendar import ClassScheduleResponse
        schedule1 = Mock(spec=ClassScheduleResponse)
        schedule1.teacher_id = sample_user_id
        schedule2 = Mock(spec=ClassScheduleResponse)
        schedule2.teacher_id = "other_user"  # Different owner
        
        async def mock_get_schedule(schedule_id):
            if schedule_id == 1:
                return schedule1
            elif schedule_id == 2:
                return schedule2
            else:
                raise Exception("Schedule not found")
        
        mock_scheduling_service.get_schedule_by_id = AsyncMock(side_effect=mock_get_schedule)
        mock_scheduling_service.sync_with_calendar = AsyncMock(return_value=True)
        
        # Create bulk operation
        operation = BulkScheduleOperation(
            schedule_ids=[1, 2],
            operation="sync"
        )
        
        # Call service method
        result = await preferences_service.perform_bulk_operation(sample_user_id, operation)
        
        # Verify results
        assert result.total_schedules == 2
        assert result.successful_operations == 1
        assert result.failed_operations == 1
        assert len(result.errors) == 1
        assert "Access denied" in result.errors[0]['error']


class TestPreferencesValidation:
    """Test validation of preferences models."""
    
    def test_scheduling_preferences_validation(self):
        """Test scheduling preferences validation."""
        # Valid preferences
        valid_prefs = SchedulingPreferences(
            default_duration_minutes=90,
            buffer_time_minutes=20,
            default_days_of_week=[DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
            timezone=TimezoneEnum.US_EASTERN
        )
        assert valid_prefs.default_duration_minutes == 90
        assert valid_prefs.buffer_time_minutes == 20
        
        # Invalid duration (too short)
        with pytest.raises(ValueError):
            SchedulingPreferences(default_duration_minutes=10)
        
        # Invalid buffer time (negative)
        with pytest.raises(ValueError):
            SchedulingPreferences(buffer_time_minutes=-5)
        
        # Empty days of week
        with pytest.raises(ValueError):
            SchedulingPreferences(default_days_of_week=[])
    
    def test_calendar_customization_validation(self):
        """Test calendar customization validation."""
        # Valid customization
        valid_custom = CalendarCustomization(
            event_color="#ff5722",
            notification_minutes_before=[15, 60, 1440]
        )
        assert valid_custom.event_color == "#ff5722"
        
        # Invalid color format
        with pytest.raises(ValueError):
            CalendarCustomization(event_color="invalid-color")
        
        # Invalid notification time (too large)
        with pytest.raises(ValueError):
            CalendarCustomization(notification_minutes_before=[15, 20160])  # More than 1 week


class TestCustomDaySelection:
    """Test custom day-of-week selection for weekly recurring patterns."""
    
    def test_custom_days_in_recurrence_pattern(self):
        """Test custom day selection in recurrence patterns."""
        from app.models.calendar import RecurrencePattern, RecurrenceType
        
        # Valid custom days selection
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            custom_days_selection=[1, 3]  # Tuesday, Thursday
        )
        
        assert pattern.days_of_week == [0, 2, 4]
        assert pattern.custom_days_selection == [1, 3]
        
        # Invalid day values
        with pytest.raises(ValueError):
            RecurrencePattern(
                type=RecurrenceType.WEEKLY,
                days_of_week=[0, 7]  # 7 is invalid (should be 0-6)
            )


if __name__ == "__main__":
    pytest.main([__file__])