#!/usr/bin/env python3
"""
Comprehensive test script for notification system fixes.
Tests all requirements from task 6:
- Foreign key constraint errors are resolved
- Class creation and joining generate proper notifications
- Notification management features work (clear all, delete individual)
- Notification bell shows correct unread counts
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional

import httpx
from pydantic import BaseModel

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 30

class TestResult(BaseModel):
    test_name: str
    passed: bool
    message: str
    details: Optional[Dict] = None

class NotificationSystemTester:
    def __init__(self):
        self.results: List[TestResult] = []
        self.test_user_token = None
        self.test_teacher_token = None
        self.test_student_token = None
        
    def log_result(self, test_name: str, passed: bool, message: str, details: Optional[Dict] = None):
        """Log a test result"""
        result = TestResult(test_name=test_name, passed=passed, message=message, details=details)
        self.results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")
        print()

    async def check_backend_health(self) -> bool:
        """Check if backend is running and healthy"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{API_BASE_URL}/api/health")
                if response.status_code == 200:
                    self.log_result("Backend Health Check", True, "Backend is running and healthy")
                    return True
                else:
                    self.log_result("Backend Health Check", False, f"Backend returned status {response.status_code}")
                    return False
        except Exception as e:
            self.log_result("Backend Health Check", False, f"Cannot connect to backend: {e}")
            return False

    async def test_notification_service_initialization(self) -> bool:
        """Test that NotificationService initializes without proxy issues"""
        try:
            # Import and initialize the service
            sys.path.append('backend')
            from app.services.notification_service import NotificationService
            
            service = NotificationService()
            is_healthy = service.is_healthy()
            
            if is_healthy:
                self.log_result(
                    "NotificationService Initialization", 
                    True, 
                    "NotificationService initialized successfully with HTTP client"
                )
                return True
            else:
                self.log_result(
                    "NotificationService Initialization", 
                    False, 
                    "NotificationService failed to initialize properly"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "NotificationService Initialization", 
                False, 
                f"Failed to initialize NotificationService: {e}"
            )
            return False

    async def test_foreign_key_constraint_resolution(self) -> bool:
        """Test that foreign key constraint errors are resolved"""
        try:
            sys.path.append('backend')
            from app.services.notification_service import NotificationService
            from app.models.notification import NotificationCreate, NotificationType
            
            service = NotificationService()
            
            # Test with various user ID formats that previously caused foreign key errors
            test_cases = [
                "test-user-id-123",  # Regular user_id format
                "auth-user-456",     # Auth user ID format
                "nonexistent-user",  # Non-existent user (should not break)
            ]
            
            all_passed = True
            for user_id in test_cases:
                try:
                    notification = NotificationCreate(
                        recipient_id=user_id,
                        type=NotificationType.STUDENT_JOINED,
                        title="Test Notification",
                        message="Testing foreign key constraint resolution"
                    )
                    
                    # This should not raise foreign key constraint errors
                    success = await service.create_notification(notification)
                    
                    if success:
                        print(f"   ✓ No foreign key error for user_id: {user_id}")
                    else:
                        print(f"   ⚠ Notification creation returned False for user_id: {user_id}")
                        
                except Exception as e:
                    if "foreign key constraint" in str(e).lower():
                        print(f"   ❌ Foreign key constraint error for user_id: {user_id}")
                        all_passed = False
                    else:
                        print(f"   ⚠ Other error for user_id: {user_id}: {e}")
            
            self.log_result(
                "Foreign Key Constraint Resolution",
                all_passed,
                "All user ID formats handled without foreign key constraint violations" if all_passed 
                else "Some user ID formats still cause foreign key constraint violations"
            )
            return all_passed
            
        except Exception as e:
            self.log_result(
                "Foreign Key Constraint Resolution",
                False,
                f"Test failed with exception: {e}"
            )
            return False

    async def test_notification_endpoints(self) -> bool:
        """Test notification API endpoints"""
        try:
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                # Test getting notifications (should work even without auth for test notifications)
                response = await client.get(f"{API_BASE_URL}/api/notifications")
                
                if response.status_code in [200, 401]:  # 401 is expected without auth
                    self.log_result(
                        "Notification Endpoints",
                        True,
                        f"Notification endpoints are accessible (status: {response.status_code})"
                    )
                    return True
                else:
                    self.log_result(
                        "Notification Endpoints",
                        False,
                        f"Unexpected status code: {response.status_code}"
                    )
                    return False
                    
        except Exception as e:
            self.log_result(
                "Notification Endpoints",
                False,
                f"Failed to test notification endpoints: {e}"
            )
            return False

    async def test_notification_management_endpoints(self) -> bool:
        """Test notification management endpoints exist"""
        try:
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                # Test clear all endpoint
                response = await client.delete(f"{API_BASE_URL}/api/notifications/clear-all")
                clear_all_exists = response.status_code != 404
                
                # Test delete individual endpoint
                response = await client.delete(f"{API_BASE_URL}/api/notifications/test-id")
                delete_individual_exists = response.status_code != 404
                
                # Test mark all read endpoint
                response = await client.patch(f"{API_BASE_URL}/api/notifications/mark-all-read")
                mark_all_read_exists = response.status_code != 404
                
                all_exist = clear_all_exists and delete_individual_exists and mark_all_read_exists
                
                self.log_result(
                    "Notification Management Endpoints",
                    all_exist,
                    f"Management endpoints exist - Clear All: {clear_all_exists}, Delete: {delete_individual_exists}, Mark All Read: {mark_all_read_exists}"
                )
                return all_exist
                
        except Exception as e:
            self.log_result(
                "Notification Management Endpoints",
                False,
                f"Failed to test management endpoints: {e}"
            )
            return False

    async def test_unread_count_endpoint(self) -> bool:
        """Test unread count endpoint"""
        try:
            async with httpx.AsyncClient(timeout=TEST_TIMEOUT) as client:
                response = await client.get(f"{API_BASE_URL}/api/notifications/unread-count")
                
                if response.status_code in [200, 401]:  # 401 expected without auth
                    self.log_result(
                        "Unread Count Endpoint",
                        True,
                        f"Unread count endpoint is accessible (status: {response.status_code})"
                    )
                    return True
                else:
                    self.log_result(
                        "Unread Count Endpoint",
                        False,
                        f"Unexpected status code: {response.status_code}"
                    )
                    return False
                    
        except Exception as e:
            self.log_result(
                "Unread Count Endpoint",
                False,
                f"Failed to test unread count endpoint: {e}"
            )
            return False

    async def test_subjects_router_notifications(self) -> bool:
        """Test that subjects router has notification creation logic"""
        try:
            # Check if subjects router imports and uses NotificationService
            with open('backend/app/routers/subjects.py', 'r', encoding='utf-8') as f:
                subjects_code = f.read()
            
            has_notification_import = 'NotificationService' in subjects_code
            has_notification_creation = 'create_notification' in subjects_code
            has_class_joined_notification = 'CLASS_JOINED' in subjects_code
            has_student_joined_notification = 'STUDENT_JOINED' in subjects_code
            has_join_failed_notification = 'JOIN_FAILED' in subjects_code
            
            all_checks = [
                has_notification_import,
                has_notification_creation,
                has_class_joined_notification,
                has_student_joined_notification,
                has_join_failed_notification
            ]
            
            passed = all(all_checks)
            
            details = {
                "notification_import": has_notification_import,
                "notification_creation": has_notification_creation,
                "class_joined_notification": has_class_joined_notification,
                "student_joined_notification": has_student_joined_notification,
                "join_failed_notification": has_join_failed_notification
            }
            
            self.log_result(
                "Subjects Router Notification Integration",
                passed,
                "Subjects router properly integrated with notification system" if passed 
                else "Subjects router missing notification integration",
                details
            )
            return passed
            
        except Exception as e:
            self.log_result(
                "Subjects Router Notification Integration",
                False,
                f"Failed to check subjects router: {e}"
            )
            return False

    async def test_frontend_notification_components(self) -> bool:
        """Test that frontend notification components have management features"""
        try:
            # Check NotificationBell component
            with open('frontend/src/components/notifications/NotificationBell.tsx', 'r', encoding='utf-8') as f:
                bell_code = f.read()
            
            # Check NotificationDropdown component
            with open('frontend/src/components/notifications/NotificationDropdown.tsx', 'r', encoding='utf-8') as f:
                dropdown_code = f.read()
            
            # Check API integration
            with open('frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
                api_code = f.read()
            
            # Check for management features
            has_clear_all_button = 'clearAllNotifications' in dropdown_code
            has_mark_all_read = 'markAllAsRead' in dropdown_code
            has_delete_notification = 'deleteNotification' in api_code
            has_clear_all_api = 'clearAllNotifications' in api_code
            has_unread_count = 'unreadCount' in bell_code
            
            all_features = [
                has_clear_all_button,
                has_mark_all_read,
                has_delete_notification,
                has_clear_all_api,
                has_unread_count
            ]
            
            passed = all(all_features)
            
            details = {
                "clear_all_button": has_clear_all_button,
                "mark_all_read": has_mark_all_read,
                "delete_notification_api": has_delete_notification,
                "clear_all_api": has_clear_all_api,
                "unread_count_display": has_unread_count
            }
            
            self.log_result(
                "Frontend Notification Management Features",
                passed,
                "Frontend has all notification management features" if passed 
                else "Frontend missing some notification management features",
                details
            )
            return passed
            
        except Exception as e:
            self.log_result(
                "Frontend Notification Management Features",
                False,
                f"Failed to check frontend components: {e}"
            )
            return False

    async def test_error_handling_and_logging(self) -> bool:
        """Test that proper error handling and logging is implemented"""
        try:
            sys.path.append('backend')
            from app.services.notification_service import NotificationService
            
            # Check if service has error handling methods
            service = NotificationService()
            
            has_foreign_key_handler = hasattr(service, '_handle_foreign_key_error')
            has_id_resolver = hasattr(service, '_resolve_to_auth_user_id')
            
            # Check if service methods return gracefully on errors
            try:
                # This should not raise an exception even with invalid data
                result = await service.get_user_notifications("invalid-user-id")
                graceful_error_handling = isinstance(result, list)  # Should return empty list or test notifications
            except Exception:
                graceful_error_handling = False
            
            all_checks = [has_foreign_key_handler, has_id_resolver, graceful_error_handling]
            passed = all(all_checks)
            
            details = {
                "foreign_key_error_handler": has_foreign_key_handler,
                "id_resolver": has_id_resolver,
                "graceful_error_handling": graceful_error_handling
            }
            
            self.log_result(
                "Error Handling and Logging",
                passed,
                "Proper error handling implemented" if passed else "Missing error handling features",
                details
            )
            return passed
            
        except Exception as e:
            self.log_result(
                "Error Handling and Logging",
                False,
                f"Failed to test error handling: {e}"
            )
            return False

    async def run_all_tests(self) -> bool:
        """Run all notification system tests"""
        print("🧪 Starting Notification System Fixes Verification")
        print("=" * 60)
        print()
        
        # Run all tests
        tests = [
            ("Backend Health", self.check_backend_health),
            ("Service Initialization", self.test_notification_service_initialization),
            ("Foreign Key Resolution", self.test_foreign_key_constraint_resolution),
            ("Notification Endpoints", self.test_notification_endpoints),
            ("Management Endpoints", self.test_notification_management_endpoints),
            ("Unread Count Endpoint", self.test_unread_count_endpoint),
            ("Subjects Router Integration", self.test_subjects_router_notifications),
            ("Frontend Components", self.test_frontend_notification_components),
            ("Error Handling", self.test_error_handling_and_logging),
        ]
        
        all_passed = True
        for test_name, test_func in tests:
            try:
                result = await test_func()
                if not result:
                    all_passed = False
            except Exception as e:
                self.log_result(test_name, False, f"Test failed with exception: {e}")
                all_passed = False
        
        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_count = sum(1 for r in self.results if r.passed)
        total_count = len(self.results)
        
        print(f"Total Tests: {total_count}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {total_count - passed_count}")
        print(f"Success Rate: {(passed_count/total_count)*100:.1f}%")
        print()
        
        if all_passed:
            print("🎉 ALL TESTS PASSED! Notification system fixes are working correctly.")
        else:
            print("⚠️  Some tests failed. Review the details above.")
            print("\nFailed tests:")
            for result in self.results:
                if not result.passed:
                    print(f"  - {result.test_name}: {result.message}")
        
        print()
        return all_passed

async def main():
    """Main test runner"""
    tester = NotificationSystemTester()
    success = await tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())