"""
Cached face recognition service with multi-level caching
Optimizes face recognition operations with intelligent caching strategies
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import json
import hashlib
import asyncio
from datetime import datetime, timedelta

from app.services.cache_manager import get_cache_manager, cached
from app.services.connection_pool import get_connection_manager
from app.services.face_recognition_client import FaceRecognitionClient
from app.settings import settings

logger = logging.getLogger(__name__)

class CachedFaceService:
    """
    Face recognition service with intelligent caching
    """
    
    def __init__(self):
        self.cache_manager = None
        self.connection_manager = None
        self.face_client = None
        self._initialized = False
        
        # Cache configuration for different data types
        self.cache_config = {
            "face_embeddings": {"ttl": 3600, "local_only": False},  # 1 hour
            "face_matches": {"ttl": 300, "local_only": True},       # 5 minutes, local only
            "user_faces": {"ttl": 1800, "local_only": False},      # 30 minutes
            "processing_results": {"ttl": 600, "local_only": True}  # 10 minutes, local only
        }
    
    async def initialize(self):
        """Initialize the cached face service"""
        try:
            self.cache_manager = get_cache_manager()
            self.connection_manager = get_connection_manager()
            self.face_client = FaceRecognitionClient()
            
            self._initialized = True
            logger.info("✅ Cached face service initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize cached face service: {e}")
            raise
    
    def _generate_image_hash(self, image_data: bytes) -> str:
        """Generate hash for image data for caching"""
        return hashlib.sha256(image_data).hexdigest()[:16]
    
    async def process_attendance_image(
        self, 
        image_data: bytes, 
        subject_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """
        Process attendance image with caching
        
        Args:
            image_data: Raw image bytes
            subject_id: Subject ID for context
            session_id: Session ID for tracking
            
        Returns:
            Processing results with matched students
        """
        try:
            # Generate cache key based on image content and context
            image_hash = self._generate_image_hash(image_data)
            cache_key = f"attendance_processing:{subject_id}:{image_hash}"
            
            # Check cache first
            cached_result = await self.cache_manager.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for attendance processing: {cache_key}")
                return cached_result
            
            logger.info(f"Processing attendance image for subject {subject_id}")
            
            # Process image with face recognition service
            processing_result = await self._process_image_with_fallback(image_data)
            
            if not processing_result.get("success"):
                return processing_result
            
            # Get enrolled students for the subject (cached)
            enrolled_students = await self._get_enrolled_students_cached(subject_id)
            
            # Match detected faces with enrolled students
            matched_students = await self._match_faces_with_students(
                processing_result.get("faces", []),
                enrolled_students
            )
            
            # Prepare final result
            result = {
                "success": True,
                "session_id": session_id,
                "subject_id": subject_id,
                "faces_detected": len(processing_result.get("faces", [])),
                "students_matched": len(matched_students),
                "matched_students": matched_students,
                "processing_time": processing_result.get("processing_time", 0),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache the result
            config = self.cache_config["processing_results"]
            await self.cache_manager.set(
                cache_key, 
                result, 
                ttl=config["ttl"], 
                local_only=config["local_only"]
            )
            
            logger.info(f"Attendance processing completed: {result['students_matched']} students matched")
            return result
            
        except Exception as e:
            logger.error(f"Error processing attendance image: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id,
                "subject_id": subject_id
            }
    
    async def _process_image_with_fallback(self, image_data: bytes) -> Dict[str, Any]:
        """Process image with face recognition service and fallback"""
        try:
            # Try face recognition service first
            result = await self.face_client.process_image(image_data)
            
            if result.get("success"):
                return result
            
            # Fallback to local processing if enabled
            if settings.FACE_RECOGNITION_FALLBACK_ENABLED:
                logger.warning("Face recognition service failed, attempting fallback")
                return await self._process_image_fallback(image_data)
            
            return {"success": False, "error": "Face recognition service unavailable"}
            
        except Exception as e:
            logger.error(f"Error in face processing: {e}")
            
            # Try fallback if enabled
            if settings.FACE_RECOGNITION_FALLBACK_ENABLED:
                return await self._process_image_fallback(image_data)
            
            return {"success": False, "error": str(e)}
    
    async def _process_image_fallback(self, image_data: bytes) -> Dict[str, Any]:
        """Fallback image processing (placeholder implementation)"""
        try:
            # This would implement local face detection/recognition
            # For now, return a placeholder result
            logger.warning("Using fallback face processing")
            
            return {
                "success": True,
                "faces": [],  # Placeholder - no faces detected in fallback
                "processing_time": 0.1,
                "method": "fallback"
            }
            
        except Exception as e:
            logger.error(f"Fallback processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    @cached(ttl=600, key_prefix="enrolled_students")
    async def _get_enrolled_students_cached(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get enrolled students with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            # Get enrollments
            response = await pool.get(
                "/subject_enrollments",
                params={
                    "subject_id": f"eq.{subject_id}",
                    "is_active": "eq.true"
                }
            )
            
            if response.status_code != 200:
                return []
            
            enrollments = response.json()
            students = []
            
            # Get student details for each enrollment
            for enrollment in enrollments:
                student_id = enrollment.get("student_id")
                if student_id:
                    student_data = await self._get_student_with_face_data(student_id)
                    if student_data:
                        students.append(student_data)
            
            return students
            
        except Exception as e:
            logger.error(f"Error getting enrolled students: {e}")
            return []
    
    @cached(ttl=1800, key_prefix="student_face_data")
    async def _get_student_with_face_data(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student data with face embedding (cached)"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            # Get user data
            response = await pool.get(
                "/users",
                params={"user_id": f"eq.{student_id}"}
            )
            
            if response.status_code != 200:
                return None
            
            users = response.json()
            if not users:
                return None
            
            user = users[0]
            
            # Get face embedding if available
            face_embedding = await self._get_face_embedding_cached(student_id)
            user["face_embedding"] = face_embedding
            
            return user
            
        except Exception as e:
            logger.error(f"Error getting student face data: {e}")
            return None
    
    @cached(ttl=3600, key_prefix="face_embedding")
    async def _get_face_embedding_cached(self, user_id: str) -> Optional[List[float]]:
        """Get face embedding with long-term caching"""
        try:
            # This would query your face embedding storage (Pinecone, database, etc.)
            # For now, return None as placeholder
            return None
            
        except Exception as e:
            logger.error(f"Error getting face embedding: {e}")
            return None
    
    async def _match_faces_with_students(
        self, 
        detected_faces: List[Dict[str, Any]], 
        enrolled_students: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Match detected faces with enrolled students"""
        try:
            matched_students = []
            
            for face in detected_faces:
                face_embedding = face.get("embedding")
                if not face_embedding:
                    continue
                
                # Find best match among enrolled students
                best_match = await self._find_best_face_match(face_embedding, enrolled_students)
                
                if best_match:
                    matched_students.append({
                        "user_id": best_match["user_id"],
                        "name": best_match.get("name", "Unknown"),
                        "email": best_match.get("email", ""),
                        "confidence": best_match.get("confidence", 0.0),
                        "bounding_box": face.get("bounding_box"),
                        "face_quality": face.get("quality", 0.0)
                    })
            
            return matched_students
            
        except Exception as e:
            logger.error(f"Error matching faces with students: {e}")
            return []
    
    async def _find_best_face_match(
        self, 
        face_embedding: List[float], 
        enrolled_students: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Find best matching student for a face embedding"""
        try:
            best_match = None
            best_similarity = 0.0
            
            for student in enrolled_students:
                student_embedding = student.get("face_embedding")
                if not student_embedding:
                    continue
                
                # Calculate similarity (placeholder - implement actual similarity calculation)
                similarity = await self._calculate_face_similarity(face_embedding, student_embedding)
                
                if similarity > settings.FACE_THRESHOLD and similarity > best_similarity:
                    best_similarity = similarity
                    best_match = {
                        **student,
                        "confidence": similarity
                    }
            
            return best_match
            
        except Exception as e:
            logger.error(f"Error finding best face match: {e}")
            return None
    
    async def _calculate_face_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """Calculate similarity between two face embeddings"""
        try:
            # Placeholder implementation - use actual similarity calculation
            # This would typically use cosine similarity or euclidean distance
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating face similarity: {e}")
            return 0.0
    
    async def register_user_face(
        self, 
        user_id: str, 
        image_data: bytes
    ) -> Dict[str, Any]:
        """Register a user's face with caching invalidation"""
        try:
            logger.info(f"Registering face for user {user_id}")
            
            # Process image to extract face embedding
            result = await self.face_client.register_face(user_id, image_data)
            
            if result.get("success"):
                # Invalidate related cache entries
                await self._invalidate_user_face_cache(user_id)
                
                logger.info(f"Face registered successfully for user {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error registering user face: {e}")
            return {"success": False, "error": str(e)}
    
    async def _invalidate_user_face_cache(self, user_id: str):
        """Invalidate all face-related cache entries for a user"""
        try:
            if self.cache_manager:
                # Invalidate specific user face data
                await self.cache_manager.delete(f"face_embedding:{user_id}")
                await self.cache_manager.delete(f"student_face_data:{user_id}")
                
                # Invalidate broader patterns that might include this user
                await self.cache_manager.invalidate_pattern(f"*{user_id}*")
                
                logger.info(f"Invalidated face cache for user {user_id}")
                
        except Exception as e:
            logger.error(f"Error invalidating user face cache: {e}")
    
    async def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        try:
            stats = {
                "service": "cached_face_service",
                "initialized": self._initialized,
                "cache_config": self.cache_config
            }
            
            if self.cache_manager:
                cache_stats = await self.cache_manager.get_stats()
                stats["cache_performance"] = {
                    "hit_rate": cache_stats.get("overall_hit_rate", 0),
                    "total_requests": cache_stats.get("total_requests", 0),
                    "redis_connected": cache_stats.get("redis_connected", False)
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting service stats: {e}")
            return {"error": str(e)}

# Global service instance
_cached_face_service: Optional[CachedFaceService] = None

async def get_cached_face_service() -> CachedFaceService:
    """Get the global cached face service instance"""
    global _cached_face_service
    
    if _cached_face_service is None:
        _cached_face_service = CachedFaceService()
        await _cached_face_service.initialize()
    
    return _cached_face_service