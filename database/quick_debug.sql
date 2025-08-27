-- Quick debug - check if the database setup is working
-- Run this in Supabase SQL console

-- Check if users table exists and has data
SELECT COUNT(*) as user_count FROM users;

-- Check recent users
SELECT 
  auth_user_id,
  email,
  user_type,
  auth_provider,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 3;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';