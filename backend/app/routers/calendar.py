"""
Calendar API router for Google Calendar integration.
Handles OAuth connection endpoints and calendar operations.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import RedirectResponse

from ..models.user import UserResponse
from ..models.calendar import (
    CalendarConnectionStatus,
    OAuthInitiateResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    CalendarError
)
from ..services.oauth_service import oauth_service, OAuthError
from ..routers.auth import get_current_user
from ..middleware.security_middleware import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/connect", response_model=OAuthInitiateResponse)
async def connect_google_calendar(
    current_user: UserResponse = Depends(get_current_user)
) -> OAuthInitiateResponse:
    """
    Initiate Google Calendar OAuth connection flow.
    
    This endpoint starts the OAuth 2.0 flow for connecting a user's Google Calendar.
    It generates a secure authorization URL that the user will be redirected to.
    
    **Requirements:** 1.1, 1.2
    
    Returns:
        OAuthInitiateResponse: Authorization URL and state parameter
        
    Raises:
        HTTPException: If OAuth flow initialization fails
    """
    try:
        logger.info(f"Initiating Google Calendar connection for user {current_user.user_id}")
        
        # Audit log: OAuth initiation attempt
        audit_logger.log_oauth_action(
            action="oauth_initiate",
            user_id=current_user.user_id,
            success=False,  # Will update on success
            details={"user_type": current_user.user_type.value}
        )
        
        # Check if user already has an active connection
        connection_status = await oauth_service.get_connection_status(current_user.user_id)
        if connection_status.get("is_connected"):
            audit_logger.log_oauth_action(
                action="oauth_initiate",
                user_id=current_user.user_id,
                success=False,
                details={"error": "already_connected"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Calendar is already connected. Disconnect first to reconnect."
            )
        
        # Initiate OAuth flow
        auth_url, state = await oauth_service.initiate_google_auth(
            user_id=current_user.user_id,
            user_type=current_user.user_type.value
        )
        
        logger.info(f"OAuth flow initiated successfully for user {current_user.user_id}")
        
        # Audit log: OAuth initiation success
        audit_logger.log_oauth_action(
            action="oauth_initiate",
            user_id=current_user.user_id,
            success=True,
            details={"state": state[:8] + "..."}  # Log partial state for tracking
        )
        
        return OAuthInitiateResponse(
            auth_url=auth_url,
            state=state
        )
        
    except OAuthError as e:
        logger.error(f"OAuth error for user {current_user.user_id}: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error initiating OAuth for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate Google Calendar connection"
        )


@router.get("/callback")
async def oauth_callback(
    code: str = Query(None, description="Authorization code from Google"),
    state: str = Query(None, description="State parameter for validation"),
    error: str = Query(None, description="Error parameter from OAuth provider")
) -> RedirectResponse:
    """
    Handle OAuth callback from Google.
    
    This endpoint processes the OAuth callback after user authorization.
    It exchanges the authorization code for access tokens and stores them securely.
    
    **Requirements:** 1.1, 1.2, 1.4
    
    Args:
        code: Authorization code from Google OAuth
        state: State parameter for validation
        error: Error parameter if OAuth failed
        
    Returns:
        RedirectResponse: Redirect to frontend with success/error status
        
    Raises:
        HTTPException: If callback processing fails
    """
    try:
        # Check for OAuth errors
        if error:
            logger.warning(f"OAuth callback received error: {error}")
            return RedirectResponse(
                url=f"http://localhost:3000/calendar?error=oauth_denied&message={error}",
                status_code=status.HTTP_302_FOUND
            )
        
        if not code or not state:
            logger.error("OAuth callback missing required parameters")
            return RedirectResponse(
                url="http://localhost:3000/calendar?error=invalid_request&message=Missing required parameters",
                status_code=status.HTTP_302_FOUND
            )
        
        logger.info(f"Processing OAuth callback with state: {state}")
        
        # Handle OAuth callback
        result = await oauth_service.handle_oauth_callback(code, state)
        
        if result.get("success"):
            user_id = result.get('user_id')
            logger.info(f"OAuth callback successful for user {user_id}")
            
            # Audit log: OAuth callback success
            audit_logger.log_oauth_action(
                action="oauth_callback",
                user_id=user_id,
                success=True,
                details={"provider": "google", "calendar_connected": True}
            )
            
            return RedirectResponse(
                url="http://localhost:3000/calendar?success=true&message=Google Calendar connected successfully",
                status_code=status.HTTP_302_FOUND
            )
        else:
            logger.error("OAuth callback failed")
            
            # Audit log: OAuth callback failure
            audit_logger.log_oauth_action(
                action="oauth_callback",
                user_id=None,
                success=False,
                details={"error": "callback_processing_failed"}
            )
            
            return RedirectResponse(
                url="http://localhost:3000/calendar?error=callback_failed&message=Failed to complete connection",
                status_code=status.HTTP_302_FOUND
            )
        
    except OAuthError as e:
        logger.error(f"OAuth error in callback: {e.message}")
        return RedirectResponse(
            url=f"http://localhost:3000/calendar?error=oauth_error&message={e.message}",
            status_code=status.HTTP_302_FOUND
        )
    except Exception as e:
        logger.error(f"Unexpected error in OAuth callback: {e}")
        return RedirectResponse(
            url="http://localhost:3000/calendar?error=server_error&message=An unexpected error occurred",
            status_code=status.HTTP_302_FOUND
        )


@router.delete("/disconnect", response_model=Dict[str, str])
async def disconnect_google_calendar(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Disconnect Google Calendar integration.
    
    This endpoint revokes Google Calendar access and removes stored tokens.
    All scheduled events will remain in Google Calendar but won't be synchronized.
    
    **Requirements:** 1.4, 1.5
    
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If disconnection fails
    """
    try:
        logger.info(f"Disconnecting Google Calendar for user {current_user.user_id}")
        
        # Check if user has an active connection
        connection_status = await oauth_service.get_connection_status(current_user.user_id)
        if not connection_status.get("is_connected"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Google Calendar connection found"
            )
        
        # Revoke access
        success = await oauth_service.revoke_access(current_user.user_id)
        
        if success:
            logger.info(f"Google Calendar disconnected successfully for user {current_user.user_id}")
            
            # Audit log: Calendar disconnection success
            audit_logger.log_oauth_action(
                action="oauth_disconnect",
                user_id=current_user.user_id,
                success=True,
                details={"provider": "google"}
            )
            
            return {
                "message": "Google Calendar disconnected successfully",
                "status": "disconnected"
            }
        else:
            logger.error(f"Failed to disconnect Google Calendar for user {current_user.user_id}")
            
            # Audit log: Calendar disconnection failure
            audit_logger.log_oauth_action(
                action="oauth_disconnect",
                user_id=current_user.user_id,
                success=False,
                details={"error": "revocation_failed"}
            )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to disconnect Google Calendar"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error disconnecting calendar for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Google Calendar"
        )


