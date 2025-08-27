-- Migration to add OAuth support to users table
-- Add new columns for OAuth authentication

-- Add auth_provider column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email' 
CHECK (auth_provider IN ('email', 'google'));

-- Add google_id column for Google OAuth users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;

-- Make password_hash nullable for OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Update existing users to have email auth_provider
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add constraint to ensure password_hash is required for email auth
ALTER TABLE users 
ADD CONSTRAINT check_password_for_email 
CHECK (
    (auth_provider = 'email' AND password_hash IS NOT NULL) OR 
    (auth_provider = 'google' AND google_id IS NOT NULL)
);