#!/usr/bin/env python3
"""
Script to apply the session migration to the cloud Supabase database
"""

import os
import requests
import json

# Supabase configuration from .env
SUPABASE_URL = "https://scijpejtvneuqbhkoxuz.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM"

def execute_sql(sql_query):
    """Execute SQL query on Supabase"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Use the PostgREST API to execute raw SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    # If exec_sql doesn't exist, we'll use a different approach
    # Let's try using the SQL editor endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/execute_sql"
    
    payload = {
        "sql": sql_query
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"SQL Execution Response: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False

def check_table_structure():
    """Check current attendance table structure"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get table info
    url = f"{SUPABASE_URL}/rest/v1/attendance"
    params = {"limit": "1"}
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Table check response: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data:
                print("Current attendance table columns:")
                for key in data[0].keys():
                    print(f"  - {key}")
            else:
                print("No data in attendance table")
        return response.status_code == 200
    except Exception as e:
        print(f"Error checking table: {e}")
        return False

def apply_migration_manually():
    """Apply migration using direct API calls"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("Applying migration manually...")
    
    # Step 1: Add new columns by trying to insert a record with them
    # This will help us see if the columns exist
    test_record = {
        "student_id": "TEST_MIGRATION",
        "subject_id": "TEST_MIGRATION", 
        "date": "2025-08-26",
        "status": "present",
        "session_id": "test",
        "session_name": "Test Session",
        "session_time": "12:00:00"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/attendance"
    response = requests.post(url, headers=headers, json=test_record)
    
    print(f"Test insert response: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 201:
        print("✅ Session columns already exist!")
        # Clean up test record
        delete_url = f"{SUPABASE_URL}/rest/v1/attendance?student_id=eq.TEST_MIGRATION"
        requests.delete(delete_url, headers=headers)
        return True
    elif "column" in response.text.lower() and "does not exist" in response.text.lower():
        print("❌ Session columns don't exist. Need to add them via Supabase dashboard.")
        return False
    else:
        print(f"Unexpected response: {response.text}")
        return False

def main():
    print("🔍 Checking cloud database structure...")
    
    if not check_table_structure():
        print("❌ Failed to check table structure")
        return
    
    print("\n🚀 Testing session column support...")
    if apply_migration_manually():
        print("✅ Migration already applied or successful!")
    else:
        print("❌ Migration needed. Please apply via Supabase dashboard.")
        print("\n📋 SQL to run in Supabase SQL Editor:")
        print("=" * 50)
        with open("backend/migrations/002_allow_multiple_attendance_per_day.sql", "r") as f:
            print(f.read())
        print("=" * 50)

if __name__ == "__main__":
    main()