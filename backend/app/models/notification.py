from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    """Enumeration of all supported notification types"""
    STUDENT_JOINED = "student_joined"
    ATTENDANCE_MARKED = "attendance_marked"
    ATTENDANCE_FAILED = "attendance_failed"
    CLASS_JOINED = "class_joined"
    JOIN_FAILED = "join_failed"

class NotificationCreate(BaseModel):
    """Model for creating a new notification"""
    recipient_id: str = Field(..., description="UUID of the user who will receive the notification")
    sender_id: Optional[str] = Field(None, description="UUID of the user who triggered the notification")
    type: NotificationType = Field(..., description="Type of notification")
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, description="Notification message content")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional structured data for the notification")

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty or whitespace only')
        return v.strip()

    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty or whitespace only')
        return v.strip()

    @validator('data')
    def validate_data(cls, v, values):
        """Validate notification data based on notification type"""
        if v is None:
            return v
        
        notification_type = values.get('type')
        if not notification_type:
            return v
        
        # Validate data structure based on notification type
        if notification_type == NotificationType.STUDENT_JOINED:
            required_fields = ['student_name', 'subject_name', 'subject_code']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'Missing required field "{field}" for {notification_type} notification')
        
        elif notification_type == NotificationType.ATTENDANCE_MARKED:
            required_fields = ['subject_name', 'session_name', 'total_students', 'present_count']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'Missing required field "{field}" for {notification_type} notification')
            
            # Validate numeric fields
            if not isinstance(v.get('total_students'), int) or v.get('total_students') < 0:
                raise ValueError('total_students must be a non-negative integer')
            if not isinstance(v.get('present_count'), int) or v.get('present_count') < 0:
                raise ValueError('present_count must be a non-negative integer')
        
        elif notification_type == NotificationType.CLASS_JOINED:
            required_fields = ['subject_name', 'teacher_name', 'invite_code']
            for field in required_fields:
                if field not in v:
                    raise ValueError(f'Missing required field "{field}" for {notification_type} notification')
        
        elif notification_type in [NotificationType.ATTENDANCE_FAILED, NotificationType.JOIN_FAILED]:
            if 'reason' not in v:
                raise ValueError(f'Missing required field "reason" for {notification_type} notification')
        
        return v

class NotificationResponse(BaseModel):
    """Model for notification response data"""
    id: str = Field(..., description="Unique notification ID")
    recipient_id: str = Field(..., description="UUID of the notification recipient")
    sender_id: Optional[str] = Field(None, description="UUID of the notification sender")
    type: NotificationType = Field(..., description="Type of notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message content")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional structured data")
    is_read: bool = Field(..., description="Whether the notification has been read")
    created_at: datetime = Field(..., description="When the notification was created")
    updated_at: Optional[datetime] = Field(None, description="When the notification was last updated")

class NotificationPreference(BaseModel):
    """Model for user notification preferences"""
    notification_type: NotificationType = Field(..., description="Type of notification to configure")
    enabled: bool = Field(True, description="Whether this notification type is enabled for the user")

class NotificationPreferencesUpdate(BaseModel):
    """Model for updating multiple notification preferences"""
    preferences: List[NotificationPreference] = Field(..., description="List of notification preferences to update")

    @validator('preferences')
    def validate_preferences(cls, v):
        if not v:
            raise ValueError('At least one preference must be provided')
        
        # Check for duplicate notification types
        types_seen = set()
        for pref in v:
            if pref.notification_type in types_seen:
                raise ValueError(f'Duplicate notification type: {pref.notification_type}')
            types_seen.add(pref.notification_type)
        
        return v

class NotificationPreferenceResponse(BaseModel):
    """Model for notification preference response"""
    id: str = Field(..., description="Unique preference ID")
    user_id: str = Field(..., description="UUID of the user")
    notification_type: NotificationType = Field(..., description="Type of notification")
    enabled: bool = Field(..., description="Whether this notification type is enabled")
    created_at: datetime = Field(..., description="When the preference was created")

class NotificationMarkRead(BaseModel):
    """Model for marking notifications as read"""
    notification_ids: List[str] = Field(..., description="List of notification IDs to mark as read")

    @validator('notification_ids')
    def validate_notification_ids(cls, v):
        if not v:
            raise ValueError('At least one notification ID must be provided')
        if len(v) > 100:  # Reasonable limit to prevent abuse
            raise ValueError('Cannot mark more than 100 notifications as read at once')
        return v

class NotificationStats(BaseModel):
    """Model for notification statistics"""
    total_count: int = Field(..., description="Total number of notifications")
    unread_count: int = Field(..., description="Number of unread notifications")
    by_type: Dict[NotificationType, int] = Field(..., description="Count of notifications by type")