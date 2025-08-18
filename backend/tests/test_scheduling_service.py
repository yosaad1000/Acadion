"""
Unit tests for the SchedulingService.
Tests class schedule CRUD operations, recurrence pattern processing,
schedule instance generation, and database operations.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta, date
import json
import sys

# Mock all external dependencies before importing
mock_supabase = MagicMock()
mock_config = MagicMock()
mock_config.settings = MagicMock()

sys.modules['supabase'] = mock_supabase
sys.modules['app.config'] = mock_config

# Mock the get_supabase_client function
def mock_get_supabase_client():
    return MagicMock()

# Patch the import before importing our modules
with patch('app.services.scheduling_service.get_supabase_client', mock_get_supabase_client):
    from app.services.scheduling_service import SchedulingService, SchedulingError
    from app.models.calendar import (
        ClassScheduleCreate, ClassScheduleUpdate, ClassScheduleResponse,
        RecurrencePattern, RecurrenceType, ScheduleStatus, UpdateScope,
        ScheduleQuery, StudentScheduleQuery, BulkScheduleCreate
    )


# Module-level fixtures
@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client."""
    mock_client = Mock()
    mock_table = Mock()
    mock_client.table.return_value = mock_table
    return mock_client, mock_table

@pytest.fixture
def scheduling_service(mock_supabase_client):
    """Create SchedulingService instance with mocked client."""
    mock_client, mock_table = mock_supabase_client
    
    with patch('app.services.scheduling_service.get_supabase_client', return_value=mock_client):
        service = SchedulingService()
        service.mock_table = mock_table  # Store for test access
        return service

@pytest.fixture
def sample_schedule_create():
    """Sample schedule creation data."""
    return ClassScheduleCreate(
        subject_id="CS101",
        title="Introduction to Computer Science",
        description="Basic programming concepts",
        start_datetime=datetime(2025, 9, 1, 10, 0),
        duration_minutes=90,
        recurrence_pattern=RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            end_date=date(2025, 12, 1)
        )
    )

@pytest.fixture
def sample_db_schedule_row():
    """Sample database row for schedule."""
    return {
        'id': 1,
        'teacher_id': 'T001',
        'subject_id': 'CS101',
        'title': 'Introduction to Computer Science',
        'description': 'Basic programming concepts',
        'start_datetime': '2025-09-01T10:00:00+00:00',
        'duration_minutes': 90,
        'recurrence_pattern': {
            'type': 'weekly',
            'interval': 1,
            'days_of_week': [0, 2, 4],
            'end_date': '2025-12-01'
        },
        'google_event_id': None,
        'google_recurring_event_id': None,
        'is_active': True,
        'created_at': '2025-02-01T10:00:00+00:00',
        'updated_at': '2025-02-01T10:00:00+00:00',
        'subject_name': 'Computer Science 101',
        'teacher_name': 'Dr. Smith',
        'enrolled_student_count': 25
    }


class TestSchedulingService:
    """Test suite for SchedulingService."""
    pass


