from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class GradeCreate(BaseModel):
    student_id: str
    subject_id: str
    exam_type: str
    marks_obtained: float
    max_marks: float
    comments: str = ""

class GradeResponse(BaseModel):
    id: str
    student_id: str
    subject_id: str
    exam_type: str
    marks_obtained: float
    max_marks: float
    percentage: float
    comments: str

@router.get("/", response_model=List[GradeResponse])
async def get_grades():
    """Get all grades"""
    return []

@router.post("/", response_model=GradeResponse)
async def create_grade(grade: GradeCreate):
    """Create a new grade"""
    percentage = (grade.marks_obtained / grade.max_marks) * 100
    return GradeResponse(
        id="grade_123",
        percentage=percentage,
        **grade.dict()
    )