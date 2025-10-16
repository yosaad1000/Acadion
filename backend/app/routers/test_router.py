from fastapi import APIRouter
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/ping")
async def ping():
    """Simple test endpoint without any authentication"""
    logger.info("🏓 Ping endpoint called - no auth required")
    return {"message": "pong", "status": "success"}

@router.post("/echo")
async def echo(data: dict):
    """Echo endpoint for testing POST requests"""
    logger.info("📢 Echo endpoint called - no auth required")
    return {"echo": data, "status": "success"}