from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AttendanceBase(BaseModel):
    """Base attendance model"""
    student_id: str
    subject_id: str
    status: str = "present"
    session_id: str = "default"
    session_name: str = "Default Session"
    session_time: Optional[str] = None
    verified_by: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    """Model for creating attendance"""
    pass

class AttendanceUpdate(BaseModel):
    """Model for updating attendance"""
    status: Optional[str] = None
    verified_by: Optional[str] = None
    session_name: Optional[str] = None
    session_time: Optional[str] = None

class AttendanceResponse(AttendanceBase):
    """Model for attendance response"""
    id: str
    date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
#
 Async Attendance Models

class AttendanceJobResponse(BaseModel):
    """Response model for attendance job submission"""
    success: bool
    job_id: Optional[str] = None
    session_id: Optional[str] = None
    subject_id: Optional[str] = None
    status: Optional[str] = None
    estimated_processing_time: Optional[str] = None
    submitted_at: Optional[str] = None
    error: Optional[str] = None

class JobStatusResponse(BaseModel):
    """Response model for job status"""
    job_id: str
    status: str
    progress_percentage: int
    estimated_completion: Optional[str] = None
    created_at: Optional[str] = None
    last_updated: Optional[str] = None
    metadata: Dict[str, Any] = {}
    status_history: List[Dict[str, Any]] = []

class UserJobSummary(BaseModel):
    """Summary model for user job"""
    job_id: str
    job_type: str
    status: str
    progress_percentage: int
    created_at: Optional[str] = None
    last_updated: Optional[str] = None
    session_id: Optional[str] = None
    subject_id: Optional[str] = None

class UserJobsResponse(BaseModel):
    """Response model for user jobs"""
    jobs: List[UserJobSummary]
    total: int
    user_id: str

class JobCancellationResponse(BaseModel):
    """Response model for job cancellation"""
    success: bool
    job_id: str
    status: Optional[str] = None
    cancelled_at: Optional[str] = None
    error: Optional[str] = None

class AsyncProcessingStats(BaseModel):
    """Model for async processing statistics"""
    service: str
    initialized: bool
    job_statistics: Dict[str, Any]
    queue_statistics: Dict[str, Any]
    timestamp: str

class ServiceHealthResponse(BaseModel):
    """Response model for service health check"""
    status: str
    service: str
    initialized: bool
    timestamp: Optional[str] = None
    error: Optional[str] = None