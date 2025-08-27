-- Create missing user profile for the Supabase auth user
-- Replace the auth_user_id with the actual ID from the error (bba01c49-9feb-4bdc-8eec-2e941ff08976)

-- First, let's see what Supabase auth user we have
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
WHERE id = 'bba01c49-9feb-4bdc-8eec-2e941ff08976';

-- Create the missing profile manually
INSERT INTO public.users (
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider,
  is_face_registered
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'user_type', 'student'),
  'google', -- Since this was likely a Google OAuth signup
  false
FROM auth.users au
WHERE au.id = 'bba01c49-9feb-4bdc-8eec-2e941ff08976'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id
  );

-- Verify the profile was created
SELECT 
  user_id,
  auth_user_id,
  email,
  name,
  user_type,
  auth_provider
FROM public.users 
WHERE auth_user_id = 'bba01c49-9feb-4bdc-8eec-2e941ff08976';