from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class SessionBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255, description="Session name (auto-generated if not provided)")
    description: Optional[str] = Field(None, description="Session description")
    session_date: Optional[datetime] = Field(None, description="Scheduled date and time for the session (defaults to current time)")
    notes: Optional[str] = Field(None, description="Session notes")

    @validator('name')
    def validate_name(cls, v):
        # Allow None for auto-generation, but validate non-empty if provided
        if v is not None and (not v or not v.strip()):
            return None  # Convert empty strings to None for auto-generation
        return v.strip() if v else v

class SessionCreate(SessionBase):
    subject_id: UUID = Field(..., description="ID of the subject this session belongs to")

class SessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    session_date: Optional[datetime] = Field(None, description="Scheduled date and time for the session")
    notes: Optional[str] = Field(None, description="Session notes")
    attendance_taken: Optional[bool] = Field(None, description="Whether attendance has been taken for this session")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Session name cannot be empty')
        return v.strip() if v else v

class Session(SessionBase):
    session_id: UUID = Field(..., description="Unique session identifier")
    subject_id: UUID = Field(..., description="ID of the subject this session belongs to")
    attendance_taken: bool = Field(default=False, description="Whether attendance has been taken")
    created_by: Optional[UUID] = Field(None, description="ID of the user who created the session")
    created_at: datetime = Field(..., description="Session creation timestamp")
    updated_at: datetime = Field(..., description="Session last update timestamp")
    
    # Related data that may be included
    subject_name: Optional[str] = Field(None, description="Name of the subject (when joined)")
    teacher_name: Optional[str] = Field(None, description="Name of the teacher (when joined)")

    class Config:
        from_attributes = True

class SessionResponse(Session):
    """Response model with additional computed fields"""
    assignment_count: int = Field(default=0, description="Number of assignments in this session")
    has_overdue_assignments: bool = Field(default=False, description="Whether session has overdue assignments")

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total_count: int
    page: int = 1
    page_size: int = 50