from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserType(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    user_type: UserType

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    user_type: UserType
    is_face_registered: bool
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_face_registered: Optional[bool] = None