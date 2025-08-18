import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from datetime import date, datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.models.user import UserResponse

client = TestClient(app, base_url="http://localhost")

# Mock user data
mock_teacher = UserResponse(
    user_id="teacher-123",
    name="Test Teacher",
    email="teacher@test.com",
    user_type="teacher",
    is_face_registered=True,
    created_at=datetime.now()
)

def test_debug_manual_attendance():
    """Debug test to see what's wrong"""
    from app.routers.auth import get_current_user
    from app.routers.attendance import db
    
    # Override dependencies
    def override_get_current_user():
        return mock_teacher
    
    mock_db = AsyncMock()
    mock_db.get_subject_by_id = AsyncMock(return_value={
        "subject_id": "subject-123",
        "name": "Test Subject",
        "teacher_id": "teacher-123"
    })
    mock_db.is_student_enrolled = AsyncMock(return_value=True)
    mock_db.mark_attendance = AsyncMock(return_value=True)
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with patch('app.routers.attendance.db', mock_db):
        # Test data
        attendance_data = {
            "student_id": "student-123",
            "subject_id": "subject-123", 
            "date": "2024-01-15",
            "status": "present",
            "method": "manual"
        }
        
        response = client.post("/api/attendance/manual", json=attendance_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        print(f"Headers: {response.headers}")
    
    # Clean up
    app.dependency_overrides.clear()
    
    assert False  # Force failure to see output

if __name__ == "__main__":
    test_debug_manual_attendance()