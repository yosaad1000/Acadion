from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Optional
from uuid import UUID
import logging

from app.models.google_integration import (
    GoogleAuthRequest, GoogleAuthResponse, GoogleIntegrationResponse, 
    GoogleCalendarEvent, GoogleDriveFolder
)
from app.services.google_oauth import google_integration_service
from app.services.google_calendar_service import google_calendar_service
from app.services.google_drive_service import google_drive_service
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/google", tags=["Google Integration"])

@router.get("/auth-url")
async def get_google_auth_url(
    state: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get Google OAuth authorization URL
    
    Returns the URL that users should visit to authorize Google Workspace integration
    """
    try:
        auth_url = google_integration_service.get_authorization_url(state)
        return {
            "success": True,
            "auth_url": auth_url,
            "message": "Authorization URL generated successfully"
        }
    except Exception as e:
        logger.error(f"❌ Error generating auth URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authorization URL"
        )

@router.post("/authenticate", response_model=GoogleAuthResponse)
async def authenticate_google(
    auth_request: GoogleAuthRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Complete Google OAuth authentication flow
    
    Exchange authorization code for tokens and store integration
    """
    try:
        user_id = UUID(current_user["user_id"])
        result = await google_integration_service.authenticate_user(auth_request, user_id)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.message
            )
        
        return result
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error authenticating with Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.get("/integration", response_model=Optional[GoogleIntegrationResponse])
async def get_user_integration(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user's Google integration status
    
    Returns integration details if user has connected Google Workspace
    """
    try:
        user_id = UUID(current_user["user_id"])
        integration = await google_integration_service.get_integration_by_user_id(user_id)
        
        if not integration:
            return None
        
        # Check if token is still valid
        is_token_valid = await google_integration_service.get_valid_access_token(user_id) is not None
        
        return GoogleIntegrationResponse(
            integration_id=integration.integration_id,
            user_id=integration.user_id,
            google_calendar_id=integration.google_calendar_id,
            google_drive_folder_id=integration.google_drive_folder_id,
            is_active=integration.is_active,
            is_token_valid=is_token_valid,
            created_at=integration.created_at,
            updated_at=integration.updated_at
        )
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error getting integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve integration"
        )

@router.delete("/integration")
async def revoke_integration(
    current_user: dict = Depends(get_current_user)
):
    """
    Revoke Google Workspace integration
    
    Disconnects user's Google account and revokes stored tokens
    """
    try:
        user_id = UUID(current_user["user_id"])
        success = await google_integration_service.revoke_integration(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to revoke integration"
            )
        
        return {
            "success": True,
            "message": "Google integration revoked successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error revoking integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke integration"
        )

@router.post("/refresh-token")
async def refresh_user_token(
    current_user: dict = Depends(get_current_user)
):
    """
    Manually refresh user's Google access token
    
    Useful for testing or when automatic refresh fails
    """
    try:
        user_id = UUID(current_user["user_id"])
        access_token = await google_integration_service.get_valid_access_token(user_id)
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid integration found or token refresh failed"
            )
        
        return {
            "success": True,
            "message": "Token refreshed successfully",
            "has_valid_token": True
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

@router.get("/calendar/primary")
async def get_primary_calendar(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's primary Google Calendar
    
    Returns primary calendar information
    """
    try:
        user_id = UUID(current_user["user_id"])
        calendar_data = await google_calendar_service.get_primary_calendar(user_id)
        
        if not calendar_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to access Google Calendar. Please check your integration."
            )
        
        return {
            "success": True,
            "calendar": calendar_data
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error getting primary calendar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calendar"
        )

@router.post("/calendar/events")
async def create_calendar_event(
    event: GoogleCalendarEvent,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Google Calendar event
    
    Creates a new event in the user's primary calendar
    """
    try:
        user_id = UUID(current_user["user_id"])
        created_event = await google_calendar_service.create_calendar_event(user_id, event)
        
        if not created_event:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create calendar event"
            )
        
        return {
            "success": True,
            "event": created_event,
            "message": "Calendar event created successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create calendar event"
        )

@router.put("/calendar/events/{event_id}")
async def update_calendar_event(
    event_id: str,
    event: GoogleCalendarEvent,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a Google Calendar event
    
    Updates an existing event in the user's primary calendar
    """
    try:
        user_id = UUID(current_user["user_id"])
        updated_event = await google_calendar_service.update_calendar_event(user_id, event_id, event)
        
        if not updated_event:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update calendar event"
            )
        
        return {
            "success": True,
            "event": updated_event,
            "message": "Calendar event updated successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error updating calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update calendar event"
        )

@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a Google Calendar event
    
    Deletes an event from the user's primary calendar
    """
    try:
        user_id = UUID(current_user["user_id"])
        success = await google_calendar_service.delete_calendar_event(user_id, event_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete calendar event"
            )
        
        return {
            "success": True,
            "message": "Calendar event deleted successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error deleting calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete calendar event"
        )

@router.get("/calendar/events")
async def get_calendar_events(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get Google Calendar events within a date range
    
    Returns events from the user's primary calendar
    """
    try:
        user_id = UUID(current_user["user_id"])
        
        # Parse dates
        start_datetime = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        
        events = await google_calendar_service.get_calendar_events(user_id, start_datetime, end_datetime)
        
        return {
            "success": True,
            "events": events,
            "count": len(events)
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid date format or user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format or user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error getting calendar events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calendar events"
        )

