"""
Performance and load testing for Google Calendar integration.
Tests system performance under various load conditions and bulk operations.
"""

import pytest
import asyncio
import time
import threading
import concurrent.futures
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock, patch, AsyncMock
import psutil
import os
import gc
from dataclasses import dataclass

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.calendar import ClassScheduleCreate, RecurrencePattern, RecurrenceType


@dataclass
class PerformanceMetrics:
    """Performance metrics tracking"""
    operation_name: str
    start_time: float
    end_time: float
    operation_count: int
    success_count: int
    error_count: int
    memory_start_mb: float
    memory_end_mb: float
    
    @property
    def duration_seconds(self) -> float:
        return self.end_time - self.start_time
    
    @property
    def operations_per_second(self) -> float:
        return self.operation_count / self.duration_seconds if self.duration_seconds > 0 else 0
    
    @property
    def success_rate(self) -> float:
        return self.success_count / self.operation_count if self.operation_count > 0 else 0
    
    @property
    def memory_increase_mb(self) -> float:
        return self.memory_end_mb - self.memory_start_mb
    
    def __str__(self) -> str:
        return (
            f"{self.operation_name}: "
            f"{self.operation_count} ops in {self.duration_seconds:.2f}s "
            f"({self.operations_per_second:.2f} ops/sec), "
            f"Success: {self.success_rate:.1%}, "
            f"Memory: +{self.memory_increase_mb:.2f}MB"
        )


class PerformanceTestBase:
    """Base class for performance tests with common utilities"""
    
    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    
    def create_test_schedule(self, index: int) -> ClassScheduleCreate:
        """Create a test schedule for performance testing"""
        return ClassScheduleCreate(
            subject_id=f"PERF{index:04d}",
            title=f"Performance Test Schedule {index}",
            description=f"Performance testing schedule number {index}",
            start_datetime=datetime.now() + timedelta(hours=index % 24 + 1),
            duration_minutes=60
        )
    
    def setup_calendar_service_mock(self):
        """Setup mocked calendar service for performance testing"""
        with patch('app.services.calendar_service.build') as mock_build:
            mock_calendar_api = Mock()
            mock_build.return_value = mock_calendar_api
            
            mock_events = Mock()
            mock_calendar_api.events.return_value = mock_events
            
            # Mock successful responses with minimal delay
            mock_insert = Mock()
            mock_events.insert.return_value = mock_insert
            mock_insert.execute.return_value = {"id": "event_123", "status": "confirmed"}
            
            mock_update = Mock()
            mock_events.update.return_value = mock_update
            mock_update.execute.return_value = {"id": "event_123", "status": "confirmed"}
            
            mock_delete = Mock()
            mock_events.delete.return_value = mock_delete
            mock_delete.execute.return_value = {}
            
            # Import after mocking
            from app.services.calendar_service import CalendarService
            return CalendarService()


