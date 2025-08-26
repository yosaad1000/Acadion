#!/usr/bin/env python3
"""
Check if the migration was properly applied to the cloud database
"""

import requests
import json
from datetime import date

# Supabase configuration
SUPABASE_URL = "https://scijpejtvneuqbhkoxuz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM"

def test_multiple_sessions():
    """Test creating multiple attendance records for the same day"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get a real student and subject ID
    print("🔍 Getting existing student and subject...")
    
    # Get students
    students_response = requests.get(f"{SUPABASE_URL}/rest/v1/students?limit=1", headers=headers)
    if students_response.status_code != 200:
        print("❌ Failed to get students")
        return False
    
    students = students_response.json()
    if not students:
        print("❌ No students found")
        return False
    
    student_id = students[0]["student_id"]
    print(f"✅ Found student: {student_id}")
    
    # Get subjects
    subjects_response = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?limit=1", headers=headers)
    if subjects_response.status_code != 200:
        print("❌ Failed to get subjects")
        return False
    
    subjects = subjects_response.json()
    if not subjects:
        print("❌ No subjects found")
        return False
    
    subject_id = subjects[0]["subject_id"]
    print(f"✅ Found subject: {subject_id}")
    
    today = date.today().isoformat()
    
    # Test 1: Create morning session attendance
    print("\n🌅 Testing morning session...")
    morning_record = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": today,
        "status": "present",
        "session_id": "morning_test",
        "session_name": "Morning Test Session",
        "session_time": "09:00:00",
        "method": "manual"
    }
    
    response1 = requests.post(f"{SUPABASE_URL}/rest/v1/attendance", 
                             headers=headers, json=morning_record)
    print(f"Morning session response: {response1.status_code}")
    if response1.status_code not in [200, 201]:
        print(f"Error: {response1.text}")
        return False
    
    # Test 2: Create afternoon session attendance (same student, same day)
    print("\n🌇 Testing afternoon session...")
    afternoon_record = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": today,
        "status": "present",
        "session_id": "afternoon_test",
        "session_name": "Afternoon Test Session", 
        "session_time": "14:00:00",
        "method": "manual"
    }
    
    response2 = requests.post(f"{SUPABASE_URL}/rest/v1/attendance",
                             headers=headers, json=afternoon_record)
    print(f"Afternoon session response: {response2.status_code}")
    if response2.status_code not in [200, 201]:
        print(f"Error: {response2.text}")
        return False
    
    # Test 3: Check if both records exist
    print("\n📊 Checking created records...")
    check_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/attendance?student_id=eq.{student_id}&subject_id=eq.{subject_id}&date=eq.{today}",
        headers=headers
    )
    
    if check_response.status_code == 200:
        records = check_response.json()
        print(f"✅ Found {len(records)} attendance records for {student_id} on {today}")
        
        for i, record in enumerate(records, 1):
            print(f"  Record {i}: {record.get('session_name', 'N/A')} at {record.get('session_time', 'N/A')} - {record.get('status')}")
        
        # Clean up test records
        print("\n🧹 Cleaning up test records...")
        for record in records:
            if record.get('session_id', '').endswith('_test'):
                delete_response = requests.delete(
                    f"{SUPABASE_URL}/rest/v1/attendance?id=eq.{record['id']}",
                    headers=headers
                )
                print(f"Deleted record {record['id']}: {delete_response.status_code}")
        
        return len(records) >= 2
    else:
        print(f"❌ Failed to check records: {check_response.text}")
        return False

def check_existing_records():
    """Check existing attendance records for session data"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("🔍 Checking existing attendance records...")
    response = requests.get(f"{SUPABASE_URL}/rest/v1/attendance?limit=5", headers=headers)
    
    if response.status_code == 200:
        records = response.json()
        print(f"✅ Found {len(records)} existing records")
        
        for i, record in enumerate(records, 1):
            print(f"  Record {i}:")
            print(f"    - Session ID: {record.get('session_id', 'NULL')}")
            print(f"    - Session Name: {record.get('session_name', 'NULL')}")
            print(f"    - Session Time: {record.get('session_time', 'NULL')}")
            print(f"    - Date: {record.get('date')}")
            print(f"    - Status: {record.get('status')}")
    else:
        print(f"❌ Failed to get records: {response.text}")

def main():
    print("🔍 Checking migration status on cloud database...")
    
    check_existing_records()
    
    print("\n🧪 Testing multiple sessions functionality...")
    if test_multiple_sessions():
        print("✅ Multiple sessions per day working correctly!")
    else:
        print("❌ Multiple sessions per day not working")

if __name__ == "__main__":
    main()