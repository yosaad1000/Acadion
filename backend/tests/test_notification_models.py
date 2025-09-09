#!/usr/bin/env python3
"""
Unit tests for notification models
"""

import unittest
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.notification import (
    NotificationType,
    NotificationCreate,
    NotificationResponse,
    NotificationPreference,
    NotificationPreferencesUpdate,
    NotificationPreferenceResponse,
    NotificationMarkRead,
    NotificationStats
)
from pydantic import ValidationError


class TestNotificationType(unittest.TestCase):
    """Test NotificationType enum"""
    
    def test_notification_type_values(self):
        """Test that all expected notification types are defined"""
        expected_types = {
            "student_joined",
            "attendance_marked", 
            "attendance_failed",
            "class_joined",
            "join_failed"
        }
        
        actual_types = {item.value for item in NotificationType}
        self.assertEqual(expected_types, actual_types)
    
    def test_notification_type_string_conversion(self):
        """Test that notification types can be converted to strings"""
        self.assertEqual(NotificationType.STUDENT_JOINED.value, "student_joined")
        self.assertEqual(NotificationType.ATTENDANCE_MARKED.value, "attendance_marked")


class TestNotificationCreate(unittest.TestCase):
    """Test NotificationCreate model"""
    
    def setUp(self):
        """Set up test data"""
        self.valid_data = {
            "recipient_id": "123e4567-e89b-12d3-a456-426614174000",
            "sender_id": "123e4567-e89b-12d3-a456-426614174001",
            "type": NotificationType.STUDENT_JOINED,
            "title": "New Student Joined",
            "message": "A new student has joined your class",
            "data": {
                "student_name": "John Doe",
                "subject_name": "Mathematics",
                "subject_code": "MATH101"
            }
        }
    
    def test_valid_notification_create(self):
        """Test creating a valid notification"""
        notification = NotificationCreate(**self.valid_data)
        
        self.assertEqual(notification.recipient_id, self.valid_data["recipient_id"])
        self.assertEqual(notification.sender_id, self.valid_data["sender_id"])
        self.assertEqual(notification.type, NotificationType.STUDENT_JOINED)
        self.assertEqual(notification.title, "New Student Joined")
        self.assertEqual(notification.message, "A new student has joined your class")
        self.assertIsInstance(notification.data, dict)
    
    def test_notification_create_without_sender(self):
        """Test creating notification without sender_id"""
        data = self.valid_data.copy()
        del data["sender_id"]
        
        notification = NotificationCreate(**data)
        self.assertIsNone(notification.sender_id)
    
    def test_notification_create_without_data(self):
        """Test creating notification without data"""
        data = self.valid_data.copy()
        del data["data"]
        
        notification = NotificationCreate(**data)
        self.assertIsNone(notification.data)
    
    def test_empty_title_validation(self):
        """Test that empty title raises validation error"""
        data = self.valid_data.copy()
        data["title"] = ""
        
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        self.assertIn("String should have at least 1 character", str(context.exception))
    
    def test_whitespace_title_validation(self):
        """Test that whitespace-only title raises validation error"""
        data = self.valid_data.copy()
        data["title"] = "   "
        
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        self.assertIn("Title cannot be empty", str(context.exception))
    
    def test_empty_message_validation(self):
        """Test that empty message raises validation error"""
        data = self.valid_data.copy()
        data["message"] = ""
        
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        self.assertIn("String should have at least 1 character", str(context.exception))
    
    def test_title_length_validation(self):
        """Test title length validation"""
        data = self.valid_data.copy()
        data["title"] = "x" * 256  # Exceeds max length of 255
        
        with self.assertRaises(ValidationError):
            NotificationCreate(**data)
    
    def test_student_joined_data_validation(self):
        """Test data validation for student_joined notification type"""
        data = self.valid_data.copy()
        data["type"] = NotificationType.STUDENT_JOINED
        data["data"] = {"student_name": "John Doe"}  # Missing required fields
        
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        error_message = str(context.exception)
        self.assertIn("Missing required field", error_message)
    
    def test_attendance_marked_data_validation(self):
        """Test data validation for attendance_marked notification type"""
        data = self.valid_data.copy()
        data["type"] = NotificationType.ATTENDANCE_MARKED
        data["data"] = {
            "subject_name": "Math",
            "session_name": "Session 1",
            "total_students": 25,
            "present_count": 20
        }
        
        # This should be valid
        notification = NotificationCreate(**data)
        self.assertEqual(notification.data["total_students"], 25)
    
    def test_attendance_marked_invalid_numbers(self):
        """Test validation of numeric fields in attendance_marked"""
        data = self.valid_data.copy()
        data["type"] = NotificationType.ATTENDANCE_MARKED
        data["data"] = {
            "subject_name": "Math",
            "session_name": "Session 1",
            "total_students": -1,  # Invalid negative number
            "present_count": 20
        }
        
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        self.assertIn("total_students must be a non-negative integer", str(context.exception))
    
    def test_class_joined_data_validation(self):
        """Test data validation for class_joined notification type"""
        data = self.valid_data.copy()
        data["type"] = NotificationType.CLASS_JOINED
        data["data"] = {
            "subject_name": "Math",
            "teacher_name": "Dr. Smith",
            "invite_code": "ABC123"
        }
        
        # This should be valid
        notification = NotificationCreate(**data)
        self.assertEqual(notification.data["invite_code"], "ABC123")
    
    def test_failed_notification_data_validation(self):
        """Test data validation for failed notification types"""
        data = self.valid_data.copy()
        data["type"] = NotificationType.JOIN_FAILED
        data["data"] = {"reason": "Invalid invite code"}
        
        # This should be valid
        notification = NotificationCreate(**data)
        self.assertEqual(notification.data["reason"], "Invalid invite code")
        
        # Test missing reason
        data["data"] = {}
        with self.assertRaises(ValidationError) as context:
            NotificationCreate(**data)
        
        self.assertIn('Missing required field "reason"', str(context.exception))


