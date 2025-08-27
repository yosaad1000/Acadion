-- Check users and trigger function
-- Run this in Supabase SQL console

-- Check if any users exist
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN auth_provider = 'google' THEN 1 END) as google_users,
  COUNT(CASE WHEN auth_provider = 'email' THEN 1 END) as email_users
FROM users;

-- Check recent users with details
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

-- Check if trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check auth.users table (recent entries)
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 3;