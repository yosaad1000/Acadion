from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserType(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: Optional[str] = None  # Optional for OAuth users
    user_type: UserType
    auth_provider: AuthProvider = AuthProvider.EMAIL

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    code: str
    user_type: UserType

class UserResponse(BaseModel):
    user_id: str
    auth_user_id: str  # Added for database foreign key references
    email: str
    name: str
    user_type: UserType
    auth_provider: AuthProvider
    is_face_registered: bool
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_face_registered: Optional[bool] = None