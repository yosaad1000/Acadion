"""
Data models for Face Recognition Microservice
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

class BoundingBox(BaseModel):
    """Face bounding box coordinates"""
    top: int
    right: int
    bottom: int
    left: int

class FaceEmbedding(BaseModel):
    """Face embedding data"""
    user_id: Optional[str] = None
    embedding_vector: List[float]
    bounding_box: BoundingBox
    confidence_score: Optional[float] = None

class DetectedFace(BaseModel):
    """Individual detected face information"""
    face_index: int
    bounding_box: BoundingBox
    recognized: bool = False
    user_id: Optional[str] = None
    similarity_score: Optional[float] = None
    confidence_score: Optional[float] = None

class RecognizedStudent(BaseModel):
    """Recognized student information"""
    face_index: int
    user_id: str
    similarity_score: float
    bounding_box: BoundingBox
    recognized: bool = True

class ProcessingResult(BaseModel):
    """Face processing result"""
    faces_detected: int
    faces_recognized: int
    faces_unrecognized: int
    embeddings: List[FaceEmbedding]
    confidence_scores: List[float]
    processing_time: float

class ProcessImageResponse(BaseModel):
    """Response for image processing endpoint"""
    success: bool
    message: str
    faces_detected: int
    faces_recognized: int
    faces_unrecognized: int
    processing_time: float
    recognized_students: List[RecognizedStudent] = []
    unrecognized_faces: List[DetectedFace] = []
    all_face_locations: List[List[int]] = []
    best_match: Optional[RecognizedStudent] = None
    # Additional fields for backward compatibility
    student_id: Optional[str] = None
    similarity_score: Optional[float] = None

class RegisterFaceResponse(BaseModel):
    """Response for face registration endpoint"""
    success: bool
    message: str
    user_id: str
    encoding_stored: bool = False
    subject_ids: List[str] = []

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    gpu_available: bool = False
    pinecone_connected: bool = False
    uptime_seconds: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ServiceMetrics(BaseModel):
    """Service metrics for monitoring"""
    requests_processed: int = 0
    average_processing_time: float = 0.0
    queue_length: int = 0
    gpu_utilization: float = 0.0
    memory_usage: float = 0.0
    error_rate: float = 0.0
    uptime_seconds: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class FaceRegistrationRequest(BaseModel):
    """Face registration request"""
    user_id: str
    subject_ids: Optional[List[str]] = None

class FaceUpdateRequest(BaseModel):
    """Face update request"""
    subject_ids: List[str]