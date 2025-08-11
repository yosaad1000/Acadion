from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class TeacherCreate(BaseModel):
    faculty_id: str
    name: str
    email: str
    department_id: str
    subjects: List[str] = []

class TeacherResponse(BaseModel):
    faculty_id: str
    name: str
    email: str
    department_id: str
    subjects: List[str]

@router.get("/", response_model=List[TeacherResponse])
async def get_teachers():
    """Get all teachers"""
    return []

@router.post("/", response_model=TeacherResponse)
async def create_teacher(teacher: TeacherCreate):
    """Create a new teacher"""
    return TeacherResponse(**teacher.dict())