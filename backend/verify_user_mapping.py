#!/usr/bin/env python3
"""
Verify the user_id to student_id mapping
"""
import asyncio
import sys
import os
import httpx

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def verify_mapping():
    """Verify the user_id to student_id mapping"""
    db = LocalSupabase()
    
    print(f"🔍 Verifying user_id to student_id mapping...")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get the student user
            student_email = "attendify@nitgoa.ac.in"
            print(f"📧 Looking for user: {student_email}")
            
            response = await client.get(
                f"{db.base_url}/rest/v1/users",
                headers=db.headers,
                params={"email": f"eq.{student_email}"}
            )
            
            if response.status_code == 200:
                users = response.json()
                if users:
                    user = users[0]
                    user_id = user.get("user_id")
                    print(f"✅ Found user:")
                    print(f"   User ID: {user_id}")
                    print(f"   Name: {user.get('name', 'Unknown')}")
                    print(f"   Email: {user.get('email', 'Unknown')}")
                    print(f"   Role: {user.get('active_role', 'Unknown')}")
                    
                    # Check if this user_id matches the student_id in enrollments
                    enrollment_student_id = "9b3102bb-39c5-4ef7-97ba-b7bf52dc3160"
                    print(f"\n🔗 Comparing IDs:")
                    print(f"   User ID:    {user_id}")
                    print(f"   Student ID: {enrollment_student_id}")
                    print(f"   Match: {user_id == enrollment_student_id}")
                    
                    if user_id == enrollment_student_id:
                        print(f"✅ CONFIRMED: student_id in enrollments is actually user_id!")
                    else:
                        print(f"❌ IDs don't match - different mapping system")
                        
                        # Check if there's a different enrollment for this user_id
                        print(f"\n🔍 Checking for enrollments with user_id as student_id...")
                        response = await client.get(
                            f"{db.base_url}/rest/v1/subject_enrollments",
                            headers=db.headers,
                            params={"student_id": f"eq.{user_id}"}
                        )
                        if response.status_code == 200:
                            user_enrollments = response.json()
                            print(f"📊 Found {len(user_enrollments)} enrollments for user_id as student_id")
                        else:
                            print(f"❌ Failed to check user enrollments")
                else:
                    print(f"❌ No user found with email {student_email}")
            else:
                print(f"❌ Failed to query users: {response.status_code}")
                
    except Exception as e:
        print(f"💥 Error verifying mapping: {e}")

if __name__ == "__main__":
    asyncio.run(verify_mapping())