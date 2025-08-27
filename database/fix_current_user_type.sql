-- Quick fix: Update the most recent user to be a teacher
-- Run this in Supabase SQL console

-- Update the most recent Google OAuth user to be a teacher
UPDATE users 
SET user_type = 'teacher' 
WHERE auth_provider = 'google' 
  AND auth_user_id = (
    SELECT auth_user_id 
    FROM users 
    WHERE auth_provider = 'google' 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Verify the change
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at
FROM users 
WHERE auth_provider = 'google'
ORDER BY created_at DESC 
LIMIT 3;