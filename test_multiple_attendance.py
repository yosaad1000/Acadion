#!/usr/bin/env python3
"""
Test script to verify multiple attendance records per day functionality
"""

import requests
import json
from datetime import date

# Configuration
BASE_URL = "http://localhost:8000"
TEACHER_EMAIL = "teacher@example.com"
TEACHER_PASSWORD = "password123"

def login_teacher():
    """Login as teacher and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEACHER_EMAIL,
        "password": TEACHER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def test_multiple_attendance():
    """Test creating multiple attendance records for the same day"""
    token = login_teacher()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test data
    subject_id = "CS101"  # Assuming this subject exists
    student_id = "STU001"  # Assuming this student exists
    today = date.today().isoformat()
    
    # Create first attendance record (morning session)
    attendance1 = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": today,
        "status": "present",
        "session_id": "morning",
        "session_name": "Morning Session",
        "session_time": "09:00"
    }
    
    print("Creating first attendance record...")
    response1 = requests.post(f"{BASE_URL}/api/attendance/manual", 
                             json=attendance1, headers=headers)
    print(f"Response 1: {response1.status_code} - {response1.text}")
    
    # Create second attendance record (afternoon session)
    attendance2 = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": today,
        "status": "present",
        "session_id": "afternoon",
        "session_name": "Afternoon Session",
        "session_time": "14:00"
    }
    
    print("Creating second attendance record...")
    response2 = requests.post(f"{BASE_URL}/api/attendance/manual", 
                             json=attendance2, headers=headers)
    print(f"Response 2: {response2.status_code} - {response2.text}")
    
    # Get attendance records for the subject
    print("Fetching attendance records...")
    response3 = requests.get(f"{BASE_URL}/api/attendance/{subject_id}", 
                            headers=headers)
    print(f"Get attendance: {response3.status_code}")
    if response3.status_code == 200:
        records = response3.json()
        today_records = [r for r in records if r.get('date') == today and r.get('student_id') == student_id]
        print(f"Found {len(today_records)} attendance records for {student_id} on {today}")
        for i, record in enumerate(today_records, 1):
            print(f"  Record {i}: {record.get('session_name', 'N/A')} at {record.get('session_time', 'N/A')} - {record.get('status')}")
    
    # Test session endpoints
    print("Testing session endpoints...")
    response4 = requests.get(f"{BASE_URL}/api/attendance/{subject_id}/sessions?attendance_date={today}", 
                            headers=headers)
    print(f"Get sessions: {response4.status_code}")
    if response4.status_code == 200:
        sessions = response4.json()
        print(f"Found {len(sessions)} sessions on {today}")
        for session in sessions:
            print(f"  Session: {session.get('session_name')} ({session.get('session_id')}) at {session.get('session_time')}")

if __name__ == "__main__":
    test_multiple_attendance()