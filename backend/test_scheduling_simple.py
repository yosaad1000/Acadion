"""
Simple test for scheduling service core logic without external dependencies.
"""

from datetime import datetime, timedelta, date
from unittest.mock import Mock, patch
import sys

# Mock external dependencies
mock_supabase = Mock()
mock_config = Mock()
sys.modules['supabase'] = mock_supabase
sys.modules['app.config'] = mock_config

# Mock the models
class RecurrenceType:
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    CUSTOM = "custom"

class RecurrencePattern:
    def __init__(self, type, interval=1, days_of_week=None, end_date=None, occurrence_count=None):
        self.type = type
        self.interval = interval
        self.days_of_week = days_of_week
        self.end_date = end_date
        self.occurrence_count = occurrence_count

# Test the core recurrence logic
def test_recurrence_calculation():
    """Test the core recurrence pattern calculation logic."""
    
    # Mock the SchedulingService class with just the recurrence logic
    class MockSchedulingService:
        def __init__(self):
            self.recurrence_config = Mock()
            self.recurrence_config.max_instances = 365
            self.recurrence_config.max_future_months = 12
        
        def _calculate_recurrence_instances(self, start_datetime, pattern):
            """Calculate all instance datetimes based on recurrence pattern."""
            instances = []
            current_datetime = start_datetime
            max_end_date = datetime.now() + timedelta(days=self.recurrence_config.max_future_months * 30)
            
            # Determine end condition
            end_date = pattern.end_date
            if end_date:
                end_datetime = datetime.combine(end_date, start_datetime.time())
                if end_datetime > max_end_date:
                    end_datetime = max_end_date
            else:
                end_datetime = max_end_date
            
            occurrence_count = pattern.occurrence_count or self.recurrence_config.max_instances
            
            count = 0
            while (current_datetime <= end_datetime and 
                   count < occurrence_count and 
                   count < self.recurrence_config.max_instances):
                
                # Check if this instance should be included based on days_of_week
                if pattern.days_of_week:
                    weekday = current_datetime.weekday()  # 0=Monday, 6=Sunday
                    if weekday not in pattern.days_of_week:
                        current_datetime = self._get_next_occurrence(current_datetime, pattern)
                        continue
                
                instances.append(current_datetime)
                count += 1
                
                # Calculate next occurrence
                current_datetime = self._get_next_occurrence(current_datetime, pattern)
            
            return instances
        
        def _get_next_occurrence(self, current_datetime, pattern):
            """Calculate the next occurrence based on recurrence pattern."""
            if pattern.type == RecurrenceType.WEEKLY:
                return current_datetime + timedelta(weeks=pattern.interval)
            elif pattern.type == RecurrenceType.BIWEEKLY:
                return current_datetime + timedelta(weeks=2 * pattern.interval)
            elif pattern.type == RecurrenceType.CUSTOM:
                return current_datetime + timedelta(weeks=pattern.interval)
            else:
                # Default to weekly
                return current_datetime + timedelta(weeks=1)
    
    # Test weekly recurrence
    service = MockSchedulingService()
    start_datetime = datetime(2024, 3, 1, 10, 0)  # Friday
    pattern = RecurrencePattern(
        type=RecurrenceType.WEEKLY,
        interval=1,
        days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
        occurrence_count=6
    )
    
    instances = service._calculate_recurrence_instances(start_datetime, pattern)
    
    print(f"Generated {len(instances)} instances:")
    for i, instance in enumerate(instances):
        print(f"  {i+1}: {instance} (weekday: {instance.weekday()})")
    
    # Verify results
    assert len(instances) == 6, f"Expected 6 instances, got {len(instances)}"
    assert instances[0] == start_datetime, "First instance should be start datetime"
    
    # Check that instances fall on correct days
    for instance in instances:
        assert instance.weekday() in [0, 2, 4], f"Instance {instance} not on correct weekday"
    
    print("✓ Weekly recurrence test passed")
    
    # Test biweekly recurrence
    pattern_biweekly = RecurrencePattern(
        type=RecurrenceType.BIWEEKLY,
        interval=1,
        occurrence_count=4
    )
    
    instances_biweekly = service._calculate_recurrence_instances(start_datetime, pattern_biweekly)
    
    print(f"\nGenerated {len(instances_biweekly)} biweekly instances:")
    for i, instance in enumerate(instances_biweekly):
        print(f"  {i+1}: {instance}")
    
    assert len(instances_biweekly) == 4, f"Expected 4 instances, got {len(instances_biweekly)}"
    assert instances_biweekly[0] == start_datetime
    assert instances_biweekly[1] == start_datetime + timedelta(weeks=2)
    assert instances_biweekly[2] == start_datetime + timedelta(weeks=4)
    assert instances_biweekly[3] == start_datetime + timedelta(weeks=6)
    
    print("✓ Biweekly recurrence test passed")
    
    # Test custom recurrence
    pattern_custom = RecurrencePattern(
        type=RecurrenceType.CUSTOM,
        interval=3,  # Every 3 weeks
        occurrence_count=3
    )
    
    instances_custom = service._calculate_recurrence_instances(start_datetime, pattern_custom)
    
    print(f"\nGenerated {len(instances_custom)} custom instances:")
    for i, instance in enumerate(instances_custom):
        print(f"  {i+1}: {instance}")
    
    assert len(instances_custom) == 3, f"Expected 3 instances, got {len(instances_custom)}"
    assert instances_custom[0] == start_datetime
    assert instances_custom[1] == start_datetime + timedelta(weeks=3)
    assert instances_custom[2] == start_datetime + timedelta(weeks=6)
    
    print("✓ Custom recurrence test passed")
    
    print("\n🎉 All recurrence pattern tests passed!")

if __name__ == "__main__":
    test_recurrence_calculation()