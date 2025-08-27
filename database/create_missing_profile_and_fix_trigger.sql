-- Create missing profile and fix trigger for OAuth users
-- Run this in Supabase SQL console

-- First, create the missing profile for the existing user
-- Replace 'teacher' with 'student' if you want to be a student instead
INSERT INTO users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
VALUES (
  '1682821c-054a-4451-aa57-4fff78b4e7e4',
  'yosaad1000@gmail.com',
  'Saad Sayed',
  'teacher', -- Change this to 'student' if needed
  'google',
  false
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  auth_provider = EXCLUDED.auth_provider,
  updated_at = NOW();

-- Update the trigger function to handle OAuth users better
-- The issue is that OAuth users don't have user_type in metadata initially
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    -- For OAuth users, we'll create with default 'student' type
    -- The AuthCallback will update it with the correct type
    INSERT INTO public.users (auth_user_id, email, name, user_type, auth_provider, is_face_registered)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name',
        NEW.email
      ), 
      COALESCE(
        NEW.raw_user_meta_data->>'user_type', 
        'student' -- Default to student, AuthCallback will update if needed
      ),
      CASE 
        WHEN NEW.raw_user_meta_data->>'provider_id' IS NOT NULL THEN 'google'
        ELSE 'email'
      END,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the profile was created
SELECT 
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  created_at
FROM users 
WHERE email = 'yosaad1000@gmail.com';

SELECT 'Profile created and trigger updated!' as status;