from datetime import datetime
from pydantic import BaseModel
from typing import Optional

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