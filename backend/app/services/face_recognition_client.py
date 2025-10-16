"""
Face Recognition Microservice Client
HTTP client for communicating with the face recognition microservice
"""

import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import httpx
from pydantic import BaseModel

from ..settings import settings
from ..config.logging import get_logger, log_business_event, log_error_with_context

logger = get_logger(__name__)

class CircuitBreakerState:
    """Circuit breaker states"""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """
    Circuit breaker implementation for service resilience
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED
    
    def can_execute(self) -> bool:
        """Check if the circuit breaker allows execution"""
        if self.state == CircuitBreakerState.CLOSED:
            return True
        
        if self.state == CircuitBreakerState.OPEN:
            if self.last_failure_time and \
               datetime.now() - self.last_failure_time > timedelta(seconds=self.recovery_timeout):
                self.state = CircuitBreakerState.HALF_OPEN
                return True
            return False
        
        # HALF_OPEN state
        return True
    
    def record_success(self):
        """Record a successful execution"""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED
    
    def record_failure(self):
        """Record a failed execution"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN

class FaceRecognitionResponse(BaseModel):
    """Response from face recognition service"""
    success: bool
    message: str
    faces_detected: int = 0
    faces_recognized: int = 0
    faces_unrecognized: int = 0
    processing_time: float = 0.0
    recognized_students: List[Dict[str, Any]] = []
    unrecognized_faces: List[Dict[str, Any]] = []
    all_face_locations: List[List[int]] = []
    best_match: Optional[Dict[str, Any]] = None
    student_id: Optional[str] = None
    similarity_score: Optional[float] = None

class FaceRegistrationResponse(BaseModel):
    """Response from face registration"""
    success: bool
    message: str
    user_id: str
    encoding_stored: bool = False
    subject_ids: List[str] = []

