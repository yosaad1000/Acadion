#!/usr/bin/env python3
"""
Script to test attendance saving directly to the API
"""

import requests
import json
from datetime import datetime

# Test data
BACKEND_URL = "http://localhost:8000"
TOKEN = "your_token_here"  # You'll need to get this from the frontend

def test_manual_attendance():
    """Test saving manual attendance for all students"""
    
    # Sample students (using the IDs from the database check)
    students = [
        {"id": "be9b9171-9f85-46a6-82df-dd80b013732e", "name": "Demo Student", "status": "present"},
        {"id": "6d62c088-ffee-4c96-93f2-6cdf6439940d", "name": "Saad Sayed", "status": "absent"},
        {"id": "0a3308d9-586a-429a-8c1c-f84a283ceeb5", "name": "Arjun Yadav", "status": "late"},
        {"id": "bc91473b-96e7-44f5-b7e2-5ed85788411f", "name": "Satyansh Kumar", "status": "absent"},
        {"id": "b9b5e69b-f4a1-4ff8-b2dc-e3ac194e17e6", "name": "Satyansh Kumar 2", "status": "present"}
    ]
    
    # You'll need to get a real subject_id from your database
    subject_id = "your_subject_id_here"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}"
    }
    
    print("🧪 Testing manual attendance API...")
    
    for student in students:
        attendance_data = {
            "student_id": student["id"],
            "subject_id": subject_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": student["status"],
            "method": "manual",
            "session_id": "debug_session",
            "session_name": "Debug Session",
            "session_time": "15:00:00"
        }
        
        print(f"\n📝 Saving attendance for {student['name']} ({student['status']})...")
        print(f"Data: {json.dumps(attendance_data, indent=2)}")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/attendance/manual",
                headers=headers,
                json=attendance_data
            )
            
            print(f"Response: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code == 200:
                print("✅ Success!")
            else:
                print("❌ Failed!")
                
        except Exception as e:
            print(f"💥 Error: {e}")

def main():
    print("🔍 This script tests attendance saving directly to the API")
    print("⚠️ You need to:")
    print("1. Get a valid JWT token from the frontend (check localStorage)")
    print("2. Get a valid subject_id from your database")
    print("3. Update the TOKEN and subject_id variables in this script")
    print("4. Make sure the backend is running on localhost:8000")
    print("\nOnce you have those, uncomment the test_manual_attendance() call below")
    
    # Uncomment this line after updating the variables above
    # test_manual_attendance()

if __name__ == "__main__":
    main()