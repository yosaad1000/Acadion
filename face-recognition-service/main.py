"""
Face Recognition Microservice
A dedicated FastAPI service for face recognition processing with GPU optimization
"""

import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn

from app.services.face_processor import FaceProcessor
from app.models.face_models import (
    ProcessImageResponse,
    RegisterFaceResponse,
    HealthResponse,
    FaceEmbedding,
    ProcessingResult
)
from app.config.logging import setup_logging, get_logger, log_face_processing_event
from app.config.xray import configure_xray, add_xray_middleware

# Initialize structured logging and X-Ray tracing
setup_logging()
configure_xray()
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition Microservice",
    description="AI-powered face recognition service for Acadion platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add X-Ray middleware for distributed tracing
add_xray_middleware(app)

# Configure CORS for internal service communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize face processor
face_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global face_processor
    try:
        face_processor = FaceProcessor()
        logger.info("✅ Face Recognition Microservice started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize face processor: {e}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for load balancer and monitoring"""
    try:
        # Check if face processor is initialized and working
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        # Test basic functionality
        status = await face_processor.get_service_status()
        
        return HealthResponse(
            status="healthy",
            service="face-recognition",
            version="1.0.0",
            gpu_available=status.get("gpu_available", False),
            pinecone_connected=status.get("pinecone_connected", False),
            uptime_seconds=status.get("uptime_seconds", 0)
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.post("/process-image", response_model=ProcessImageResponse)
async def process_image(
    file: UploadFile = File(...),
    subject_id: Optional[str] = Form(None)
):
    """
    Process an image to detect and recognize faces
    
    Args:
        file: Image file to process
        subject_id: Optional subject ID to filter recognition results
    
    Returns:
        ProcessImageResponse with detected faces and recognition results
    """
    try:
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Process the image
        result = await face_processor.process_image(image_data, subject_id)
        
        return ProcessImageResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@app.post("/register-face", response_model=RegisterFaceResponse)
async def register_face(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    subject_ids: Optional[str] = Form(None)  # Comma-separated subject IDs
):
    """
    Register a face for a user
    
    Args:
        user_id: User ID to register the face for
        file: Image file containing the face
        subject_ids: Optional comma-separated list of subject IDs
    
    Returns:
        RegisterFaceResponse with registration status
    """
    try:
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Parse subject IDs
        subject_list = []
        if subject_ids:
            subject_list = [s.strip() for s in subject_ids.split(',') if s.strip()]
        
        # Register the face
        result = await face_processor.register_face(user_id, image_data, subject_list)
        
        return RegisterFaceResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register face: {str(e)}")

@app.delete("/face/{user_id}")
async def delete_face(user_id: str):
    """
    Delete a user's face encoding
    
    Args:
        user_id: User ID whose face encoding to delete
    
    Returns:
        Success message
    """
    try:
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        success = await face_processor.delete_face(user_id)
        
        if success:
            return {"message": f"Face encoding deleted for user {user_id}"}
        else:
            raise HTTPException(status_code=404, detail="Face encoding not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting face: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete face: {str(e)}")

@app.put("/face/{user_id}/subjects")
async def update_face_subjects(
    user_id: str,
    subject_ids: List[str]
):
    """
    Update subject associations for a user's face encoding
    
    Args:
        user_id: User ID whose face encoding to update
        subject_ids: List of subject IDs to associate with the face
    
    Returns:
        Success message
    """
    try:
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        success = await face_processor.update_face_subjects(user_id, subject_ids)
        
        if success:
            return {"message": f"Face subjects updated for user {user_id}"}
        else:
            raise HTTPException(status_code=404, detail="Face encoding not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating face subjects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update face subjects: {str(e)}")

@app.get("/metrics")
async def get_metrics():
    """
    Get service metrics for monitoring and auto-scaling
    
    Returns:
        Service metrics including processing queue, GPU utilization, etc.
    """
    try:
        if face_processor is None:
            raise HTTPException(status_code=503, detail="Face processor not initialized")
        
        metrics = await face_processor.get_metrics()
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

if __name__ == "__main__":
    # For development only
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )