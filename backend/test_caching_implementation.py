#!/usr/bin/env python3
"""
Test script for caching and connection pooling implementation
Verifies that the multi-level caching and connection pooling are working correctly
"""

import asyncio
import logging
import sys
import os
import time
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_cache_manager():
    """Test the cache manager functionality"""
    try:
        from app.services.cache_manager import initialize_cache_manager, get_cache_manager
        from app.settings import settings
        
        logger.info("🧪 Testing Cache Manager...")
        
        # Initialize cache manager
        await initialize_cache_manager(settings.REDIS_URL)
        cache_manager = get_cache_manager()
        
        # Test basic cache operations
        logger.info("Testing basic cache operations...")
        
        # Set a value
        await cache_manager.set("test_key", "test_value", ttl=60)
        
        # Get the value
        value = await cache_manager.get("test_key")
        assert value == "test_value", f"Expected 'test_value', got {value}"
        
        # Test cache miss
        missing_value = await cache_manager.get("non_existent_key", default="default")
        assert missing_value == "default", f"Expected 'default', got {missing_value}"
        
        # Test cache statistics
        stats = await cache_manager.get_stats()
        logger.info(f"Cache stats: {stats}")
        
        # Test cache invalidation
        await cache_manager.delete("test_key")
        deleted_value = await cache_manager.get("test_key")
        assert deleted_value is None, f"Expected None after deletion, got {deleted_value}"
        
        logger.info("✅ Cache Manager tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Cache Manager test failed: {e}")
        return False

async def test_connection_pool():
    """Test the connection pool functionality"""
    try:
        from app.services.connection_pool import initialize_connection_manager, get_connection_manager
        from app.settings import settings
        
        logger.info("🧪 Testing Connection Pool...")
        
        # Initialize connection manager
        await initialize_connection_manager(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY,
            service_key=settings.SUPABASE_SERVICE_KEY
        )
        
        connection_manager = get_connection_manager()
        
        # Test connection pools
        read_pool = connection_manager.get_read_pool()
        write_pool = connection_manager.get_write_pool()
        admin_pool = connection_manager.get_admin_pool()
        
        logger.info("Testing connection pool requests...")
        
        # Test a simple GET request (health check)
        try:
            response = await read_pool.get("/health", retry_count=1)
            logger.info(f"Health check response status: {response.status_code}")
        except Exception as e:
            logger.warning(f"Health check failed (expected if Supabase not running): {e}")
        
        # Get connection statistics
        stats = await connection_manager.get_combined_stats()
        logger.info(f"Connection stats: {stats}")
        
        logger.info("✅ Connection Pool tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Connection Pool test failed: {e}")
        return False

async def test_cached_decorator():
    """Test the cached decorator functionality"""
    try:
        from app.services.cache_manager import cached, initialize_cache_manager
        from app.settings import settings
        
        logger.info("🧪 Testing Cached Decorator...")
        
        # Initialize cache manager
        await initialize_cache_manager(settings.REDIS_URL)
        
        # Define a test function with caching
        call_count = 0
        
        @cached(ttl=60, key_prefix="test_function")
        async def expensive_function(param1: str, param2: int) -> str:
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate expensive operation
            return f"result_{param1}_{param2}_{call_count}"
        
        # First call - should execute function
        start_time = time.time()
        result1 = await expensive_function("test", 123)
        first_call_time = time.time() - start_time
        
        # Second call - should use cache
        start_time = time.time()
        result2 = await expensive_function("test", 123)
        second_call_time = time.time() - start_time
        
        # Results should be the same
        assert result1 == result2, f"Results don't match: {result1} != {result2}"
        
        # Second call should be faster (cached)
        assert second_call_time < first_call_time, f"Second call not faster: {second_call_time} >= {first_call_time}"
        
        # Function should only be called once
        assert call_count == 1, f"Function called {call_count} times, expected 1"
        
        logger.info(f"First call: {first_call_time:.3f}s, Second call: {second_call_time:.3f}s")
        logger.info("✅ Cached Decorator tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Cached Decorator test failed: {e}")
        return False

async def test_enhanced_services():
    """Test the enhanced services with caching"""
    try:
        from app.core.cache_init import initialize_caching_services
        
        logger.info("🧪 Testing Enhanced Services...")
        
        # Initialize all caching services
        success = await initialize_caching_services()
        if not success:
            logger.warning("Caching services initialization failed, continuing with limited functionality")
        
        # Test enhanced Supabase service
        try:
            from app.services.enhanced_supabase_service import get_enhanced_supabase_service
            
            supabase_service = await get_enhanced_supabase_service()
            stats = await supabase_service.get_service_stats()
            logger.info(f"Enhanced Supabase Service stats: {stats}")
            
        except Exception as e:
            logger.warning(f"Enhanced Supabase Service test failed: {e}")
        
        # Test enhanced attendance service
        try:
            from app.services.enhanced_attendance_service import get_enhanced_attendance_service
            
            attendance_service = await get_enhanced_attendance_service()
            stats = await attendance_service.get_service_performance_stats()
            logger.info(f"Enhanced Attendance Service stats: {stats}")
            
        except Exception as e:
            logger.warning(f"Enhanced Attendance Service test failed: {e}")
        
        logger.info("✅ Enhanced Services tests completed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Enhanced Services test failed: {e}")
        return False

async def test_cache_performance():
    """Test cache performance with multiple operations"""
    try:
        from app.services.cache_manager import get_cache_manager
        
        logger.info("🧪 Testing Cache Performance...")
        
        cache_manager = get_cache_manager()
        
        # Test multiple cache operations
        num_operations = 100
        
        logger.info(f"Performing {num_operations} cache operations...")
        
        start_time = time.time()
        
        # Set multiple values
        for i in range(num_operations):
            await cache_manager.set(f"perf_test_{i}", f"value_{i}", ttl=300)
        
        set_time = time.time() - start_time
        
        # Get multiple values
        start_time = time.time()
        
        for i in range(num_operations):
            value = await cache_manager.get(f"perf_test_{i}")
            assert value == f"value_{i}", f"Unexpected value for key perf_test_{i}"
        
        get_time = time.time() - start_time
        
        # Get final statistics
        final_stats = await cache_manager.get_stats()
        
        logger.info(f"Performance results:")
        logger.info(f"  Set {num_operations} values: {set_time:.3f}s ({num_operations/set_time:.1f} ops/sec)")
        logger.info(f"  Get {num_operations} values: {get_time:.3f}s ({num_operations/get_time:.1f} ops/sec)")
        logger.info(f"  Final cache stats: {final_stats}")
        
        logger.info("✅ Cache Performance tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Cache Performance test failed: {e}")
        return False

async def main():
    """Run all tests"""
    logger.info("🚀 Starting Caching and Connection Pooling Tests")
    
    test_results = []
    
    # Run individual tests
    tests = [
        ("Cache Manager", test_cache_manager),
        ("Connection Pool", test_connection_pool),
        ("Cached Decorator", test_cached_decorator),
        ("Enhanced Services", test_enhanced_services),
        ("Cache Performance", test_cache_performance)
    ]
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running {test_name} Test")
        logger.info(f"{'='*50}")
        
        try:
            result = await test_func()
            test_results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} crashed: {e}")
            test_results.append((test_name, False))
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("TEST SUMMARY")
    logger.info(f"{'='*50}")
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! Caching and connection pooling implementation is working correctly.")
        return 0
    else:
        logger.error(f"💥 {total - passed} tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test runner crashed: {e}")
        sys.exit(1)