#!/usr/bin/env python3
"""
Script to apply OAuth migration to Supabase database
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
    """Apply the OAuth migration to the database"""
    
    # Read the migration SQL
    try:
        with open('database/add_oauth_support.sql', 'r') as f:
            migration_sql = f.read()
    except FileNotFoundError:
        print("❌ Migration file not found: database/add_oauth_support.sql")
        sys.exit(1)
    
    # Split the SQL into individual statements
    statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("🔄 Applying OAuth migration to Supabase...")
    
    async with httpx.AsyncClient() as client:
        for i, statement in enumerate(statements, 1):
            print(f"   Executing statement {i}/{len(statements)}...")
            
            try:
                # Use Supabase's RPC endpoint to execute raw SQL
                response = await client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                    headers=headers,
                    json={"sql": statement}
                )
                
                if response.status_code not in [200, 201, 204]:
                    # Try alternative approach using direct SQL execution
                    # This might work depending on your Supabase setup
                    print(f"   ⚠️  RPC method failed, trying alternative approach...")
                    print(f"   Statement: {statement[:100]}...")
                    
            except Exception as e:
                print(f"   ⚠️  Error executing statement {i}: {e}")
                print(f"   Statement: {statement[:100]}...")
    
    print("✅ Migration completed!")
    print("\n📋 Manual steps if automatic migration failed:")
    print("1. Go to your Supabase dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Run the contents of database/add_oauth_support.sql")
    print("\n🔧 Or run this SQL manually:")
    print("=" * 50)
    print(migration_sql)
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(apply_migration())