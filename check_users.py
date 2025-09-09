#!/usr/bin/env python3
"""
Check what users exist in the database
"""
import sys
import os
sys.path.append('backend')

from app.services.local_supabase import LocalSupabase
import asyncio

async def check_users():
    db = LocalSupabase()
    try:
        result = db.supabase.table('users').select('*').limit(10).execute()
        print(f'Found {len(result.data)} users in database:')
        print('-' * 50)
        for i, user in enumerate(result.data, 1):
            print(f'{i}. Email: {user.get("email", "No email")}')
            print(f'   User ID: {user.get("user_id", "No ID")}')
            print(f'   Auth ID: {user.get("auth_user_id", "No auth ID")}')
            print(f'   Role: {user.get("active_role", "No role")}')
            print('-' * 30)
    except Exception as e:
        print(f'Error accessing database: {e}')
        print('This might mean the users table does not exist or is empty.')

if __name__ == "__main__":
    asyncio.run(check_users())