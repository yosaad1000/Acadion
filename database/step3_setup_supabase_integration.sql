-- Step 3: Set up Supabase Auth integration
-- Run this after step 2 completes successfully

-- Create a function to handle new user creation from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'auth_provider', 'email'),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile when someone signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS (Row Level Security) for the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS that handle both new and existing users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    -- New Supabase users
    auth.uid() = auth_user_id OR 
    -- Legacy users (temporarily allow access)
    (auth_user_id IS NULL AND auth.role() = 'authenticated')
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    -- New Supabase users
    auth.uid() = auth_user_id OR 
    -- Legacy users (temporarily allow updates)
    (auth_user_id IS NULL AND auth.role() = 'authenticated')
  );

-- Allow service role to manage all users (for admin operations)
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Add a flexible constraint that doesn't break existing data
ALTER TABLE users 
ADD CONSTRAINT check_auth_flexible 
CHECK (
    -- Either has Supabase auth_user_id
    auth_user_id IS NOT NULL OR 
    -- Or is a legacy user with email auth
    (auth_user_id IS NULL AND auth_provider = 'email')
);