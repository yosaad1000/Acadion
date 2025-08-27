-- Quick fix for infinite loading issue
-- Check current database state and fix issues

-- First, let's see what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_roles');

-- Check if users table has the right columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public';

-- Check if user_roles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
) as user_roles_exists;

-- If user_roles doesn't exist, create it
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('teacher', 'student')),
    institution_context VARCHAR(100) DEFAULT 'default',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id, role_type, institution_context)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Users can manage own roles" ON user_roles;
CREATE POLICY "Users can manage own roles" ON user_roles
  FOR ALL USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT SELECT, INSERT ON user_roles TO anon;

-- Make sure users table has active_role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'student';

-- Create default roles for existing users who don't have any
INSERT INTO user_roles (auth_user_id, role_type, institution_context)
SELECT auth_user_id, 'student', 'default'
FROM users 
WHERE auth_user_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.auth_user_id = users.auth_user_id
)
ON CONFLICT DO NOTHING;

SELECT 'Database fixed for loading issue' as status;