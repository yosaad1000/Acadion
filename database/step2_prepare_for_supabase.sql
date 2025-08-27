-- Step 2: Prepare existing users table for Supabase integration
-- Run this after checking existing users

-- Add the auth_user_id column (nullable for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Add auth_provider column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';

-- Update existing users to have email auth_provider
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL OR auth_provider = '';

-- Remove the old constraint that's causing issues
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS check_password_for_email;

-- Make password_hash nullable (for OAuth users)
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;