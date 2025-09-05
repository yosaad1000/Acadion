"""
Face Encoding Migration Service
Utility to update existing face encodings with subject metadata
"""

import logging
from typing import List, Dict, Any
from .storage_service import StorageService
from ..config import settings
from pinecone import Pinecone

logger = logging.getLogger(__name__)

class FaceMigrationService:
    def __init__(self):
        self.storage = StorageService()
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.face_index = self.pc.Index(settings.PINECONE_INDEX_NAME)
    
    async def migrate_existing_face_encodings(self) -> Dict[str, Any]:
        """
        Migrate existing face encodings to include subject metadata
        This should be run once after implementing the subject filtering feature
        """
        try:
            logger.info("Starting face encoding migration...")
            
            # Get all vectors from Pinecone
            stats = self.face_index.describe_index_stats()
            total_vectors = stats.total_vector_count
            
            if total_vectors == 0:
                return {
                    "success": True,
                    "message": "No face encodings to migrate",
                    "migrated_count": 0
                }
            
            logger.info(f"Found {total_vectors} face encodings to migrate")
            
            # Fetch all vectors (Pinecone doesn't have a direct way to list all vectors)
            # We'll need to query with dummy vectors or use the list operation if available
            
            # Alternative approach: Get all students and update their face encodings
            all_students = self.storage.get_all_students()
            migrated_count = 0
            errors = []
            
            for student in all_students:
                try:
                    student_id = student.get('student_id') or student.get('id')
                    if not student_id:
                        continue
                    
                    # Get student's enrolled subjects
                    enrolled_subjects = self.storage.get_student_subjects(student_id)
                    subject_ids = [subject['subject_id'] for subject in enrolled_subjects] if enrolled_subjects else []
                    
                    # Check if this student has a face encoding
                    try:
                        # Try to fetch the vector to see if it exists
                        fetch_result = self.face_index.fetch(ids=[student_id])
                        
                        if student_id in fetch_result.vectors:
                            # Vector exists, update its metadata
                            vector_data = fetch_result.vectors[student_id]
                            current_metadata = vector_data.metadata or {}
                            
                            # Update metadata with subject information
                            updated_metadata = {
                                **current_metadata,
                                "student_id": student_id,
                                "subject_ids": subject_ids,
                                "migrated": True
                            }
                            
                            # Upsert with updated metadata
                            self.face_index.upsert(vectors=[{
                                "id": student_id,
                                "values": vector_data.values,
                                "metadata": updated_metadata
                            }])
                            
                            migrated_count += 1
                            logger.info(f"Migrated face encoding for student {student_id} with subjects: {subject_ids}")
                        
                    except Exception as e:
                        # Vector doesn't exist or other error, skip
                        logger.debug(f"No face encoding found for student {student_id}: {e}")
                        continue
                        
                except Exception as e:
                    error_msg = f"Error migrating student {student_id}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            result = {
                "success": True,
                "message": f"Migration completed. Updated {migrated_count} face encodings",
                "migrated_count": migrated_count,
                "total_students_checked": len(all_students)
            }
            
            if errors:
                result["errors"] = errors
                result["error_count"] = len(errors)
            
            logger.info(f"Migration completed: {migrated_count} face encodings updated")
            return result
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return {
                "success": False,
                "message": f"Migration failed: {str(e)}",
                "migrated_count": 0
            }
    
    async def update_student_face_subjects(self, student_id: str) -> bool:
        """
        Update a specific student's face encoding with current subject enrollment
        """
        try:
            # Get student's current enrolled subjects
            enrolled_subjects = self.storage.get_student_subjects(student_id)
            subject_ids = [subject['subject_id'] for subject in enrolled_subjects] if enrolled_subjects else []
            
            # Check if student has a face encoding
            fetch_result = self.face_index.fetch(ids=[student_id])
            
            if student_id not in fetch_result.vectors:
                logger.warning(f"No face encoding found for student {student_id}")
                return False
            
            # Update the face encoding metadata
            vector_data = fetch_result.vectors[student_id]
            current_metadata = vector_data.metadata or {}
            
            updated_metadata = {
                **current_metadata,
                "student_id": student_id,
                "subject_ids": subject_ids
            }
            
            # Upsert with updated metadata
            self.face_index.upsert(vectors=[{
                "id": student_id,
                "values": vector_data.values,
                "metadata": updated_metadata
            }])
            
            logger.info(f"Updated face encoding subjects for student {student_id}: {subject_ids}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating face encoding subjects for student {student_id}: {e}")
            return False
    
    async def get_face_encoding_stats(self) -> Dict[str, Any]:
        """
        Get statistics about face encodings and their metadata
        """
        try:
            stats = self.face_index.describe_index_stats()
            
            # Sample some vectors to check metadata structure
            all_students = self.storage.get_all_students()
            sample_size = min(10, len(all_students))
            
            metadata_analysis = {
                "with_subjects": 0,
                "without_subjects": 0,
                "migrated": 0,
                "total_checked": 0
            }
            
            for i, student in enumerate(all_students[:sample_size]):
                try:
                    student_id = student.get('student_id') or student.get('id')
                    if not student_id:
                        continue
                    
                    fetch_result = self.face_index.fetch(ids=[student_id])
                    
                    if student_id in fetch_result.vectors:
                        metadata = fetch_result.vectors[student_id].metadata or {}
                        metadata_analysis["total_checked"] += 1
                        
                        if "subject_ids" in metadata:
                            metadata_analysis["with_subjects"] += 1
                        else:
                            metadata_analysis["without_subjects"] += 1
                        
                        if metadata.get("migrated"):
                            metadata_analysis["migrated"] += 1
                            
                except Exception as e:
                    logger.debug(f"Error checking metadata for student {student_id}: {e}")
                    continue
            
            return {
                "total_vectors": stats.total_vector_count,
                "sample_analysis": metadata_analysis,
                "sample_size": sample_size
            }
            
        except Exception as e:
            logger.error(f"Error getting face encoding stats: {e}")
            return {"error": str(e)}

# Global instance
face_migration_service = FaceMigrationService()