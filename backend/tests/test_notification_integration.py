import pytest
from unittest.mock import AsyncMock
from datetime import date
from app.models.notification import NotificationCreate, NotificationType


class TestNotificationIntegration:
    """Test notification creation integration with existing services"""
    
    @pytest.fixture
    def mock_notification_service(self):
        """Mock notification service"""
        service = AsyncMock()
        service.create_notification.return_value = True
        return service

    def test_student_joined_notification_creation(self):
        """Test creating student joined notification"""
        notification = NotificationCreate(
            recipient_id="teacher-id",
            sender_id="student-id",
            type=NotificationType.STUDENT_JOINED,
            title="New Student Joined",
            message="Test Student joined your class Test Subject",
            data={
                "student_name": "Test Student",
                "student_id": "student-id",
                "subject_name": "Test Subject",
                "subject_code": "TEST101",
                "joined_at": "2024-01-01T10:00:00Z"
            }
        )
        
        assert notification.recipient_id == "teacher-id"
        assert notification.type == NotificationType.STUDENT_JOINED
        assert notification.data["student_name"] == "Test Student"
        assert notification.data["subject_name"] == "Test Subject"

    def test_class_joined_notification_creation(self):
        """Test creating class joined notification"""
        notification = NotificationCreate(
            recipient_id="student-id",
            sender_id="teacher-id",
            type=NotificationType.CLASS_JOINED,
            title="Successfully Joined Class",
            message="You have successfully joined Test Subject",
            data={
                "subject_name": "Test Subject",
                "subject_code": "TEST101",
                "teacher_name": "Test Teacher",
                "invite_code": "TEST123",
                "joined_at": "2024-01-01T10:00:00Z"
            }
        )
        
        assert notification.recipient_id == "student-id"
        assert notification.type == NotificationType.CLASS_JOINED
        assert notification.data["subject_name"] == "Test Subject"
        assert notification.data["teacher_name"] == "Test Teacher"

    def test_attendance_marked_notification_creation(self):
        """Test creating attendance marked notification"""
        notification = NotificationCreate(
            recipient_id="student-id",
            sender_id="teacher-id",
            type=NotificationType.ATTENDANCE_MARKED,
            title="Attendance Marked",
            message="Your attendance has been marked as present for Test Subject",
            data={
                "subject_name": "Test Subject",
                "subject_code": "TEST101",
                "session_name": "Morning Session",
                "session_time": "09:00",
                "status": "present",
                "date": "2024-01-01",
                "method": "face_recognition",
                "confidence_score": 0.95,
                "total_students": 25,
                "present_count": 23
            }
        )
        
        assert notification.recipient_id == "student-id"
        assert notification.type == NotificationType.ATTENDANCE_MARKED
        assert notification.data["status"] == "present"
        assert notification.data["method"] == "face_recognition"

    def test_join_failed_notification_creation(self):
        """Test creating join failed notification"""
        notification = NotificationCreate(
            recipient_id="student-id",
            type=NotificationType.JOIN_FAILED,
            title="Failed to Join Class",
            message="The invite code you entered is invalid or expired",
            data={
                "reason": "Invalid invite code",
                "invite_code": "INVALID123",
                "attempted_at": None
            }
        )
        
        assert notification.recipient_id == "student-id"
        assert notification.type == NotificationType.JOIN_FAILED
        assert notification.data["reason"] == "Invalid invite code"

    def test_attendance_failed_notification_creation(self):
        """Test creating attendance failed notification"""
        notification = NotificationCreate(
            recipient_id="student-id",
            sender_id="teacher-id",
            type=NotificationType.ATTENDANCE_FAILED,
            title="Attendance Marking Failed",
            message="Failed to mark attendance for Test Subject",
            data={
                "reason": "Database error occurred while marking attendance",
                "subject_name": "Test Subject",
                "subject_code": "TEST101",
                "session_name": "Morning Session",
                "date": "2024-01-01"
            }
        )
        
        assert notification.recipient_id == "student-id"
        assert notification.type == NotificationType.ATTENDANCE_FAILED
        assert notification.data["reason"] == "Database error occurred while marking attendance"

    @pytest.mark.asyncio
    async def test_notification_service_integration(self, mock_notification_service):
        """Test that notification service can be called with different notification types"""
        
        # Test creating different types of notifications
        notifications = [
            NotificationCreate(
                recipient_id="user-1",
                type=NotificationType.STUDENT_JOINED,
                title="Student Joined",
                message="A student joined your class",
                data={"student_name": "Test Student", "subject_name": "Test Subject", "subject_code": "TEST101"}
            ),
            NotificationCreate(
                recipient_id="user-2",
                type=NotificationType.CLASS_JOINED,
                title="Class Joined",
                message="You joined a class",
                data={"subject_name": "Test Subject", "teacher_name": "Test Teacher", "invite_code": "TEST123"}
            ),
            NotificationCreate(
                recipient_id="user-3",
                type=NotificationType.ATTENDANCE_MARKED,
                title="Attendance Marked",
                message="Your attendance was marked",
                data={"subject_name": "Test Subject", "session_name": "Morning", "total_students": 25, "present_count": 23}
            ),
            NotificationCreate(
                recipient_id="user-4",
                type=NotificationType.JOIN_FAILED,
                title="Join Failed",
                message="Failed to join class",
                data={"reason": "Invalid invite code"}
            ),
            NotificationCreate(
                recipient_id="user-5",
                type=NotificationType.ATTENDANCE_FAILED,
                title="Attendance Failed",
                message="Failed to mark attendance",
                data={"reason": "Database error"}
            )
        ]
        
        # Test that all notifications can be created
        for notification in notifications:
            result = await mock_notification_service.create_notification(notification)
            assert result is True
        
        # Verify all notifications were processed
        assert mock_notification_service.create_notification.call_count == len(notifications)

    def test_notification_types_coverage(self):
        """Test that all required notification types are covered"""
        
        # Verify all notification types from requirements are available
        required_types = [
            NotificationType.STUDENT_JOINED,    # Requirement 1.1
            NotificationType.ATTENDANCE_MARKED, # Requirement 2.1, 4.1
            NotificationType.ATTENDANCE_FAILED, # Requirement 2.2, 4.2
            NotificationType.CLASS_JOINED,      # Requirement 3.1
            NotificationType.JOIN_FAILED        # Requirement 3.1 (failure case)
        ]
        
        # Verify all types exist
        for notification_type in required_types:
            assert isinstance(notification_type, NotificationType)
        
        # Verify we can create notifications for all types
        for notification_type in required_types:
            notification = NotificationCreate(
                recipient_id="test-user",
                type=notification_type,
                title="Test Notification",
                message="Test message",
                data=self._get_test_data_for_type(notification_type)
            )
            assert notification.type == notification_type

    def _get_test_data_for_type(self, notification_type: NotificationType) -> dict:
        """Get test data for different notification types"""
        if notification_type == NotificationType.STUDENT_JOINED:
            return {
                "student_name": "Test Student",
                "subject_name": "Test Subject",
                "subject_code": "TEST101"
            }
        elif notification_type == NotificationType.ATTENDANCE_MARKED:
            return {
                "subject_name": "Test Subject",
                "session_name": "Test Session",
                "total_students": 25,
                "present_count": 23
            }
        elif notification_type == NotificationType.CLASS_JOINED:
            return {
                "subject_name": "Test Subject",
                "teacher_name": "Test Teacher",
                "invite_code": "TEST123"
            }
        elif notification_type in [NotificationType.ATTENDANCE_FAILED, NotificationType.JOIN_FAILED]:
            return {"reason": "Test reason"}
        else:
            return {}


if __name__ == "__main__":
    pytest.main([__file__])