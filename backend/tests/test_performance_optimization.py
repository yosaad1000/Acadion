"""
Performance optimization tests
"""
import pytest
import asyncio
import time
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from main import app
from app.services.local_supabase import LocalSupabase

class TestPerformanceOptimizations:
    """Test performance optimizations"""
    
    @pytest.mark.asyncio
    async def test_concurrent_database_queries(self):
        """Test that dashboard data uses concurrent queries"""
        db = LocalSupabase()
        
        # Mock the httpx client to track concurrent calls
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            start_time = time.time()
            result = await db.get_attendance_dashboard_data("test-subject")
            end_time = time.time()
            
            # Should have made concurrent calls
            assert mock_client_instance.get.call_count == 2  # attendance + students
            assert result["records"] == []
            assert result["students"] == []
            
            print(f"✅ Dashboard query completed in {end_time - start_time:.3f}s")
    
    @pytest.mark.asyncio
    async def test_optimized_student_count_queries(self):
        """Test that multiple subject student counts are optimized"""
        db = LocalSupabase()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = [
                {"subject_id": "subject1"},
                {"subject_id": "subject1"},
                {"subject_id": "subject2"}
            ]
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            # Test the optimized method
            result = await db._get_multiple_subject_student_counts(["subject1", "subject2", "subject3"])
            
            # Should make only one query for all subjects
            assert mock_client_instance.get.call_count == 1
            assert result["subject1"] == 2
            assert result["subject2"] == 1
            assert result["subject3"] == 0
            
            print("✅ Optimized student count queries working")
    
    @pytest.mark.asyncio
    async def test_caching_functionality(self):
        """Test that caching improves performance"""
        db = LocalSupabase()
        
        # Test cache operations
        cache_key = db._get_cache_key("test", "key1", "key2")
        assert cache_key == "test:key1_key2"
        
        # Test cache set/get
        db._set_cache("test_key", {"data": "value"})
        cached_value = db._get_from_cache("test_key")
        assert cached_value == {"data": "value"}
        
        # Test cache expiration (simulate old timestamp)
        db._cache["expired_key"] = ({"data": "old"}, time.time() - 400)  # Older than TTL
        expired_value = db._get_from_cache("expired_key")
        assert expired_value is None
        assert "expired_key" not in db._cache  # Should be cleaned up
        
        print("✅ Caching functionality working")
    
    @pytest.mark.asyncio
    async def test_cache_invalidation(self):
        """Test that cache invalidation works correctly"""
        db = LocalSupabase()
        
        # Set up some cache entries
        db._set_cache("student_count:subject1", 5)
        db._set_cache("student_count:subject2", 3)
        db._set_cache("other_data:subject1", "test")
        
        # Invalidate student count caches
        db._invalidate_cache_pattern("student_count:")
        
        # Student count caches should be gone
        assert db._get_from_cache("student_count:subject1") is None
        assert db._get_from_cache("student_count:subject2") is None
        
        # Other cache should remain
        assert db._get_from_cache("other_data:subject1") == "test"
        
        print("✅ Cache invalidation working")
    
    @pytest.mark.asyncio
    async def test_api_response_time(self):
        """Test that API endpoints respond quickly"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            start_time = time.time()
            response = await client.get("/api/health")
            end_time = time.time()
            
            assert response.status_code == 200
            response_time = end_time - start_time
            assert response_time < 1.0  # Should respond in less than 1 second
            
            print(f"✅ Health endpoint responded in {response_time:.3f}s")
    
    @pytest.mark.asyncio
    async def test_concurrent_api_requests(self):
        """Test that API can handle concurrent requests"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            start_time = time.time()
            
            # Make 5 concurrent requests
            tasks = [client.get("/api/health") for _ in range(5)]
            responses = await asyncio.gather(*tasks)
            
            end_time = time.time()
            
            # All should succeed
            for response in responses:
                assert response.status_code == 200
            
            total_time = end_time - start_time
            avg_time = total_time / len(responses)
            
            print(f"✅ {len(responses)} concurrent requests completed in {total_time:.3f}s (avg: {avg_time:.3f}s)")
            
            # Should handle concurrent requests efficiently
            assert total_time < 5.0  # All requests should complete in under 5 seconds

class TestDatabaseOptimizations:
    """Test database-specific optimizations"""
    
    @pytest.mark.asyncio
    async def test_teacher_subjects_optimization(self):
        """Test that teacher subjects query is optimized"""
        db = LocalSupabase()
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock subjects response
            subjects_response = AsyncMock()
            subjects_response.status_code = 200
            subjects_response.json.return_value = [
                {"subject_id": "s1", "name": "Math", "teacher": {"name": "Teacher 1"}},
                {"subject_id": "s2", "name": "Science", "teacher": {"name": "Teacher 1"}}
            ]
            
            # Mock student counts response
            counts_response = AsyncMock()
            counts_response.status_code = 200
            counts_response.json.return_value = [
                {"subject_id": "s1"},
                {"subject_id": "s1"},
                {"subject_id": "s2"}
            ]
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.side_effect = [subjects_response, counts_response]
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await db.get_teacher_subjects("teacher1")
            
            # Should make 2 queries: subjects + optimized student counts
            assert mock_client_instance.get.call_count == 2
            assert len(result) == 2
            assert result[0]["student_count"] == 2
            assert result[1]["student_count"] == 1
            
            print("✅ Teacher subjects query optimized")
    
    @pytest.mark.asyncio
    async def test_student_subjects_optimization(self):
        """Test that student subjects query is optimized"""
        db = LocalSupabase()
        
        with patch('httpx.AsyncClient') as mock_client:
            # Mock enrollments response
            enrollments_response = AsyncMock()
            enrollments_response.status_code = 200
            enrollments_response.json.return_value = [
                {"subject": {"subject_id": "s1", "name": "Math", "teacher": {"name": "Teacher 1"}}},
                {"subject": {"subject_id": "s2", "name": "Science", "teacher": {"name": "Teacher 2"}}}
            ]
            
            # Mock student counts response
            counts_response = AsyncMock()
            counts_response.status_code = 200
            counts_response.json.return_value = [
                {"subject_id": "s1"},
                {"subject_id": "s2"},
                {"subject_id": "s2"}
            ]
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.side_effect = [enrollments_response, counts_response]
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            result = await db.get_student_subjects("student1")
            
            # Should make 2 queries: enrollments + optimized student counts
            assert mock_client_instance.get.call_count == 2
            assert len(result) == 2
            assert result[0]["student_count"] == 1
            assert result[1]["student_count"] == 2
            
            print("✅ Student subjects query optimized")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])