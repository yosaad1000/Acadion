from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class DepartmentCreate(BaseModel):
    dept_id: str
    name: str
    hod: Optional[str] = None

class DepartmentResponse(BaseModel):
    dept_id: str
    name: str
    hod: Optional[str]

@router.get("/", response_model=List[DepartmentResponse])
async def get_departments():
    """Get all departments"""
    return []

@router.post("/", response_model=DepartmentResponse)
async def create_department(department: DepartmentCreate):
    """Create a new department"""
    return DepartmentResponse(**department.dict())