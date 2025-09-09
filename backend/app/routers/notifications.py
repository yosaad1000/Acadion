from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.notification import (
    NotificationResponse, 
    NotificationPreferencesUpdate,
    NotificationPreferenceResponse,
    NotificationStats
)
from app.models.user import UserResponse
from app.middleware.supabase_auth import get_current_user_supabase as get_current_user
from app.services.notification_service import NotificationService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Notification service will be initialized lazily
def get_notification_service() -> NotificationService:
    """Get notification service instance"""
    return NotificationService()

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to retrieve"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Get notifications for the current user"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user.user_id,
            limit=limit,
            offset=offset
        )
        
        logger.info(f"Retrieved {len(notifications)} notifications for user {current_user.user_id}")
        return notifications
        
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications"
        )

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Mark a specific notification as read"""
    try:
        success = await notification_service.mark_as_read(
            notification_id=notification_id,
            user_id=current_user.user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found or access denied"
            )
        
        logger.info(f"Notification {notification_id} marked as read for user {current_user.user_id}")
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark notification read error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )

@router.patch("/mark-all-read")
async def mark_all_notifications_read(
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Mark all notifications as read for the current user"""
    try:
        success = await notification_service.mark_all_as_read(current_user.user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark all notifications as read"
            )
        
        logger.info(f"All notifications marked as read for user {current_user.user_id}")
        return {"message": "All notifications marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mark all notifications read error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )

@router.get("/unread-count")
async def get_unread_count(
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Get count of unread notifications for the current user"""
    try:
        count = await notification_service.get_unread_count(current_user.user_id)
        
        logger.info(f"Retrieved unread count {count} for user {current_user.user_id}")
        return {"unread_count": count}
        
    except Exception as e:
        logger.error(f"Get unread count error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve unread count"
        )

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Get notification statistics for the current user"""
    try:
        stats = await notification_service.get_notification_stats(current_user.user_id)
        
        logger.info(f"Retrieved notification stats for user {current_user.user_id}")
        return stats
        
    except Exception as e:
        logger.error(f"Get notification stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification statistics"
        )

@router.get("/preferences", response_model=List[NotificationPreferenceResponse])
async def get_notification_preferences(
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Get notification preferences for the current user"""
    try:
        preferences = await notification_service.get_user_preferences(current_user.user_id)
        
        logger.info(f"Retrieved {len(preferences)} preferences for user {current_user.user_id}")
        return preferences
        
    except Exception as e:
        logger.error(f"Get notification preferences error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification preferences"
        )

@router.put("/preferences")
async def update_notification_preferences(
    preferences_update: NotificationPreferencesUpdate,
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Update notification preferences for the current user"""
    try:
        success = await notification_service.update_preferences(
            user_id=current_user.user_id,
            preferences_update=preferences_update
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification preferences"
            )
        
        logger.info(f"Updated {len(preferences_update.preferences)} preferences for user {current_user.user_id}")
        return {"message": "Notification preferences updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update notification preferences error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification preferences"
        )

@router.delete("/clear-all")
async def clear_all_notifications(
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Clear all notifications for the current user"""
    try:
        success = await notification_service.clear_all_notifications(current_user.user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear all notifications"
            )
        
        logger.info(f"All notifications cleared for user {current_user.user_id}")
        return {"message": "All notifications cleared successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear all notifications error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear all notifications"
        )

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: UserResponse = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Delete a specific notification"""
    try:
        success = await notification_service.delete_notification(
            notification_id=notification_id,
            user_id=current_user.user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found or access denied"
            )
        
        logger.info(f"Notification {notification_id} deleted for user {current_user.user_id}")
        return {"message": "Notification deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete notification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )