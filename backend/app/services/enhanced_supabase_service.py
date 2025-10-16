"""
Enhanced Supabase service with caching and connection pooling
Provides optimized database operations with multi-level caching
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import hashlib

from app.services.cache_manager import get_cache_manager, cached
from app.services.connection_pool import get_connection_manager, with_read_pool, with_write_pool
from app.settings import settings

logger = logging.getLogger(__name__)

class EnhancedSupabaseService:
    """
    Enhanced Supabase service with caching and connection pooling
    """
    
    def __init__(self):
        self.cache_manager = None
        self.connection_manager = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the service with cache and connection managers"""
        try:
            self.cache_manager = get_cache_manager()
            self.connection_manager = get_connection_manager()
            self._initialized = True
            logger.info("✅ Enhanced Supabase service initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Enhanced Supabase service: {e}")
            raise
    
    def _generate_cache_key(self, operation: str, *args, **kwargs) -> str:
        """Generate cache key for operation"""
        key_data = f"supabase:{operation}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    # User operations with caching
    @cached(ttl=300, key_prefix="user")
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/users",
                params={"user_id": f"eq.{user_id}"}
            )
            
            if response.status_code == 200:
                users = response.json()
                return users[0] if users else None
            
            logger.error(f"Failed to get user: {response.status_code} - {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    @cached(ttl=300, key_prefix="user_email")
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/users",
                params={"email": f"eq.{email}"}
            )
            
            if response.status_code == 200:
                users = response.json()
                return users[0] if users else None
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create user and invalidate related cache"""
        try:
            pool = self.connection_manager.get_write_pool()
            
            response = await pool.post(
                "/users",
                json_data=user_data
            )
            
            if response.status_code in [200, 201]:
                created_user = response.json()[0] if response.json() else None
                
                # Invalidate related cache entries
                if created_user and self.cache_manager:
                    await self.cache_manager.delete(f"user:{created_user.get('user_id')}")
                    await self.cache_manager.delete(f"user_email:{created_user.get('email')}")
                
                return created_user
            
            logger.error(f"Failed to create user: {response.status_code} - {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    async def update_user_face_status(self, user_id: str, is_registered: bool) -> bool:
        """Update user face status and invalidate cache"""
        try:
            pool = self.connection_manager.get_write_pool()
            
            response = await pool.patch(
                "/users",
                params={"user_id": f"eq.{user_id}"},
                json_data={"is_face_registered": is_registered}
            )
            
            success = response.status_code in [200, 204]
            
            # Invalidate user cache
            if success and self.cache_manager:
                await self.cache_manager.delete(f"user:{user_id}")
                await self.cache_manager.invalidate_pattern(f"*user:{user_id}*")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating user face status: {e}")
            return False
    
    # Subject operations with caching
    @cached(ttl=600, key_prefix="subject")
    async def get_subject_by_id(self, subject_id: str) -> Optional[Dict[str, Any]]:
        """Get subject by ID with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/subjects",
                params={"subject_id": f"eq.{subject_id}"}
            )
            
            if response.status_code == 200:
                subjects = response.json()
                if subjects:
                    subject = subjects[0]
                    # Enhance with teacher name (cached separately)
                    teacher_name = await self._get_teacher_name_cached(subject.get("teacher_id"))
                    subject["teacher_name"] = teacher_name
                    return subject
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting subject by ID: {e}")
            return None
    
    @cached(ttl=300, key_prefix="teacher_name")
    async def _get_teacher_name_cached(self, teacher_id: str) -> str:
        """Get teacher name with caching"""
        try:
            user = await self.get_user_by_id(teacher_id)
            return user.get("name", "Unknown Teacher") if user else "Unknown Teacher"
        except Exception:
            return "Unknown Teacher"
    
    @cached(ttl=600, key_prefix="teacher_subjects")
    async def get_teacher_subjects(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get teacher subjects with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/subjects",
                params={"teacher_id": f"eq.{teacher_id}"}
            )
            
            if response.status_code == 200:
                subjects = response.json()
                
                # Enhance each subject with additional data
                for subject in subjects:
                    # Add teacher name (cached)
                    subject["teacher_name"] = await self._get_teacher_name_cached(teacher_id)
                    
                    # Add student count (cached)
                    subject["student_count"] = await self._get_subject_student_count_cached(
                        subject["subject_id"]
                    )
                
                return subjects
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting teacher subjects: {e}")
            return []
    
    @cached(ttl=300, key_prefix="subject_student_count")
    async def _get_subject_student_count_cached(self, subject_id: str) -> int:
        """Get subject student count with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/subject_enrollments",
                params={
                    "subject_id": f"eq.{subject_id}",
                    "is_active": "eq.true"
                }
            )
            
            if response.status_code == 200:
                enrollments = response.json()
                return len(enrollments)
            
            return 0
            
        except Exception as e:
            logger.error(f"Error getting subject student count: {e}")
            return 0
    
    async def create_subject(self, subject_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create subject and invalidate related cache"""
        try:
            pool = self.connection_manager.get_write_pool()
            
            response = await pool.post(
                "/subjects",
                json_data=subject_data
            )
            
            if response.status_code in [200, 201]:
                created_subject = response.json()[0] if response.json() else None
                
                # Invalidate related cache entries
                if created_subject and self.cache_manager:
                    teacher_id = created_subject.get("teacher_id")
                    if teacher_id:
                        await self.cache_manager.delete(f"teacher_subjects:{teacher_id}")
                
                return created_subject
            
            logger.error(f"Failed to create subject: {response.status_code} - {response.text}")
            return None
            
        except Exception as e:
            logger.error(f"Error creating subject: {e}")
            return None
    
    # Attendance operations with caching
    async def mark_attendance(self, attendance_data: Dict[str, Any]) -> bool:
        """Mark attendance and invalidate related cache"""
        try:
            pool = self.connection_manager.get_write_pool()
            
            response = await pool.post(
                "/attendance",
                json_data=attendance_data
            )
            
            success = response.status_code in [200, 201, 409]  # 409 = duplicate (already marked)
            
            # Invalidate attendance-related cache
            if success and self.cache_manager:
                session_id = attendance_data.get("session_id")
                subject_id = attendance_data.get("subject_id")
                student_id = attendance_data.get("student_id")
                
                if session_id:
                    await self.cache_manager.invalidate_pattern(f"*session:{session_id}*")
                if subject_id:
                    await self.cache_manager.invalidate_pattern(f"*subject_attendance:{subject_id}*")
                if student_id:
                    await self.cache_manager.invalidate_pattern(f"*student_attendance:{student_id}*")
            
            return success
            
        except Exception as e:
            logger.error(f"Error marking attendance: {e}")
            return False
    
    @cached(ttl=180, key_prefix="subject_attendance")
    async def get_attendance_by_subject(self, subject_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get attendance by subject with caching"""
        try:
            pool = self.connection_manager.get_read_pool()
            
            response = await pool.get(
                "/attendance",
                params={
                    "subject_id": f"eq.{subject_id}",
                    "order": "created_at.desc",
                    "limit": str(limit)
                }
            )
            
            if response.status_code == 200:
                return response.json()
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting attendance by subject: {e}")
            return []
    
    # Face recognition data with caching
    @cached(ttl=1800, key_prefix="face_embedding")
    async def get_face_embedding(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get face embedding with long-term caching"""
        try:
            # This would integrate with your face recognition service
            # For now, return placeholder
            return None
            
        except Exception as e:
            logger.error(f"Error getting face embedding: {e}")
            return None
    
    async def update_face_embedding(self, user_id: str, embedding_data: Dict[str, Any]) -> bool:
        """Update face embedding and invalidate cache"""
        try:
            # Update face embedding in your storage system
            # This is a placeholder implementation
            
            # Invalidate face embedding cache
            if self.cache_manager:
                await self.cache_manager.delete(f"face_embedding:{user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating face embedding: {e}")
            return False
    
    # Health and statistics
    async def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics including cache performance"""
        try:
            stats = {
                "service": "enhanced_supabase",
                "initialized": self._initialized,
                "cache_stats": None,
                "connection_stats": None
            }
            
            # Get cache statistics
            if self.cache_manager:
                stats["cache_stats"] = await self.cache_manager.get_stats()
            
            # Get connection statistics
            if self.connection_manager:
                stats["connection_stats"] = await self.connection_manager.get_combined_stats()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting service stats: {e}")
            return {"error": str(e)}

# Global service instance
_enhanced_supabase_service: Optional[EnhancedSupabaseService] = None

async def get_enhanced_supabase_service() -> EnhancedSupabaseService:
    """Get the global enhanced Supabase service instance"""
    global _enhanced_supabase_service
    
    if _enhanced_supabase_service is None:
        _enhanced_supabase_service = EnhancedSupabaseService()
        await _enhanced_supabase_service.initialize()
    
    return _enhanced_supabase_service