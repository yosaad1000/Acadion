#!/usr/bin/env python3
"""
Fix the database constraint to allow multiple sessions per day
"""

import requests

# Supabase configuration
SUPABASE_URL = "https://scijpejtvneuqbhkoxuz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM"

def check_current_records():
    """Check what's causing the constraint violation"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    student_id = "be9b9171-9f85-46a6-82df-dd80b013732e"
    subject_id = "0e21ba7f-5920-4dee-9170-1245d7c9b6fc"
    today = "2025-08-26"
    
    print(f"🔍 Checking existing records for student {student_id[:8]}... on {today}")
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/attendance?student_id=eq.{student_id}&subject_id=eq.{subject_id}&date=eq.{today}",
        headers=headers
    )
    
    if response.status_code == 200:
        records = response.json()
        print(f"Found {len(records)} existing records:")
        
        for i, record in enumerate(records, 1):
            print(f"  Record {i}:")
            print(f"    ID: {record['id']}")
            print(f"    Session ID: {record.get('session_id', 'NULL')}")
            print(f"    Session Name: {record.get('session_name', 'NULL')}")
            print(f"    Date: {record['date']}")
            print(f"    Status: {record['status']}")
            print()
        
        return records
    else:
        print(f"❌ Error: {response.text}")
        return []

def test_with_different_session():
    """Test creating a record with a different session ID"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    student_id = "be9b9171-9f85-46a6-82df-dd80b013732e"
    subject_id = "0e21ba7f-5920-4dee-9170-1245d7c9b6fc"
    today = "2025-08-26"
    
    # Try with a unique session ID
    import time
    unique_session = f"test_session_{int(time.time())}"
    
    record = {
        "student_id": student_id,
        "subject_id": subject_id,
        "date": today,
        "status": "present",
        "method": "manual",
        "session_id": unique_session,
        "session_name": f"Test Session {unique_session}",
        "session_time": "15:30:00"
    }
    
    print(f"🧪 Testing with unique session ID: {unique_session}")
    response = requests.post(f"{SUPABASE_URL}/rest/v1/attendance", 
                           headers=headers, json=record)
    
    print(f"Response: {response.status_code}")
    if response.status_code not in [200, 201]:
        print(f"Error: {response.text}")
        return False
    else:
        print("✅ Success! Record created with unique session ID")
        
        # Clean up
        delete_response = requests.delete(
            f"{SUPABASE_URL}/rest/v1/attendance?session_id=eq.{unique_session}",
            headers=headers
        )
        print(f"Cleanup: {delete_response.status_code}")
        return True

def main():
    print("🔍 Investigating constraint issue...")
    
    existing_records = check_current_records()
    
    print("\n" + "="*50)
    
    if test_with_different_session():
        print("\n✅ The issue is that there are existing records with 'default' session_id")
        print("Multiple sessions work, but we need to use different session IDs")
        
        if existing_records:
            print(f"\nFound {len(existing_records)} existing 'default' session records")
            print("The frontend should generate unique session IDs, not use 'default'")
    else:
        print("\n❌ Still having issues - need to investigate further")
    
    print("\n📋 Next steps:")
    print("1. Frontend should generate unique session IDs (not 'default')")
    print("2. Each new session should have a unique session_id")
    print("3. The 'default' session_id should only be used for the first/main session")

if __name__ == "__main__":
    main()