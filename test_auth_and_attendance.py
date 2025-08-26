#!/usr/bin/env python3
"""
Script to test authentication and attendance API directly
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "http://localhost:8000"

def test_login():
    """Test login to get a valid token"""
    print("🔐 Testing login...")
    
    # You'll need to update these with valid credentials
    login_data = {
        "email": "teacher@example.com",  # Update with your teacher email
        "password": "password123"        # Update with your password
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/api/auth/login", json=login_data)
        print(f"Login response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print(f"✅ Login successful! Token: {token[:50]}...")
            return token
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"💥 Login error: {e}")
        return None

def test_attendance_with_token(token):
    """Test attendance API with valid token"""
    if not token:
        print("❌ No token available, skipping attendance test")
        return
    
    print("\n📝 Testing attendance API...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    # Test data - update with real IDs from your system
    test_students = [
        {"id": "0a3308d9-586a-429a-8c1c-f84a283ceeb5", "status": "present"},
        {"id": "bc91473b-96e7-44f5-b7e2-5ed85788411f", "status": "absent"},
        {"id": "b9b5e69b-f4a1-4ff8-b2dc-e3ac194e17e6", "status": "late"}
    ]
    
    subject_id = "0e21ba7f-5920-4dee-9170-1245d7c9b6fc"  # Update if needed
    
    for student in test_students:
        attendance_data = {
            "student_id": student["id"],
            "subject_id": subject_id,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "status": student["status"],
            "method": "manual",
            "session_id": "test_session",
            "session_name": "Test Session",
            "session_time": "16:00:00"
        }
        
        print(f"\n🧪 Testing {student['status']} student...")
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/attendance/manual",
                headers=headers,
                json=attendance_data
            )
            
            print(f"Response: {response.status_code}")
            if response.status_code == 200:
                print(f"✅ {student['status']} student saved successfully!")
            else:
                print(f"❌ Failed: {response.text}")
                
        except Exception as e:
            print(f"💥 Error: {e}")

def main():
    print("🧪 Testing Authentication and Attendance API")
    print("=" * 50)
    
    # Step 1: Get a valid token
    token = test_login()
    
    # Step 2: Test attendance API
    test_attendance_with_token(token)
    
    print("\n" + "=" * 50)
    print("✅ Test complete!")
    print("\nIf login failed, update the credentials in this script.")
    print("If attendance failed, check the student/subject IDs.")

if __name__ == "__main__":
    main()