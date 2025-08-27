-- Fix RLS policies and trigger for Supabase Auth integration

-- First, temporarily disable RLS to fix existing issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Recreate the trigger function with proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER -- This runs with the function owner's privileges
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id, 
    email, 
    name, 
    user_type, 
    auth_provider, 
    is_face_registered
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email'),
    false
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-enable RLS with better policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for development
CREATE POLICY "Allow authenticated users to read users" ON users
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert users" ON users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update own profile" ON users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow service role full access
CREATE POLICY "Service role full access" ON users
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Check if there are any orphaned Supabase auth users without profiles
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data,
  CASE 
    WHEN u.auth_user_id IS NULL THEN 'Missing profile - needs manual creation'
    ELSE 'Profile exists'
  END as status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
ORDER BY au.created_at DESC;