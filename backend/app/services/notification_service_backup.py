import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from postgrest.exceptions import APIError
from app.config import settings
from app.models.notification import (
    NotificationCreate, 
    NotificationResponse, 
    NotificationPreference,
    NotificationPreferencesUpdate,
    NotificationPreferenceResponse,
    NotificationStats,
    NotificationType
)

logger = logging.getLogger(__name__)

class NotificationServiceError(Exception):
    """Base exception for notification service errors"""
    pass

class NotificationConnectionError(NotificationServiceError):
    """Raised when there's a connection issue with the database"""
    pass

class NotificationValidationError(NotificationServiceError):
    """Raised when notification data is invalid"""
    pass

class NotificationService:
    """Service for notification-related operations with enhanced error handling"""
    
    def __init__(self):
        try:
            # Use direct HTTP requests like LocalSupabase to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self._connection_healthy = True
            logger.info("NotificationService initialized successfully with HTTP client")
        except Exception as e:
            logger.error(f"Error initializing NotificationService: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize NotificationService: {e}")
    
    async def _execute_with_retry(self, operation, max_retries: int = 3, delay: float = 1.0):
        """Execute database operation with retry logic"""
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                return await operation()
            except APIError as e:
                last_exception = e
                logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                
                # Don't retry on client errors (4xx)
                if hasattr(e, 'code') and str(e.code).startswith('4'):
                    raise NotificationValidationError(f"Invalid request: {e}")
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                else:
                    self._connection_healthy = False
                    raise NotificationConnectionError(f"Database operation failed after {max_retries} attempts: {e}")
            except Exception as e:
                last_exception = e
                logger.error(f"Unexpected error in database operation (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt < max_retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                else:
                    raise NotificationServiceError(f"Operation failed after {max_retries} attempts: {e}")
        
        # This should never be reached, but just in case
        raise last_exception or NotificationServiceError("Unknown error occurred")
    
    def is_healthy(self) -> bool:
        """Check if the service is healthy"""
        return self._connection_healthy
    
    async def create_notification(self, notification: NotificationCreate) -> bool:
        """Create a new notification with enhanced error handling"""
        if not self._connection_healthy or self.supabase is None:
            logger.warning("NotificationService is not available - skipping notification creation")
            return True  # Return True to not break the flow
            
        try:
            # Validate notification data
            if not notification.recipient_id or not notification.title or not notification.message:
                raise NotificationValidationError("Missing required notification fields")
            
            # Check if user has this notification type enabled
            if not await self._is_notification_enabled(notification.recipient_id, notification.type):
                logger.info(f"Notification type {notification.type} is disabled for user {notification.recipient_id}")
                return True  # Return True as this is not an error, just filtered out
            
            notification_data = {
                'recipient_id': notification.recipient_id,
                'sender_id': notification.sender_id,
                'type': notification.type.value,
                'title': notification.title[:255],  # Ensure title doesn't exceed limit
                'message': notification.message,
                'data': notification.data,
                'is_read': False,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            async def create_operation():
                result = self.supabase.table('notifications').insert(notification_data).execute()
                if not result.data:
                    raise NotificationServiceError("Failed to create notification - no data returned")
                return result
            
            result = await self._execute_with_retry(create_operation)
            logger.info(f"Notification created successfully for user {notification.recipient_id}")
            self._connection_healthy = True
            return True
                
        except (NotificationValidationError, NotificationConnectionError, NotificationServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating notification: {e}")
            raise NotificationServiceError(f"Failed to create notification: {e}")
    
    async def get_user_notifications(self, user_id: str, limit: int = 50, offset: int = 0) -> List[NotificationResponse]:
        """Get notifications for a specific user with enhanced error handling"""
        if not self._connection_healthy:
            logger.warning("NotificationService is not available - returning empty notifications list")
            return []
            

            
        try:
            # Validate parameters
            if not user_id:
                raise NotificationValidationError("User ID is required")
            if limit <= 0 or limit > 100:
                raise NotificationValidationError("Limit must be between 1 and 100")
            if offset < 0:
                raise NotificationValidationError("Offset must be non-negative")
            
            # Use HTTP requests like LocalSupabase to avoid proxy issues
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/notifications",
                    headers=self.headers,
                    params={
                        "recipient_id": f"eq.{user_id}",
                        "order": "created_at.desc",
                        "limit": str(limit),
                        "offset": str(offset)
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch notifications: {response.status_code} - {response.text}")
                    return []
                
                notifications = []
                for record in response.json():
                try:
                    notification = NotificationResponse(
                        id=record['id'],
                        recipient_id=record['recipient_id'],
                        sender_id=record.get('sender_id'),
                        type=NotificationType(record['type']),
                        title=record['title'],
                        message=record['message'],
                        data=record.get('data'),
                        is_read=record['is_read'],
                        created_at=datetime.fromisoformat(record['created_at'].replace('Z', '+00:00')),
                        updated_at=datetime.fromisoformat(record['updated_at'].replace('Z', '+00:00')) if record.get('updated_at') else None
                    )
                    notifications.append(notification)
                except Exception as parse_error:
                    logger.error(f"Error parsing notification record {record.get('id', 'unknown')}: {parse_error}")
                    continue
            
            logger.info(f"Retrieved {len(notifications)} notifications for user {user_id}")
            self._connection_healthy = True
            return notifications
            
        except (NotificationValidationError, NotificationConnectionError, NotificationServiceError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error getting user notifications: {e}")
            raise NotificationServiceError(f"Failed to get notifications: {e}")
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a specific notification as read"""
        if not self._connection_healthy:
            return True
            

            
        try:
            result = (self.supabase.table('notifications')
                     .update({
                         'is_read': True,
                         'updated_at': datetime.utcnow().isoformat()
                     })
                     .eq('id', notification_id)
                     .eq('recipient_id', user_id)  # Ensure user can only mark their own notifications
                     .execute())
            
            if result.data:
                logger.info(f"Notification {notification_id} marked as read for user {user_id}")
                return True
            else:
                logger.warning(f"No notification found with id {notification_id} for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False
    
    async def mark_all_as_read(self, user_id: str) -> bool:
        """Mark all notifications as read for a user"""
        try:
            result = (self.supabase.table('notifications')
                     .update({
                         'is_read': True,
                         'updated_at': datetime.utcnow().isoformat()
                     })
                     .eq('recipient_id', user_id)
                     .eq('is_read', False)  # Only update unread notifications
                     .execute())
            
            logger.info(f"All notifications marked as read for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            return False
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        if not self._connection_healthy:
            return 0
            

            
        try:
            result = (self.supabase.table('notifications')
                     .select("id", count="exact")
                     .eq('recipient_id', user_id)
                     .eq('is_read', False)
                     .execute())
            
            count = result.count if result.count is not None else 0
            logger.info(f"User {user_id} has {count} unread notifications")
            return count
            
        except Exception as e:
            logger.error(f"Error getting unread count: {e}")
            return 0
    
    async def get_notification_stats(self, user_id: str) -> NotificationStats:
        """Get notification statistics for a user"""
        try:
            # Get total count
            total_result = (self.supabase.table('notifications')
                           .select("id", count="exact")
                           .eq('recipient_id', user_id)
                           .execute())
            
            # Get unread count
            unread_result = (self.supabase.table('notifications')
                            .select("id", count="exact")
                            .eq('recipient_id', user_id)
                            .eq('is_read', False)
                            .execute())
            
            # Get count by type
            type_result = (self.supabase.table('notifications')
                          .select("type")
                          .eq('recipient_id', user_id)
                          .execute())
            
            # Count notifications by type
            by_type = {}
            for record in type_result.data:
                notification_type = NotificationType(record['type'])
                by_type[notification_type] = by_type.get(notification_type, 0) + 1
            
            stats = NotificationStats(
                total_count=total_result.count if total_result.count is not None else 0,
                unread_count=unread_result.count if unread_result.count is not None else 0,
                by_type=by_type
            )
            
            logger.info(f"Retrieved notification stats for user {user_id}")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting notification stats: {e}")
            return NotificationStats(total_count=0, unread_count=0, by_type={})
    
    async def get_user_preferences(self, user_id: str) -> List[NotificationPreferenceResponse]:
        """Get notification preferences for a user"""
        if not self._connection_healthy:
            return []
            

            
        try:
            result = (self.supabase.table('notification_preferences')
                     .select("*")
                     .eq('user_id', user_id)
                     .execute())
            
            preferences = []
            for record in result.data:
                try:
                    preference = NotificationPreferenceResponse(
                        id=record['id'],
                        user_id=record['user_id'],
                        notification_type=NotificationType(record['notification_type']),
                        enabled=record['enabled'],
                        created_at=datetime.fromisoformat(record['created_at'].replace('Z', '+00:00'))
                    )
                    preferences.append(preference)
                except Exception as parse_error:
                    logger.error(f"Error parsing preference record {record.get('id', 'unknown')}: {parse_error}")
                    continue
            
            # If no preferences exist, create default ones
            if not preferences:
                await self._create_default_preferences(user_id)
                return await self.get_user_preferences(user_id)
            
            logger.info(f"Retrieved {len(preferences)} preferences for user {user_id}")
            return preferences
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return []
    
    async def update_preferences(self, user_id: str, preferences_update: NotificationPreferencesUpdate) -> bool:
        """Update notification preferences for a user"""
        try:
            success_count = 0
            
            for preference in preferences_update.preferences:
                try:
                    # Use upsert to insert or update
                    result = (self.supabase.table('notification_preferences')
                             .upsert({
                                 'user_id': user_id,
                                 'notification_type': preference.notification_type.value,
                                 'enabled': preference.enabled
                             }, on_conflict='user_id,notification_type')
                             .execute())
                    
                    if result.data:
                        success_count += 1
                    
                except Exception as pref_error:
                    logger.error(f"Error updating preference {preference.notification_type}: {pref_error}")
                    continue
            
            success = success_count == len(preferences_update.preferences)
            if success:
                logger.info(f"Updated {success_count} preferences for user {user_id}")
            else:
                logger.warning(f"Only updated {success_count}/{len(preferences_update.preferences)} preferences for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating preferences: {e}")
            return False
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification (soft delete by marking as read and hiding)"""
        try:
            # For now, we'll just mark as read. In the future, we could add a 'deleted' flag
            return await self.mark_as_read(notification_id, user_id)
            
        except Exception as e:
            logger.error(f"Error deleting notification: {e}")
            return False
    
    async def _is_notification_enabled(self, user_id: str, notification_type: NotificationType) -> bool:
        """Check if a notification type is enabled for a user"""
        try:
            result = (self.supabase.table('notification_preferences')
                     .select("enabled")
                     .eq('user_id', user_id)
                     .eq('notification_type', notification_type.value)
                     .execute())
            
            if result.data:
                return result.data[0]['enabled']
            else:
                # If no preference exists, default to enabled
                return True
                
        except Exception as e:
            logger.error(f"Error checking notification preference: {e}")
            # Default to enabled on error
            return True
    
    async def _create_default_preferences(self, user_id: str) -> bool:
        """Create default notification preferences for a new user"""
        try:
            default_preferences = []
            for notification_type in NotificationType:
                default_preferences.append({
                    'user_id': user_id,
                    'notification_type': notification_type.value,
                    'enabled': True  # All notifications enabled by default
                })
            
            result = self.supabase.table('notification_preferences').insert(default_preferences).execute()
            
            if result.data:
                logger.info(f"Created default preferences for user {user_id}")
                return True
            else:
                logger.error(f"Failed to create default preferences for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating default preferences: {e}")
            return False