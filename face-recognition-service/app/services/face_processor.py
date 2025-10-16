"""
Face Processor Service
Core face recognition processing logic with GPU optimization
"""

import asyncio
import time
import logging
import numpy as np
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import face_recognition
from PIL import Image
import io
import os
from pinecone import Pinecone

from ..config import settings
from ..models.face_models import (
    ProcessingResult, 
    FaceEmbedding, 
    BoundingBox, 
    DetectedFace, 
    RecognizedStudent,
    ServiceMetrics
)

logger = logging.getLogger(__name__)

class FaceProcessor:
    """
    Core face processing service with GPU optimization and async support
    """
    
    def __init__(self):
        """Initialize the face processor with Pinecone connection"""
        self.start_time = time.time()
        self.metrics = ServiceMetrics()
        self.processing_queue = asyncio.Queue()
        
        try:
            # Initialize Pinecone
            self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            self.index = self.pc.Index(settings.PINECONE_INDEX_NAME)
            self.face_threshold = settings.FACE_THRESHOLD
            
            # Test Pinecone connection
            self.index.describe_index_stats()
            logger.info("✅ Pinecone connection established")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Pinecone: {e}")
            raise
        
        # Check GPU availability
        self.gpu_available = self._check_gpu_availability()
        if self.gpu_available:
            logger.info("✅ GPU acceleration available")
        else:
            logger.warning("⚠️ GPU acceleration not available, using CPU")
    
    def _check_gpu_availability(self) -> bool:
        """Check if GPU acceleration is available"""
        try:
            import cv2
            # Check if OpenCV was built with CUDA support
            return cv2.cuda.getCudaEnabledDeviceCount() > 0
        except:
            return False
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get current service status"""
        uptime = int(time.time() - self.start_time)
        
        try:
            # Test Pinecone connection
            stats = self.index.describe_index_stats()
            pinecone_connected = True
        except:
            pinecone_connected = False
        
        return {
            "gpu_available": self.gpu_available,
            "pinecone_connected": pinecone_connected,
            "uptime_seconds": uptime,
            "queue_length": self.processing_queue.qsize()
        }
    
    async def get_metrics(self) -> ServiceMetrics:
        """Get service metrics for monitoring"""
        self.metrics.uptime_seconds = int(time.time() - self.start_time)
        self.metrics.queue_length = self.processing_queue.qsize()
        self.metrics.last_updated = datetime.utcnow()
        
        # Update GPU utilization if available
        if self.gpu_available:
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                info = pynvml.nvmlDeviceGetUtilizationRates(handle)
                self.metrics.gpu_utilization = info.gpu
            except:
                pass
        
        return self.metrics
    
    def _extract_face_encoding(self, image_data: bytes) -> Optional[Tuple[np.ndarray, List[Tuple[int, int, int, int]]]]:
        """
        Extract face encodings from image bytes
        
        Returns:
            Tuple of (encodings, face_locations) or None if no faces found
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            logger.info(f"🖼️ Image loaded: {image.size} pixels, mode: {image.mode}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL to numpy array
            image_array = np.array(image)
            
            # Find face locations with GPU acceleration if available
            model = "cnn" if self.gpu_available else "hog"
            face_locations = face_recognition.face_locations(image_array, model=model)
            
            logger.info(f"👥 Found {len(face_locations)} face(s) using {model} model")
            
            if not face_locations:
                return None
            
            # Get face encodings
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if not face_encodings:
                return None
            
            return face_encodings, face_locations
            
        except Exception as e:
            logger.error(f"💥 Error extracting face encoding: {e}")
            return None
    
    async def process_image(self, image_data: bytes, subject_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process an image to detect and recognize faces
        
        Args:
            image_data: Image bytes
            subject_id: Optional subject ID to filter results
            
        Returns:
            Processing results dictionary
        """
        start_time = time.time()
        
        try:
            logger.info("🚀 Starting face recognition process...")
            
            # Extract face encodings and locations
            extraction_result = self._extract_face_encoding(image_data)
            
            if extraction_result is None:
                processing_time = time.time() - start_time
                return {
                    "success": False,
                    "message": "No faces detected in the image",
                    "faces_detected": 0,
                    "faces_recognized": 0,
                    "faces_unrecognized": 0,
                    "processing_time": processing_time,
                    "recognized_students": [],
                    "unrecognized_faces": [],
                    "all_face_locations": []
                }
            
            face_encodings, face_locations = extraction_result
            total_faces = len(face_locations)
            
            logger.info(f"🧠 Processing {total_faces} face encodings")
            
            recognized_students = {}  # Track unique students only
            face_results = []
            best_match_overall = None
            best_score_overall = 0
            
            # Process each face
            for i, (encoding, location) in enumerate(zip(face_encodings, face_locations)):
                logger.info(f"🔍 Processing face {i+1}/{total_faces}")
                
                # Find matching student
                match_result = await self._find_matching_student(encoding, subject_id)
                
                if match_result:
                    user_id, similarity_score = match_result
                    
                    # Convert face location to bounding box
                    top, right, bottom, left = location
                    bounding_box = BoundingBox(top=top, right=right, bottom=bottom, left=left)
                    
                    face_data = RecognizedStudent(
                        face_index=i + 1,
                        user_id=user_id,
                        similarity_score=similarity_score,
                        bounding_box=bounding_box,
                        recognized=True
                    )
                    
                    # Only keep the best match per student (prevent duplicates)
                    if user_id not in recognized_students or similarity_score > recognized_students[user_id].similarity_score:
                        recognized_students[user_id] = face_data
                        
                        # Track the overall best match
                        if similarity_score > best_score_overall:
                            best_match_overall = face_data
                            best_score_overall = similarity_score
                        
                        logger.info(f"✅ Face {i+1} recognized as user {user_id} (score: {similarity_score:.4f})")
                    else:
                        logger.info(f"🔄 Face {i+1} recognized as user {user_id} (score: {similarity_score:.4f}) - DUPLICATE")
                else:
                    logger.info(f"❌ Face {i+1} not recognized")
            
            # Calculate results
            unique_students_count = len(recognized_students)
            unrecognized_faces_count = total_faces - unique_students_count
            
            # Create unrecognized faces list
            unrecognized_faces = []
            recognized_face_indices = {student.face_index for student in recognized_students.values()}
            
            for i, location in enumerate(face_locations):
                face_index = i + 1
                if face_index not in recognized_face_indices:
                    top, right, bottom, left = location
                    bounding_box = BoundingBox(top=top, right=right, bottom=bottom, left=left)
                    unrecognized_faces.append(DetectedFace(
                        face_index=face_index,
                        bounding_box=bounding_box,
                        recognized=False
                    ))
            
            processing_time = time.time() - start_time
            
            # Update metrics
            self.metrics.requests_processed += 1
            self.metrics.average_processing_time = (
                (self.metrics.average_processing_time * (self.metrics.requests_processed - 1) + processing_time) 
                / self.metrics.requests_processed
            )
            
            logger.info(f"📊 Processing complete: {total_faces} faces, {unique_students_count} recognized, {unrecognized_faces_count} unrecognized")
            
            # Build response
            result = {
                "success": True,
                "message": f"Processed {total_faces} faces, recognized {unique_students_count} students",
                "faces_detected": total_faces,
                "faces_recognized": unique_students_count,
                "faces_unrecognized": unrecognized_faces_count,
                "processing_time": processing_time,
                "recognized_students": list(recognized_students.values()),
                "unrecognized_faces": unrecognized_faces,
                "all_face_locations": [list(loc) for loc in face_locations]
            }
            
            # Add best match for backward compatibility
            if best_match_overall:
                result["best_match"] = best_match_overall
                result["student_id"] = best_match_overall.user_id
                result["similarity_score"] = best_match_overall.similarity_score
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"💥 Error processing image: {e}")
            
            # Update error metrics
            self.metrics.error_rate = (self.metrics.error_rate * self.metrics.requests_processed + 1) / (self.metrics.requests_processed + 1)
            self.metrics.requests_processed += 1
            
            return {
                "success": False,
                "message": f"Error processing image: {str(e)}",
                "faces_detected": 0,
                "faces_recognized": 0,
                "faces_unrecognized": 0,
                "processing_time": processing_time,
                "recognized_students": [],
                "unrecognized_faces": [],
                "all_face_locations": []
            }
    
    async def _find_matching_student(self, encoding: np.ndarray, subject_id: Optional[str] = None) -> Optional[Tuple[str, float]]:
        """
        Find matching student by face encoding
        
        Args:
            encoding: Face encoding to match
            subject_id: Optional subject ID to filter results
            
        Returns:
            Tuple of (user_id, similarity_score) or None
        """
        try:
            # Convert numpy array to list for Pinecone query
            encoding_list = encoding.tolist()
            
            query_params = {
                "vector": encoding_list,
                "top_k": 10,
                "include_metadata": True
            }
            
            # Add subject filter if provided
            if subject_id:
                query_params["filter"] = {
                    "subject_ids": {"$in": [subject_id]}
                }
                logger.info(f"🎯 Filtering by subject_id: {subject_id}")
            
            # Query Pinecone for similar faces
            results = self.index.query(**query_params)
            
            logger.info(f"📊 Pinecone returned {len(results.matches)} matches")
            
            if results.matches and len(results.matches) > 0:
                match = results.matches[0]
                similarity_score = match.score
                threshold = 1 - self.face_threshold
                
                logger.info(f"🎚️ Threshold: {threshold:.4f}, Best Score: {similarity_score:.4f}")
                
                # Check if similarity is above threshold
                if similarity_score >= threshold:
                    user_id = match.metadata.get('student_id') or match.metadata.get('user_id')
                    logger.info(f"✅ MATCH FOUND! User: {user_id}, Confidence: {similarity_score:.4f}")
                    return user_id, similarity_score
                else:
                    logger.info(f"❌ No match above threshold. Best score {similarity_score:.4f} < {threshold:.4f}")
            
            return None
            
        except Exception as e:
            logger.error(f"💥 Error finding matching student: {e}")
            return None
    
    async def register_face(self, user_id: str, image_data: bytes, subject_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Register a face for a user
        
        Args:
            user_id: User ID to register the face for
            image_data: Image bytes containing the face
            subject_ids: Optional list of subject IDs to associate
            
        Returns:
            Registration result dictionary
        """
        try:
            # Extract face encoding
            extraction_result = self._extract_face_encoding(image_data)
            
            if extraction_result is None:
                return {
                    "success": False,
                    "message": "No face detected in the image",
                    "user_id": user_id,
                    "encoding_stored": False
                }
            
            face_encodings, face_locations = extraction_result
            
            if len(face_encodings) == 0:
                return {
                    "success": False,
                    "message": "No face encodings could be generated",
                    "user_id": user_id,
                    "encoding_stored": False
                }
            
            # Use the first face encoding
            encoding = face_encodings[0]
            
            # Store encoding in Pinecone
            success = await self._store_face_encoding(user_id, encoding, subject_ids)
            
            if success:
                return {
                    "success": True,
                    "message": "Face registered successfully",
                    "user_id": user_id,
                    "encoding_stored": True,
                    "subject_ids": subject_ids or []
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to store face encoding",
                    "user_id": user_id,
                    "encoding_stored": False
                }
                
        except Exception as e:
            logger.error(f"Error registering face for user {user_id}: {e}")
            return {
                "success": False,
                "message": f"Error registering face: {str(e)}",
                "user_id": user_id,
                "encoding_stored": False
            }
    
    async def _store_face_encoding(self, user_id: str, encoding: np.ndarray, subject_ids: Optional[List[str]] = None) -> bool:
        """Store face encoding in Pinecone"""
        try:
            # Convert numpy array to list for Pinecone
            encoding_list = encoding.tolist()
            
            metadata = {
                "user_id": user_id,
                "student_id": user_id,  # For backward compatibility
                "created_at": str(np.datetime64('now'))
            }
            
            # Add subject information if provided
            if subject_ids:
                metadata["subject_ids"] = subject_ids
            
            # Store in Pinecone with user_id as the vector ID
            self.index.upsert(
                vectors=[{
                    "id": user_id,
                    "values": encoding_list,
                    "metadata": metadata
                }]
            )
            
            logger.info(f"✅ Face encoding stored for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing face encoding for user {user_id}: {e}")
            return False
    
    async def delete_face(self, user_id: str) -> bool:
        """Delete face encoding from Pinecone"""
        try:
            self.index.delete(ids=[user_id])
            logger.info(f"✅ Face encoding deleted for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting face encoding for user {user_id}: {e}")
            return False
    
    async def update_face_subjects(self, user_id: str, subject_ids: List[str]) -> bool:
        """Update subject associations for a user's face encoding"""
        try:
            # Fetch the existing vector
            fetch_result = self.index.fetch(ids=[user_id])
            if user_id not in fetch_result.vectors:
                logger.error(f"No face encoding found for user {user_id}")
                return False
            
            vector_data = fetch_result.vectors[user_id]
            current_metadata = vector_data.metadata or {}
            
            # Update metadata with new subject list
            updated_metadata = {
                **current_metadata,
                "user_id": user_id,
                "student_id": user_id,  # For backward compatibility
                "subject_ids": subject_ids
            }
            
            # Upsert with updated metadata
            self.index.upsert(vectors=[{
                "id": user_id,
                "values": vector_data.values,
                "metadata": updated_metadata
            }])
            
            logger.info(f"✅ Updated face encoding subjects for user {user_id}: {subject_ids}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating face encoding subjects for user {user_id}: {e}")
            return False