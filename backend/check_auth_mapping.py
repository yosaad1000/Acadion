#!/usr/bin/env python3
"""
Check if student_id matches auth_user_id
"""
import asyncio
import sys
import os
import httpx

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def check_auth_mapping():
    """Check if student_id matches auth_user_id"""
    db = LocalSupabase()
    
    print(f"🔍 Checking auth_user_id mapping...")
    
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
                    auth_user_id = user.get("auth_user_id")
                    print(f"✅ Found user:")
                    print(f"   User ID:      {user_id}")
                    print(f"   Auth User ID: {auth_user_id}")
                    print(f"   Name: {user.get('name', 'Unknown')}")
                    print(f"   Email: {user.get('email', 'Unknown')}")
                    print(f"   Role: {user.get('active_role', 'Unknown')}")
                    
                    # Check if auth_user_id matches the student_id in enrollments
                    enrollment_student_id = "9b3102bb-39c5-4ef7-97ba-b7bf52dc3160"
                    print(f"\n🔗 Comparing IDs:")
                    print(f"   Auth User ID: {auth_user_id}")
                    print(f"   Student ID:   {enrollment_student_id}")
                    print(f"   Match: {auth_user_id == enrollment_student_id}")
                    
                    if auth_user_id == enrollment_student_id:
                        print(f"✅ CONFIRMED: student_id in enrollments is auth_user_id!")
                        print(f"🔧 The fix is to use auth_user_id for enrollment checks")
                    else:
                        print(f"❌ auth_user_id doesn't match either")
                        
                        # Let's check all users to see if any match the enrollment student_id
                        print(f"\n🔍 Checking all users to find matching ID...")
                        all_users_response = await client.get(
                            f"{db.base_url}/rest/v1/users",
                            headers=db.headers
                        )
                        if all_users_response.status_code == 200:
                            all_users = all_users_response.json()
                            print(f"👥 Checking {len(all_users)} users...")
                            for user in all_users:
                                if (user.get("user_id") == enrollment_student_id or 
                                    user.get("auth_user_id") == enrollment_student_id):
                                    print(f"✅ MATCH FOUND:")
                                    print(f"   Name: {user.get('name', 'Unknown')}")
                                    print(f"   Email: {user.get('email', 'Unknown')}")
                                    print(f"   User ID: {user.get('user_id')}")
                                    print(f"   Auth User ID: {user.get('auth_user_id')}")
                                    print(f"   Role: {user.get('active_role', 'Unknown')}")
                                    break
                            else:
                                print(f"❌ No user found with matching ID")
                else:
                    print(f"❌ No user found with email {student_email}")
            else:
                print(f"❌ Failed to query users: {response.status_code}")
                
    except Exception as e:
        print(f"💥 Error checking auth mapping: {e}")

if __name__ == "__main__":
    asyncio.run(check_auth_mapping())