class TestCreateClassSchedule:
    """Test create_class_schedule method."""
    
    @pytest.mark.asyncio
    async def test_create_schedule_success(self, scheduling_service, sample_schedule_create, sample_db_schedule_row):
        """Test successful schedule creation."""
        # Mock validation
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value.data = [{'faculty_id': 'T001'}]
        
        # Mock schedule creation
        mock_insert_result = Mock()
        mock_insert_result.data = [{'id': 1}]
        scheduling_service.mock_table.insert.return_value.execute.return_value = mock_insert_result
        
        # Mock get_schedule_by_id
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock instance generation
            with patch.object(scheduling_service, '_generate_schedule_instances') as mock_generate:
                result = await scheduling_service.create_class_schedule('T001', sample_schedule_create)
                
                assert result.id == 1
                assert result.title == sample_schedule_create.title
                mock_generate.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_schedule_teacher_not_found(self, scheduling_service, sample_schedule_create):
        """Test schedule creation with non-existent teacher."""
        # Mock teacher not found
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value.data = []
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.create_class_schedule('T999', sample_schedule_create)
        
        assert exc_info.value.error_code == "TEACHER_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_create_schedule_subject_not_found(self, scheduling_service, sample_schedule_create):
        """Test schedule creation with non-existent subject."""
        # Mock teacher found, subject not found
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.side_effect = [
            Mock(data=[{'faculty_id': 'T001'}]),  # Teacher found
            Mock(data=[])  # Subject not found
        ]
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.create_class_schedule('T001', sample_schedule_create)
        
        assert exc_info.value.error_code == "SUBJECT_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_create_schedule_database_error(self, scheduling_service, sample_schedule_create):
        """Test schedule creation with database error."""
        # Mock validation success
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value.data = [{'faculty_id': 'T001'}]
        
        # Mock database error
        scheduling_service.mock_table.insert.return_value.execute.return_value.data = None
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.create_class_schedule('T001', sample_schedule_create)
        
        assert exc_info.value.error_code == "SCHEDULE_CREATE_FAILED"


class TestRecurrencePatternProcessing:
    """Test recurrence pattern processing logic."""
    
    def test_calculate_weekly_recurrence(self, scheduling_service):
        """Test weekly recurrence calculation."""
        start_datetime = datetime(2025, 9, 5, 10, 0)  # Friday
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
            occurrence_count=6
        )
        
        instances = scheduling_service._calculate_recurrence_instances(start_datetime, pattern)
        
        assert len(instances) == 6
        assert instances[0] == start_datetime
        
        # Check that instances fall on correct days
        for instance in instances:
            assert instance.weekday() in [0, 2, 4]  # Monday, Wednesday, Friday
    
    def test_calculate_biweekly_recurrence(self, scheduling_service):
        """Test biweekly recurrence calculation."""
        start_datetime = datetime(2025, 9, 1, 10, 0)
        pattern = RecurrencePattern(
            type=RecurrenceType.BIWEEKLY,
            interval=1,
            occurrence_count=4
        )
        
        instances = scheduling_service._calculate_recurrence_instances(start_datetime, pattern)
        
        assert len(instances) == 4
        assert instances[0] == start_datetime
        assert instances[1] == start_datetime + timedelta(weeks=2)
        assert instances[2] == start_datetime + timedelta(weeks=4)
        assert instances[3] == start_datetime + timedelta(weeks=6)
    
    def test_calculate_custom_recurrence(self, scheduling_service):
        """Test custom recurrence calculation."""
        start_datetime = datetime(2025, 9, 1, 10, 0)
        pattern = RecurrencePattern(
            type=RecurrenceType.CUSTOM,
            interval=3,  # Every 3 weeks
            occurrence_count=3
        )
        
        instances = scheduling_service._calculate_recurrence_instances(start_datetime, pattern)
        
        assert len(instances) == 3
        assert instances[0] == start_datetime
        assert instances[1] == start_datetime + timedelta(weeks=3)
        assert instances[2] == start_datetime + timedelta(weeks=6)
    
    def test_calculate_recurrence_with_end_date(self, scheduling_service):
        """Test recurrence calculation with end date."""
        start_datetime = datetime(2025, 9, 1, 10, 0)  # Future date
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            end_date=date(2025, 9, 15)  # 2 weeks later
        )
        
        instances = scheduling_service._calculate_recurrence_instances(start_datetime, pattern)
        
        # Should only include instances up to end date
        assert len(instances) <= 3  # Start + 2 weeks max
        for instance in instances:
            assert instance.date() <= pattern.end_date
    
    def test_calculate_recurrence_max_instances_limit(self, scheduling_service):
        """Test that recurrence calculation respects max instances limit."""
        start_datetime = datetime(2025, 9, 1, 10, 0)
        pattern = RecurrencePattern(
            type=RecurrenceType.WEEKLY,
            interval=1,
            occurrence_count=1000  # Very large number
        )
        
        instances = scheduling_service._calculate_recurrence_instances(start_datetime, pattern)
        
        # Should be limited by max_instances config
        assert len(instances) <= scheduling_service.recurrence_config.max_instances


