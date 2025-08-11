from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter()

class FeeRecord(BaseModel):
    student_id: str
    amount: float
    fee_type: str
    due_date: datetime
    status: str = "pending"

class FeeResponse(BaseModel):
    id: str
    student_id: str
    amount: float
    fee_type: str
    due_date: datetime
    status: str
    paid_date: datetime = None

@router.get("/", response_model=List[FeeResponse])
async def get_fees():
    """Get all fee records"""
    return []

@router.post("/", response_model=FeeResponse)
async def create_fee_record(fee: FeeRecord):
    """Create a new fee record"""
    return FeeResponse(
        id="fee_123",
        paid_date=None,
        **fee.dict()
    )