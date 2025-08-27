-- Fix authentication errors and RLS policies
-- This script addresses the 406 and 403 errors

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Temporarily disable RLS to fix existing issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    INSERT INTO public.users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
      COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email'),
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Re-enable RLS with better policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (viewing profiles)
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT USING (
    -- Allow users to see their own profile
    auth.uid() = auth_user_id OR
    -- Allow service role full access
    auth.role() = 'service_role' OR
    -- Allow anon role to read (for initial profile creation)
    auth.role() = 'anon'
  );

-- Policy for INSERT (creating profiles)
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (
    -- Allow users to create their own profile
    auth.uid() = auth_user_id OR
    -- Allow service role full access
    auth.role() = 'service_role' OR
    -- Allow anon role to insert (for OAuth flow)
    auth.role() = 'anon'
  );

-- Policy for UPDATE (updating profiles)
CREATE POLICY "Enable update for users based on auth_user_id" ON users
  FOR UPDATE USING (
    -- Allow users to update their own profile
    auth.uid() = auth_user_id OR
    -- Allow service role full access
    auth.role() = 'service_role'
  );

-- Policy for DELETE (if needed)
CREATE POLICY "Enable delete for users based on auth_user_id" ON users
  FOR DELETE USING (
    -- Allow users to delete their own profile
    auth.uid() = auth_user_id OR
    -- Allow service role full access
    auth.role() = 'service_role'
  );

-- Grant necessary permissions to authenticated and anon roles
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT ON users TO anon;

-- Create a function to manually create user profile (for OAuth callback)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_auth_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_user_type TEXT DEFAULT 'student',
  p_auth_provider TEXT DEFAULT 'google'
)
RETURNS users AS $$
DECLARE
  new_user users;
BEGIN
  -- Check if profile already exists
  SELECT * INTO new_user FROM users WHERE auth_user_id = p_auth_user_id;
  
  IF new_user IS NULL THEN
    -- Create new profile
    INSERT INTO users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
    VALUES (p_auth_user_id, p_email, p_name, p_user_type, p_auth_provider, false)
    RETURNING * INTO new_user;
  END IF;
  
  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;