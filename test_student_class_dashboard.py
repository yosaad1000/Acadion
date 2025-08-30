#!/usr/bin/env python3
"""
Test script to verify the student class dashboard functionality
"""

import requests
import sys

# Configuration
API_BASE = "http://localhost:8000"
FRONTEND_BASE = "http://localhost:3000"

def test_backend_endpoints():
    """Test if backend endpoints are working"""
    print("🔍 Testing Backend Endpoints...")
    
    # Test subjects endpoint (should require auth)
    try:
        response = requests.get(f"{API_BASE}/api/subjects")
        if response.status_code in [401, 403]:
            print("✅ Subjects endpoint properly protected")
        else:
            print(f"❌ Subjects endpoint returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Subjects endpoint test failed: {e}")
        return False
    
    # Test attendance endpoint (should require auth)
    try:
        response = requests.get(f"{API_BASE}/api/attendance/test-class-id")
        if response.status_code in [401, 403]:
            print("✅ Attendance endpoint properly protected")
        else:
            print(f"❌ Attendance endpoint returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Attendance endpoint test failed: {e}")
        return False
    
    return True

def test_frontend_routes():
    """Test if frontend routes are accessible"""
    print("🔍 Testing Frontend Routes...")
    
    routes_to_test = [
        "/",
        "/dashboard", 
        "/class/test-id",
        "/student-attendance/test-id",
        "/register-face"
    ]
    
    for route in routes_to_test:
        try:
            response = requests.get(f"{FRONTEND_BASE}{route}")
            if response.status_code == 200:
                print(f"✅ Route {route} is accessible")
            else:
                print(f"❌ Route {route} returned status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Route {route} test failed: {e}")
            return False
    
    return True

def test_api_integration():
    """Test if the API integration is properly configured"""
    print("🔍 Testing API Integration...")
    
    # Check if the API base URL is reachable
    try:
        response = requests.get(f"{API_BASE}/api/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ API health check passed: {health_data}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API integration test failed: {e}")
        return False

def main():
    print("🧪 Testing Student Class Dashboard Fix")
    print("=" * 60)
    
    tests = [
        ("Backend Endpoints", test_backend_endpoints),
        ("Frontend Routes", test_frontend_routes),
        ("API Integration", test_api_integration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed += 1
            print(f"✅ {test_name} tests passed")
        else:
            print(f"❌ {test_name} tests failed")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} test suites passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The student class dashboard should be working.")
        print("\n📋 Manual testing steps:")
        print("1. Go to http://localhost:3000")
        print("2. Login with Google as a student")
        print("3. Join a class using an invite code")
        print("4. Click on the class from your dashboard")
        print("5. Should see class information (not 'Class not found')")
        print("6. Should see student-specific actions:")
        print("   - 'View My Attendance' button")
        print("   - 'Register Face' button (if not registered)")
        print("7. Click 'View My Attendance' to see attendance history")
        print("8. Navigate between Stream, People, and Attendance tabs")
        
        print("\n🔧 Key fixes applied:")
        print("- Fixed authentication to use Supabase tokens")
        print("- Updated API calls to use proper apiCall helper")
        print("- Added student-specific dashboard view")
        print("- Fixed attendance filtering for students")
        print("- Added face registration integration")
    else:
        print(f"\n❌ {total - passed} test suites failed. Please check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())