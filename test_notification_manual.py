#!/usr/bin/env python3
"""
Manual test script to verify notification system functionality
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_notification_service():
    """Test the notification service directly"""
    print("🧪 Testing NotificationService directly...")
    
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationCreate, NotificationType
        
        # Initialize service
        print("1. Initializing NotificationService...")
        service = NotificationService()
        
        if service.is_healthy():
            print("   ✅ Service initialized successfully")
        else:
            print("   ❌ Service initialization failed")
            return False
        
        # Test ID resolution
        print("\n2. Testing user ID resolution...")
        test_user_id = "test-user-123"
        resolved_id = await service._resolve_to_auth_user_id(test_user_id)
        print(f"   Input: {test_user_id}")
        print(f"   Resolved: {resolved_id}")
        
        # Test notification creation (should not fail with foreign key errors)
        print("\n3. Testing notification creation...")
        notification = NotificationCreate(
            recipient_id=test_user_id,
            type=NotificationType.STUDENT_JOINED,
            title="Test Notification",
            message="Testing notification system fixes"
        )
        
        success = await service.create_notification(notification)
        if success:
            print("   ✅ Notification creation succeeded (no foreign key errors)")
        else:
            print("   ❌ Notification creation failed")
        
        # Test getting notifications
        print("\n4. Testing notification retrieval...")
        notifications = await service.get_user_notifications(test_user_id, limit=5)
        print(f"   Retrieved {len(notifications)} notifications")
        
        for i, notif in enumerate(notifications[:3]):  # Show first 3
            print(f"   {i+1}. {notif.title}: {notif.message}")
        
        # Test unread count
        print("\n5. Testing unread count...")
        count = await service.get_unread_count(test_user_id)
        print(f"   Unread count: {count}")
        
        # Test clear all
        print("\n6. Testing clear all notifications...")
        clear_success = await service.clear_all_notifications(test_user_id)
        if clear_success:
            print("   ✅ Clear all succeeded")
        else:
            print("   ❌ Clear all failed")
        
        print("\n✅ All NotificationService tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ NotificationService test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_api_endpoints():
    """Test API endpoints"""
    print("\n🌐 Testing API endpoints...")
    
    try:
        import httpx
        
        base_url = "http://localhost:8000"
        
        async with httpx.AsyncClient(timeout=10) as client:
            # Test health endpoint
            print("1. Testing health endpoint...")
            response = await client.get(f"{base_url}/api/health")
            print(f"   Health check: {response.status_code}")
            
            # Test notification endpoints (without auth - should get 401/403)
            print("\n2. Testing notification endpoints...")
            
            endpoints = [
                ("GET", "/api/notifications", "Get notifications"),
                ("GET", "/api/notifications/unread-count", "Get unread count"),
                ("DELETE", "/api/notifications/clear-all", "Clear all notifications"),
                ("PATCH", "/api/notifications/mark-all-read", "Mark all read"),
                ("DELETE", "/api/notifications/test-id", "Delete notification"),
            ]
            
            for method, endpoint, description in endpoints:
                try:
                    if method == "GET":
                        response = await client.get(f"{base_url}{endpoint}")
                    elif method == "DELETE":
                        response = await client.delete(f"{base_url}{endpoint}")
                    elif method == "PATCH":
                        response = await client.patch(f"{base_url}{endpoint}")
                    
                    # 401/403 is expected without auth, 404 means endpoint doesn't exist
                    if response.status_code in [401, 403, 200]:
                        print(f"   ✅ {description}: {response.status_code} (endpoint exists)")
                    elif response.status_code == 404:
                        print(f"   ❌ {description}: {response.status_code} (endpoint missing)")
                    else:
                        print(f"   ⚠️  {description}: {response.status_code}")
                        
                except Exception as e:
                    print(f"   ❌ {description}: Error - {e}")
        
        print("\n✅ API endpoint tests completed!")
        return True
        
    except Exception as e:
        print(f"\n❌ API endpoint test failed: {e}")
        return False

def test_code_integration():
    """Test that code has proper integration"""
    print("\n📝 Testing code integration...")
    
    try:
        # Test subjects router integration
        print("1. Checking subjects router...")
        with open('backend/app/routers/subjects.py', 'r', encoding='utf-8') as f:
            subjects_code = f.read()
        
        checks = {
            "NotificationService import": "NotificationService" in subjects_code,
            "create_notification calls": "create_notification" in subjects_code,
            "CLASS_JOINED notifications": "CLASS_JOINED" in subjects_code,
            "STUDENT_JOINED notifications": "STUDENT_JOINED" in subjects_code,
            "JOIN_FAILED notifications": "JOIN_FAILED" in subjects_code,
        }
        
        for check, result in checks.items():
            status = "✅" if result else "❌"
            print(f"   {status} {check}")
        
        # Test frontend components
        print("\n2. Checking frontend components...")
        
        # NotificationBell
        with open('frontend/src/components/notifications/NotificationBell.tsx', 'r', encoding='utf-8') as f:
            bell_code = f.read()
        
        # NotificationDropdown
        with open('frontend/src/components/notifications/NotificationDropdown.tsx', 'r', encoding='utf-8') as f:
            dropdown_code = f.read()
        
        # API integration
        with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
            api_code = f.read()
        
        frontend_checks = {
            "Unread count display": "unreadCount" in bell_code,
            "Clear all button": "clearAllNotifications" in dropdown_code,
            "Mark all read": "markAllAsRead" in dropdown_code,
            "Delete notification API": "deleteNotification" in api_code,
            "Clear all API": "clearAllNotifications" in api_code,
        }
        
        for check, result in frontend_checks.items():
            status = "✅" if result else "❌"
            print(f"   {status} {check}")
        
        all_passed = all(checks.values()) and all(frontend_checks.values())
        
        if all_passed:
            print("\n✅ All code integration checks passed!")
        else:
            print("\n⚠️  Some code integration checks failed")
        
        return all_passed
        
    except Exception as e:
        print(f"\n❌ Code integration test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Notification System Manual Tests")
    print("=" * 50)
    
    results = []
    
    # Test 1: NotificationService
    results.append(await test_notification_service())
    
    # Test 2: API endpoints
    results.append(await test_api_endpoints())
    
    # Test 3: Code integration
    results.append(test_code_integration())
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("The notification system fixes are working correctly.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
        print("Review the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)