class TestUpdateClassSchedule:
    """Test update_class_schedule method."""
    
    @pytest.mark.asyncio
    async def test_update_single_instance(self, scheduling_service, sample_db_schedule_row):
        """Test updating a single instance of a recurring schedule."""
        updates = ClassScheduleUpdate(
            title="Updated Title",
            start_datetime=datetime(2025, 9, 1, 11, 0)
        )
        
        # Mock get_schedule_by_id
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock _update_single_instance
            with patch.object(scheduling_service, '_update_single_instance') as mock_update:
                mock_update.return_value = mock_schedule
                
                result = await scheduling_service.update_class_schedule(
                    1, updates, UpdateScope.THIS_INSTANCE, datetime(2025, 9, 1, 10, 0)
                )
                
                assert result == mock_schedule
                mock_update.assert_called_once_with(1, datetime(2025, 9, 1, 10, 0), updates)
    
    @pytest.mark.asyncio
    async def test_update_this_and_future_instances(self, scheduling_service, sample_db_schedule_row):
        """Test updating this and future instances."""
        updates = ClassScheduleUpdate(title="Updated Title")
        
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_update_this_and_future_instances') as mock_update:
                mock_update.return_value = mock_schedule
                
                result = await scheduling_service.update_class_schedule(
                    1, updates, UpdateScope.THIS_AND_FUTURE
                )
                
                assert result == mock_schedule
    
    @pytest.mark.asyncio
    async def test_update_missing_instance_datetime(self, scheduling_service, sample_db_schedule_row):
        """Test that THIS_INSTANCE scope requires instance_datetime."""
        updates = ClassScheduleUpdate(title="Updated Title")
        
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with pytest.raises(SchedulingError) as exc_info:
                await scheduling_service.update_class_schedule(
                    1, updates, UpdateScope.THIS_INSTANCE, None
                )
            
            assert exc_info.value.error_code == "MISSING_INSTANCE_DATETIME"


