#!/usr/bin/env python3
"""
Test script for the new student sessions API endpoint
"""

import asyncio
import httpx
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_STUDENT_ID = "test_student_001"

async def test_student_sessions_endpoint():
    """Test the new student sessions API endpoint"""
    
    print("🧪 Testing Student Sessions API Endpoint")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        try:
            # Test the endpoint without authentication first (should fail)
            print("\n1. Testing endpoint without authentication...")
            response = await client.get(f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/sessions")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
            # Test with pagination parameters
            print("\n2. Testing with pagination parameters...")
            response = await client.get(
                f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/sessions",
                params={"page": 1, "page_size": 10}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
            # Test with filters
            print("\n3. Testing with status filter...")
            response = await client.get(
                f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/sessions",
                params={"filter_status": "present"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
            # Test API documentation
            print("\n4. Testing API documentation...")
            response = await client.get(f"{BASE_URL}/docs")
            print(f"   Docs Status: {response.status_code}")
            
            # Test OpenAPI schema
            print("\n5. Testing OpenAPI schema...")
            response = await client.get(f"{BASE_URL}/openapi.json")
            if response.status_code == 200:
                openapi_data = response.json()
                # Check if our new endpoint is in the schema
                paths = openapi_data.get("paths", {})
                student_sessions_path = "/api/students/{student_id}/sessions"
                if student_sessions_path in paths:
                    print(f"   ✅ Student sessions endpoint found in OpenAPI schema")
                    endpoint_info = paths[student_sessions_path]
                    print(f"   Methods: {list(endpoint_info.keys())}")
                else:
                    print(f"   ❌ Student sessions endpoint NOT found in OpenAPI schema")
            else:
                print(f"   OpenAPI Status: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Error testing endpoint: {e}")

async def test_health_check():
    """Test the health check endpoint"""
    print("\n🏥 Testing Health Check")
    print("=" * 30)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/health")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                health_data = response.json()
                print(f"Health: {json.dumps(health_data, indent=2)}")
            else:
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")

async def main():
    """Main test function"""
    print(f"🚀 Starting API Tests at {datetime.now()}")
    print(f"Base URL: {BASE_URL}")
    
    await test_health_check()
    await test_student_sessions_endpoint()
    
    print(f"\n✅ Tests completed at {datetime.now()}")

if __name__ == "__main__":
    asyncio.run(main())