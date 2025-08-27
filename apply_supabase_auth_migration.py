#!/usr/bin/env python3
"""
Script to apply Supabase Auth migration
"""

import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env")
    sys.exit(1)

async def apply_migration():
    """Apply the Supabase Auth migration to the database"""
    
    # Read the migration SQL
    try:
        with open('database/supabase_auth_migration.sql', 'r') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print("❌ Migration file not found: database/supabase_auth_migration.sql")
        sys.exit(1)
    
    print("🔄 Applying Supabase Auth migration...")
    print("\n📋 Please run this SQL in your Supabase SQL Editor:")
    print("=" * 80)
    print(migration_sql)
    print("=" * 80)
    
    print("\n✅ Migration SQL displayed above!")
    print("\n🔧 Steps to complete the setup:")
    print("1. Go to your Supabase dashboard: https://supabase.com/dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Copy and paste the SQL above")
    print("4. Run the SQL")
    print("5. Go to Authentication > Providers")
    print("6. Enable Google OAuth with your credentials:")
    print("   - Client ID: YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com")
    print("   - Client Secret: YOUR_GOOGLE_CLIENT_SECRET")
    print("7. Set redirect URL to: http://localhost:3000/auth/callback")

if __name__ == "__main__":
    asyncio.run(apply_migration())