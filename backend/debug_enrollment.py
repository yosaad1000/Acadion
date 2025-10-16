#!/usr/bin/env python3
"""
Debug script to test student enrollment checking
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def debug_enrollment():
    """Debug the enrollment checking process"""
    db = LocalSupabase()
    
    # Test data from the error logs
    subject_id = "decd0e0b-aaa8-4b69-acf7-29f2f911cc0a"
    test_user_email = "attendify@nitgoa.ac.in"  # From the auth logs
    
    print(f"🔍 Debugging enrollment for subject: {subject_id}")
    print(f"📧 User email: {test_user_email}")
    
    # Step 1: Check if subject exists
    print("\n1. Checking if subject exists...")
    subject = await db.get_subject_by_id(subject_id)
    if subject:
        print(f"✅ Subject found: {subject.get('name', 'Unknown')}")
        print(f"   Teacher ID: {subject.get('teacher_id', 'Unknown')}")
    else:
        print("❌ Subject not found!")
        return
    
    # Step 2: Find student by email
    print(f"\n2. Looking for student with email: {test_user_email}")
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/students",
                headers=db.headers,
                params={"email": f"eq.{test_user_email}"}
            )
            if response.status_code == 200:
                students = response.json()
                print(f"📝 Found {len(students)} students with this email")
                if students:
                    student = students[0]
                    student_id = student.get("student_id")
                    print(f"✅ Student ID: {student_id}")
                    print(f"   Name: {student.get('name', 'Unknown')}")
                    
                    # Step 3: Check enrollment
                    print(f"\n3. Checking enrollment for student {student_id} in subject {subject_id}")
                    is_enrolled = await db.is_student_enrolled(subject_id, student_id)
                    print(f"📊 Enrollment result: {is_enrolled}")
                    
                    # Step 4: Check enrollment records directly
                    print(f"\n4. Checking enrollment records directly...")
                    enrollment_response = await client.get(
                        f"{db.base_url}/rest/v1/subject_enrollments",
                        headers=db.headers,
                        params={
                            "subject_id": f"eq.{subject_id}",
                            "student_id": f"eq.{student_id}",
                            "is_active": "eq.true"
                        }
                    )
                    if enrollment_response.status_code == 200:
                        enrollments = enrollment_response.json()
                        print(f"📋 Found {len(enrollments)} enrollment records")
                        for enrollment in enrollments:
                            print(f"   - Enrollment ID: {enrollment.get('id', 'Unknown')}")
                            print(f"   - Active: {enrollment.get('is_active', 'Unknown')}")
                            print(f"   - Created: {enrollment.get('created_at', 'Unknown')}")
                    else:
                        print(f"❌ Failed to query enrollments: {enrollment_response.status_code}")
                        print(f"   Response: {enrollment_response.text}")
                else:
                    print("❌ No student found with this email")
            else:
                print(f"❌ Failed to query students: {response.status_code}")
                print(f"   Response: {response.text}")
    except Exception as e:
        print(f"💥 Error during lookup: {e}")
    
    # Step 5: List all students for debugging
    print(f"\n5. Listing all students for debugging...")
    try:
        all_students = await db.get_all_students()
        print(f"📊 Total students in database: {len(all_students)}")
        for i, student in enumerate(all_students[:5]):  # Show first 5
            print(f"   {i+1}. {student.get('name', 'Unknown')} ({student.get('email', 'Unknown')})")
        if len(all_students) > 5:
            print(f"   ... and {len(all_students) - 5} more")
    except Exception as e:
        print(f"💥 Error listing students: {e}")

if __name__ == "__main__":
    asyncio.run(debug_enrollment())