class TestBulkOperationPerformance(PerformanceTestBase):
    """Test performance of bulk operations"""
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_bulk_schedule_creation_performance(self):
        """Test performance of creating multiple schedules"""
        calendar_service = self.setup_calendar_service_mock()
        
        # Test different batch sizes
        batch_sizes = [10, 50, 100, 200]
        
        for batch_size in batch_sizes:
            print(f"\nTesting bulk creation with {batch_size} schedules...")
            
            # Create test schedules
            schedules = [self.create_test_schedule(i) for i in range(batch_size)]
            
            # Measure performance
            memory_start = self.get_memory_usage_mb()
            start_time = time.time()
            
            # Execute bulk creation
            results = []
            errors = 0
            
            for schedule in schedules:
                try:
                    event_id = await calendar_service.create_event(
                        user_id=1, event_data=schedule
                    )
                    results.append(event_id)
                except Exception as e:
                    errors += 1
            
            end_time = time.time()
            memory_end = self.get_memory_usage_mb()
            
            # Create metrics
            metrics = PerformanceMetrics(
                operation_name=f"Bulk Creation ({batch_size})",
                start_time=start_time,
                end_time=end_time,
                operation_count=batch_size,
                success_count=len(results),
                error_count=errors,
                memory_start_mb=memory_start,
                memory_end_mb=memory_end
            )
            
            print(metrics)
            
            # Performance assertions
            assert metrics.success_rate >= 0.95  # At least 95% success rate
            assert metrics.operations_per_second >= 10  # At least 10 ops/sec
            assert metrics.memory_increase_mb < 50  # Less than 50MB increase
            
            # Cleanup
            gc.collect()
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_bulk_schedule_updates_performance(self):
        """Test performance of updating multiple schedules"""
        calendar_service = self.setup_calendar_service_mock()
        
        batch_size = 100
        print(f"\nTesting bulk updates with {batch_size} schedules...")
        
        # Prepare update data
        updates = [
            {"title": f"Updated Schedule {i}", "duration_minutes": 90}
            for i in range(batch_size)
        ]
        
        # Measure performance
        memory_start = self.get_memory_usage_mb()
        start_time = time.time()
        
        # Execute bulk updates
        results = []
        errors = 0
        
        for i, update_data in enumerate(updates):
            try:
                result = await calendar_service.update_event(
                    user_id=1, event_id=f"event_{i}", updates=update_data
                )
                results.append(result)
            except Exception as e:
                errors += 1
        
        end_time = time.time()
        memory_end = self.get_memory_usage_mb()
        
        # Create metrics
        metrics = PerformanceMetrics(
            operation_name=f"Bulk Updates ({batch_size})",
            start_time=start_time,
            end_time=end_time,
            operation_count=batch_size,
            success_count=len([r for r in results if r]),
            error_count=errors,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end
        )
        
        print(metrics)
        
        # Performance assertions
        assert metrics.success_rate >= 0.95
        assert metrics.operations_per_second >= 15  # Updates should be faster
        assert metrics.memory_increase_mb < 30
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_bulk_schedule_deletion_performance(self):
        """Test performance of deleting multiple schedules"""
        calendar_service = self.setup_calendar_service_mock()
        
        batch_size = 150
        print(f"\nTesting bulk deletion with {batch_size} schedules...")
        
        # Prepare event IDs for deletion
        event_ids = [f"event_{i}" for i in range(batch_size)]
        
        # Measure performance
        memory_start = self.get_memory_usage_mb()
        start_time = time.time()
        
        # Execute bulk deletion
        results = []
        errors = 0
        
        for event_id in event_ids:
            try:
                result = await calendar_service.delete_event(
                    user_id=1, event_id=event_id
                )
                results.append(result)
            except Exception as e:
                errors += 1
        
        end_time = time.time()
        memory_end = self.get_memory_usage_mb()
        
        # Create metrics
        metrics = PerformanceMetrics(
            operation_name=f"Bulk Deletion ({batch_size})",
            start_time=start_time,
            end_time=end_time,
            operation_count=batch_size,
            success_count=len([r for r in results if r]),
            error_count=errors,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end
        )
        
        print(metrics)
        
        # Performance assertions
        assert metrics.success_rate >= 0.95
        assert metrics.operations_per_second >= 20  # Deletions should be fastest
        assert metrics.memory_increase_mb < 20


