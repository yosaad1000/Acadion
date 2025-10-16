"""
Enhanced Attendance Service with Multi-level Caching and Connection Pooling
Demonstrates implementation of caching strategies and optimized database connections
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
import asyncio
import json
import hashlib

from app.services.cache_manager import get_cache_manager, cached
from app.services.connection_pool import get_connection_manager
from app.settings import settings

logger = logging.getLogger(__name__)

class EnhancedAttendanceService:
    """
    Enhanced attendance service with caching and connection pooling
    """
    
    def __init__(self):
        self.cache_manager = None
        self.connection_manager = None
        self._initialized = False
        
        # Cache configuration for different operations
        self.cache_config = {
            "attendance_records": {"ttl": 300, "local_only": False},     # 5 minutes
            "session_data": {"ttl": 600, "local_only": False},          # 10 minutes
            "student_attendance": {"ttl": 180, "local_only": True},     # 3 minutes, local only
            "subject_stats": {"ttl": 900, "local_only": False},         # 15 minutes
            "daily_attendance": {"ttl": 1800, "local_only": False}      # 30 minutes
        }
    
    async def initialize(self):
        """Initialize the enhanced attendance service"""
        try:
            self.cache_manager = get_cache_manager()
            self.connection_manager = get_connection_manager()
            self._initialized = True
            logger.info("✅ Enhanced attendance service initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize enhanced attendance service: {e}")
            raise
    
    async def process_attendance_session(
        self, 
        session_data: Dict[str, Any], 
        image_data: bytes
    ) -> Dict[str, Any]:
        """
        Process attendance session with caching and optimized database operations
        
        Args:
            session_data: Session information (subject_id, session_id, etc.)
            image_data: Attendance image data
            
        Returns:
            Processing results with attendance records
        """
        try:
            session_id = session_data.get("session_id")
            subject_id = session_data.get("subject_id")
            
            logger.info(f"Processing attendance session {session_id} for subject {subject_id}")
            
            # Check if session is already processed (cached)
            cache_key = f"processed_session:{session_id}"
            cached_result = await self.cache_manager.get(cache_key)
            
            if cached_result:
                logger.info(f"Session {session_id} already processed (cached)")
                return cached_result
            
            # Process the attendance image
            processing_result = await self._process_attendance_image(
                image_data, subject_id, session_id
            )
            
            if not processing_result.get("success"):
                return processing_result
            
            # Save attendance records to database
            attendance_records = await self._save_attendance_records(
                session_data, processing_result.get("matched_students", [])
            )
            
            # Update session status
            await self._update_session_status(session_id, "completed")
            
            # Prepare final result
            result = {
                "success": True,
                "session_id": session_id,
                "subject_id": subject_id,
                "students_processed": len(attendance_records),
                "attendance_records": attendance_records,
                "processing_stats": {
                    "faces_detected": processing_result.get("faces_detected", 0),
                    "students_matched": processing_result.get("students_matched", 0),
                    "processing_time": processing_result.get("processing_time", 0)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache the result
            config = self.cache_config["session_data"]
            await self.cache_manager.set(
                cache_key, 
                result, 
                ttl=config["ttl"], 
                local_only=config["local_only"]
            )
            
            # Invalidate related cache entries
            await self._invalidate_attendance_cache(subject_id, session_id)
            
            logger.info(f"Attendance session {session_id} processed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error processing attendance session: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_data.get("session_id"),
                "subject_id": session_data.get("subject_id")
            }
    
    async def _process_attendance_image(
        self, 
        image_data: bytes, 
        subject_id: str, 
        session_id: str
    ) -> Dict[str, Any]:
        """Process attendance image using cached face service"""
        try:
            # This would integrate with the cached face service
            # For now, return a placeholder result
            
            # Generate image hash for caching
            image_hash = hashlib.sha256(image_data).hexdigest()[:16]
            cache_key = f"image_processing:{subject_id}:{image_hash}"
            
            # Check cache first
            cached_result = await self.cache_manager.get(cache_key)
            if cached_result:
                logger.info(f"Image processing cache hit: {cache_key}")
                return cached_result
            
            # Simulate face recognition processing
            await asyncio.sleep(0.1)  # Simulate processing time
            
            # Get enrolled students (cached)
            enrolled_students = await self._get_enrolled_students_cached(subject_id)
            
            # Simulate face matching results
            matched_students = []
            for i, student in enumerate(enrolled_students[:3]):  # Simulate 3 matches
                matched_students.append({
                    "user_id": student.get("user_id"),
                    "name": student.get("name", f"Student {i+1}"),
                    "email": student.get("email", ""),
                    "confidence": 0.85 + (i * 0.05),  # Simulate confidence scores
                    "status": "present"
                })
            
            result = {
                "success": True,
                "faces_detected": len(matched_students),
                "students_matched": len(matched_students),
                "matched_students": matched_students,
                "processing_time": 0.5
            }
            
            # Cache the result
            await self.cache_manager.set(cache_key, result, ttl=600, local_only=True)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing attendance image: {e}")
            return {"success": False, "error": str(e)}
    
    @cached(ttl=600, key_prefix="enrolled_students")
    async def _get_enrolled_students_cached(self, subject_id: str) -> List[Dict[str, Any]]:
        """Get enrolled students with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
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
                    student = await self._get_student_details_cached(student_id)
                    if student:
                        students.append(student)
            
            return students
            
        except Exception as e:
            logger.error(f"Error getting enrolled students: {e}")
            return []
    
    @cached(ttl=900, key_prefix="student_details")
    async def _get_student_details_cached(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student details with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/users",
                params={"user_id": f"eq.{student_id}"}
            )
            
            if response.status_code == 200:
                users = response.json()
                return users[0] if users else None
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting student details: {e}")
            return None
    
    async def _save_attendance_records(
        self, 
        session_data: Dict[str, Any], 
        matched_students: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Save attendance records to database with connection pooling"""
        try:
            pool = self.connection_manager.get_write_pool()
            attendance_records = []
            
            for student in matched_students:
                attendance_data = {
                    "session_id": session_data.get("session_id"),
                    "subject_id": session_data.get("subject_id"),
                    "student_id": student.get("user_id"),
                    "status": student.get("status", "present"),
                    "confidence": student.get("confidence", 0.0),
                    "date": datetime.utcnow().date().isoformat(),
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # Save attendance record
                response = await pool.post(
                    "/attendance",
                    json_data=attendance_data
                )
                
                if response.status_code in [200, 201, 409]:  # 409 = already exists
                    attendance_records.append({
                        **attendance_data,
                        "student_name": student.get("name", "Unknown"),
                        "saved": True
                    })
                    logger.debug(f"Attendance saved for student {student.get('user_id')}")
                else:
                    logger.error(f"Failed to save attendance: {response.status_code} - {response.text}")
                    attendance_records.append({
                        **attendance_data,
                        "student_name": student.get("name", "Unknown"),
                        "saved": False,
                        "error": response.text
                    })
            
            logger.info(f"Saved {len([r for r in attendance_records if r.get('saved')])} attendance records")
            return attendance_records
            
        except Exception as e:
            logger.error(f"Error saving attendance records: {e}")
            return []
    
    async def _update_session_status(self, session_id: str, status: str) -> bool:
        """Update session status in database"""
        try:
            pool = self.connection_manager.get_write_pool()
            
            response = await pool.patch(
                "/attendance_sessions",
                params={"session_id": f"eq.{session_id}"},
                json_data={
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                }
            )
            
            success = response.status_code in [200, 204]
            if success:
                logger.info(f"Session {session_id} status updated to {status}")
            else:
                logger.error(f"Failed to update session status: {response.status_code}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating session status: {e}")
            return False
    
    async def _invalidate_attendance_cache(self, subject_id: str, session_id: str):
        """Invalidate attendance-related cache entries"""
        try:
            if self.cache_manager:
                # Invalidate specific patterns
                await self.cache_manager.invalidate_pattern(f"*attendance*{subject_id}*")
                await self.cache_manager.invalidate_pattern(f"*session*{session_id}*")
                await self.cache_manager.invalidate_pattern(f"*subject_stats*{subject_id}*")
                
                logger.debug(f"Invalidated attendance cache for subject {subject_id}")
                
        except Exception as e:
            logger.error(f"Error invalidating attendance cache: {e}")
    
    @cached(ttl=300, key_prefix="attendance_by_subject")
    async def get_attendance_by_subject(
        self, 
        subject_id: str, 
        limit: int = 100,
        date_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get attendance records by subject with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            params = {
                "subject_id": f"eq.{subject_id}",
                "order": "created_at.desc",
                "limit": str(limit)
            }
            
            if date_filter:
                params["date"] = f"eq.{date_filter}"
            
            response = await pool.get("/attendance", params=params)
            
            if response.status_code == 200:
                attendance_records = response.json()
                
                # Enhance with student names (cached)
                for record in attendance_records:
                    student_id = record.get("student_id")
                    if student_id:
                        student = await self._get_student_details_cached(student_id)
                        record["student_name"] = student.get("name", "Unknown") if student else "Unknown"
                
                return attendance_records
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting attendance by subject: {e}")
            return []
    
    @cached(ttl=900, key_prefix="subject_attendance_stats")
    async def get_subject_attendance_stats(self, subject_id: str) -> Dict[str, Any]:
        """Get attendance statistics for a subject with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            # Get total attendance records
            response = await pool.get(
                "/attendance",
                params={"subject_id": f"eq.{subject_id}"}
            )
            
            if response.status_code != 200:
                return {"error": "Failed to fetch attendance data"}
            
            attendance_records = response.json()
            
            # Calculate statistics
            total_records = len(attendance_records)
            present_count = len([r for r in attendance_records if r.get("status") == "present"])
            absent_count = total_records - present_count
            
            # Get unique sessions
            unique_sessions = len(set(r.get("session_id") for r in attendance_records if r.get("session_id")))
            
            # Get enrolled student count
            enrolled_students = await self._get_enrolled_students_cached(subject_id)
            enrolled_count = len(enrolled_students)
            
            stats = {
                "subject_id": subject_id,
                "total_records": total_records,
                "present_count": present_count,
                "absent_count": absent_count,
                "attendance_rate": (present_count / total_records * 100) if total_records > 0 else 0,
                "unique_sessions": unique_sessions,
                "enrolled_students": enrolled_count,
                "average_attendance_per_session": (present_count / unique_sessions) if unique_sessions > 0 else 0
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting subject attendance stats: {e}")
            return {"error": str(e)}
    
    async def get_student_attendance_history(
        self, 
        student_id: str, 
        subject_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get student attendance history with caching"""
        try:
            cache_key = f"student_attendance:{student_id}:{subject_id or 'all'}:{limit}"
            
            # Check cache first
            cached_result = await self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            
            pool = self.connection_manager.get_read_pool()
            
            params = {
                "student_id": f"eq.{student_id}",
                "order": "created_at.desc",
                "limit": str(limit)
            }
            
            if subject_id:
                params["subject_id"] = f"eq.{subject_id}"
            
            response = await pool.get("/attendance", params=params)
            
            if response.status_code == 200:
                attendance_records = response.json()
                
                # Enhance with subject names
                for record in attendance_records:
                    subj_id = record.get("subject_id")
                    if subj_id:
                        subject = await self._get_subject_details_cached(subj_id)
                        record["subject_name"] = subject.get("name", "Unknown") if subject else "Unknown"
                
                # Cache the result
                config = self.cache_config["student_attendance"]
                await self.cache_manager.set(
                    cache_key, 
                    attendance_records, 
                    ttl=config["ttl"], 
                    local_only=config["local_only"]
                )
                
                return attendance_records
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting student attendance history: {e}")
            return []
    
    @cached(ttl=1800, key_prefix="subject_details")
    async def _get_subject_details_cached(self, subject_id: str) -> Optional[Dict[str, Any]]:
        """Get subject details with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/subjects",
                params={"subject_id": f"eq.{subject_id}"}
            )
            
            if response.status_code == 200:
                subjects = response.json()
                return subjects[0] if subjects else None
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting subject details: {e}")
            return None
    
    async def get_service_performance_stats(self) -> Dict[str, Any]:
        """Get service performance statistics"""
        try:
            stats = {
                "service": "enhanced_attendance_service",
                "initialized": self._initialized,
                "cache_config": self.cache_config
            }
            
            # Get cache performance
            if self.cache_manager:
                cache_stats = await self.cache_manager.get_stats()
                stats["cache_performance"] = {
                    "hit_rate": cache_stats.get("overall_hit_rate", 0),
                    "total_requests": cache_stats.get("total_requests", 0),
                    "local_cache_size": cache_stats.get("local_cache_size", 0),
                    "redis_connected": cache_stats.get("redis_connected", False)
                }
            
            # Get connection pool performance
            if self.connection_manager:
                conn_stats = await self.connection_manager.get_combined_stats()
                stats["connection_performance"] = {
                    "total_connections": conn_stats.get("total_connections", 0),
                    "total_requests": conn_stats.get("total_requests", 0),
                    "read_pool": conn_stats.get("read_pool", {}),
                    "write_pool": conn_stats.get("write_pool", {})
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting service performance stats: {e}")
            return {"error": str(e)}

# Global service instance
_enhanced_attendance_service: Optional[EnhancedAttendanceService] = None

async def get_enhanced_attendance_service() -> EnhancedAttendanceService:
    """Get the global enhanced attendance service instance"""
    global _enhanced_attendance_service
    
    if _enhanced_attendance_service is None:
        _enhanced_attendance_service = EnhancedAttendanceService()
        await _enhanced_attendance_service.initialize()
    
    return _enhanced_attendance_service