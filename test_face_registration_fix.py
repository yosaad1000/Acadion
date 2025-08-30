#!/usr/bin/env python3
"""
Test script to verify face registration functionality after Google Auth setup
"""

import requests
import json
import sys
from pathlib import Path

# Configuration
API_BASE = "http://localhost:8000"
FRONTEND_BASE = "http://localhost:3000"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{API_BASE}/api/health")
        if response.status_code == 200:
            print("✅ Backend is running")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_auth_endpoint():
    """Test if auth endpoints are accessible"""
    try:
        # Test the /me endpoint without auth (should return 401 or 403)
        response = requests.get(f"{API_BASE}/api/auth/me")
        if response.status_code in [401, 403]:
            print("✅ Auth endpoint is properly protected")
            return True
        else:
            print(f"❌ Auth endpoint returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Auth endpoint test failed: {e}")
        return False

def test_face_registration_endpoint():
    """Test if face registration endpoint is accessible"""
    try:
        # Test the face registration endpoint without auth (should return 401 or 403)
        response = requests.post(f"{API_BASE}/api/auth/register-face")
        if response.status_code in [401, 403]:
            print("✅ Face registration endpoint is properly protected")
            return True
        else:
            print(f"❌ Face registration endpoint returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Face registration endpoint test failed: {e}")
        return False

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    try:
        response = requests.get(FRONTEND_BASE)
        if response.status_code == 200:
            print("✅ Frontend is accessible")
            return True
        else:
            print(f"❌ Frontend returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend connection failed: {e}")
        return False

def main():
    print("🧪 Testing Face Registration Fix")
    print("=" * 50)
    
    tests = [
        ("Backend Health", test_backend_health),
        ("Auth Endpoint", test_auth_endpoint),
        ("Face Registration Endpoint", test_face_registration_endpoint),
        ("Frontend Accessibility", test_frontend_accessibility),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"   ⚠️  {test_name} test failed")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The face registration fix should be working.")
        print("\n📋 Next steps for manual testing:")
        print("1. Go to http://localhost:3000")
        print("2. Login with Google as a student")
        print("3. Go to Dashboard - check if 'Face Registered' shows 'No'")
        print("4. Click on profile picture → Profile")
        print("5. Upload a clear face photo")
        print("6. Verify face registration succeeds")
    else:
        print(f"\n❌ {total - passed} tests failed. Please check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())