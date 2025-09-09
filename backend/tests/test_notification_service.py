#!/usr/bin/env python3
"""
Unit tests for notification service
"""

import unittest
import sys
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock
import asyncio

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.notification_service import NotificationService
from app.models.notification import (
    NotificationType,
    NotificationCreate,
    NotificationResponse,
    NotificationPreference,
    NotificationPreferencesUpdate,
    NotificationPreferenceResponse,
    NotificationStats
)


class AsyncTestCase(unittest.TestCase):
    """Base class for async test cases"""
    
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
    
    def tearDown(self):
        self.loop.close()
    
    def run_async(self, coro):
        """Helper method to run async functions in tests"""
        return self.loop.run_until_complete(coro)


class TestNotificationService(AsyncTestCase):
    """Test NotificationService class"""
    
    def setUp(self):
        super().setUp()
        # Mock the Supabase client
        self.mock_supabase = Mock()
        self.mock_table = Mock()
        self.mock_supabase.table.return_value = self.mock_table
        
        # Patch the create_client function
        with patch('app.services.notification_service.create_client', return_value=self.mock_supabase):
            with patch('app.services.notification_service.settings') as mock_settings:
                mock_settings.SUPABASE_URL = "https://test.supabase.co"
                mock_settings.SUPABASE_KEY = "test-key"
                self.service = NotificationService()
    
    def test_service_initialization(self):
        """Test that the service initializes correctly"""
        self.assertIsNotNone(self.service.supabase)
    
    def test_create_notification_success(self):
        """Test successful notification creation"""
        # Mock successful database insert
        mock_result = Mock()
        mock_result.data = [{"id": "test-id", "recipient_id": "user-123"}]
        self.mock_table.insert.return_value.execute.return_value = mock_result
        
        # Mock preference check to return enabled using AsyncMock
        with patch.object(self.service, '_is_notification_enabled', new_callable=AsyncMock) as mock_enabled:
            mock_enabled.return_value = True
            
            notification = NotificationCreate(
                recipient_id="user-123",
                type=NotificationType.STUDENT_JOINED,
                title="Test Notification",
                message="Test message"
            )
            
            result = self.run_async(self.service.create_notification(notification))
            
            self.assertTrue(result)
            self.mock_table.insert.assert_called_once()
    
    def test_create_notification_disabled_type(self):
        """Test notification creation when type is disabled"""
        # Reset the mock to ensure clean state
        self.mock_table.reset_mock()
        
        # Mock preference check to return disabled using AsyncMock
        with patch.object(self.service, '_is_notification_enabled', new_callable=AsyncMock) as mock_enabled:
            mock_enabled.return_value = False
            
            notification = NotificationCreate(
                recipient_id="user-123",
                type=NotificationType.STUDENT_JOINED,
                title="Test Notification",
                message="Test message"
            )
            
            result = self.run_async(self.service.create_notification(notification))
            
            # Should return True (success) but not insert into database
            self.assertTrue(result)
            self.mock_table.insert.assert_not_called()
    
    def test_create_notification_database_error(self):
        """Test notification creation with database error"""
        # Mock database error
        self.mock_table.insert.return_value.execute.side_effect = Exception("Database error")
        
        # Mock preference check to return enabled using AsyncMock
        with patch.object(self.service, '_is_notification_enabled', new_callable=AsyncMock) as mock_enabled:
            mock_enabled.return_value = True
            
            notification = NotificationCreate(
                recipient_id="user-123",
                type=NotificationType.STUDENT_JOINED,
                title="Test Notification",
                message="Test message"
            )
            
            result = self.run_async(self.service.create_notification(notification))
            
            self.assertFalse(result)
    
    def test_get_user_notifications_success(self):
        """Test successful retrieval of user notifications"""
        # Mock database response
        mock_result = Mock()
        mock_result.data = [
            {
                "id": "notif-1",
                "recipient_id": "user-123",
                "sender_id": "user-456",
                "type": "student_joined",
                "title": "Student Joined",
                "message": "A student joined your class",
                "data": {"student_name": "John Doe"},
                "is_read": False,
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        ]
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.order.return_value = self.mock_table
        self.mock_table.limit.return_value = self.mock_table
        self.mock_table.offset.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_user_notifications("user-123"))
        
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], NotificationResponse)
        self.assertEqual(result[0].id, "notif-1")
        self.assertEqual(result[0].type, NotificationType.STUDENT_JOINED)
    
    def test_get_user_notifications_empty(self):
        """Test retrieval when no notifications exist"""
        # Mock empty database response
        mock_result = Mock()
        mock_result.data = []
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.order.return_value = self.mock_table
        self.mock_table.limit.return_value = self.mock_table
        self.mock_table.offset.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_user_notifications("user-123"))
        
        self.assertEqual(len(result), 0)
    
    def test_get_user_notifications_parse_error(self):
        """Test handling of parse errors in notification data"""
        # Mock database response with invalid data
        mock_result = Mock()
        mock_result.data = [
            {
                "id": "notif-1",
                "recipient_id": "user-123",
                "type": "invalid_type",  # Invalid notification type
                "title": "Test",
                "message": "Test message",
                "is_read": False,
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        ]
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.order.return_value = self.mock_table
        self.mock_table.limit.return_value = self.mock_table
        self.mock_table.offset.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_user_notifications("user-123"))
        
        # Should return empty list due to parse error
        self.assertEqual(len(result), 0)
    
    def test_mark_as_read_success(self):
        """Test successful marking notification as read"""
        # Mock successful database update
        mock_result = Mock()
        mock_result.data = [{"id": "notif-1", "is_read": True}]
        
        # Set up the mock chain
        self.mock_table.update.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.mark_as_read("notif-1", "user-123"))
        
        self.assertTrue(result)
        self.mock_table.update.assert_called_once()
    
    def test_mark_as_read_not_found(self):
        """Test marking notification as read when notification not found"""
        # Mock empty database response
        mock_result = Mock()
        mock_result.data = []
        
        # Set up the mock chain
        self.mock_table.update.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.mark_as_read("notif-1", "user-123"))
        
        self.assertFalse(result)
    
    def test_mark_all_as_read_success(self):
        """Test successful marking all notifications as read"""
        # Mock successful database update
        mock_result = Mock()
        mock_result.data = [{"updated": True}]
        
        # Set up the mock chain
        self.mock_table.update.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.mark_all_as_read("user-123"))
        
        self.assertTrue(result)
        self.mock_table.update.assert_called_once()
    
    def test_get_unread_count_success(self):
        """Test successful retrieval of unread count"""
        # Mock database response
        mock_result = Mock()
        mock_result.count = 5
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_unread_count("user-123"))
        
        self.assertEqual(result, 5)
    
    def test_get_unread_count_none(self):
        """Test unread count when count is None"""
        # Mock database response with None count
        mock_result = Mock()
        mock_result.count = None
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_unread_count("user-123"))
        
        self.assertEqual(result, 0)
    
    def test_get_notification_stats_success(self):
        """Test successful retrieval of notification stats"""
        # Mock database responses
        mock_total_result = Mock()
        mock_total_result.count = 10
        
        mock_unread_result = Mock()
        mock_unread_result.count = 3
        
        mock_type_result = Mock()
        mock_type_result.data = [
            {"type": "student_joined"},
            {"type": "student_joined"},
            {"type": "attendance_marked"}
        ]
        
        # Set up the mock chain for different calls
        def mock_execute():
            # Return different results based on the query
            if hasattr(mock_execute, 'call_count'):
                mock_execute.call_count += 1
            else:
                mock_execute.call_count = 1
            
            if mock_execute.call_count == 1:
                return mock_total_result
            elif mock_execute.call_count == 2:
                return mock_unread_result
            else:
                return mock_type_result
        
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.side_effect = mock_execute
        
        result = self.run_async(self.service.get_notification_stats("user-123"))
        
        self.assertIsInstance(result, NotificationStats)
        self.assertEqual(result.total_count, 10)
        self.assertEqual(result.unread_count, 3)
        self.assertEqual(result.by_type[NotificationType.STUDENT_JOINED], 2)
        self.assertEqual(result.by_type[NotificationType.ATTENDANCE_MARKED], 1)
    
    def test_get_user_preferences_success(self):
        """Test successful retrieval of user preferences"""
        # Mock database response
        mock_result = Mock()
        mock_result.data = [
            {
                "id": "pref-1",
                "user_id": "user-123",
                "notification_type": "student_joined",
                "enabled": True,
                "created_at": "2024-01-01T12:00:00Z"
            }
        ]
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service.get_user_preferences("user-123"))
        
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], NotificationPreferenceResponse)
        self.assertEqual(result[0].notification_type, NotificationType.STUDENT_JOINED)
        self.assertTrue(result[0].enabled)
    
    def test_get_user_preferences_empty_creates_defaults(self):
        """Test that empty preferences triggers default creation"""
        # Mock empty database response first, then default preferences
        mock_empty_result = Mock()
        mock_empty_result.data = []
        
        mock_default_result = Mock()
        mock_default_result.data = [
            {
                "id": "pref-1",
                "user_id": "user-123",
                "notification_type": "student_joined",
                "enabled": True,
                "created_at": "2024-01-01T12:00:00Z"
            }
        ]
        
        # Mock the create_default_preferences method using AsyncMock
        with patch.object(self.service, '_create_default_preferences', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = True
            
            # Set up the mock chain to return empty first, then defaults
            execute_results = [mock_empty_result, mock_default_result]
            self.mock_table.select.return_value = self.mock_table
            self.mock_table.eq.return_value = self.mock_table
            self.mock_table.execute.side_effect = execute_results
            
            result = self.run_async(self.service.get_user_preferences("user-123"))
            
            # Should have called create_default_preferences
            mock_create.assert_called_once_with("user-123")
            self.assertEqual(len(result), 1)
    
    def test_update_preferences_success(self):
        """Test successful preference updates"""
        # Mock successful database upsert
        mock_result = Mock()
        mock_result.data = [{"updated": True}]
        
        # Set up the mock chain
        self.mock_table.upsert.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        preferences_update = NotificationPreferencesUpdate(
            preferences=[
                NotificationPreference(notification_type=NotificationType.STUDENT_JOINED, enabled=True),
                NotificationPreference(notification_type=NotificationType.ATTENDANCE_MARKED, enabled=False)
            ]
        )
        
        result = self.run_async(self.service.update_preferences("user-123", preferences_update))
        
        self.assertTrue(result)
        # Should be called twice (once for each preference)
        self.assertEqual(self.mock_table.upsert.call_count, 2)
    
    def test_update_preferences_partial_failure(self):
        """Test preference updates with partial failures"""
        # Mock one success and one failure
        mock_success_result = Mock()
        mock_success_result.data = [{"updated": True}]
        
        mock_failure_result = Mock()
        mock_failure_result.data = []
        
        # Set up the mock chain
        self.mock_table.upsert.return_value = self.mock_table
        self.mock_table.execute.side_effect = [mock_success_result, mock_failure_result]
        
        preferences_update = NotificationPreferencesUpdate(
            preferences=[
                NotificationPreference(notification_type=NotificationType.STUDENT_JOINED, enabled=True),
                NotificationPreference(notification_type=NotificationType.ATTENDANCE_MARKED, enabled=False)
            ]
        )
        
        result = self.run_async(self.service.update_preferences("user-123", preferences_update))
        
        self.assertFalse(result)  # Should return False due to partial failure
    
    def test_is_notification_enabled_exists(self):
        """Test checking if notification is enabled when preference exists"""
        # Mock database response
        mock_result = Mock()
        mock_result.data = [{"enabled": False}]
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service._is_notification_enabled("user-123", NotificationType.STUDENT_JOINED))
        
        self.assertFalse(result)
    
    def test_is_notification_enabled_not_exists(self):
        """Test checking if notification is enabled when no preference exists"""
        # Mock empty database response
        mock_result = Mock()
        mock_result.data = []
        
        # Set up the mock chain
        self.mock_table.select.return_value = self.mock_table
        self.mock_table.eq.return_value = self.mock_table
        self.mock_table.execute.return_value = mock_result
        
        result = self.run_async(self.service._is_notification_enabled("user-123", NotificationType.STUDENT_JOINED))
        
        # Should default to True when no preference exists
        self.assertTrue(result)
    
    def test_create_default_preferences_success(self):
        """Test successful creation of default preferences"""
        # Mock successful database insert
        mock_result = Mock()
        mock_result.data = [{"created": True}]
        
        self.mock_table.insert.return_value.execute.return_value = mock_result
        
        result = self.run_async(self.service._create_default_preferences("user-123"))
        
        self.assertTrue(result)
        self.mock_table.insert.assert_called_once()
        
        # Check that all notification types were included
        call_args = self.mock_table.insert.call_args[0][0]
        self.assertEqual(len(call_args), len(NotificationType))
    
    def test_delete_notification_calls_mark_as_read(self):
        """Test that delete notification calls mark_as_read"""
        with patch.object(self.service, 'mark_as_read', new_callable=AsyncMock) as mock_mark:
            mock_mark.return_value = True
            
            result = self.run_async(self.service.delete_notification("notif-1", "user-123"))
            
            self.assertTrue(result)
            mock_mark.assert_called_once_with("notif-1", "user-123")


