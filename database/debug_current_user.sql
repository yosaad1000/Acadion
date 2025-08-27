-- Debug the current user to see what's in the database
-- Run this in Supabase SQL console

-- Check what users exist and their types
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at,
  updated_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check the auth.users table for the latest user
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;