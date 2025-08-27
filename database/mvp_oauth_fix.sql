-- MVP OAuth Fix - Ensure user_type is properly handled
-- Run this in Supabase SQL console

-- First, run the RLS fix from earlier
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on auth_user_id" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on auth_user_id" ON users;

-- Temporarily disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Update the trigger function to better handle OAuth user_type
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    INSERT INTO public.users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_app_meta_data->>'name', NEW.email), 
      COALESCE(
        NEW.raw_user_meta_data->>'user_type', 
        NEW.raw_app_meta_data->>'user_type',
        'student'
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'auth_provider', 
        NEW.raw_app_meta_data->>'auth_provider',
        CASE 
          WHEN NEW.raw_user_meta_data->>'provider' = 'google' THEN 'google'
          ELSE 'email'
        END
      ),
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

-- Re-enable RLS with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT (viewing profiles)
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

-- Policy for INSERT (creating profiles)
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

-- Policy for UPDATE (updating profiles)
CREATE POLICY "Enable update for users based on auth_user_id" ON users
  FOR UPDATE USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT ON users TO anon;

-- Create/update the manual profile creation function
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
  ELSE
    -- Update existing profile if user_type is different
    IF new_user.user_type != p_user_type THEN
      UPDATE users 
      SET user_type = p_user_type, 
          auth_provider = p_auth_provider,
          updated_at = NOW()
      WHERE auth_user_id = p_auth_user_id
      RETURNING * INTO new_user;
    END IF;
  END IF;
  
  RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;

SELECT 'MVP OAuth setup complete!' as status;