#!/usr/bin/env python3
"""
Test script to verify the direct face registration functionality
"""

import requests
import sys

# Configuration
FRONTEND_BASE = "http://localhost:3000"

def test_face_registration_route():
    """Test if the new face registration route is accessible"""
    try:
        response = requests.get(f"{FRONTEND_BASE}/register-face")
        if response.status_code == 200:
            print("✅ Face registration page is accessible")
            # Check if it contains expected content
            content = response.text
            if "Register Your Face" in content and "Select Photo" in content:
                print("✅ Face registration page contains expected content")
                return True
            else:
                print("❌ Face registration page missing expected content")
                return False
        else:
            print(f"❌ Face registration page returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Face registration page test failed: {e}")
        return False

def test_dashboard_route():
    """Test if dashboard is accessible and might contain face registration link"""
    try:
        response = requests.get(f"{FRONTEND_BASE}/dashboard")
        if response.status_code == 200:
            print("✅ Dashboard is accessible")
            return True
        else:
            print(f"❌ Dashboard returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Dashboard test failed: {e}")
        return False

def main():
    print("🧪 Testing Direct Face Registration Implementation")
    print("=" * 60)
    
    tests = [
        ("Face Registration Route", test_face_registration_route),
        ("Dashboard Route", test_dashboard_route),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"   ⚠️  {test_name} test failed")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The direct face registration should be working.")
        print("\n📋 Manual testing steps:")
        print("1. Go to http://localhost:3000")
        print("2. Login with Google as a student")
        print("3. On Dashboard, you should see a prominent 'Register Face' button")
        print("4. Click 'Register Face' - should go to /register-face (not /profile)")
        print("5. Upload a clear face photo directly")
        print("6. Verify face registration processes and succeeds")
        print("7. Should redirect back to dashboard with updated status")
    else:
        print(f"\n❌ {total - passed} tests failed. Please check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())