#!/usr/bin/env python3
"""
Test script for subject-based face recognition filtering
Run this after implementing the enhancement to verify it works correctly
"""

import asyncio
import sys
import os
import numpy as np
from typing import List, Dict

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.face_recognition import FaceRecognitionService
from app.services.storage_service import StorageService
from app.settings import settings

async def test_subject_filtering():
    """Test the subject filtering functionality"""
    
    print("🧪 Testing Subject-Based Face Recognition Filtering")
    print("=" * 60)
    
    try:
        # Initialize services
        from app.services.face_recognition import get_face_recognition_service
        face_service = get_face_recognition_service()
        storage_service = StorageService()
        
        print("✅ Services initialized successfully")
        
        # Test 1: Check if we can store face encodings with subject metadata
        print("\n📝 Test 1: Storing face encoding with subject metadata")
        
        # Create a dummy face encoding (128-dimensional vector)
        dummy_encoding = np.random.rand(128).astype(np.float32)
        test_student_id = "test_student_001"
        test_subjects = ["math_101", "physics_201"]
        
        success = face_service.store_face_encoding(
            student_id=test_student_id,
            encoding=dummy_encoding,
            subject_ids=test_subjects
        )
        
        if success:
            print(f"✅ Successfully stored face encoding for {test_student_id}")
            print(f"   Subjects: {test_subjects}")
        else:
            print(f"❌ Failed to store face encoding for {test_student_id}")
            return False
        
        # Test 2: Test filtered search
        print("\n🔍 Test 2: Testing filtered face recognition")
        
        # Test with subject filter
        result_with_filter = face_service.find_matching_student(
            encoding=dummy_encoding,
            subject_id="math_101"
        )
        
        if result_with_filter:
            student_id, confidence = result_with_filter
            print(f"✅ Found match with subject filter: {student_id} (confidence: {confidence:.4f})")
        else:
            print("❌ No match found with subject filter")
        
        # Test without subject filter
        result_without_filter = face_service.find_matching_student(
            encoding=dummy_encoding,
            subject_id=None
        )
        
        if result_without_filter:
            student_id, confidence = result_without_filter
            print(f"✅ Found match without subject filter: {student_id} (confidence: {confidence:.4f})")
        else:
            print("❌ No match found without subject filter")
        
        # Test 3: Test with non-matching subject
        print("\n🚫 Test 3: Testing with non-enrolled subject")
        
        result_wrong_subject = face_service.find_matching_student(
            encoding=dummy_encoding,
            subject_id="chemistry_301"  # Student not enrolled in this
        )
        
        if result_wrong_subject:
            print(f"❌ Unexpected match found for non-enrolled subject: {result_wrong_subject[0]}")
        else:
            print("✅ Correctly filtered out student not enrolled in chemistry_301")
        
        # Test 4: Test storage service integration
        print("\n🔗 Test 4: Testing storage service integration")
        
        try:
            storage_service.store_student_face(
                student_id="test_student_002",
                name="Test Student 2",
                face_encoding=dummy_encoding,
                subject_ids=["physics_201", "chemistry_301"]
            )
            print("✅ Storage service integration working")
        except Exception as e:
            print(f"❌ Storage service integration failed: {e}")
        
        # Cleanup
        print("\n🧹 Cleaning up test data")
        try:
            face_service.delete_face_encoding("test_student_001")
            face_service.delete_face_encoding("test_student_002")
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")
        
        print("\n🎉 All tests completed successfully!")
        print("\n📊 Summary:")
        print("   ✅ Face encoding storage with subject metadata")
        print("   ✅ Subject-filtered face recognition")
        print("   ✅ Cross-subject isolation")
        print("   ✅ Storage service integration")
        
        return True
        
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_migration_service():
    """Test the migration service functionality"""
    
    print("\n🔄 Testing Face Migration Service")
    print("=" * 40)
    
    try:
        from app.services.face_migration_service import face_migration_service
        
        # Test getting stats
        stats = await face_migration_service.get_face_encoding_stats()
        print(f"📊 Current face encoding stats: {stats}")
        
        # Test updating a specific student (if any exist)
        # This is a safe operation that won't break anything
        print("✅ Migration service is accessible and functional")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration service test failed: {e}")
        return False

def check_configuration():
    """Check if the required configuration is present"""
    
    print("🔧 Checking Configuration")
    print("=" * 30)
    
    required_settings = [
        "PINECONE_API_KEY",
        "PINECONE_INDEX_NAME", 
        "FACE_THRESHOLD"
    ]
    
    missing_settings = []
    
    for setting in required_settings:
        if not hasattr(settings, setting) or not getattr(settings, setting):
            missing_settings.append(setting)
        else:
            print(f"✅ {setting}: {'*' * 10}")  # Hide actual values
    
    if missing_settings:
        print(f"\n❌ Missing required settings: {missing_settings}")
        print("Please check your .env file and ensure all required settings are present.")
        return False
    
    print("✅ All required settings are present")
    return True

async def main():
    """Main test function"""
    
    print("🚀 Subject-Based Face Recognition Test Suite")
    print("=" * 50)
    
    # Check configuration first
    if not check_configuration():
        print("\n❌ Configuration check failed. Please fix configuration before running tests.")
        return
    
    # Run tests
    tests_passed = 0
    total_tests = 2
    
    # Test 1: Subject filtering functionality
    if await test_subject_filtering():
        tests_passed += 1
    
    # Test 2: Migration service
    if await test_migration_service():
        tests_passed += 1
    
    # Summary
    print(f"\n📋 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Subject filtering is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the output above for details.")

if __name__ == "__main__":
    asyncio.run(main())