class TestNotificationResponse(unittest.TestCase):
    """Test NotificationResponse model"""
    
    def test_valid_notification_response(self):
        """Test creating a valid notification response"""
        data = {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "recipient_id": "123e4567-e89b-12d3-a456-426614174001",
            "sender_id": "123e4567-e89b-12d3-a456-426614174002",
            "type": NotificationType.STUDENT_JOINED,
            "title": "New Student Joined",
            "message": "A new student has joined your class",
            "data": {"student_name": "John Doe"},
            "is_read": False,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        notification = NotificationResponse(**data)
        
        self.assertEqual(notification.id, data["id"])
        self.assertEqual(notification.recipient_id, data["recipient_id"])
        self.assertEqual(notification.type, NotificationType.STUDENT_JOINED)
        self.assertFalse(notification.is_read)
        self.assertIsInstance(notification.created_at, datetime)


class TestNotificationPreference(unittest.TestCase):
    """Test NotificationPreference model"""
    
    def test_valid_notification_preference(self):
        """Test creating a valid notification preference"""
        preference = NotificationPreference(
            notification_type=NotificationType.STUDENT_JOINED,
            enabled=True
        )
        
        self.assertEqual(preference.notification_type, NotificationType.STUDENT_JOINED)
        self.assertTrue(preference.enabled)
    
    def test_default_enabled_value(self):
        """Test that enabled defaults to True"""
        preference = NotificationPreference(
            notification_type=NotificationType.ATTENDANCE_MARKED
        )
        
        self.assertTrue(preference.enabled)


class TestNotificationPreferencesUpdate(unittest.TestCase):
    """Test NotificationPreferencesUpdate model"""
    
    def test_valid_preferences_update(self):
        """Test creating a valid preferences update"""
        preferences = [
            NotificationPreference(notification_type=NotificationType.STUDENT_JOINED, enabled=True),
            NotificationPreference(notification_type=NotificationType.ATTENDANCE_MARKED, enabled=False)
        ]
        
        update = NotificationPreferencesUpdate(preferences=preferences)
        
        self.assertEqual(len(update.preferences), 2)
        self.assertTrue(update.preferences[0].enabled)
        self.assertFalse(update.preferences[1].enabled)
    
    def test_empty_preferences_validation(self):
        """Test that empty preferences list raises validation error"""
        with self.assertRaises(ValidationError) as context:
            NotificationPreferencesUpdate(preferences=[])
        
        self.assertIn("At least one preference must be provided", str(context.exception))
    
    def test_duplicate_notification_types_validation(self):
        """Test that duplicate notification types raise validation error"""
        preferences = [
            NotificationPreference(notification_type=NotificationType.STUDENT_JOINED, enabled=True),
            NotificationPreference(notification_type=NotificationType.STUDENT_JOINED, enabled=False)
        ]
        
        with self.assertRaises(ValidationError) as context:
            NotificationPreferencesUpdate(preferences=preferences)
        
        self.assertIn("Duplicate notification type", str(context.exception))


class TestNotificationMarkRead(unittest.TestCase):
    """Test NotificationMarkRead model"""
    
    def test_valid_mark_read(self):
        """Test creating a valid mark read request"""
        mark_read = NotificationMarkRead(
            notification_ids=["123e4567-e89b-12d3-a456-426614174000"]
        )
        
        self.assertEqual(len(mark_read.notification_ids), 1)
    
    def test_empty_notification_ids_validation(self):
        """Test that empty notification IDs list raises validation error"""
        with self.assertRaises(ValidationError) as context:
            NotificationMarkRead(notification_ids=[])
        
        self.assertIn("At least one notification ID must be provided", str(context.exception))
    
    def test_too_many_notification_ids_validation(self):
        """Test that too many notification IDs raises validation error"""
        notification_ids = [f"id_{i}" for i in range(101)]  # 101 IDs, exceeds limit of 100
        
        with self.assertRaises(ValidationError) as context:
            NotificationMarkRead(notification_ids=notification_ids)
        
        self.assertIn("Cannot mark more than 100 notifications", str(context.exception))


class TestNotificationStats(unittest.TestCase):
    """Test NotificationStats model"""
    
    def test_valid_notification_stats(self):
        """Test creating valid notification stats"""
        stats = NotificationStats(
            total_count=50,
            unread_count=10,
            by_type={
                NotificationType.STUDENT_JOINED: 20,
                NotificationType.ATTENDANCE_MARKED: 30
            }
        )
        
        self.assertEqual(stats.total_count, 50)
        self.assertEqual(stats.unread_count, 10)
        self.assertEqual(stats.by_type[NotificationType.STUDENT_JOINED], 20)


class TestModelSerialization(unittest.TestCase):
    """Test model serialization and deserialization"""
    
    def test_notification_create_serialization(self):
        """Test that NotificationCreate can be serialized to dict"""
        notification = NotificationCreate(
            recipient_id="123e4567-e89b-12d3-a456-426614174000",
            type=NotificationType.STUDENT_JOINED,
            title="Test Title",
            message="Test Message"
        )
        
        data = notification.model_dump()
        
        self.assertIsInstance(data, dict)
        self.assertEqual(data["recipient_id"], "123e4567-e89b-12d3-a456-426614174000")
        self.assertEqual(data["type"], "student_joined")
        self.assertEqual(data["title"], "Test Title")
    
    def test_notification_create_json_serialization(self):
        """Test that NotificationCreate can be serialized to JSON"""
        notification = NotificationCreate(
            recipient_id="123e4567-e89b-12d3-a456-426614174000",
            type=NotificationType.STUDENT_JOINED,
            title="Test Title",
            message="Test Message"
        )
        
        json_str = notification.model_dump_json()
        
        self.assertIsInstance(json_str, str)
        self.assertIn("student_joined", json_str)
        self.assertIn("Test Title", json_str)


if __name__ == "__main__":
    # Run all tests
    unittest.main(verbosity=2)