@router.get("/status", response_model=CalendarConnectionStatus)
async def get_calendar_connection_status(
    current_user: UserResponse = Depends(get_current_user)
) -> CalendarConnectionStatus:
    """
    Get Google Calendar connection status.
    
    This endpoint returns the current connection status, including whether
    the user is connected, when they connected, and token validity.
    
    **Requirements:** 1.5
    
    Returns:
        CalendarConnectionStatus: Connection status information
        
    Raises:
        HTTPException: If status check fails
    """
    try:
        logger.info(f"Checking calendar connection status for user {current_user.user_id}")
        
        # Get connection status
        status_info = await oauth_service.get_connection_status(current_user.user_id)
        
        return CalendarConnectionStatus(
            is_connected=status_info.get("is_connected", False),
            provider=status_info.get("provider"),
            calendar_id=status_info.get("calendar_id"),
            connected_at=status_info.get("connected_at")
        )
        
    except Exception as e:
        logger.error(f"Error checking connection status for user {current_user.user_id}: {e}")
        # Return disconnected status on error rather than failing
        return CalendarConnectionStatus(
            is_connected=False,
            provider=None,
            calendar_id=None,
            connected_at=None
        )


@router.post("/test-connection", response_model=Dict[str, Any])
async def test_calendar_connection(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test Google Calendar connection by making a simple API call.
    
    This endpoint verifies that the stored tokens are valid and can be used
    to make requests to the Google Calendar API.
    
    **Requirements:** 1.5
    
    Returns:
        dict: Test results and connection information
        
    Raises:
        HTTPException: If connection test fails
    """
    try:
        logger.info(f"Testing calendar connection for user {current_user.user_id}")
        
        # Check if user has a connection
        connection_status = await oauth_service.get_connection_status(current_user.user_id)
        if not connection_status.get("is_connected"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Google Calendar connection found"
            )
        
        # Get a valid token (this will test token validity and refresh if needed)
        token = await oauth_service.get_valid_token(current_user.user_id)
        
        if token:
            logger.info(f"Calendar connection test successful for user {current_user.user_id}")
            return {
                "success": True,
                "message": "Google Calendar connection is working",
                "token_valid": True,
                "calendar_id": connection_status.get("calendar_id"),
                "connected_at": connection_status.get("connected_at")
            }
        else:
            logger.warning(f"Calendar connection test failed - invalid token for user {current_user.user_id}")
            return {
                "success": False,
                "message": "Google Calendar connection has invalid tokens",
                "token_valid": False,
                "calendar_id": connection_status.get("calendar_id"),
                "connected_at": connection_status.get("connected_at")
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing calendar connection for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to test calendar connection"
        )


# Helper function for OAuth error handling
def handle_oauth_error(exc: OAuthError) -> HTTPException:
    """Handle OAuth-specific errors with appropriate HTTP responses."""
    error_status_map = {
        "OAUTH_INIT_FAILED": status.HTTP_400_BAD_REQUEST,
        "INVALID_STATE": status.HTTP_400_BAD_REQUEST,
        "OAUTH_CALLBACK_FAILED": status.HTTP_400_BAD_REQUEST,
        "CONNECTION_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "TOKEN_DECRYPT_FAILED": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "TOKEN_REFRESH_FAILED": status.HTTP_401_UNAUTHORIZED,
    }
    
    status_code = error_status_map.get(exc.error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return HTTPException(
        status_code=status_code,
        detail=CalendarError(
            error_code=exc.error_code,
            message=exc.message,
            details={"retry_after": exc.retry_after} if exc.retry_after else None
        ).dict()
    )