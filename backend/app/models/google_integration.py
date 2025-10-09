from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class GoogleIntegrationBase(BaseModel):
    google_calendar_id: Optional[str] = Field(None, description="Google Calendar ID")
    google_drive_folder_id: Optional[str] = Field(None, description="Google Drive folder ID")
    is_active: bool = Field(default=True, description="Whether the integration is active")

class GoogleIntegrationCreate(GoogleIntegrationBase):
    user_id: UUID = Field(..., description="ID of the user")
    access_token: str = Field(..., description="Google OAuth access token")
    refresh_token: str = Field(..., description="Google OAuth refresh token")
    token_expires_at: datetime = Field(..., description="Token expiration timestamp")

class GoogleIntegrationUpdate(BaseModel):
    google_calendar_id: Optional[str] = Field(None, description="Google Calendar ID")
    google_drive_folder_id: Optional[str] = Field(None, description="Google Drive folder ID")
    access_token: Optional[str] = Field(None, description="Google OAuth access token")
    refresh_token: Optional[str] = Field(None, description="Google OAuth refresh token")
    token_expires_at: Optional[datetime] = Field(None, description="Token expiration timestamp")
    is_active: Optional[bool] = Field(None, description="Whether the integration is active")

class GoogleIntegration(GoogleIntegrationBase):
    integration_id: UUID = Field(..., description="Unique integration identifier")
    user_id: UUID = Field(..., description="ID of the user")
    access_token: str = Field(..., description="Google OAuth access token")
    refresh_token: str = Field(..., description="Google OAuth refresh token")
    token_expires_at: datetime = Field(..., description="Token expiration timestamp")
    created_at: datetime = Field(..., description="Integration creation timestamp")
    updated_at: datetime = Field(..., description="Integration last update timestamp")

    class Config:
        from_attributes = True

class GoogleIntegrationResponse(BaseModel):
    """Public response model that excludes sensitive token information"""
    integration_id: UUID = Field(..., description="Unique integration identifier")
    user_id: UUID = Field(..., description="ID of the user")
    google_calendar_id: Optional[str] = Field(None, description="Google Calendar ID")
    google_drive_folder_id: Optional[str] = Field(None, description="Google Drive folder ID")
    is_active: bool = Field(..., description="Whether the integration is active")
    is_token_valid: bool = Field(..., description="Whether the stored token is still valid")
    created_at: datetime = Field(..., description="Integration creation timestamp")
    updated_at: datetime = Field(..., description="Integration last update timestamp")

class GoogleAuthRequest(BaseModel):
    """Request model for Google OAuth authentication"""
    authorization_code: str = Field(..., description="Google OAuth authorization code")
    redirect_uri: str = Field(..., description="OAuth redirect URI used in the request")

class GoogleAuthResponse(BaseModel):
    """Response model for Google OAuth authentication"""
    success: bool = Field(..., description="Whether authentication was successful")
    message: str = Field(..., description="Success or error message")
    integration: Optional[GoogleIntegrationResponse] = Field(None, description="Integration details if successful")

class GoogleCalendarEvent(BaseModel):
    """Model for creating Google Calendar events"""
    title: str = Field(..., description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    start_time: datetime = Field(..., description="Event start time")
    end_time: datetime = Field(..., description="Event end time")
    attendees: Optional[List[str]] = Field(default=[], description="List of attendee email addresses")
    meet_link: bool = Field(default=True, description="Whether to create a Google Meet link")

class GoogleDriveFolder(BaseModel):
    """Model for creating Google Drive folders"""
    name: str = Field(..., description="Folder name")
    parent_folder_id: Optional[str] = Field(None, description="Parent folder ID")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Folder name cannot be empty')
        return v.strip()

class GoogleDriveFile(BaseModel):
    """Model for Google Drive file information"""
    file_id: str = Field(..., description="Google Drive file ID")
    name: str = Field(..., description="File name")
    web_view_link: str = Field(..., description="Web view link for the file")
    download_link: Optional[str] = Field(None, description="Download link for the file")
    mime_type: str = Field(..., description="MIME type of the file")
    created_time: datetime = Field(..., description="File creation time")
    modified_time: datetime = Field(..., description="File last modification time")