@router.post("/calendar/session-event")
async def create_session_calendar_event(
    session_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a calendar event for a session
    
    Creates a calendar event with Google Meet link for a class session
    """
    try:
        user_id = UUID(current_user["user_id"])
        event_data = await google_calendar_service.create_session_event(user_id, session_data)
        
        if not event_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create session calendar event"
            )
        
        return {
            "success": True,
            "event_data": event_data,
            "message": "Session calendar event created successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating session calendar event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session calendar event"
        )

@router.post("/drive/folders")
async def create_drive_folder(
    folder: GoogleDriveFolder,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Google Drive folder
    
    Creates a new folder in the user's Google Drive
    """
    try:
        user_id = UUID(current_user["user_id"])
        created_folder = await google_drive_service.create_folder(user_id, folder)
        
        if not created_folder:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create Drive folder"
            )
        
        return {
            "success": True,
            "folder": created_folder,
            "message": "Drive folder created successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating Drive folder: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create Drive folder"
        )

@router.get("/drive/folders/{folder_id}/contents")
async def get_folder_contents(
    folder_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get contents of a Google Drive folder
    
    Returns files and subfolders within the specified folder
    """
    try:
        user_id = UUID(current_user["user_id"])
        contents = await google_drive_service.get_folder_contents(user_id, folder_id)
        
        return {
            "success": True,
            "contents": contents,
            "count": len(contents)
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error getting folder contents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve folder contents"
        )

@router.post("/drive/folders/{folder_id}/share")
async def share_drive_folder(
    folder_id: str,
    share_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Share a Google Drive folder with users
    
    Grants access to the specified folder for given email addresses
    """
    try:
        user_id = UUID(current_user["user_id"])
        email_addresses = share_data.get("email_addresses", [])
        role = share_data.get("role", "reader")
        
        if not email_addresses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email addresses are required"
            )
        
        success = await google_drive_service.share_folder(user_id, folder_id, email_addresses, role)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to share folder with all users"
            )
        
        return {
            "success": True,
            "message": f"Folder shared with {len(email_addresses)} users"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error sharing folder: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to share folder"
        )

@router.post("/drive/class-folder")
async def create_class_folder(
    class_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Google Drive folder structure for a class
    
    Creates organized folders for assignments, materials, and submissions
    """
    try:
        user_id = UUID(current_user["user_id"])
        class_name = class_data.get("class_name")
        
        if not class_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Class name is required"
            )
        
        folder_structure = await google_drive_service.create_class_folder(user_id, class_name)
        
        if not folder_structure:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create class folder structure"
            )
        
        return {
            "success": True,
            "folder_structure": folder_structure,
            "message": f"Class folder structure created for {class_name}"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating class folder: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create class folder"
        )

@router.post("/drive/assignment-folder")
async def create_assignment_folder(
    assignment_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Google Drive folder for an assignment
    
    Creates a folder within the class assignments directory
    """
    try:
        user_id = UUID(current_user["user_id"])
        assignment_name = assignment_data.get("assignment_name")
        class_folder_id = assignment_data.get("class_folder_id")
        
        if not assignment_name or not class_folder_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignment name and class folder ID are required"
            )
        
        assignment_folder = await google_drive_service.create_assignment_folder(
            user_id, assignment_name, class_folder_id
        )
        
        if not assignment_folder:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create assignment folder"
            )
        
        return {
            "success": True,
            "assignment_folder": assignment_folder,
            "message": f"Assignment folder created for {assignment_name}"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating assignment folder: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create assignment folder"
        )

@router.get("/drive/files/{file_id}")
async def get_file_info(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about a Google Drive file
    
    Returns file metadata and links
    """
    try:
        user_id = UUID(current_user["user_id"])
        file_info = await google_drive_service.get_file_info(user_id, file_id)
        
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )
        
        return {
            "success": True,
            "file": file_info
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error getting file info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file information"
        )

@router.delete("/drive/files/{file_id}")
async def delete_drive_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a Google Drive file
    
    Permanently deletes the specified file
    """
    try:
        user_id = UUID(current_user["user_id"])
        success = await google_drive_service.delete_file(user_id, file_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete file"
            )
        
        return {
            "success": True,
            "message": "File deleted successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error deleting file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )

@router.get("/drive/files/{file_id}/share-link")
async def get_shared_drive_link(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a shareable link for a Google Drive file
    
    Makes the file publicly viewable and returns the link
    """
    try:
        user_id = UUID(current_user["user_id"])
        share_link = await google_drive_service.get_shared_drive_link(user_id, file_id)
        
        if not share_link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create shareable link"
            )
        
        return {
            "success": True,
            "share_link": share_link,
            "message": "Shareable link created successfully"
        }
        
    except ValueError as e:
        logger.error(f"❌ Invalid user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    except Exception as e:
        logger.error(f"❌ Error creating shareable link: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create shareable link"
        )

@router.get("/health")
async def google_integration_health():
    """
    Check Google integration service health
    
    Returns service status and configuration
    """
    try:
        # Check if service is properly configured
        has_client_id = bool(google_integration_service.client_id)
        has_client_secret = bool(google_integration_service.client_secret)
        has_redirect_uri = bool(google_integration_service.redirect_uri)
        
        is_configured = has_client_id and has_client_secret and has_redirect_uri
        
        return {
            "service": "Google Integration",
            "status": "healthy" if google_integration_service._connection_healthy else "unhealthy",
            "configured": is_configured,
            "scopes": google_integration_service.scopes,
            "redirect_uri": google_integration_service.redirect_uri if has_redirect_uri else None,
            "calendar_service": "healthy" if google_calendar_service._connection_healthy else "unhealthy",
            "drive_service": "healthy" if google_drive_service._connection_healthy else "unhealthy"
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking service health: {e}")
        return {
            "service": "Google Integration",
            "status": "unhealthy",
            "error": str(e)
        }