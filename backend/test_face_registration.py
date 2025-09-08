#!/usr/bin/env python3
"""
Simple test script to verify face registration is working correctly
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.face_recognition import face_recognition_service
from app.services.local_supabase import LocalSupabase
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_face_registration():
    """Test the face registration process"""
    
    print("🧪 Testing Face Registration Process")
    print("=" * 50)
    
    # Test 1: Check Pinecone connection
    print("\n1️⃣ Testing Pinecone Connection...")
    try:
        # Get index stats
        stats = face_recognition_service.index.describe_index_stats()
        print(f"✅ Pinecone connected successfully")
        print(f"   - Index: {face_recognition_service.index._config.name}")
        print(f"   - Total vectors: {stats.total_vector_count}")
        print(f"   - Dimension: {stats.dimension}")
    except Exception as e:
        print(f"❌ Pinecone connection failed: {e}")
        return False
    
    # Test 2: Check database connection
    print("\n2️⃣ Testing Database Connection...")
    try:
        db = LocalSupabase()
        students = await db.get_all_students()
        print(f"✅ Database connected successfully")
        print(f"   - Students in database: {len(students)}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 3: Test face encoding storage (without actual image)
    print("\n3️⃣ Testing Face Encoding Storage...")
    try:
        import numpy as np
        
        # Create a dummy face encoding (128 dimensions)
        dummy_encoding = np.random.rand(128).astype(np.float32)
        test_student_id = "test_student_123"
        
        # Store the encoding
        success = face_recognition_service.store_face_encoding(
            student_id=test_student_id,
            encoding=dummy_encoding,
            subject_ids=["test_subject_1", "test_subject_2"]
        )
        
        if success:
            print(f"✅ Face encoding stored successfully for {test_student_id}")
            
            # Try to retrieve it
            match_result = face_recognition_service.find_matching_student(dummy_encoding)
            if match_result:
                matched_id, similarity = match_result
                print(f"✅ Face encoding retrieved successfully")
                print(f"   - Matched student: {matched_id}")
                print(f"   - Similarity score: {similarity:.4f}")
                
                # Clean up - delete the test encoding
                face_recognition_service.delete_face_encoding(test_student_id)
                print(f"🧹 Test encoding cleaned up")
            else:
                print(f"❌ Could not retrieve stored face encoding")
                return False
        else:
            print(f"❌ Failed to store face encoding")
            return False
            
    except Exception as e:
        print(f"❌ Face encoding test failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Face registration system is working correctly.")
    return True

if __name__ == "__main__":
    # Run the test
    success = asyncio.run(test_face_registration())
    
    if success:
        print("\n✅ Face registration system is ready for use!")
        print("\nNext steps:")
        print("1. Start the backend server: uvicorn main:app --reload")
        print("2. Register a student face via the API")
        print("3. Test attendance recognition")
    else:
        print("\n❌ Face registration system has issues that need to be fixed.")
        sys.exit(1)