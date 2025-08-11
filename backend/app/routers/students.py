from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
from ..services.face_recognition import face_recognition_service

router = APIRouter()
logger = logging.getLogger(__name__)

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str
    department_id: str
    batch_year: int
    current_semester: int

class StudentResponse(BaseModel):
    student_id: str
    name: str
    email: str
    department_id: str
    batch_year: int
    current_semester: int
    created_at: datetime

# Initialize database connection
try:
    from app.services.local_supabase import LocalSupabase
    db = LocalSupabase()
    logger.info("Local Supabase connection initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize local Supabase: {e}")
    db = None

@router.get("", response_model=List[StudentResponse])
async def get_students():
    """Get all students"""
    try:
        if db:
            students_data = await db.get_all_students()
            return [StudentResponse(
                student_id=s.get("student_id", ""),
                name=s.get("name", ""),
                email=s.get("email", ""),
                department_id=s.get("department_id", ""),
                batch_year=s.get("batch_year", 2024),
                current_semester=s.get("current_semester", 1),
                created_at=datetime.fromisoformat(s.get("created_at", datetime.now().isoformat()).replace('Z', '+00:00')) if s.get("created_at") else datetime.now()
            ) for s in students_data]
        else:
            # Return empty list if database is not available
            logger.warning("Database not available, returning empty list")
            return []
    except Exception as e:
        logger.error(f"Error fetching students: {e}")
        return []

@router.post("", response_model=StudentResponse)
async def create_student(student: StudentCreate):
    """Create a new student"""
    logger.info(f"Received student data: {student}")
    
    try:
        if db:
            # Check if student already exists
            exists = await db.student_exists(student.student_id)
            if exists:
                raise HTTPException(status_code=400, detail=f"Student with ID {student.student_id} already exists")
            
            # Prepare student data for database
            student_data = {
                "student_id": student.student_id,
                "name": student.name,
                "email": student.email,
                "department_id": student.department_id,
                "batch_year": student.batch_year,
                "current_semester": student.current_semester,
                "course_enrolled_ids": [],
                "face_encoding_id": None
            }
            
            # Insert into database
            success = await db.insert_student(student_data)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to create student in database")
            
            logger.info(f"Student {student.student_id} created successfully in database")
        else:
            logger.warning(f"Database not available, student {student.student_id} not saved")
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        # Return the created student
        return StudentResponse(
            **student.dict(),
            created_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str):
    """Get a specific student"""
    # TODO: Implement actual student retrieval
    raise HTTPException(status_code=404, detail="Student not found")

@router.post("/{student_id}/upload-photo")
async def upload_student_photo(student_id: str, file: UploadFile = File(...)):
    """Upload student photo for face recognition"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check if student exists
        if db:
            exists = await db.student_exists(student_id)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        # Read image data
        image_data = await file.read()
        
        # Process face encoding
        result = face_recognition_service.process_student_photo(student_id, image_data)
        
        if result["success"]:
            # Update student record with face encoding status
            if db:
                await db.update_student_face_encoding(student_id, True)
            
            logger.info(f"Face encoding stored for student {student_id}")
            return {
                "message": "Photo uploaded and face encoding stored successfully",
                "student_id": student_id,
                "face_encoding_stored": True
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process photo: {str(e)}")

@router.post("/recognize")
async def recognize_student(file: UploadFile = File(...)):
    """Recognize student from uploaded photo"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Recognize student
        result = face_recognition_service.recognize_student(image_data)
        
        if result["success"]:
            student_id = result["student_id"]
            
            # Get student details from database
            if db:
                student_data = await db.get_student_by_id(student_id)
                if student_data:
                    return {
                        "success": True,
                        "student": {
                            "student_id": student_data.get("student_id"),
                            "name": student_data.get("name"),
                            "email": student_data.get("email"),
                            "department_id": student_data.get("department_id"),
                            "batch_year": student_data.get("batch_year"),
                            "current_semester": student_data.get("current_semester")
                        },
                        "similarity_score": result["similarity_score"],
                        "message": result["message"]
                    }
            
            return {
                "success": True,
                "student_id": student_id,
                "similarity_score": result["similarity_score"],
                "message": result["message"]
            }
        else:
            return {
                "success": False,
                "message": result["message"]
            }
            
    except Exception as e:
        logger.error(f"Error recognizing student: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to recognize student: {str(e)}")

@router.delete("/{student_id}")
async def delete_student(student_id: str):
    """Delete a student"""
    try:
        if db:
            # Check if student exists
            exists = await db.student_exists(student_id)
            if not exists:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
            
            # Delete face encoding from Pinecone
            face_recognition_service.delete_face_encoding(student_id)
            
            # Delete student from database
            success = await db.delete_student(student_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to delete student from database")
            
            logger.info(f"Student {student_id} deleted successfully")
            return {"message": "Student deleted successfully", "student_id": student_id}
        else:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")