class TestDeleteClassSchedule:
    """Test delete_class_schedule method."""
    
    @pytest.mark.asyncio
    async def test_delete_single_instance(self, scheduling_service, sample_db_schedule_row):
        """Test deleting a single instance of a recurring schedule."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_delete_single_instance') as mock_delete:
                mock_delete.return_value = True
                
                result = await scheduling_service.delete_class_schedule(
                    1, UpdateScope.THIS_INSTANCE, datetime(2025, 9, 1, 10, 0)
                )
                
                assert result is True
                mock_delete.assert_called_once_with(1, datetime(2025, 9, 1, 10, 0))
    
    @pytest.mark.asyncio
    async def test_delete_this_and_future_instances(self, scheduling_service, sample_db_schedule_row):
        """Test deleting this and future instances."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_delete_this_and_future_instances') as mock_delete:
                mock_delete.return_value = True
                
                result = await scheduling_service.delete_class_schedule(
                    1, UpdateScope.THIS_AND_FUTURE, datetime(2025, 9, 1, 10, 0)
                )
                
                assert result is True
                mock_delete.assert_called_once_with(1, datetime(2025, 9, 1, 10, 0))
    
    @pytest.mark.asyncio
    async def test_delete_all_instances(self, scheduling_service, sample_db_schedule_row):
        """Test deleting all instances."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_delete_all_instances') as mock_delete:
                mock_delete.return_value = True
                
                result = await scheduling_service.delete_class_schedule(
                    1, UpdateScope.ALL_INSTANCES
                )
                
                assert result is True
                mock_delete.assert_called_once_with(1)


class TestRecurringEventManagement:
    """Test recurring event management functionality."""
    
    @pytest.mark.asyncio
    async def test_sync_recurring_event_with_calendar(self, scheduling_service, sample_db_schedule_row):
        """Test syncing recurring event with Google Calendar."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock calendar connection
            scheduling_service.mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {'user_id': 'T001', 'provider': 'google'}
            ]
            
            # Mock the calendar service import inside the method
            with patch('app.services.calendar_service.calendar_service') as mock_calendar_service:
                # Mock async method
                async def mock_update_event(*args, **kwargs):
                    return True
                mock_calendar_service.update_event = mock_update_event
                
                result = await scheduling_service.sync_recurring_event_with_calendar(
                    1, UpdateScope.ALL_INSTANCES
                )
                
                assert result is True
    
    @pytest.mark.asyncio
    async def test_sync_recurring_event_no_connection(self, scheduling_service, sample_db_schedule_row):
        """Test syncing when no Google Calendar connection exists."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock no calendar connection
            scheduling_service.mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
            
            result = await scheduling_service.sync_recurring_event_with_calendar(
                1, UpdateScope.ALL_INSTANCES
            )
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_delete_recurring_event_from_calendar(self, scheduling_service, sample_db_schedule_row):
        """Test deleting recurring event from Google Calendar."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_schedule.google_recurring_event_id = "google_event_123"
            mock_get.return_value = mock_schedule
            
            # Mock calendar connection and instances queries
            def mock_select_chain(*args, **kwargs):
                mock_result = Mock()
                if 'calendar_connections' in str(args):
                    mock_result.data = [{'user_id': 'T001', 'provider': 'google'}]
                else:  # schedule_instances
                    mock_result.data = []  # No individual instances
                
                mock_chain = Mock()
                mock_chain.eq.return_value.eq.return_value.execute.return_value = mock_result
                mock_chain.eq.return_value.execute.return_value = mock_result
                return mock_chain
            
            scheduling_service.mock_table.select.side_effect = mock_select_chain
            
            with patch('app.services.calendar_service.calendar_service') as mock_calendar_service:
                # Mock async method
                async def mock_delete_event(*args, **kwargs):
                    return True
                mock_calendar_service.delete_event = mock_delete_event
                
                result = await scheduling_service.delete_recurring_event_from_calendar(
                    1, UpdateScope.ALL_INSTANCES
                )
                
                assert result is True
    
    @pytest.mark.asyncio
    async def test_get_schedule_instances(self, scheduling_service, sample_db_schedule_row):
        """Test getting schedule instances."""
        # Mock schedule
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock instances data
            mock_instances_data = [
                {
                    'id': 1,
                    'schedule_id': 1,
                    'instance_datetime': '2025-09-01T10:00:00+00:00',
                    'google_event_id': 'event_1',
                    'status': 'scheduled',
                    'modifications': None,
                    'created_at': '2025-02-01T10:00:00+00:00',
                    'updated_at': '2025-02-01T10:00:00+00:00'
                },
                {
                    'id': 2,
                    'schedule_id': 1,
                    'instance_datetime': '2025-09-03T10:00:00+00:00',
                    'google_event_id': 'event_2',
                    'status': 'modified',
                    'modifications': {'title': 'Modified Title'},
                    'created_at': '2025-02-01T10:00:00+00:00',
                    'updated_at': '2025-02-01T10:00:00+00:00'
                }
            ]
            
            # Mock the query chain properly
            mock_result = Mock()
            mock_result.data = mock_instances_data
            
            mock_query = Mock()
            mock_query.execute.return_value = mock_result
            
            scheduling_service.mock_table.select.return_value.eq.return_value.neq.return_value.order.return_value = mock_query
            
            instances = await scheduling_service.get_schedule_instances(1)
            
            assert len(instances) == 2
            assert instances[0].status == ScheduleStatus.SCHEDULED
            assert instances[1].status == ScheduleStatus.MODIFIED
            assert instances[1].title == "Modified Title"  # Should use modified title
    
    @pytest.mark.asyncio
    async def test_handle_recurring_event_modification(self, scheduling_service, sample_db_schedule_row):
        """Test handling modification of a recurring event instance."""
        instance_datetime = datetime(2025, 9, 1, 10, 0)
        modifications = {
            'title': 'Modified Title',
            'start_datetime': datetime(2025, 9, 1, 11, 0).isoformat()
        }
        
        # Mock existing instance
        mock_instance_data = {
            'id': 1,
            'schedule_id': 1,
            'instance_datetime': instance_datetime.isoformat(),
            'status': 'scheduled',
            'modifications': None
        }
        
        scheduling_service.mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [mock_instance_data]
        
        # Mock update result
        mock_update_result = Mock()
        mock_update_result.data = [{'id': 1}]
        scheduling_service.mock_table.update.return_value.eq.return_value.execute.return_value = mock_update_result
        
        # Mock get_schedule_instances
        with patch.object(scheduling_service, 'get_schedule_instances') as mock_get_instances:
            from app.models.calendar import ScheduleInstanceResponse
            mock_instance = ScheduleInstanceResponse(
                id=1,
                schedule_id=1,
                instance_datetime=instance_datetime,
                google_event_id='event_1',
                status=ScheduleStatus.MODIFIED,
                modifications=modifications,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                title='Modified Title',
                description='Basic programming concepts',
                duration_minutes=90
            )
            mock_get_instances.return_value = [mock_instance]
            
            # Mock sync
            with patch.object(scheduling_service, 'sync_recurring_event_with_calendar') as mock_sync:
                mock_sync.return_value = True
                
                result = await scheduling_service.handle_recurring_event_modification(
                    1, instance_datetime, modifications, sync_to_calendar=True
                )
                
                assert result.title == 'Modified Title'
                assert result.status == ScheduleStatus.MODIFIED
                mock_sync.assert_called_once_with(1, UpdateScope.THIS_INSTANCE, instance_datetime)


