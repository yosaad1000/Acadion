#!/usr/bin/env python3
"""
Script to check attendance data in the cloud database
"""

import requests
import json

# Supabase configuration
SUPABASE_URL = "https://scijpejtvneuqbhkoxuz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM"

def check_attendance_records():
    """Check all attendance records"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/attendance"
    params = {"select": "*", "order": "created_at.desc", "limit": "50"}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Attendance records response: {response.status_code}")
        
        if response.status_code == 200:
            records = response.json()
            print(f"\n📊 Found {len(records)} attendance records:")
            
            status_counts = {}
            for record in records:
                status = record.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
                
                print(f"  - ID: {record.get('id')}")
                print(f"    Student: {record.get('student_id')}")
                print(f"    Status: {record.get('status')}")
                print(f"    Date: {record.get('date')}")
                print(f"    Session: {record.get('session_id', 'N/A')}")
                print(f"    Method: {record.get('method', 'N/A')}")
                print(f"    Created: {record.get('created_at')}")
                print()
            
            print(f"📈 Status breakdown:")
            for status, count in status_counts.items():
                print(f"  - {status}: {count} records")
                
            return records
        else:
            print(f"Error: {response.text}")
            return []
            
    except Exception as e:
        print(f"Error checking attendance: {e}")
        return []

def check_students():
    """Check students in the database"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/users"
    params = {"select": "user_id,name,user_type", "user_type": "eq.student"}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Students response: {response.status_code}")
        
        if response.status_code == 200:
            students = response.json()
            print(f"\n👥 Found {len(students)} students:")
            for student in students:
                print(f"  - {student.get('name')} (ID: {student.get('user_id')})")
            return students
        else:
            print(f"Error: {response.text}")
            return []
            
    except Exception as e:
        print(f"Error checking students: {e}")
        return []

def main():
    print("🔍 Checking attendance data in cloud database...")
    
    students = check_students()
    records = check_attendance_records()
    
    if not records:
        print("\n⚠️ No attendance records found!")
        print("This could mean:")
        print("1. No attendance has been taken yet")
        print("2. There's an issue with saving attendance to the database")
        print("3. The attendance records are being filtered out")
    
    print("\n✅ Database check complete!")

if __name__ == "__main__":
    main()