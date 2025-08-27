-- Step 1: Check existing users in the database
-- Run this first to see what data we're working with

SELECT 
  user_id,
  email,
  name,
  user_type,
  auth_provider,
  password_hash,
  created_at,
  CASE 
    WHEN password_hash IS NOT NULL THEN 'Has password (email auth)'
    WHEN password_hash IS NULL THEN 'No password (needs setup)'
    ELSE 'Unknown'
  END as auth_status
FROM users 
ORDER BY created_at DESC;