class TestRecurringEventEdgeCases:
    """Test edge cases and error scenarios for recurring event management."""
    
    @pytest.mark.asyncio
    async def test_modify_nonexistent_instance(self, scheduling_service):
        """Test modifying a non-existent instance."""
        instance_datetime = datetime(2025, 9, 1, 10, 0)
        modifications = {'title': 'Modified Title'}
        
        # Mock no instance found
        scheduling_service.mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.handle_recurring_event_modification(
                1, instance_datetime, modifications
            )
        
        assert exc_info.value.error_code == "INSTANCE_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_sync_with_calendar_failure(self, scheduling_service, sample_db_schedule_row):
        """Test handling calendar sync failures gracefully."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_schedule.google_recurring_event_id = "recurring_event_123"  # Add this so it tries to sync
            mock_get.return_value = mock_schedule
            
            # Mock calendar connection
            scheduling_service.mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {'user_id': 'T001', 'provider': 'google'}
            ]
            
            with patch('app.services.calendar_service.calendar_service') as mock_calendar_service:
                # Mock async method that raises exception
                async def mock_update_event_error(*args, **kwargs):
                    raise Exception("Calendar API error")
                mock_calendar_service.update_event = mock_update_event_error
                
                # Should not raise exception, but return False
                result = await scheduling_service.sync_recurring_event_with_calendar(
                    1, UpdateScope.ALL_INSTANCES
                )
                
                assert result is False
    
    @pytest.mark.asyncio
    async def test_delete_this_and_future_with_end_date_update(self, scheduling_service, sample_db_schedule_row):
        """Test that deleting 'this and future' properly updates recurrence end date."""
        from_datetime = datetime(2025, 10, 1, 10, 0)
        
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock update operations
            mock_update_result = Mock()
            mock_update_result.data = [{'id': 1}]
            scheduling_service.mock_table.update.return_value.eq.return_value.execute.return_value = mock_update_result
            scheduling_service.mock_table.update.return_value.eq.return_value.gte.return_value.execute.return_value = mock_update_result
            
            result = await scheduling_service._delete_this_and_future_instances(1, from_datetime)
            
            assert result is True
            # Verify that both instance cancellation and schedule update were called
            assert scheduling_service.mock_table.update.call_count >= 2
    
    @pytest.mark.asyncio
    async def test_complex_recurring_series_update(self, scheduling_service, sample_db_schedule_row):
        """Test complex recurring series updates that require creating new series."""
        from_datetime = datetime(2025, 10, 1, 10, 0)
        
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_schedule.google_recurring_event_id = "recurring_123"
            mock_get.return_value = mock_schedule
            
            # Mock instances
            mock_instances_data = [
                {
                    'id': 1,
                    'google_event_id': 'event_1',
                    'instance_datetime': from_datetime.isoformat(),
                    'modifications': {'title': 'Modified'}
                },
                {
                    'id': 2,
                    'google_event_id': 'event_2',
                    'instance_datetime': (from_datetime + timedelta(weeks=1)).isoformat(),
                    'modifications': None
                }
            ]
            
            scheduling_service.mock_table.select.return_value.eq.return_value.gte.return_value.execute.return_value.data = mock_instances_data
            
            with patch('app.services.calendar_service.calendar_service') as mock_calendar_service:
                # Mock async method with AsyncMock
                from unittest.mock import AsyncMock
                mock_calendar_service.update_event = AsyncMock(return_value=True)
                
                result = await scheduling_service._sync_recurring_series_update(
                    mock_schedule, from_datetime, {'user_id': 'T001'}
                )
                
                assert result is True
                # Should update individual instances
                assert mock_calendar_service.update_event.call_count == 2
    
    @pytest.mark.asyncio
    async def test_update_missing_instance_datetime(self, scheduling_service, sample_db_schedule_row):
        """Test update fails when instance_datetime is missing for THIS_INSTANCE scope."""
        updates = ClassScheduleUpdate(title="Updated Title")
        
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with pytest.raises(SchedulingError) as exc_info:
                await scheduling_service.update_class_schedule(
                    1, updates, UpdateScope.THIS_INSTANCE
                )
            
            assert exc_info.value.error_code == "MISSING_INSTANCE_DATETIME"


class TestDeleteClassSchedule:
    """Test delete_class_schedule method."""
    
    @pytest.mark.asyncio
    async def test_delete_single_instance(self, scheduling_service, sample_db_schedule_row):
        """Test deleting a single instance."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_delete_single_instance') as mock_delete:
                mock_delete.return_value = True
                
                result = await scheduling_service.delete_class_schedule(
                    1, UpdateScope.THIS_INSTANCE, datetime(2025, 9, 1, 10, 0)
                )
                
                assert result is True
                mock_delete.assert_called_once_with(1, datetime(2025, 9, 1, 10, 0))
    
    @pytest.mark.asyncio
    async def test_delete_all_instances(self, scheduling_service, sample_db_schedule_row):
        """Test deleting all instances."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            with patch.object(scheduling_service, '_delete_all_instances') as mock_delete:
                mock_delete.return_value = True
                
                result = await scheduling_service.delete_class_schedule(1, UpdateScope.ALL_INSTANCES)
                
                assert result is True
                mock_delete.assert_called_once_with(1)


class TestGetSchedules:
    """Test schedule retrieval methods."""
    
    @pytest.mark.asyncio
    async def test_get_teacher_schedules(self, scheduling_service, sample_db_schedule_row):
        """Test getting teacher schedules."""
        # Mock database query
        mock_result = Mock()
        mock_result.data = [sample_db_schedule_row]
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value = mock_result
        
        # Mock conversion method
        with patch.object(scheduling_service, '_convert_db_row_to_schedule_response') as mock_convert:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_convert.return_value = mock_schedule
            
            result = await scheduling_service.get_teacher_schedules('T001')
            
            assert len(result) == 1
            assert result[0] == mock_schedule
            mock_convert.assert_called_once_with(sample_db_schedule_row, False)
    
    @pytest.mark.asyncio
    async def test_get_teacher_schedules_with_query(self, scheduling_service, sample_db_schedule_row):
        """Test getting teacher schedules with query filters."""
        query = ScheduleQuery(
            start_date=date(2024, 3, 1),
            end_date=date(2024, 6, 1),
            subject_id="CS101",
            include_instances=True
        )
        
        # Mock database query chain
        mock_query = Mock()
        mock_query.gte.return_value = mock_query
        mock_query.lte.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value.data = [sample_db_schedule_row]
        
        scheduling_service.mock_table.select.return_value.eq.return_value = mock_query
        
        with patch.object(scheduling_service, '_convert_db_row_to_schedule_response') as mock_convert:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_convert.return_value = mock_schedule
            
            result = await scheduling_service.get_teacher_schedules('T001', query)
            
            assert len(result) == 1
            mock_convert.assert_called_once_with(sample_db_schedule_row, True)
    
    @pytest.mark.asyncio
    async def test_get_student_schedules(self, scheduling_service, sample_db_schedule_row):
        """Test getting student schedules."""
        mock_result = Mock()
        mock_result.data = [sample_db_schedule_row]
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value = mock_result
        
        with patch.object(scheduling_service, '_convert_db_row_to_schedule_response') as mock_convert:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_convert.return_value = mock_schedule
            
            result = await scheduling_service.get_student_schedules('S001')
            
            assert len(result) == 1
            assert result[0] == mock_schedule
    
    @pytest.mark.asyncio
    async def test_get_schedule_by_id(self, scheduling_service, sample_db_schedule_row):
        """Test getting schedule by ID."""
        mock_result = Mock()
        mock_result.data = [sample_db_schedule_row]
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value = mock_result
        
        with patch.object(scheduling_service, '_convert_db_row_to_schedule_response') as mock_convert:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_convert.return_value = mock_schedule
            
            result = await scheduling_service.get_schedule_by_id(1)
            
            assert result == mock_schedule
            mock_convert.assert_called_once_with(sample_db_schedule_row, include_instances=True)
    
    @pytest.mark.asyncio
    async def test_get_schedule_by_id_not_found(self, scheduling_service):
        """Test getting non-existent schedule by ID."""
        mock_result = Mock()
        mock_result.data = []
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value = mock_result
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.get_schedule_by_id(999)
        
        assert exc_info.value.error_code == "SCHEDULE_NOT_FOUND"


class TestBulkOperations:
    """Test bulk operations."""
    
    @pytest.mark.asyncio
    async def test_create_bulk_schedules_success(self, scheduling_service, sample_schedule_create, sample_db_schedule_row):
        """Test successful bulk schedule creation."""
        bulk_data = BulkScheduleCreate(schedules=[sample_schedule_create, sample_schedule_create])
        
        with patch.object(scheduling_service, 'create_class_schedule') as mock_create:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_create.return_value = mock_schedule
            
            result = await scheduling_service.create_bulk_schedules('T001', bulk_data)
            
            assert result.created_count == 2
            assert result.failed_count == 0
            assert len(result.created_schedules) == 2
            assert len(result.errors) == 0
    
    @pytest.mark.asyncio
    async def test_create_bulk_schedules_partial_failure(self, scheduling_service, sample_schedule_create, sample_db_schedule_row):
        """Test bulk schedule creation with partial failures."""
        bulk_data = BulkScheduleCreate(schedules=[sample_schedule_create, sample_schedule_create])
        
        with patch.object(scheduling_service, 'create_class_schedule') as mock_create:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_create.side_effect = [mock_schedule, SchedulingError("Test error", "TEST_ERROR")]
            
            result = await scheduling_service.create_bulk_schedules('T001', bulk_data)
            
            assert result.created_count == 1
            assert result.failed_count == 1
            assert len(result.created_schedules) == 1
            assert len(result.errors) == 1


class TestSyncWithCalendar:
    """Test calendar synchronization."""
    
    @pytest.mark.asyncio
    async def test_sync_with_calendar_success(self, scheduling_service, sample_db_schedule_row):
        """Test successful calendar sync."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock update operation
            mock_result = Mock()
            mock_result.data = [{'id': 1}]
            scheduling_service.mock_table.update.return_value.eq.return_value.execute.return_value = mock_result
            
            result = await scheduling_service.sync_with_calendar(1)
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_sync_with_calendar_failure(self, scheduling_service, sample_db_schedule_row):
        """Test calendar sync failure."""
        with patch.object(scheduling_service, 'get_schedule_by_id') as mock_get:
            mock_schedule = ClassScheduleResponse(**sample_db_schedule_row)
            mock_get.return_value = mock_schedule
            
            # Mock update failure
            mock_result = Mock()
            mock_result.data = None
            scheduling_service.mock_table.update.return_value.eq.return_value.execute.return_value = mock_result
            
            with pytest.raises(SchedulingError) as exc_info:
                await scheduling_service.sync_with_calendar(1)
            
            assert exc_info.value.error_code == "SYNC_UPDATE_FAILED"


