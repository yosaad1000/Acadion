#!/usr/bin/env python3
"""
Check what users exist in the database using the LocalSupabase service
"""
import sys
import os
sys.path.append('backend')

from app.services.local_supabase import LocalSupabase
import asyncio

async def check_users():
    print("🔍 Checking users in database...")
    db = LocalSupabase()
    
    try:
        # Try to get users using the service method
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/users",
                headers=db.headers,
                params={"select": "*", "limit": "10"}
            )
            
            print(f"API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                users = response.json()
                print(f'✅ Found {len(users)} users in database:')
                print('-' * 60)
                for i, user in enumerate(users, 1):
                    print(f'{i}. Email: {user.get("email", "No email")}')
                    print(f'   User ID: {user.get("user_id", "No ID")}')
                    print(f'   Auth ID: {user.get("auth_user_id", "No auth ID")}')
                    print(f'   Role: {user.get("active_role", user.get("user_type", "No role"))}')
                    print(f'   Name: {user.get("name", "No name")}')
                    print('-' * 30)
                    
                # If we found users, let's test with the first one
                if users:
                    test_user = users[0]
                    print(f"\n🧪 Testing with first user:")
                    print(f"   Email: {test_user.get('email')}")
                    print(f"   Auth ID: {test_user.get('auth_user_id')}")
                    return test_user
                    
            else:
                print(f'❌ API Error: {response.status_code} - {response.text}')
                
    except Exception as e:
        print(f'💥 Error accessing database: {e}')
        
    return None

if __name__ == "__main__":
    result = asyncio.run(check_users())