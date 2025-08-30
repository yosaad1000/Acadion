#!/usr/bin/env python3
"""
Debug script to check what content is being served by the frontend
"""

import requests

FRONTEND_BASE = "http://localhost:3000"

def check_route_content(route):
    """Check what content is served for a specific route"""
    try:
        response = requests.get(f"{FRONTEND_BASE}{route}")
        print(f"\n🔍 Route: {route}")
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
        
        content = response.text
        print(f"Content length: {len(content)} characters")
        
        # Check for key indicators
        if "Register Your Face" in content:
            print("✅ Contains 'Register Your Face'")
        else:
            print("❌ Missing 'Register Your Face'")
            
        if "Select Photo" in content:
            print("✅ Contains 'Select Photo'")
        else:
            print("❌ Missing 'Select Photo'")
            
        if "<title>" in content:
            title_start = content.find("<title>") + 7
            title_end = content.find("</title>")
            if title_start > 6 and title_end > title_start:
                title = content[title_start:title_end]
                print(f"Page title: {title}")
        
        # Show first 500 characters for debugging
        print(f"\nFirst 500 characters:")
        print("-" * 50)
        print(content[:500])
        print("-" * 50)
        
    except Exception as e:
        print(f"❌ Error checking {route}: {e}")

def main():
    print("🔍 Debugging Frontend Content")
    print("=" * 50)
    
    routes = ["/", "/dashboard", "/register-face", "/profile"]
    
    for route in routes:
        check_route_content(route)

if __name__ == "__main__":
    main()