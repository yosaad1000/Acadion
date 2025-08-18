#!/usr/bin/env python3
"""
Simple integration test for scheduling router endpoints.
This can be run in the Docker environment to verify the implementation.
"""

import requests
import json
from datetime import datetime, date, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000/api"

def test_scheduling_endpoints():
    """Test the scheduling endpoints are accessible and return expected responses."""
    
    print("Testing Scheduling Router Integration...")
    
    # Test 1: Check if scheduling endpoints are registered
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print("✓ API documentation accessible")
            
            # Check if scheduling endpoints are in the OpenAPI spec
            openapi_response = requests.get(f"{BASE_URL}/openapi.json")
            if openapi_response.status_code == 200:
                openapi_spec = openapi_response.json()
                paths = openapi_spec.get("paths", {})
                
                expected_endpoints = [
                    "/api/schedules/",
                    "/api/schedules/{schedule_id}",
                    "/api/schedules/bulk",
                    "/api/schedules/{schedule_id}/sync",
                    "/api/schedules/sync-all"
                ]
                
                for endpoint in expected_endpoints:
                    if endpoint in paths:
                        print(f"✓ Endpoint {endpoint} registered")
                    else:
                        print(f"✗ Endpoint {endpoint} missing")
                        
        else:
            print("✗ API documentation not accessible")
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API server. Make sure the server is running.")
        return False
    
    # Test 2: Test authentication requirements (should return 403 without auth)
    try:
        response = requests.post(f"{BASE_URL}/schedules/", json={
            "subject_id": "TEST101",
            "title": "Test Schedule",
            "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 60
        })
        
        if response.status_code == 403:
            print("✓ Authentication required for creating schedules")
        else:
            print(f"✗ Expected 403, got {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing authentication: {e}")
    
    # Test 3: Test GET schedules endpoint (should require auth)
    try:
        response = requests.get(f"{BASE_URL}/schedules/")
        
        if response.status_code == 403:
            print("✓ Authentication required for getting schedules")
        else:
            print(f"✗ Expected 403, got {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing GET schedules: {e}")
    
    # Test 4: Test query parameters are accepted
    try:
        response = requests.get(f"{BASE_URL}/schedules/?start_date=2024-01-01&end_date=2024-12-31&subject_id=MATH101")
        
        if response.status_code == 403:  # Still should require auth, but query params should be parsed
            print("✓ Query parameters accepted")
        else:
            print(f"✗ Unexpected response code: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing query parameters: {e}")
    
    # Test 5: Test sync endpoint
    try:
        response = requests.post(f"{BASE_URL}/schedules/1/sync")
        
        if response.status_code == 403:
            print("✓ Sync endpoint requires authentication")
        else:
            print(f"✗ Expected 403, got {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing sync endpoint: {e}")
    
    print("\nScheduling Router Integration Test Complete!")
    return True

def test_api_structure():
    """Test that the API structure includes scheduling endpoints."""
    
    print("\nTesting API Structure...")
    
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            spec = response.json()
            
            # Check if scheduling tag exists
            tags = spec.get("tags", [])
            scheduling_tag_found = any(tag.get("name") == "Scheduling" for tag in tags)
            
            if scheduling_tag_found:
                print("✓ Scheduling tag found in API specification")
            else:
                print("✗ Scheduling tag not found in API specification")
            
            # Check specific endpoints and methods
            paths = spec.get("paths", {})
            
            endpoint_tests = [
                ("/api/schedules/", "post", "Create schedule"),
                ("/api/schedules/", "get", "Get schedules"),
                ("/api/schedules/{schedule_id}", "get", "Get schedule by ID"),
                ("/api/schedules/{schedule_id}", "put", "Update schedule"),
                ("/api/schedules/{schedule_id}", "delete", "Delete schedule"),
                ("/api/schedules/bulk", "post", "Bulk create schedules"),
                ("/api/schedules/{schedule_id}/sync", "post", "Sync schedule"),
                ("/api/schedules/sync-all", "post", "Sync all schedules")
            ]
            
            for endpoint, method, description in endpoint_tests:
                if endpoint in paths and method in paths[endpoint]:
                    print(f"✓ {description} endpoint found")
                else:
                    print(f"✗ {description} endpoint missing")
                    
        else:
            print("✗ Could not retrieve API specification")
            
    except Exception as e:
        print(f"✗ Error testing API structure: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("SCHEDULING ROUTER INTEGRATION TEST")
    print("=" * 60)
    
    test_api_structure()
    test_scheduling_endpoints()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print("\nNote: This test verifies that the scheduling router is properly")
    print("integrated and endpoints are accessible. Full functionality testing")
    print("requires authentication and database setup.")