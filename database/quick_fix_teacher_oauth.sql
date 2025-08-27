-- Quick fix for teacher OAuth login issues
-- This script fixes the immediate problem without complex checks

-- First, ensure the user_roles table exists and has proper structure
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

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage own roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage own roles" ON user_roles
  FOR ALL USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT SELECT, INSERT ON user_roles TO anon;

-- Ensure users table has active_role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(20) DEFAULT 'student';

-- Update the trigger function to handle OAuth user_type properly
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR(20) := 'student'; -- default
    oauth_user_type VARCHAR(20);
BEGIN
    -- Get user_type from OAuth metadata
    oauth_user_type := NEW.raw_user_meta_data->>'user_type';
    
    -- If no user_type in user_meta_data, check app_meta_data
    IF oauth_user_type IS NULL THEN
        oauth_user_type := NEW.raw_app_meta_data->>'user_type';
    END IF;
    
    -- Set the role based on OAuth data
    IF oauth_user_type = 'teacher' THEN
        user_role := 'teacher';
    ELSE
        user_role := 'student';
    END IF;
    
    -- Create user profile if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
        INSERT INTO public.users (auth_user_id, email, name, auth_provider, is_face_registered, active_role)
        VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(
                NEW.raw_user_meta_data->>'name', 
                NEW.raw_user_meta_data->>'full_name',
                NEW.email
            ), 
            CASE 
                WHEN NEW.raw_user_meta_data->>'provider_id' IS NOT NULL THEN 'google'
                ELSE 'email'
            END,
            false,
            user_role -- Use the determined role
        );
        
        -- Create the appropriate role in user_roles table
        INSERT INTO public.user_roles (auth_user_id, role_type, institution_context)
        VALUES (NEW.id, user_role, 'default');
        
        -- If it's a teacher, also add student role (teachers can be students too)
        IF user_role = 'teacher' THEN
            INSERT INTO public.user_roles (auth_user_id, role_type, institution_context)
            VALUES (NEW.id, 'student', 'default')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create/update the role switching functions
CREATE OR REPLACE FUNCTION public.switch_user_role(
  p_auth_user_id UUID,
  p_role_type VARCHAR(20),
  p_institution_context VARCHAR(100) DEFAULT 'default'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has this role
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE auth_user_id = p_auth_user_id 
    AND role_type = p_role_type 
    AND (institution_context = p_institution_context OR institution_context IS NULL)
    AND is_active = true
  ) THEN
    -- Update active_role in users table
    UPDATE users 
    SET active_role = p_role_type, updated_at = NOW()
    WHERE auth_user_id = p_auth_user_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_user_role(
  p_auth_user_id UUID,
  p_role_type VARCHAR(20),
  p_institution_context VARCHAR(100) DEFAULT 'default'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add role if it doesn't exist
  INSERT INTO user_roles (auth_user_id, role_type, institution_context)
  VALUES (p_auth_user_id, p_role_type, p_institution_context)
  ON CONFLICT (auth_user_id, role_type, institution_context) 
  DO UPDATE SET is_active = true, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.switch_user_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_user_role TO authenticated, anon;

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

-- Show current state
SELECT 'Current users after fix:' as info;
SELECT auth_user_id, email, name, active_role FROM users;

SELECT 'User roles after fix:' as info;
SELECT ur.auth_user_id, u.email, ur.role_type, ur.institution_context, ur.is_active 
FROM user_roles ur
JOIN users u ON ur.auth_user_id = u.auth_user_id;

SELECT 'OAuth teacher fix complete!' as status;