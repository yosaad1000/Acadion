-- Redesign database to support multiple roles per user
-- A person can be both teacher and student in different contexts

-- First, let's modify the users table to remove the single user_type constraint
ALTER TABLE users DROP COLUMN IF EXISTS user_type;

-- Add a active_role column for the active session role (avoiding reserved keyword)
ALTER TABLE users ADD COLUMN active_role VARCHAR(20) DEFAULT 'student';

-- Create a user_roles table to track all roles a user can have
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('teacher', 'student')),
    institution_context VARCHAR(100), -- Optional: track which institution/context
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id, role_type, institution_context)
);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
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

-- Update the trigger function to create default student role
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
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
      'student' -- Default role
    );
    
    -- Create default student role
    INSERT INTO public.user_roles (auth_user_id, role_type, institution_context)
    VALUES (NEW.id, 'student', 'default');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch user role
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

-- Function to add a new role to user
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

-- Migrate existing users (if any)
INSERT INTO user_roles (auth_user_id, role_type, institution_context)
SELECT auth_user_id, 'student', 'default'
FROM users 
WHERE auth_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

SELECT 'Multi-role system setup complete!' as status;