class FaceRecognitionClient:
    """
    HTTP client for face recognition microservice with circuit breaker pattern
    """
    
    def __init__(self):
        """Initialize the face recognition client"""
        self.base_url = getattr(settings, 'FACE_RECOGNITION_SERVICE_URL', 'http://face-recognition-service:8001')
        self.timeout = getattr(settings, 'FACE_RECOGNITION_TIMEOUT', 30.0)
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=(httpx.RequestError, httpx.HTTPStatusError)
        )
        self.fallback_enabled = True
        
        logger.info(f"Face Recognition Client initialized with base URL: {self.base_url}")
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Make HTTP request with circuit breaker protection
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request parameters
            
        Returns:
            Response data or None if failed
        """
        if not self.circuit_breaker.can_execute():
            logger.warning(f"Circuit breaker is OPEN, skipping request to {endpoint}")
            return None
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = f"{self.base_url}{endpoint}"
                
                logger.info(f"Making {method} request to {url}")
                
                response = await client.request(method, url, **kwargs)
                response.raise_for_status()
                
                result = response.json()
                self.circuit_breaker.record_success()
                
                logger.info(f"Request to {endpoint} successful")
                return result
                
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"Request to {endpoint} failed: {e}")
            self.circuit_breaker.record_failure()
            return None
        except Exception as e:
            logger.error(f"Unexpected error in request to {endpoint}: {e}")
            self.circuit_breaker.record_failure()
            return None
    
    async def health_check(self) -> bool:
        """
        Check if the face recognition service is healthy
        
        Returns:
            True if service is healthy, False otherwise
        """
        try:
            result = await self._make_request("GET", "/health")
            return result is not None and result.get("status") == "healthy"
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def process_image(
        self,
        image_data: bytes,
        subject_id: Optional[str] = None
    ) -> FaceRecognitionResponse:
        """
        Process image for face recognition
        
        Args:
            image_data: Image bytes
            subject_id: Optional subject ID to filter results
            
        Returns:
            Face recognition response
        """
        try:
            # Prepare request data
            files = {"file": ("image.jpg", image_data, "image/jpeg")}
            data = {}
            if subject_id:
                data["subject_id"] = subject_id
            
            # Make request to microservice
            result = await self._make_request(
                "POST",
                "/process-image",
                files=files,
                data=data
            )
            
            if result:
                return FaceRecognitionResponse(**result)
            else:
                # Service unavailable, return graceful degradation
                return await self._fallback_process_image(image_data, subject_id)
                
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return await self._fallback_process_image(image_data, subject_id)
    
    async def register_face(
        self,
        user_id: str,
        image_data: bytes,
        subject_ids: Optional[List[str]] = None
    ) -> FaceRegistrationResponse:
        """
        Register a face for a user
        
        Args:
            user_id: User ID
            image_data: Image bytes
            subject_ids: Optional list of subject IDs
            
        Returns:
            Face registration response
        """
        try:
            # Prepare request data
            files = {"file": ("image.jpg", image_data, "image/jpeg")}
            data = {"user_id": user_id}
            if subject_ids:
                data["subject_ids"] = ",".join(subject_ids)
            
            # Make request to microservice
            result = await self._make_request(
                "POST",
                "/register-face",
                files=files,
                data=data
            )
            
            if result:
                return FaceRegistrationResponse(**result)
            else:
                # Service unavailable, return graceful degradation
                return await self._fallback_register_face(user_id, image_data, subject_ids)
                
        except Exception as e:
            logger.error(f"Error registering face: {e}")
            return await self._fallback_register_face(user_id, image_data, subject_ids)
    
    async def delete_face(self, user_id: str) -> bool:
        """
        Delete a user's face encoding
        
        Args:
            user_id: User ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self._make_request("DELETE", f"/face/{user_id}")
            return result is not None
        except Exception as e:
            logger.error(f"Error deleting face for user {user_id}: {e}")
            return False
    
    async def update_face_subjects(self, user_id: str, subject_ids: List[str]) -> bool:
        """
        Update subject associations for a user's face
        
        Args:
            user_id: User ID
            subject_ids: List of subject IDs
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self._make_request(
                "PUT",
                f"/face/{user_id}/subjects",
                json=subject_ids
            )
            return result is not None
        except Exception as e:
            logger.error(f"Error updating face subjects for user {user_id}: {e}")
            return False
    
    async def get_metrics(self) -> Optional[Dict[str, Any]]:
        """
        Get service metrics
        
        Returns:
            Service metrics or None if unavailable
        """
        try:
            return await self._make_request("GET", "/metrics")
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return None
    
    # Fallback methods for graceful degradation
    
    async def _fallback_process_image(
        self,
        image_data: bytes,
        subject_id: Optional[str] = None
    ) -> FaceRecognitionResponse:
        """
        Fallback processing when microservice is unavailable
        Uses the original face recognition service
        """
        if not self.fallback_enabled:
            return FaceRecognitionResponse(
                success=False,
                message="Face recognition service unavailable and fallback disabled"
            )
        
        try:
            logger.info("Using fallback face recognition processing")
            
            # Import the original face recognition service
            from .face_recognition import get_face_recognition_service
            
            # Use the original service as fallback
            result = get_face_recognition_service().recognize_student(image_data, subject_id)
            
            # Convert to new response format
            return FaceRecognitionResponse(
                success=result.get("success", False),
                message=result.get("message", "Processed with fallback service"),
                faces_detected=result.get("faces_detected", 0),
                faces_recognized=result.get("faces_recognized", 0),
                faces_unrecognized=result.get("faces_unrecognized", 0),
                processing_time=0.0,  # Not tracked in fallback
                recognized_students=result.get("recognized_students", []),
                unrecognized_faces=result.get("unrecognized_faces", []),
                all_face_locations=result.get("all_face_locations", []),
                best_match=result.get("best_match"),
                student_id=result.get("student_id"),
                similarity_score=result.get("similarity_score")
            )
            
        except Exception as e:
            logger.error(f"Fallback processing failed: {e}")
            return FaceRecognitionResponse(
                success=False,
                message=f"Face recognition service unavailable: {str(e)}"
            )
    
    async def _fallback_register_face(
        self,
        user_id: str,
        image_data: bytes,
        subject_ids: Optional[List[str]] = None
    ) -> FaceRegistrationResponse:
        """
        Fallback face registration when microservice is unavailable
        """
        if not self.fallback_enabled:
            return FaceRegistrationResponse(
                success=False,
                message="Face registration service unavailable and fallback disabled",
                user_id=user_id
            )
        
        try:
            logger.info("Using fallback face registration")
            
            # Import the original face recognition service
            from .face_recognition import get_face_recognition_service
            
            # Use the original service as fallback
            result = get_face_recognition_service().process_student_photo(user_id, image_data, subject_ids)
            
            return FaceRegistrationResponse(
                success=result.get("success", False),
                message=result.get("message", "Registered with fallback service"),
                user_id=user_id,
                encoding_stored=result.get("encoding_stored", False),
                subject_ids=subject_ids or []
            )
            
        except Exception as e:
            logger.error(f"Fallback registration failed: {e}")
            return FaceRegistrationResponse(
                success=False,
                message=f"Face registration service unavailable: {str(e)}",
                user_id=user_id
            )
    
    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """
        Get circuit breaker status for monitoring
        
        Returns:
            Circuit breaker status information
        """
        return {
            "state": self.circuit_breaker.state,
            "failure_count": self.circuit_breaker.failure_count,
            "failure_threshold": self.circuit_breaker.failure_threshold,
            "last_failure_time": self.circuit_breaker.last_failure_time.isoformat() if self.circuit_breaker.last_failure_time else None,
            "recovery_timeout": self.circuit_breaker.recovery_timeout
        }

# Global client instance
face_recognition_client = FaceRecognitionClient()