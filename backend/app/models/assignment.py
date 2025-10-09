from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum

class AssignmentType(str, Enum):
    HOMEWORK = "homework"
    TEST = "test"
    PROJECT = "project"

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"
    OVERDUE = "overdue"

class AssignmentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Assignment title")
    description: Optional[str] = Field(None, description="Assignment description")
    due_date: Optional[datetime] = Field(None, description="Assignment due date")
    assignment_type: AssignmentType = Field(..., description="Type of assignment")
    google_drive_link: Optional[str] = Field(None, description="Google Drive link for assignment materials")

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Assignment title cannot be empty')
        return v.strip()

    @validator('google_drive_link')
    def validate_google_drive_link(cls, v):
        if v and not v.startswith(('https://drive.google.com/', 'https://docs.google.com/')):
            raise ValueError('Google Drive link must be a valid Google Drive or Docs URL')
        return v

class AssignmentCreate(AssignmentBase):
    session_id: UUID = Field(..., description="ID of the session this assignment belongs to")

class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Assignment title")
    description: Optional[str] = Field(None, description="Assignment description")
    due_date: Optional[datetime] = Field(None, description="Assignment due date")
    assignment_type: Optional[AssignmentType] = Field(None, description="Type of assignment")
    google_drive_link: Optional[str] = Field(None, description="Google Drive link for assignment materials")

    @validator('title')
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Assignment title cannot be empty')
        return v.strip() if v else v

    @validator('google_drive_link')
    def validate_google_drive_link(cls, v):
        if v and not v.startswith(('https://drive.google.com/', 'https://docs.google.com/')):
            raise ValueError('Google Drive link must be a valid Google Drive or Docs URL')
        return v

class Assignment(AssignmentBase):
    assignment_id: UUID = Field(..., description="Unique assignment identifier")
    session_id: UUID = Field(..., description="ID of the session this assignment belongs to")
    created_by: Optional[UUID] = Field(None, description="ID of the user who created the assignment")
    created_at: datetime = Field(..., description="Assignment creation timestamp")
    updated_at: datetime = Field(..., description="Assignment last update timestamp")
    
    # Related data that may be included
    session_name: Optional[str] = Field(None, description="Name of the session (when joined)")
    subject_name: Optional[str] = Field(None, description="Name of the subject (when joined)")

    class Config:
        from_attributes = True

class AssignmentResponse(Assignment):
    """Response model with additional computed fields"""
    is_overdue: bool = Field(default=False, description="Whether the assignment is overdue")
    submission_count: int = Field(default=0, description="Number of submissions received")
    pending_count: int = Field(default=0, description="Number of pending submissions")

class AssignmentSubmissionBase(BaseModel):
    submission_status: SubmissionStatus = Field(default=SubmissionStatus.PENDING, description="Submission status")
    submission_date: Optional[datetime] = Field(None, description="Date when assignment was submitted")
    google_drive_link: Optional[str] = Field(None, description="Google Drive link for submission")
    grade: Optional[str] = Field(None, max_length=10, description="Grade assigned to the submission")
    feedback: Optional[str] = Field(None, description="Teacher feedback on the submission")

    @validator('google_drive_link')
    def validate_google_drive_link(cls, v):
        if v and not v.startswith(('https://drive.google.com/', 'https://docs.google.com/')):
            raise ValueError('Google Drive link must be a valid Google Drive or Docs URL')
        return v

class AssignmentSubmissionCreate(AssignmentSubmissionBase):
    assignment_id: UUID = Field(..., description="ID of the assignment")
    student_id: UUID = Field(..., description="ID of the student")

class AssignmentSubmissionUpdate(BaseModel):
    submission_status: Optional[SubmissionStatus] = Field(None, description="Submission status")
    submission_date: Optional[datetime] = Field(None, description="Date when assignment was submitted")
    google_drive_link: Optional[str] = Field(None, description="Google Drive link for submission")
    grade: Optional[str] = Field(None, max_length=10, description="Grade assigned to the submission")
    feedback: Optional[str] = Field(None, description="Teacher feedback on the submission")

    @validator('google_drive_link')
    def validate_google_drive_link(cls, v):
        if v and not v.startswith(('https://drive.google.com/', 'https://docs.google.com/')):
            raise ValueError('Google Drive link must be a valid Google Drive or Docs URL')
        return v

class AssignmentSubmission(AssignmentSubmissionBase):
    submission_id: UUID = Field(..., description="Unique submission identifier")
    assignment_id: UUID = Field(..., description="ID of the assignment")
    student_id: UUID = Field(..., description="ID of the student")
    created_at: datetime = Field(..., description="Submission creation timestamp")
    updated_at: datetime = Field(..., description="Submission last update timestamp")
    
    # Related data that may be included
    student_name: Optional[str] = Field(None, description="Name of the student (when joined)")
    assignment_title: Optional[str] = Field(None, description="Title of the assignment (when joined)")

    class Config:
        from_attributes = True

class AssignmentListResponse(BaseModel):
    assignments: List[AssignmentResponse]
    total_count: int
    page: int = 1
    page_size: int = 50

class AssignmentSubmissionListResponse(BaseModel):
    submissions: List[AssignmentSubmission]
    total_count: int
    page: int = 1
    page_size: int = 50

# Forward reference resolution
Assignment.model_rebuild()
AssignmentSubmission.model_rebuild()