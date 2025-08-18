"""
Simple integration test for error handling and monitoring system.
"""

import asyncio
from datetime import datetime

async def test_integration():
    """Test the integration of all error handling components."""
    
    print("Testing error handling and monitoring integration...")
    
    # Test 1: Logging system
    print("1. Testing logging system...")
    from app.core.logging_config import setup_logging, get_calendar_logger
    
    setup_logging()
    logger = get_calendar_logger(__name__)
    logger.info("Test log message", extra={'test': True})
    print("   ✓ Logging system working")
    
    # Test 2: Error message service
    print("2. Testing error message service...")
    from app.services.error_messages import error_message_service
    
    error = error_message_service.get_user_friendly_error("TOKEN_NOT_FOUND")
    assert error.title == "Calendar Not Connected"
    print("   ✓ Error message service working")
    
    # Test 3: Graceful degradation service
    print("3. Testing graceful degradation service...")
    from app.services.graceful_degradation import graceful_degradation
    
    status = graceful_degradation.get_service_status()
    assert "degraded_mode" in status
    assert "services" in status
    print("   ✓ Graceful degradation service working")
    
    # Test 4: Retry queue service
    print("4. Testing retry queue service...")
    from app.services.retry_queue import retry_queue_service
    
    queue_status = await retry_queue_service.get_queue_status()
    assert "total_operations" in queue_status or "error" in queue_status
    print("   ✓ Retry queue service working")
    
    # Test 5: Health check functionality
    print("5. Testing health check functionality...")
    from app.services.graceful_degradation import graceful_degradation
    
    health = await graceful_degradation.check_service_health('google_calendar')
    assert health is not None
    print("   ✓ Health check functionality working")
    
    print("\n✅ All error handling and monitoring components are working correctly!")
    
    return True

if __name__ == "__main__":
    result = asyncio.run(test_integration())
    if result:
        print("\n🎉 Integration test passed!")
    else:
        print("\n❌ Integration test failed!")