class TestDataConversion:
    """Test data conversion methods."""
    
    @pytest.mark.asyncio
    async def test_convert_db_row_to_schedule_response(self, scheduling_service, sample_db_schedule_row):
        """Test converting database row to schedule response."""
        # Mock instances query for include_instances=True
        mock_instances_result = Mock()
        mock_instances_result.data = [{
            'id': 1,
            'schedule_id': 1,
            'instance_datetime': '2024-03-01T10:00:00+00:00',
            'google_event_id': None,
            'status': 'scheduled',
            'modifications': None,
            'created_at': '2024-02-01T10:00:00+00:00',
            'updated_at': '2024-02-01T10:00:00+00:00'
        }]
        
        scheduling_service.mock_table.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_instances_result
        
        result = await scheduling_service._convert_db_row_to_schedule_response(
            sample_db_schedule_row, include_instances=True
        )
        
        assert isinstance(result, ClassScheduleResponse)
        assert result.id == sample_db_schedule_row['id']
        assert result.title == sample_db_schedule_row['title']
        assert result.teacher_id == sample_db_schedule_row['teacher_id']
        assert result.subject_id == sample_db_schedule_row['subject_id']
        assert result.recurrence_pattern is not None
        assert result.recurrence_pattern.type == RecurrenceType.WEEKLY
    
    @pytest.mark.asyncio
    async def test_convert_db_row_invalid_data(self, scheduling_service):
        """Test conversion with invalid data."""
        invalid_row = {
            'id': 1,
            'start_datetime': 'invalid-datetime',  # Invalid datetime format
        }
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service._convert_db_row_to_schedule_response(invalid_row)
        
        assert exc_info.value.error_code == "DATA_CONVERSION_FAILED"