class TestConcurrentOperationPerformance(PerformanceTestBase):
    """Test performance under concurrent load"""
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_concurrent_schedule_creation(self):
        """Test concurrent schedule creation performance"""
        calendar_service = self.setup_calendar_service_mock()
        
        concurrent_users = 10
        schedules_per_user = 5
        total_operations = concurrent_users * schedules_per_user
        
        print(f"\nTesting concurrent creation: {concurrent_users} users, "
              f"{schedules_per_user} schedules each ({total_operations} total)")
        
        async def create_schedules_for_user(user_id: int) -> List[str]:
            """Create schedules for a single user"""
            results = []
            for i in range(schedules_per_user):
                schedule = self.create_test_schedule(user_id * 100 + i)
                try:
                    event_id = await calendar_service.create_event(
                        user_id=user_id, event_data=schedule
                    )
                    results.append(event_id)
                except Exception as e:
                    results.append(f"ERROR: {str(e)}")
            return results
        
        # Measure performance
        memory_start = self.get_memory_usage_mb()
        start_time = time.time()
        
        # Execute concurrent operations
        tasks = [
            create_schedules_for_user(user_id) 
            for user_id in range(1, concurrent_users + 1)
        ]
        
        all_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        memory_end = self.get_memory_usage_mb()
        
        # Count successes and errors
        success_count = 0
        error_count = 0
        
        for user_results in all_results:
            if isinstance(user_results, Exception):
                error_count += schedules_per_user
            else:
                for result in user_results:
                    if isinstance(result, str) and result.startswith("ERROR"):
                        error_count += 1
                    else:
                        success_count += 1
        
        # Create metrics
        metrics = PerformanceMetrics(
            operation_name=f"Concurrent Creation ({concurrent_users} users)",
            start_time=start_time,
            end_time=end_time,
            operation_count=total_operations,
            success_count=success_count,
            error_count=error_count,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end
        )
        
        print(metrics)
        
        # Performance assertions
        assert metrics.success_rate >= 0.90  # At least 90% success under load
        assert metrics.operations_per_second >= 5  # Reasonable throughput
        assert metrics.memory_increase_mb < 100
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_mixed_concurrent_operations(self):
        """Test mixed concurrent operations (create, update, delete)"""
        calendar_service = self.setup_calendar_service_mock()
        
        operations_per_type = 20
        total_operations = operations_per_type * 3
        
        print(f"\nTesting mixed concurrent operations: {operations_per_type} each of create/update/delete")
        
        async def create_operation(op_id: int) -> str:
            schedule = self.create_test_schedule(op_id)
            return await calendar_service.create_event(user_id=1, event_data=schedule)
        
        async def update_operation(op_id: int) -> bool:
            updates = {"title": f"Updated {op_id}", "duration_minutes": 90}
            return await calendar_service.update_event(
                user_id=1, event_id=f"event_{op_id}", updates=updates
            )
        
        async def delete_operation(op_id: int) -> bool:
            return await calendar_service.delete_event(
                user_id=1, event_id=f"event_{op_id}"
            )
        
        # Measure performance
        memory_start = self.get_memory_usage_mb()
        start_time = time.time()
        
        # Create mixed tasks
        tasks = []
        
        # Add create tasks
        for i in range(operations_per_type):
            tasks.append(create_operation(i))
        
        # Add update tasks
        for i in range(operations_per_type):
            tasks.append(update_operation(i + 100))
        
        # Add delete tasks
        for i in range(operations_per_type):
            tasks.append(delete_operation(i + 200))
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        memory_end = self.get_memory_usage_mb()
        
        # Count successes and errors
        success_count = len([r for r in results if not isinstance(r, Exception)])
        error_count = len([r for r in results if isinstance(r, Exception)])
        
        # Create metrics
        metrics = PerformanceMetrics(
            operation_name="Mixed Concurrent Operations",
            start_time=start_time,
            end_time=end_time,
            operation_count=total_operations,
            success_count=success_count,
            error_count=error_count,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end
        )
        
        print(metrics)
        
        # Performance assertions
        assert metrics.success_rate >= 0.85  # At least 85% success for mixed ops
        assert metrics.operations_per_second >= 8
        assert metrics.memory_increase_mb < 80


