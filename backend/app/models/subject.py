from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class SubjectResponse(BaseModel):
    subject_id: str
    subject_code: str
    name: str
    description: Optional[str]
    teacher_id: str
    teacher_name: str
    invite_code: str
    is_active: bool
    student_count: int
    created_at: datetime

class SubjectJoin(BaseModel):
    invite_code: str

class SubjectEnrollmentResponse(BaseModel):
    subject_id: str
    subject_name: str
    subject_code: str
    teacher_name: str
    enrolled_at: datetime
    is_active: bool