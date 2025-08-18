"""
User-friendly error message service for calendar operations.
Provides clear, actionable error messages for common failure scenarios.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass

from ..core.logging_config import get_calendar_logger

logger = get_calendar_logger(__name__)


class ErrorCategory(Enum):
    """Categories of errors for better organization."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    RATE_LIMIT = "rate_limit"
    NETWORK = "network"
    VALIDATION = "validation"
    CONFLICT = "conflict"
    SERVICE_UNAVAILABLE = "service_unavailable"
    QUOTA_EXCEEDED = "quota_exceeded"
    NOT_FOUND = "not_found"
    INTERNAL_ERROR = "internal_error"


@dataclass
class UserFriendlyError:
    """User-friendly error message with context."""
    title: str
    message: str
    category: ErrorCategory
    error_code: str
    suggestions: list[str]
    retry_after: Optional[int] = None
    support_info: Optional[str] = None


class ErrorMessageService:
    """
    Service for generating user-friendly error messages from technical errors.
    Maps technical error codes to clear, actionable messages for users.
    """
    
    def __init__(self):
        self.error_mappings = self._initialize_error_mappings()
    
    def _initialize_error_mappings(self) -> Dict[str, UserFriendlyError]:
        """Initialize mapping of error codes to user-friendly messages."""
        
        return {
            # Authentication Errors
            "TOKEN_NOT_FOUND": UserFriendlyError(
                title="Calendar Not Connected",
                message="Your Google Calendar is not connected to this account. Please connect your calendar to use scheduling features.",
                category=ErrorCategory.AUTHENTICATION,
                error_code="TOKEN_NOT_FOUND",
                suggestions=[
                    "Go to Calendar Settings and click 'Connect Google Calendar'",
                    "Follow the authorization steps to grant calendar access",
                    "Make sure you're using the same Google account"
                ]
            ),
            
            "UNAUTHORIZED": UserFriendlyError(
                title="Calendar Access Expired",
                message="Your Google Calendar access has expired. Please reconnect your calendar to continue using scheduling features.",
                category=ErrorCategory.AUTHENTICATION,
                error_code="UNAUTHORIZED",
                suggestions=[
                    "Go to Calendar Settings and disconnect your current connection",
                    "Click 'Connect Google Calendar' to reconnect",
                    "Make sure to grant all requested permissions"
                ]
            ),
            
            "TOKEN_REFRESH_FAILED": UserFriendlyError(
                title="Calendar Connection Issue",
                message="We couldn't refresh your calendar access. Please reconnect your Google Calendar.",
                category=ErrorCategory.AUTHENTICATION,
                error_code="TOKEN_REFRESH_FAILED",
                suggestions=[
                    "Disconnect and reconnect your Google Calendar",
                    "Check that your Google account is still active",
                    "Try again in a few minutes"
                ]
            ),
            
            # Authorization Errors
            "FORBIDDEN": UserFriendlyError(
                title="Calendar Access Denied",
                message="You don't have permission to access this calendar. Please check your Google Calendar permissions.",
                category=ErrorCategory.AUTHORIZATION,
                error_code="FORBIDDEN",
                suggestions=[
                    "Make sure you granted calendar permissions during setup",
                    "Check your Google account security settings",
                    "Try reconnecting your calendar with full permissions"
                ]
            ),
            
            # Rate Limiting Errors
            "RATE_LIMIT_EXCEEDED": UserFriendlyError(
                title="Too Many Requests",
                message="You've made too many calendar requests. Please wait a moment before trying again.",
                category=ErrorCategory.RATE_LIMIT,
                error_code="RATE_LIMIT_EXCEEDED",
                suggestions=[
                    "Wait a few minutes before making more calendar changes",
                    "Avoid making multiple rapid changes to your schedule",
                    "Try scheduling events in smaller batches"
                ],
                retry_after=60
            ),
            
            "QUOTA_EXCEEDED": UserFriendlyError(
                title="Daily Limit Reached",
                message="You've reached the daily limit for calendar operations. Please try again tomorrow.",
                category=ErrorCategory.QUOTA_EXCEEDED,
                error_code="QUOTA_EXCEEDED",
                suggestions=[
                    "Wait until tomorrow to make more calendar changes",
                    "Consider reducing the number of calendar operations",
                    "Contact support if you need higher limits"
                ],
                retry_after=86400  # 24 hours
            ),
            
            # Network Errors
            "SERVICE_UNAVAILABLE": UserFriendlyError(
                title="Calendar Service Temporarily Unavailable",
                message="Google Calendar is temporarily unavailable. Your changes have been saved locally and will sync when the service is restored.",
                category=ErrorCategory.SERVICE_UNAVAILABLE,
                error_code="SERVICE_UNAVAILABLE",
                suggestions=[
                    "Your schedule changes are saved locally",
                    "Try again in a few minutes",
                    "Check Google's service status if the issue persists"
                ],
                retry_after=300  # 5 minutes
            ),
            
            "NETWORK_ERROR": UserFriendlyError(
                title="Connection Problem",
                message="We couldn't connect to Google Calendar. Please check your internet connection and try again.",
                category=ErrorCategory.NETWORK,
                error_code="NETWORK_ERROR",
                suggestions=[
                    "Check your internet connection",
                    "Try refreshing the page",
                    "Wait a moment and try again"
                ]
            ),
            
            # Validation Errors
            "INVALID_EVENT_DATA": UserFriendlyError(
                title="Invalid Event Information",
                message="The event information you provided is not valid. Please check your input and try again.",
                category=ErrorCategory.VALIDATION,
                error_code="INVALID_EVENT_DATA",
                suggestions=[
                    "Make sure all required fields are filled out",
                    "Check that dates and times are valid",
                    "Ensure the event duration is reasonable"
                ]
            ),
            
            "INVALID_DATE_RANGE": UserFriendlyError(
                title="Invalid Date Range",
                message="The date range you specified is not valid. Please check your start and end dates.",
                category=ErrorCategory.VALIDATION,
                error_code="INVALID_DATE_RANGE",
                suggestions=[
                    "Make sure the start date is before the end date",
                    "Check that dates are in the correct format",
                    "Ensure dates are not too far in the past or future"
                ]
            ),
            
            # Conflict Errors
            "EVENT_CONFLICT": UserFriendlyError(
                title="Schedule Conflict",
                message="This event conflicts with your existing schedule. Please choose a different time or resolve the conflict.",
                category=ErrorCategory.CONFLICT,
                error_code="EVENT_CONFLICT",
                suggestions=[
                    "Choose a different time slot",
                    "Check your existing calendar for conflicts",
                    "Consider shortening the event duration"
                ]
            ),
            
            "RECURRING_EVENT_CONFLICT": UserFriendlyError(
                title="Recurring Event Conflict",
                message="Some instances of this recurring event conflict with your existing schedule.",
                category=ErrorCategory.CONFLICT,
                error_code="RECURRING_EVENT_CONFLICT",
                suggestions=[
                    "Review the conflicting dates shown",
                    "Adjust the recurrence pattern",
                    "Skip conflicting instances if possible"
                ]
            ),
            
            # Not Found Errors
            "EVENT_NOT_FOUND": UserFriendlyError(
                title="Event Not Found",
                message="The calendar event you're looking for could not be found. It may have been deleted or moved.",
                category=ErrorCategory.NOT_FOUND,
                error_code="EVENT_NOT_FOUND",
                suggestions=[
                    "Check if the event was deleted",
                    "Refresh your calendar view",
                    "Make sure you're looking in the right calendar"
                ]
            ),
            
            "CALENDAR_NOT_FOUND": UserFriendlyError(
                title="Calendar Not Found",
                message="The specified calendar could not be found. Please check your calendar settings.",
                category=ErrorCategory.NOT_FOUND,
                error_code="CALENDAR_NOT_FOUND",
                suggestions=[
                    "Check your Google Calendar settings",
                    "Make sure the calendar still exists",
                    "Try reconnecting your calendar"
                ]
            ),
            
            # Internal Errors
            "INTERNAL_ERROR": UserFriendlyError(
                title="Something Went Wrong",
                message="An unexpected error occurred. Our team has been notified and will investigate the issue.",
                category=ErrorCategory.INTERNAL_ERROR,
                error_code="INTERNAL_ERROR",
                suggestions=[
                    "Try again in a few minutes",
                    "Refresh the page if the problem persists",
                    "Contact support if you continue to experience issues"
                ],
                support_info="If this problem continues, please contact support with error code: INTERNAL_ERROR"
            ),
            
            "DATABASE_ERROR": UserFriendlyError(
                title="Data Storage Issue",
                message="We're having trouble saving your changes. Please try again in a moment.",
                category=ErrorCategory.INTERNAL_ERROR,
                error_code="DATABASE_ERROR",
                suggestions=[
                    "Wait a moment and try again",
                    "Check that your changes were saved",
                    "Contact support if the issue persists"
                ]
            ),
            
            # Sync Errors
            "SYNC_FAILED": UserFriendlyError(
                title="Synchronization Failed",
                message="We couldn't sync your calendar changes. Your local changes are saved and we'll try to sync again automatically.",
                category=ErrorCategory.SERVICE_UNAVAILABLE,
                error_code="SYNC_FAILED",
                suggestions=[
                    "Your changes are saved locally",
                    "Sync will be retried automatically",
                    "You can also try manual sync later"
                ]
            ),
            
            "PARTIAL_SYNC": UserFriendlyError(
                title="Partial Synchronization",
                message="Some of your calendar changes couldn't be synced. We'll keep trying to sync the remaining changes.",
                category=ErrorCategory.SERVICE_UNAVAILABLE,
                error_code="PARTIAL_SYNC",
                suggestions=[
                    "Most changes were synced successfully",
                    "Remaining changes will be retried automatically",
                    "Check your calendar to verify changes"
                ]
            )
        }
    
    def get_user_friendly_error(
        self,
        error_code: str,
        context: Optional[Dict[str, Any]] = None
    ) -> UserFriendlyError:
        """
        Get user-friendly error message for an error code.
        
        Args:
            error_code: Technical error code
            context: Additional context for customizing the message
            
        Returns:
            UserFriendlyError: User-friendly error information
        """
        
        # Get base error message
        base_error = self.error_mappings.get(error_code)
        
        if not base_error:
            # Return generic error for unknown codes
            logger.warning(f"Unknown error code: {error_code}", extra={
                'error_code': error_code,
                'context': context
            })
            
            base_error = self.error_mappings["INTERNAL_ERROR"]
        
        # Customize message based on context
        customized_error = self._customize_error_message(base_error, context or {})
        
        logger.info(f"Generated user-friendly error message", extra={
            'error_code': error_code,
            'category': customized_error.category.value,
            'context': context
        })
        
        return customized_error
    
    def _customize_error_message(
        self,
        base_error: UserFriendlyError,
        context: Dict[str, Any]
    ) -> UserFriendlyError:
        """
        Customize error message based on context.
        
        Args:
            base_error: Base error message
            context: Context for customization
            
        Returns:
            UserFriendlyError: Customized error message
        """
        
        # Create a copy to avoid modifying the original
        customized = UserFriendlyError(
            title=base_error.title,
            message=base_error.message,
            category=base_error.category,
            error_code=base_error.error_code,
            suggestions=base_error.suggestions.copy(),
            retry_after=base_error.retry_after,
            support_info=base_error.support_info
        )
        
        # Customize based on context
        if context.get('user_id'):
            # Add user-specific information if needed
            pass
        
        if context.get('operation'):
            operation = context['operation']
            if operation == 'create_event':
                customized.title = f"Couldn't Create Event - {customized.title}"
            elif operation == 'update_event':
                customized.title = f"Couldn't Update Event - {customized.title}"
            elif operation == 'delete_event':
                customized.title = f"Couldn't Delete Event - {customized.title}"
        
        if context.get('retry_after'):
            customized.retry_after = context['retry_after']
        
        if context.get('conflict_count'):
            count = context['conflict_count']
            if base_error.error_code == 'EVENT_CONFLICT':
                customized.message = f"This event conflicts with {count} existing event{'s' if count != 1 else ''} in your calendar."
        
        if context.get('event_title'):
            event_title = context['event_title']
            customized.message = customized.message.replace(
                "This event",
                f"The event '{event_title}'"
            )
        
        return customized
    
    def format_error_response(
        self,
        error_code: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Format error as API response.
        
        Args:
            error_code: Technical error code
            context: Additional context
            
        Returns:
            dict: Formatted error response
        """
        
        user_error = self.get_user_friendly_error(error_code, context)
        
        response = {
            "error": {
                "code": user_error.error_code,
                "category": user_error.category.value,
                "title": user_error.title,
                "message": user_error.message,
                "suggestions": user_error.suggestions
            }
        }
        
        if user_error.retry_after:
            response["error"]["retry_after"] = user_error.retry_after
        
        if user_error.support_info:
            response["error"]["support_info"] = user_error.support_info
        
        return response
    
    def get_error_categories(self) -> Dict[str, list[str]]:
        """
        Get all error codes organized by category.
        
        Returns:
            dict: Error codes grouped by category
        """
        
        categories = {}
        for error_code, error_info in self.error_mappings.items():
            category = error_info.category.value
            if category not in categories:
                categories[category] = []
            categories[category].append(error_code)
        
        return categories
    
    def get_recovery_suggestions(self, error_category: ErrorCategory) -> list[str]:
        """
        Get general recovery suggestions for an error category.
        
        Args:
            error_category: Category of error
            
        Returns:
            list: General recovery suggestions
        """
        
        category_suggestions = {
            ErrorCategory.AUTHENTICATION: [
                "Check your Google account credentials",
                "Reconnect your Google Calendar",
                "Ensure you have proper permissions"
            ],
            ErrorCategory.AUTHORIZATION: [
                "Verify calendar permissions in Google account",
                "Check Google account security settings",
                "Try reconnecting with full permissions"
            ],
            ErrorCategory.RATE_LIMIT: [
                "Wait before making more requests",
                "Reduce the frequency of operations",
                "Try again later"
            ],
            ErrorCategory.NETWORK: [
                "Check your internet connection",
                "Try refreshing the page",
                "Wait and try again"
            ],
            ErrorCategory.VALIDATION: [
                "Check all required fields are filled",
                "Verify date and time formats",
                "Ensure data is within valid ranges"
            ],
            ErrorCategory.CONFLICT: [
                "Choose different times",
                "Check existing calendar events",
                "Resolve scheduling conflicts"
            ],
            ErrorCategory.SERVICE_UNAVAILABLE: [
                "Wait for service to recover",
                "Try again later",
                "Check service status"
            ],
            ErrorCategory.NOT_FOUND: [
                "Verify the item still exists",
                "Refresh your view",
                "Check you're looking in the right place"
            ],
            ErrorCategory.INTERNAL_ERROR: [
                "Try again in a few minutes",
                "Refresh the page",
                "Contact support if issue persists"
            ]
        }
        
        return category_suggestions.get(error_category, [
            "Try again later",
            "Contact support if the issue persists"
        ])


# Global instance
error_message_service = ErrorMessageService()