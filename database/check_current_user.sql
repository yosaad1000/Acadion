-- Check the current user data to debug the user_type issue
-- Run this in Supabase SQL console

-- Check users table
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check auth.users table for metadata
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;