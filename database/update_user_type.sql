-- Update existing user type and add debugging
-- Run this in Supabase SQL console

-- First, let's see what users exist
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at
FROM users 
ORDER BY created_at DESC;

-- Update the most recent user to be a teacher (replace with your email)
-- UPDATE users 
-- SET user_type = 'teacher' 
-- WHERE email = 'your-email@gmail.com';

-- Or update all Google OAuth users to be teachers (if you want to test)
-- UPDATE users 
-- SET user_type = 'teacher' 
-- WHERE auth_provider = 'google';

-- Check the result
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at
FROM users 
ORDER BY created_at DESC;