class TestMemoryPerformance(PerformanceTestBase):
    """Test memory usage and potential memory leaks"""
    
    @pytest.mark.performance
    def test_memory_usage_schedule_objects(self):
        """Test memory usage when creating many schedule objects"""
        print("\nTesting memory usage for schedule object creation...")
        
        # Measure baseline memory
        gc.collect()  # Clean up before measurement
        baseline_memory = self.get_memory_usage_mb()
        
        # Create large number of schedule objects
        schedules = []
        batch_size = 1000
        
        for i in range(batch_size):
            schedule = self.create_test_schedule(i)
            schedules.append(schedule)
            
            # Check memory every 100 objects
            if (i + 1) % 100 == 0:
                current_memory = self.get_memory_usage_mb()
                memory_per_object = (current_memory - baseline_memory) / (i + 1) * 1024  # KB
                
                if memory_per_object > 10:  # More than 10KB per object is concerning
                    print(f"Warning: High memory usage per object: {memory_per_object:.2f}KB")
        
        peak_memory = self.get_memory_usage_mb()
        total_increase = peak_memory - baseline_memory
        memory_per_object = total_increase / batch_size * 1024  # KB per object
        
        print(f"Created {batch_size} schedule objects")
        print(f"Memory increase: {total_increase:.2f}MB ({memory_per_object:.2f}KB per object)")
        
        # Memory usage assertions
        assert total_increase < 100  # Should not use more than 100MB
        assert memory_per_object < 5  # Should not use more than 5KB per object
        
        # Cleanup and check for memory release
        del schedules
        gc.collect()
        
        cleanup_memory = self.get_memory_usage_mb()
        memory_released = peak_memory - cleanup_memory
        
        print(f"Memory released after cleanup: {memory_released:.2f}MB")
        
        # Should release at least 80% of allocated memory
        assert memory_released >= total_increase * 0.8
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_memory_leak_detection(self):
        """Test for memory leaks during repeated operations"""
        calendar_service = self.setup_calendar_service_mock()
        
        print("\nTesting for memory leaks during repeated operations...")
        
        cycles = 10
        operations_per_cycle = 50
        memory_measurements = []
        
        for cycle in range(cycles):
            gc.collect()  # Force garbage collection
            cycle_start_memory = self.get_memory_usage_mb()
            
            # Perform operations
            for i in range(operations_per_cycle):
                schedule = self.create_test_schedule(cycle * 1000 + i)
                
                # Create and immediately "delete" (simulate cleanup)
                try:
                    event_id = await calendar_service.create_event(
                        user_id=1, event_data=schedule
                    )
                    # Simulate cleanup
                    await calendar_service.delete_event(user_id=1, event_id=event_id)
                except Exception:
                    pass  # Ignore errors for memory leak test
            
            gc.collect()  # Force cleanup after cycle
            cycle_end_memory = self.get_memory_usage_mb()
            
            memory_measurements.append(cycle_end_memory)
            
            print(f"Cycle {cycle + 1}: {cycle_end_memory:.2f}MB "
                  f"(+{cycle_end_memory - cycle_start_memory:.2f}MB)")
        
        # Analyze memory trend
        if len(memory_measurements) >= 3:
            # Check if memory is consistently increasing
            recent_avg = sum(memory_measurements[-3:]) / 3
            early_avg = sum(memory_measurements[:3]) / 3
            memory_trend = recent_avg - early_avg
            
            print(f"Memory trend: {memory_trend:+.2f}MB over {cycles} cycles")
            
            # Memory leak detection
            if memory_trend > 20:  # More than 20MB increase is concerning
                pytest.fail(f"Potential memory leak detected: {memory_trend:.2f}MB increase")
            
            assert memory_trend < 10  # Should not increase by more than 10MB