class TestNotificationServiceErrorHandling(AsyncTestCase):
    """Test error handling in NotificationService"""
    
    def setUp(self):
        super().setUp()
        # Mock the Supabase client
        self.mock_supabase = Mock()
        
        # Patch the create_client function
        with patch('app.services.notification_service.create_client', return_value=self.mock_supabase):
            with patch('app.services.notification_service.settings') as mock_settings:
                mock_settings.SUPABASE_URL = "https://test.supabase.co"
                mock_settings.SUPABASE_KEY = "test-key"
                self.service = NotificationService()
    
    def test_database_connection_error(self):
        """Test handling of database connection errors"""
        # Mock database connection error during initialization
        with patch('app.services.notification_service.create_client', side_effect=Exception("Connection failed")):
            with self.assertRaises(Exception):
                NotificationService()
    
    def test_get_user_notifications_database_error(self):
        """Test handling of database errors in get_user_notifications"""
        # Mock database error
        self.mock_supabase.table.side_effect = Exception("Database error")
        
        result = self.run_async(self.service.get_user_notifications("user-123"))
        
        # Should return empty list on error
        self.assertEqual(len(result), 0)
    
    def test_get_unread_count_database_error(self):
        """Test handling of database errors in get_unread_count"""
        # Mock database error
        self.mock_supabase.table.side_effect = Exception("Database error")
        
        result = self.run_async(self.service.get_unread_count("user-123"))
        
        # Should return 0 on error
        self.assertEqual(result, 0)
    
    def test_get_notification_stats_database_error(self):
        """Test handling of database errors in get_notification_stats"""
        # Mock database error
        self.mock_supabase.table.side_effect = Exception("Database error")
        
        result = self.run_async(self.service.get_notification_stats("user-123"))
        
        # Should return empty stats on error
        self.assertIsInstance(result, NotificationStats)
        self.assertEqual(result.total_count, 0)
        self.assertEqual(result.unread_count, 0)
        self.assertEqual(len(result.by_type), 0)


if __name__ == "__main__":
    # Run all tests
    unittest.main(verbosity=2)