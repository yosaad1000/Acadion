# services/storage_service.py
import logging
import numpy as np
from datetime import datetime
from pinecone import Pinecone, ServerlessSpec

from app.config import settings as config
from services.database_interface import DatabaseInterface
from services.supabase_adapter import SupabaseAdapter

logger = logging.getLogger(__name__)

class StorageService:
    """
    Service for database and vector storage operations
    Uses dependency injection for database operations
    """
    def __init__(self, db_adapter: DatabaseInterface = None):
        # Use provided adapter or default to Supabase
        self.db = db_adapter or SupabaseAdapter()
        
        # Initialize Pinecone for face recognition
        if not config.PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY is required but not set")
        
        logger.info(f"Initializing Pinecone with API key: {config.PINECONE_API_KEY[:10]}...")
        self.pc = Pinecone(api_key=config.PINECONE_API_KEY)
        
        # Create index if it doesn't exist
        existing_indexes = [index.name for index in self.pc.list_indexes()]
        if config.PINECONE_INDEX_NAME not in existing_indexes:
            logger.info(f"Creating Pinecone index: {config.PINECONE_INDEX_NAME}")
            self.pc.create_index(
                name=config.PINECONE_INDEX_NAME,
                dimension=config.FACE_ENCODING_DIMENSION,
                metric=config.FACE_METRIC,
                spec=ServerlessSpec(
                    cloud="aws",  # Use aws as default cloud
                    region=config.PINECONE_REGION
                )
            )
            logger.info(f"Index {config.PINECONE_INDEX_NAME} created successfully")
        else:
            logger.info(f"Using existing Pinecone index: {config.PINECONE_INDEX_NAME}")
        
        self.face_index = self.pc.Index(config.PINECONE_INDEX_NAME)
    
    # Face recognition methods (Pinecone operations)
    def store_student_face(self, student_id, name, face_encoding):
        """Store student face encoding in Pinecone"""
        try:
            logger.info(f"Storing face encoding for student {student_id} ({name})")
            logger.info(f"Face encoding shape: {face_encoding.shape}, dimension: {len(face_encoding)}")
            
            self.face_index.upsert(vectors=[{
                "id": student_id,
                "values": face_encoding.tolist(),
                "metadata": {
                    "name": name,
                    "student_id": student_id
                }
            }])
            logger.info(f"Successfully stored face encoding for {student_id}")
        except Exception as e:
            logger.error(f"Error storing face encoding for {student_id}: {e}")
            raise
    
    def find_matching_face(self, face_encoding):
        """Find a matching face in Pinecone"""
        results = self.face_index.query(
            vector=face_encoding.tolist(),
            top_k=1,
            include_metadata=True
        )
        
        if results['matches'] and results['matches'][0]['score'] < config.FACE_THRESHOLD:
            match = results['matches'][0]
            return match['id'], match['metadata'].get('name', 'Unknown'), match['score']
        
        return None, "Unknown", 1.0
    
    # Database operations (delegated to adapter)
    def add_department(self, department):
        """Add a department"""
        return self.db.add_department(department)
    
    def get_all_departments(self):
        """Get all departments"""
        return self.db.get_all_departments()
    
    def update_department(self, dept_id, updates):
        """Update a department"""
        return self.db.update_department(dept_id, updates)
    
    def add_faculty(self, faculty):
        """Add a faculty member"""
        return self.db.add_faculty(faculty)
    
    def get_all_faculty(self):
        """Get all faculty members"""
        return self.db.get_all_faculty()
    
    def get_faculty_by_id(self, faculty_id):
        """Get faculty by ID"""
        return self.db.get_faculty_by_id(faculty_id)
    
    def update_faculty(self, faculty_id, updates):
        """Update a faculty member"""
        return self.db.update_faculty(faculty_id, updates)
    
    def delete_faculty(self, faculty_id):
        """Delete a faculty member"""
        return self.db.delete_faculty(faculty_id)
    
    def add_subject(self, subject):
        """Add a subject"""
        return self.db.add_subject(subject)
    
    def get_all_subjects(self):
        """Get all subjects"""
        return self.db.get_all_subjects()
    
    def get_subject_by_id(self, subject_id):
        """Get subject by ID"""
        return self.db.get_subject_by_id(subject_id)
    
    def update_subject(self, subject_id, updates):
        """Update a subject"""
        return self.db.update_subject(subject_id, updates)
    
    def delete_subject(self, subject_id):
        """Delete a subject"""
        return self.db.delete_subject(subject_id)
    
    def add_student(self, student):
        """Add a student"""
        return self.db.add_student(student)
    
    def get_student(self, student_id):
        """Get a student by ID"""
        return self.db.get_student(student_id)
    
    def get_all_students(self):
        """Get all students"""
        return self.db.get_all_students()
    
    def update_student(self, student):
        """Update a student"""
        return self.db.update_student(student)
    
    def student_exists(self, student_id):
        """Check if student exists"""
        return self.db.student_exists(student_id)
    
    def get_courses_by_department_semester(self, department_id, semester):
        """Get courses by department and semester"""
        return self.db.get_courses_by_department_semester(department_id, semester)
    
    def enroll_student_in_courses(self, student_id, course_ids):
        """Enroll student in multiple courses"""
        return self.db.enroll_student_in_courses(student_id, course_ids)
    
    def clear_student_enrollments(self, student_id):
        """Clear all enrollments for a student"""
        return self.db.clear_student_enrollments(student_id)
    
    def get_student_subjects(self, student_id):
        """Get all subjects a student is enrolled in"""
        return self.db.get_student_subjects(student_id)
    
    def get_enrolled_students(self, subject_id):
        """Get list of student IDs enrolled in a subject"""
        return self.db.get_enrolled_students(subject_id)
    
    def update_student_semester(self, student_id, semester):
        """Update student's current semester"""
        return self.db.update_student_semester(student_id, semester)
    
    def record_attendance(self, attendance):
        """Record student attendance"""
        return self.db.add_attendance_record(attendance)
    
    def get_student_attendance(self, student_id, subject_id=None, start_date=None, end_date=None):
        """Get attendance records for a student"""
        filters = {'student_id': student_id}
        if subject_id:
            filters['subject_id'] = subject_id
        if start_date:
            filters['start_date'] = start_date.isoformat() if hasattr(start_date, 'isoformat') else start_date
        if end_date:
            filters['end_date'] = end_date.isoformat() if hasattr(end_date, 'isoformat') else end_date
        
        return self.db.get_attendance_records(filters)
    
    def get_subject_attendance(self, subject_id, date=None):
        """Get attendance records for a subject"""
        filters = {'subject_id': subject_id}
        if date:
            filters['date'] = date.isoformat() if hasattr(date, 'isoformat') else date
        
        return self.db.get_attendance_records(filters)