class TestDatabasePerformance(PerformanceTestBase):
    """Test database operation performance"""
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_database_query_performance(self):
        """Test database query performance under load"""
        with patch('app.services.scheduling_service.LocalSupabase') as mock_supabase, \
             patch('app.services.scheduling_service.httpx.AsyncClient') as mock_client:
            
            # Setup mocks
            mock_db = Mock()
            mock_db.base_url = "http://localhost:54321"
            mock_db.headers = {"Authorization": "Bearer test"}
            mock_supabase.return_value = mock_db
            
            # Mock fast database responses
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            
            mock_http_client = Mock()
            mock_http_client.get.return_value = mock_response
            mock_http_client.post.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_http_client
            
            scheduling_service = SchedulingService()
            
            # Test query performance
            query_count = 100
            print(f"\nTesting database query performance with {query_count} queries...")
            
            memory_start = self.get_memory_usage_mb()
            start_time = time.time()
            
            # Execute multiple queries
            results = []
            errors = 0
            
            for i in range(query_count):
                try:
                    schedules = await scheduling_service.get_teacher_schedules(teacher_id=i % 10 + 1)
                    results.append(schedules)
                except Exception as e:
                    errors += 1
            
            end_time = time.time()
            memory_end = self.get_memory_usage_mb()
            
            # Create metrics
            metrics = PerformanceMetrics(
                operation_name=f"Database Queries ({query_count})",
                start_time=start_time,
                end_time=end_time,
                operation_count=query_count,
                success_count=len(results),
                error_count=errors,
                memory_start_mb=memory_start,
                memory_end_mb=memory_end
            )
            
            print(metrics)
            
            # Performance assertions
            assert metrics.success_rate >= 0.98  # Database should be very reliable
            assert metrics.operations_per_second >= 50  # Should handle many queries/sec
            assert metrics.memory_increase_mb < 20


class TestScalabilityLimits(PerformanceTestBase):
    """Test system scalability limits"""
    
    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_maximum_concurrent_users(self):
        """Test system behavior with maximum concurrent users"""
        calendar_service = self.setup_calendar_service_mock()
        
        max_users = 50  # Test with 50 concurrent users
        operations_per_user = 3
        total_operations = max_users * operations_per_user
        
        print(f"\nTesting scalability with {max_users} concurrent users...")
        
        async def user_operations(user_id: int) -> Dict[str, Any]:
            """Simulate operations for a single user"""
            results = {"user_id": user_id, "operations": [], "errors": 0}
            
            for i in range(operations_per_user):
                try:
                    schedule = self.create_test_schedule(user_id * 100 + i)
                    event_id = await calendar_service.create_event(
                        user_id=user_id, event_data=schedule
                    )
                    results["operations"].append(event_id)
                except Exception as e:
                    results["errors"] += 1
            
            return results
        
        # Measure performance
        memory_start = self.get_memory_usage_mb()
        start_time = time.time()
        
        # Execute operations for all users concurrently
        tasks = [user_operations(user_id) for user_id in range(1, max_users + 1)]
        user_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        memory_end = self.get_memory_usage_mb()
        
        # Analyze results
        successful_users = 0
        total_successful_operations = 0
        total_errors = 0
        
        for result in user_results:
            if isinstance(result, Exception):
                total_errors += operations_per_user
            else:
                successful_users += 1
                total_successful_operations += len(result["operations"])
                total_errors += result["errors"]
        
        # Create metrics
        metrics = PerformanceMetrics(
            operation_name=f"Scalability Test ({max_users} users)",
            start_time=start_time,
            end_time=end_time,
            operation_count=total_operations,
            success_count=total_successful_operations,
            error_count=total_errors,
            memory_start_mb=memory_start,
            memory_end_mb=memory_end
        )
        
        print(metrics)
        print(f"Successful users: {successful_users}/{max_users}")
        
        # Scalability assertions
        assert successful_users >= max_users * 0.8  # At least 80% of users successful
        assert metrics.success_rate >= 0.75  # At least 75% of operations successful
        assert metrics.operations_per_second >= 2  # Reasonable throughput under load
        assert metrics.memory_increase_mb < 200  # Memory usage should be reasonable


if __name__ == "__main__":
    # Run performance tests
    pytest.main(["-v", "-m", "performance", __file__])