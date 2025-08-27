-- Migration to integrate with Supabase Auth
-- This updates the users table to work with Supabase's built-in authentication

-- First, let's add the auth_user_id column to link with Supabase auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make auth_user_id unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Update the existing constraint to work with Supabase auth
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS check_password_for_email;

-- Add new constraint for Supabase auth integration
ALTER TABLE users 
ADD CONSTRAINT check_auth_integration 
CHECK (
    (auth_provider = 'email' AND auth_user_id IS NOT NULL) OR 
    (auth_provider = 'google' AND auth_user_id IS NOT NULL)
);

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

-- Create policies for RLS
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Allow service role to manage all users (for admin operations)
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Update existing users to have proper auth integration (if any exist)
-- This is for migration purposes only
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);