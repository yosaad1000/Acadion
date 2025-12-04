#!/usr/bin/env python3
"""
Test script to create a valid JWT token and test the notifications API
"""
import requests
import json
from datetime import datetime, timedelta
from jose import jwt

# Configuration (from backend/app/config.py)
SECRET_KEY = "supersecretkey"  # Default from config
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
BASE_URL = "http://localhost:8000"

def create_test_token(user_id: str = "d069613e-1db3-450c-b73d-86022cc4aae2", user_type: str = "teacher"):
    """Create a valid JWT token for testing"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user_id,
        "user_type": user_type,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def test_notifications_api():
    """Test the notifications API with a valid token"""
    # Create test token
    token = create_test_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"🔑 Generated JWT Token: {token[:50]}...")
    print(f"🌐 Testing API at: {BASE_URL}")
    print("-" * 60)
    
    # Test 1: Get unread count
    print("📊 Testing unread count...")
    try:
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Unread count: {response.json()}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print()
    
    # Test 2: Get notifications list
    print("📋 Testing notifications list...")
    try:
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            notifications = response.json()
            print(f"✅ Found {len(notifications)} notifications")
            for i, notif in enumerate(notifications[:3]):  # Show first 3
                print(f"  {i+1}. {notif.get('title', 'No title')} - {notif.get('message', 'No message')[:50]}...")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print()
    
    # Test 3: Get preferences
    print("⚙️ Testing notification preferences...")
    try:
        response = requests.get(f"{BASE_URL}/api/notifications/preferences", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            preferences = response.json()
            print(f"✅ Found {len(preferences)} preferences")
            for pref in preferences[:3]:  # Show first 3
                print(f"  - {pref.get('notification_type', 'Unknown')}: {'Enabled' if pref.get('enabled') else 'Disabled'}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing Notifications API with Real JWT Token")
    print("=" * 60)
    test_notifications_api()
    print("=" * 60)
    print("✨ Test completed!")