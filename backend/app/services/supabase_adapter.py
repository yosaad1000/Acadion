# services/supabase_adapter.py
import logging
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from app.config import settings
from app.models.student import Student

logger = logging.getLogger(__name__)

class SupabaseAdapter:
    """Supabase implementation for database operations"""
    
    def __init__(self):
        try:
            self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Error creating Supabase client: {e}")
            raise
    
    def get_student(self, student_id: str):
        """Get a student by ID"""
        try:
            result = self.supabase.table('students').select("*").eq('student_id', student_id).execute()
            if result.data:
                return Student.from_dict(result.data[0])
            return None
        except Exception as e:
            logger.error(f"Error getting student: {e}")
            return None
    
    def get_all_students(self) -> List[Student]:
        """Get all students"""
        try:
            result = self.supabase.table('students').select("*").execute()
            return [Student.from_dict(record) for record in result.data]
        except Exception as e:
            logger.error(f"Error getting all students: {e}")
            return []
    
    def add_student(self, student: Student) -> bool:
        """Add a new student"""
        try:
            student_data = {
                'student_id': student.student_id,
                'name': student.name,
                'email': student.email,
                'department_id': student.department_id,
                'batch_year': student.batch_year,
                'current_semester': student.current_semester,
                'course_enrolled_ids': student.course_enrolled_ids or []
            }
            result = self.supabase.table('students').insert(student_data).execute()
            logger.info(f"Student {student.student_id} added successfully")
            return True
        except Exception as e:
            logger.error(f"Error adding student: {e}")
            return False
    
    def student_exists(self, student_id: str) -> bool:
        """Check if student exists"""
        try:
            result = self.supabase.table('students').select("student_id").eq('student_id', student_id).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error checking student existence: {e}")
            return False