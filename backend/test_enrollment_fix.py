#!/usr/bin/env python3
"""
Test the enrollment fix
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.local_supabase import LocalSupabase

async def test_enrollment_fix():
    """Test the enrollment fix"""
    db = LocalSupabase()
    
    print(f"🧪 Testing enrollment fix...")
    
    # Test data
    subject_id = "decd0e0b-aaa8-4b69-acf7-29f2f911cc0a"
    auth_user_id = "9b3102bb-39c5-4ef7-97ba-b7bf52dc3160"  # From the enrollment record
    
    print(f"📊 Testing enrollment check:")
    print(f"   Subject ID: {subject_id}")
    print(f"   Auth User ID: {auth_user_id}")
    
    try:
        # Test the enrollment check with auth_user_id
        is_enrolled = await db.is_student_enrolled(subject_id, auth_user_id)
        print(f"✅ Enrollment result: {is_enrolled}")
        
        if is_enrolled:
            print(f"🎉 SUCCESS! The fix works - student is enrolled")
        else:
            print(f"❌ FAILED! Student should be enrolled but check returned False")
            
    except Exception as e:
        print(f"💥 Error testing enrollment: {e}")

if __name__ == "__main__":
    asyncio.run(test_enrollment_fix())