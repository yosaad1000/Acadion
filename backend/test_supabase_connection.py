#!/usr/bin/env python3
"""
Test script to verify Supabase connection with new project configuration
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

# Load environment variables (force reload)
load_dotenv(override=True)

async def test_supabase_connection():
    """Test connection to new Supabase project"""
    
    # Get configuration from environment
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    print("🔧 Testing Supabase Connection")
    print(f"📍 URL: {supabase_url}")
    print(f"🔑 Anon Key: {supabase_key[:20]}..." if supabase_key else "❌ Missing anon key")
    print(f"🔐 Service Key: {supabase_service_key[:20]}..." if supabase_service_key else "❌ Missing service key")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing required Supabase configuration")
        return False
    
    # Test with anon key
    headers_anon = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            print("\n🧪 Testing anon key connection...")
            response = await client.get(
                f"{supabase_url}/rest/v1/",
                headers=headers_anon
            )
            
            if response.status_code == 200:
                print("✅ Anon key connection successful")
            else:
                print(f"❌ Anon key connection failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
            
            # Test service key if available
            if supabase_service_key:
                headers_service = {
                    "apikey": supabase_service_key,
                    "Authorization": f"Bearer {supabase_service_key}",
                    "Content-Type": "application/json"
                }
                
                print("\n🧪 Testing service key connection...")
                response = await client.get(
                    f"{supabase_url}/rest/v1/",
                    headers=headers_service
                )
                
                if response.status_code == 200:
                    print("✅ Service key connection successful")
                else:
                    print(f"❌ Service key connection failed: {response.status_code}")
                    print(f"Response: {response.text}")
            
            # Test database tables access
            print("\n🗄️ Testing database table access...")
            
            # Test organizations table
            response = await client.get(
                f"{supabase_url}/rest/v1/organizations",
                headers=headers_anon,
                params={"limit": "1"}
            )
            
            if response.status_code == 200:
                print("✅ Organizations table accessible")
                orgs = response.json()
                print(f"📊 Found {len(orgs)} organizations")
            else:
                print(f"❌ Organizations table access failed: {response.status_code}")
                print(f"Response: {response.text}")
            
            # Test users table
            response = await client.get(
                f"{supabase_url}/rest/v1/users",
                headers=headers_anon,
                params={"limit": "1"}
            )
            
            if response.status_code == 200:
                print("✅ Users table accessible")
                users = response.json()
                print(f"👥 Found {len(users)} users")
            else:
                print(f"❌ Users table access failed: {response.status_code}")
                print(f"Response: {response.text}")
            
            print("\n🎉 Supabase connection test completed!")
            return True
            
    except Exception as e:
        print(f"💥 Connection test failed with exception: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_supabase_connection())