class TestErrorHandling:
    """Test error handling scenarios."""
    
    @pytest.mark.asyncio
    async def test_database_connection_error(self, scheduling_service, sample_schedule_create):
        """Test handling of database connection errors."""
        # Mock database connection error
        scheduling_service.mock_table.select.side_effect = Exception("Database connection failed")
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.create_class_schedule('T001', sample_schedule_create)
        
        assert exc_info.value.error_code == "SCHEDULE_CREATE_FAILED"
        assert "Database connection failed" in str(exc_info.value.details.get('error', ''))
    
    @pytest.mark.asyncio
    async def test_transaction_rollback_scenario(self, scheduling_service, sample_schedule_create):
        """Test transaction rollback scenarios."""
        # This would be more comprehensive with actual database transactions
        # For now, we test that errors are properly caught and wrapped
        
        # Mock successful validation but failed insert
        scheduling_service.mock_table.select.return_value.eq.return_value.execute.return_value.data = [{'faculty_id': 'T001'}]
        scheduling_service.mock_table.insert.side_effect = Exception("Insert failed")
        
        with pytest.raises(SchedulingError) as exc_info:
            await scheduling_service.create_class_schedule('T001', sample_schedule_create)
        
        assert exc_info.value.error_code == "SCHEDULE_CREATE_FAILED"


if __name__ == "__main__":
    pytest.main([__file__])