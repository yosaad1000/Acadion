#!/usr/bin/env python3
"""
Check the subject_enrollments table structure
"""
import asyncio
import sys
import os
import httpx

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def check_enrollments():
    """Check the subject_enrollments table structure"""
    db = LocalSupabase()
    
    print(f"🔍 Checking subject_enrollments table...")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all enrollment records
            response = await client.get(
                f"{db.base_url}/rest/v1/subject_enrollments",
                headers=db.headers
            )
            if response.status_code == 200:
                enrollments = response.json()
                print(f"✅ Found {len(enrollments)} enrollment records")
                
                if enrollments:
                    print(f"\n📋 Sample enrollment record:")
                    sample = enrollments[0]
                    for key, value in sample.items():
                        print(f"   {key}: {value}")
                    
                    print(f"\n📊 All enrollment records:")
                    for i, enrollment in enumerate(enrollments):
                        print(f"   {i+1}. Subject: {enrollment.get('subject_id', 'Unknown')}")
                        print(f"      Student: {enrollment.get('student_id', 'Unknown')}")
                        print(f"      User: {enrollment.get('user_id', 'Unknown')}")
                        print(f"      Active: {enrollment.get('is_active', 'Unknown')}")
                        print(f"      Created: {enrollment.get('created_at', 'Unknown')}")
                        print()
                else:
                    print("📝 No enrollment records found")
            else:
                print(f"❌ Failed to query enrollments: {response.status_code}")
                print(f"   Response: {response.text}")
                
            # Also check the specific subject from the error
            subject_id = "decd0e0b-aaa8-4b69-acf7-29f2f911cc0a"
            print(f"\n🎯 Checking enrollments for subject: {subject_id}")
            
            response = await client.get(
                f"{db.base_url}/rest/v1/subject_enrollments",
                headers=db.headers,
                params={"subject_id": f"eq.{subject_id}"}
            )
            if response.status_code == 200:
                subject_enrollments = response.json()
                print(f"📊 Found {len(subject_enrollments)} enrollments for this subject")
                for enrollment in subject_enrollments:
                    print(f"   - Student/User: {enrollment.get('student_id', 'Unknown')} / {enrollment.get('user_id', 'Unknown')}")
                    print(f"     Active: {enrollment.get('is_active', 'Unknown')}")
            else:
                print(f"❌ Failed to query subject enrollments: {response.status_code}")
                
    except Exception as e:
        print(f"💥 Error checking enrollments: {e}")

if __name__ == "__main__":
    asyncio.run(check_enrollments())