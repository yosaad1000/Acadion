#!/usr/bin/env python3
"""
Debug the database structure and test session functionality
"""

import requests
import json
from datetime import date

# Supabase configuration
SUPABASE_URL = "https://scijpejtvneuqbhkoxuz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM"

def check_tables():
    """Check what tables exist in the database"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    tables_to_check = ["students", "users", "subjects", "attendance"]
    
    for table in tables_to_check:
        print(f"\n🔍 Checking table: {table}")
        response = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?limit=1", headers=headers)
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data:
                print(f"  Columns: {list(data[0].keys())}")
                print(f"  Sample record: {data[0]}")
            else:
                print("  No data found")
        else:
            print(f"  Error: {response.text}")

def test_session_creation():
    """Test creating multiple sessions with real data"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Check users table (likely where students are stored)
    print("\n🔍 Getting users...")
    users_response = requests.get(f"{SUPABASE_URL}/rest/v1/users?user_type=eq.student&limit=1", headers=headers)
    
    if users_response.status_code != 200:
        print(f"❌ Failed to get users: {users_response.text}")
        return False
    
    users = users_response.json()
    if not users:
        print("❌ No student users found")
        return False
    
    student_id = users[0]["user_id"]
    print(f"✅ Found student: {student_id}")
    
    # Get subjects
    print("\n🔍 Getting subjects...")
    subjects_response = requests.get(f"{SUPABASE_URL}/rest/v1/subjects?limit=1", headers=headers)
    
    if subjects_response.status_code != 200:
        print(f"❌ Failed to get subjects: {subjects_response.text}")
        return False
    
    subjects = subjects_response.json()
    if not subjects:
        print("❌ No subjects found")
        return False
    
    subject_id = subjects[0]["subject_id"]
    print(f"✅ Found subject: {subject_id}")
    
    today = date.today().isoformat()
    
    # Test creating multiple sessions
    sessions = [
        {
            "session_id": "morning_session",
            "session_name": "Morning Session",
            "session_time": "09:00:00"
        },
        {
            "session_id": "afternoon_session", 
            "session_name": "Afternoon Session",
            "session_time": "14:00:00"
        }
    ]
    
    created_records = []
    
    for session in sessions:
        print(f"\n📝 Creating {session['session_name']}...")
        
        record = {
            "student_id": student_id,
            "subject_id": subject_id,
            "date": today,
            "status": "present",
            "method": "manual",
            **session
        }
        
        response = requests.post(f"{SUPABASE_URL}/rest/v1/attendance", 
                               headers=headers, json=record)
        
        print(f"  Response: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"  ✅ Created successfully")
            if response.json():
                created_records.extend(response.json())
        else:
            print(f"  ❌ Error: {response.text}")
    
    # Check created records
    print(f"\n📊 Checking records for student {student_id} on {today}...")
    check_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/attendance?student_id=eq.{student_id}&date=eq.{today}",
        headers=headers
    )
    
    if check_response.status_code == 200:
        records = check_response.json()
        print(f"✅ Found {len(records)} total records")
        
        session_records = [r for r in records if r.get('session_id', '').endswith('_session')]
        print(f"✅ Found {len(session_records)} test session records")
        
        for record in session_records:
            print(f"  - {record.get('session_name')}: {record.get('session_time')} ({record.get('status')})")
        
        # Clean up
        print("\n🧹 Cleaning up test records...")
        for record in session_records:
            delete_response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/attendance?id=eq.{record['id']}",
                headers=headers
            )
            print(f"  Deleted {record['id']}: {delete_response.status_code}")
        
        return len(session_records) >= 2
    else:
        print(f"❌ Failed to check records: {check_response.text}")
        return False

def main():
    print("🔍 Debugging database structure and session functionality...")
    
    check_tables()
    
    print("\n" + "="*50)
    print("🧪 Testing session creation...")
    
    if test_session_creation():
        print("\n✅ Multiple sessions per day working correctly!")
        print("The issue might be in the frontend session creation logic.")
    else:
        print("\n❌ Multiple sessions per day not working")
        print("Need to investigate further.")

if __name__ == "__main__":
    main()