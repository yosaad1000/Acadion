import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class SimpleSupabase:
    """Simple mock database for testing purposes"""
    
    def __init__(self):
        # In-memory storage for testing
        self.students = []
        logger.info("Mock database initialized")
    
    async def get_all_students(self) -> List[Dict[str, Any]]:
        """Get all students"""
        return self.students
    
    async def insert_student(self, student_data: Dict[str, Any]) -> bool:
        """Add a new student"""
        try:
            # Add created_at timestamp
            student_data['created_at'] = datetime.now().isoformat()
            self.students.append(student_data)
            logger.info(f"Student {student_data.get('student_id')} added to mock database")
            return True
        except Exception as e:
            logger.error(f"Error adding student to mock database: {e}")
            return False
    
    async def student_exists(self, student_id: str) -> bool:
        """Check if student exists"""
        return any(s.get('student_id') == student_id for s in self.students)
    
    async def get_student(self, student_id: str) -> Dict[str, Any]:
        """Get a student by ID"""
        for student in self.students:
            if student.get('student_id') == student_id:
                return student
        return None