#!/usr/bin/env python3
"""
Check what tables exist in the Supabase database
"""
import asyncio
import sys
import os
import httpx

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def check_tables():
    """Check what tables exist in the database"""
    db = LocalSupabase()
    
    print(f"🔍 Checking database tables...")
    print(f"📡 Base URL: {db.base_url}")
    
    # Try to get schema information
    try:
        async with httpx.AsyncClient() as client:
            # Try to get all tables by making requests to common table names
            common_tables = [
                "users", "subjects", "sessions", "assignments", 
                "students", "subject_enrollments", "attendance",
                "notifications", "auth.users"
            ]
            
            print(f"\n📋 Checking common table names...")
            for table in common_tables:
                try:
                    response = await client.get(
                        f"{db.base_url}/rest/v1/{table}",
                        headers=db.headers,
                        params={"limit": "1"}  # Just get 1 record to test
                    )
                    if response.status_code == 200:
                        data = response.json()
                        print(f"✅ {table}: exists ({len(data)} records in sample)")
                    elif response.status_code == 404:
                        print(f"❌ {table}: not found")
                    else:
                        print(f"⚠️  {table}: status {response.status_code}")
                except Exception as e:
                    print(f"💥 {table}: error - {e}")
            
            # Try to get users table specifically since that's what auth uses
            print(f"\n👥 Checking users table in detail...")
            try:
                response = await client.get(
                    f"{db.base_url}/rest/v1/users",
                    headers=db.headers,
                    params={"limit": "5"}
                )
                if response.status_code == 200:
                    users = response.json()
                    print(f"✅ Found {len(users)} users")
                    for user in users:
                        print(f"   - {user.get('name', 'Unknown')} ({user.get('email', 'Unknown')}) - Role: {user.get('active_role', 'Unknown')}")
                else:
                    print(f"❌ Users query failed: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"💥 Error querying users: {e}")
                
    except Exception as e:
        print(f"💥 Error checking tables: {e}")

if __name__ == "__main__":
    asyncio.run(check_tables())