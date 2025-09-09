#!/usr/bin/env python3
"""
Integration tests for notification API endpoints
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
import asyncio
from fastapi.testclient import TestClient
from fastapi import status
import json

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from app.models.notification import (
    NotificationType,
    NotificationResponse,
    NotificationPreferenceResponse,
    NotificationStats,
    NotificationPreferencesUpdate,
    NotificationPreference
)
from app.models.user import UserResponse, UserType, AuthProvider


class TestNotificationEndpoints(unittest.TestCase):
    """Test notification API endpoints"""
    
    def setUp(self):
        """Set up test client and mocks"""
        self.client = TestClient(app)
        
        # Mock user for authentication
        from datetime import datetime
        
        self.mock_user = UserResponse(
            user_id="test-user-123",
            name="Test User",
            email="test@example.com",
            user_type=UserType.STUDENT,
            auth_provider=AuthProvider.EMAIL,
            is_face_registered=True,
            created_at=datetime.now()
        )
        
        # Mock notification service
        self.mock_notification_service = Mock()
        
        # Patch the notification service dependency
        self.notification_service_patcher = patch(
            'app.routers.notifications.get_notification_service',
            return_value=self.mock_notification_service
        )
        self.notification_service_patcher.start()
        
        # Patch authentication
        self.auth_patcher = patch(
            'app.routers.notifications.get_current_user',
            return_value=self.mock_user
        )
        self.auth_patcher.start()
    
    def tearDown(self):
        """Clean up patches"""
        self.notification_service_patcher.stop()
        self.auth_patcher.stop()
    
    def test_get_notifications_success(self):
        """Test successful retrieval of notifications"""
        # Mock service response
        mock_notifications = [
            NotificationResponse(
                id="notif-1",
                recipient_id="test-user-123",
                sender_id="sender-456",
                type=NotificationType.STUDENT_JOINED,
                title="Student Joined",
                message="A student joined your class",
                data={"student_name": "John Doe"},
                is_read=False,
                created_at="2024-01-01T12:00:00Z"
            )
        ]
        
        # Configure mock to return async result
        async def mock_get_notifications(*args, **kwargs):
            return mock_notifications
        
        self.mock_notification_service.get_user_notifications = mock_get_notifications
        
        # Make request
        response = self.client.get("/api/notifications")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "notif-1")
        self.assertEqual(data[0]["type"], "student_joined")
    
    def test_get_notifications_with_pagination(self):
        """Test notifications retrieval with pagination parameters"""
        # Mock service response
        async def mock_get_notifications(user_id, limit, offset):
            # Verify parameters are passed correctly
            self.assertEqual(user_id, "test-user-123")
            self.assertEqual(limit, 10)
            self.assertEqual(offset, 20)
            return []
        
        self.mock_notification_service.get_user_notifications = mock_get_notifications
        
        # Make request with pagination
        response = self.client.get("/api/notifications?limit=10&offset=20")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])
    
    def test_get_notifications_invalid_pagination(self):
        """Test notifications retrieval with invalid pagination parameters"""
        # Test limit too high
        response = self.client.get("/api/notifications?limit=200")
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Test negative offset
        response = self.client.get("/api/notifications?offset=-1")
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    def test_get_notifications_service_error(self):
        """Test notifications retrieval when service raises exception"""
        # Configure mock to raise exception
        async def mock_get_notifications(*args, **kwargs):
            raise Exception("Database error")
        
        self.mock_notification_service.get_user_notifications = mock_get_notifications
        
        # Make request
        response = self.client.get("/api/notifications")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to retrieve notifications", response.json()["detail"])
    
    def test_mark_notification_read_success(self):
        """Test successful marking of notification as read"""
        # Configure mock to return success
        async def mock_mark_as_read(notification_id, user_id):
            self.assertEqual(notification_id, "notif-123")
            self.assertEqual(user_id, "test-user-123")
            return True
        
        self.mock_notification_service.mark_as_read = mock_mark_as_read
        
        # Make request
        response = self.client.patch("/api/notifications/notif-123/read")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "Notification marked as read")
    
    def test_mark_notification_read_not_found(self):
        """Test marking notification as read when notification not found"""
        # Configure mock to return failure
        async def mock_mark_as_read(notification_id, user_id):
            return False
        
        self.mock_notification_service.mark_as_read = mock_mark_as_read
        
        # Make request
        response = self.client.patch("/api/notifications/notif-123/read")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Notification not found", response.json()["detail"])
    
    def test_mark_notification_read_service_error(self):
        """Test marking notification as read when service raises exception"""
        # Configure mock to raise exception
        async def mock_mark_as_read(notification_id, user_id):
            raise Exception("Database error")
        
        self.mock_notification_service.mark_as_read = mock_mark_as_read
        
        # Make request
        response = self.client.patch("/api/notifications/notif-123/read")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to mark notification as read", response.json()["detail"])
    
    def test_mark_all_notifications_read_success(self):
        """Test successful marking of all notifications as read"""
        # Configure mock to return success
        async def mock_mark_all_as_read(user_id):
            self.assertEqual(user_id, "test-user-123")
            return True
        
        self.mock_notification_service.mark_all_as_read = mock_mark_all_as_read
        
        # Make request
        response = self.client.patch("/api/notifications/mark-all-read")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "All notifications marked as read")
    
    def test_mark_all_notifications_read_failure(self):
        """Test marking all notifications as read when service returns failure"""
        # Configure mock to return failure
        async def mock_mark_all_as_read(user_id):
            return False
        
        self.mock_notification_service.mark_all_as_read = mock_mark_all_as_read
        
        # Make request
        response = self.client.patch("/api/notifications/mark-all-read")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to mark all notifications as read", response.json()["detail"])
    
    def test_get_unread_count_success(self):
        """Test successful retrieval of unread count"""
        # Configure mock to return count
        async def mock_get_unread_count(user_id):
            self.assertEqual(user_id, "test-user-123")
            return 5
        
        self.mock_notification_service.get_unread_count = mock_get_unread_count
        
        # Make request
        response = self.client.get("/api/notifications/unread-count")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["unread_count"], 5)
    
    def test_get_unread_count_service_error(self):
        """Test unread count retrieval when service raises exception"""
        # Configure mock to raise exception
        async def mock_get_unread_count(user_id):
            raise Exception("Database error")
        
        self.mock_notification_service.get_unread_count = mock_get_unread_count
        
        # Make request
        response = self.client.get("/api/notifications/unread-count")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to retrieve unread count", response.json()["detail"])
    
    def test_get_notification_stats_success(self):
        """Test successful retrieval of notification stats"""
        # Mock stats response
        mock_stats = NotificationStats(
            total_count=10,
            unread_count=3,
            by_type={
                NotificationType.STUDENT_JOINED: 5,
                NotificationType.ATTENDANCE_MARKED: 3,
                NotificationType.CLASS_JOINED: 2
            }
        )
        
        # Configure mock to return stats
        async def mock_get_stats(user_id):
            self.assertEqual(user_id, "test-user-123")
            return mock_stats
        
        self.mock_notification_service.get_notification_stats = mock_get_stats
        
        # Make request
        response = self.client.get("/api/notifications/stats")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_count"], 10)
        self.assertEqual(data["unread_count"], 3)
        self.assertEqual(data["by_type"]["student_joined"], 5)
    
    def test_get_notification_preferences_success(self):
        """Test successful retrieval of notification preferences"""
        # Mock preferences response
        mock_preferences = [
            NotificationPreferenceResponse(
                id="pref-1",
                user_id="test-user-123",
                notification_type=NotificationType.STUDENT_JOINED,
                enabled=True,
                created_at="2024-01-01T12:00:00Z"
            ),
            NotificationPreferenceResponse(
                id="pref-2",
                user_id="test-user-123",
                notification_type=NotificationType.ATTENDANCE_MARKED,
                enabled=False,
                created_at="2024-01-01T12:00:00Z"
            )
        ]
        
        # Configure mock to return preferences
        async def mock_get_preferences(user_id):
            self.assertEqual(user_id, "test-user-123")
            return mock_preferences
        
        self.mock_notification_service.get_user_preferences = mock_get_preferences
        
        # Make request
        response = self.client.get("/api/notifications/preferences")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["notification_type"], "student_joined")
        self.assertTrue(data[0]["enabled"])
        self.assertEqual(data[1]["notification_type"], "attendance_marked")
        self.assertFalse(data[1]["enabled"])
    
    def test_get_notification_preferences_service_error(self):
        """Test preferences retrieval when service raises exception"""
        # Configure mock to raise exception
        async def mock_get_preferences(user_id):
            raise Exception("Database error")
        
        self.mock_notification_service.get_user_preferences = mock_get_preferences
        
        # Make request
        response = self.client.get("/api/notifications/preferences")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to retrieve notification preferences", response.json()["detail"])
    
    def test_update_notification_preferences_success(self):
        """Test successful update of notification preferences"""
        # Configure mock to return success
        async def mock_update_preferences(user_id, preferences_update):
            self.assertEqual(user_id, "test-user-123")
            self.assertEqual(len(preferences_update.preferences), 2)
            return True
        
        self.mock_notification_service.update_preferences = mock_update_preferences
        
        # Prepare request data
        request_data = {
            "preferences": [
                {"notification_type": "student_joined", "enabled": True},
                {"notification_type": "attendance_marked", "enabled": False}
            ]
        }
        
        # Make request
        response = self.client.put(
            "/api/notifications/preferences",
            json=request_data
        )
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "Notification preferences updated successfully")
    
    def test_update_notification_preferences_invalid_data(self):
        """Test update preferences with invalid data"""
        # Test empty preferences
        response = self.client.put(
            "/api/notifications/preferences",
            json={"preferences": []}
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Test invalid notification type
        response = self.client.put(
            "/api/notifications/preferences",
            json={
                "preferences": [
                    {"notification_type": "invalid_type", "enabled": True}
                ]
            }
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Test duplicate notification types
        response = self.client.put(
            "/api/notifications/preferences",
            json={
                "preferences": [
                    {"notification_type": "student_joined", "enabled": True},
                    {"notification_type": "student_joined", "enabled": False}
                ]
            }
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    def test_update_notification_preferences_service_failure(self):
        """Test update preferences when service returns failure"""
        # Configure mock to return failure
        async def mock_update_preferences(user_id, preferences_update):
            return False
        
        self.mock_notification_service.update_preferences = mock_update_preferences
        
        # Prepare request data
        request_data = {
            "preferences": [
                {"notification_type": "student_joined", "enabled": True}
            ]
        }
        
        # Make request
        response = self.client.put(
            "/api/notifications/preferences",
            json=request_data
        )
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to update notification preferences", response.json()["detail"])
    
    def test_update_notification_preferences_service_error(self):
        """Test update preferences when service raises exception"""
        # Configure mock to raise exception
        async def mock_update_preferences(user_id, preferences_update):
            raise Exception("Database error")
        
        self.mock_notification_service.update_preferences = mock_update_preferences
        
        # Prepare request data
        request_data = {
            "preferences": [
                {"notification_type": "student_joined", "enabled": True}
            ]
        }
        
        # Make request
        response = self.client.put(
            "/api/notifications/preferences",
            json=request_data
        )
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to update notification preferences", response.json()["detail"])
    
    def test_delete_notification_success(self):
        """Test successful deletion of notification"""
        # Configure mock to return success
        async def mock_delete_notification(notification_id, user_id):
            self.assertEqual(notification_id, "notif-123")
            self.assertEqual(user_id, "test-user-123")
            return True
        
        self.mock_notification_service.delete_notification = mock_delete_notification
        
        # Make request
        response = self.client.delete("/api/notifications/notif-123")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "Notification deleted successfully")
    
    def test_delete_notification_not_found(self):
        """Test deletion of notification when notification not found"""
        # Configure mock to return failure
        async def mock_delete_notification(notification_id, user_id):
            return False
        
        self.mock_notification_service.delete_notification = mock_delete_notification
        
        # Make request
        response = self.client.delete("/api/notifications/notif-123")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Notification not found", response.json()["detail"])
    
    def test_delete_notification_service_error(self):
        """Test deletion when service raises exception"""
        # Configure mock to raise exception
        async def mock_delete_notification(notification_id, user_id):
            raise Exception("Database error")
        
        self.mock_notification_service.delete_notification = mock_delete_notification
        
        # Make request
        response = self.client.delete("/api/notifications/notif-123")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to delete notification", response.json()["detail"])
    
    def test_clear_all_notifications_success(self):
        """Test successful clearing of all notifications"""
        # Configure mock to return success
        async def mock_clear_all_notifications(user_id):
            self.assertEqual(user_id, "test-user-123")
            return True
        
        self.mock_notification_service.clear_all_notifications = mock_clear_all_notifications
        
        # Make request
        response = self.client.delete("/api/notifications/clear-all")
        
        # Debug: Print response details if test fails
        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["message"], "All notifications cleared successfully")
    
    def test_clear_all_notifications_failure(self):
        """Test clearing all notifications when service returns failure"""
        # Configure mock to return failure
        async def mock_clear_all_notifications(user_id):
            return False
        
        self.mock_notification_service.clear_all_notifications = mock_clear_all_notifications
        
        # Make request
        response = self.client.delete("/api/notifications/clear-all")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to clear all notifications", response.json()["detail"])
    
    def test_clear_all_notifications_service_error(self):
        """Test clearing all notifications when service raises exception"""
        # Configure mock to raise exception
        async def mock_clear_all_notifications(user_id):
            raise Exception("Database error")
        
        self.mock_notification_service.clear_all_notifications = mock_clear_all_notifications
        
        # Make request
        response = self.client.delete("/api/notifications/clear-all")
        
        # Assertions
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Failed to clear all notifications", response.json()["detail"])


class TestNotificationEndpointsAuthentication(unittest.TestCase):
    """Test notification endpoints authentication requirements"""
    
    def setUp(self):
        """Set up test client"""
        self.client = TestClient(app)
    
    def test_endpoints_require_authentication(self):
        """Test that all notification endpoints require authentication"""
        # Mock authentication to raise exception (unauthenticated)
        with patch('app.routers.notifications.get_current_user', side_effect=Exception("Unauthenticated")):
            
            # Test all endpoints
            endpoints = [
                ("GET", "/api/notifications"),
                ("PATCH", "/api/notifications/test-id/read"),
                ("PATCH", "/api/notifications/mark-all-read"),
                ("GET", "/api/notifications/unread-count"),
                ("GET", "/api/notifications/stats"),
                ("GET", "/api/notifications/preferences"),
                ("PUT", "/api/notifications/preferences"),
                ("DELETE", "/api/notifications/test-id"),
                ("DELETE", "/api/notifications/clear-all")
            ]
            
            for method, endpoint in endpoints:
                with self.subTest(method=method, endpoint=endpoint):
                    if method == "GET":
                        response = self.client.get(endpoint)
                    elif method == "PATCH":
                        response = self.client.patch(endpoint)
                    elif method == "PUT":
                        response = self.client.put(endpoint, json={"preferences": []})
                    elif method == "DELETE":
                        response = self.client.delete(endpoint)
                    
                    # Should return 500 due to authentication error
                    # In a real app, this would be handled by middleware to return 401
                    self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


if __name__ == "__main__":
    # Run all tests
    unittest.main(verbosity=2)