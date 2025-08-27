-- Fix teacher login and infinite loading issues
-- This script will properly handle role assignment and fix the database

-- First, let's check what's in the database
SELECT 'Current users:' as info;
SELECT auth_user_id, email, name, active_role FROM users;

SELECT 'Current user_roles:' as info;
SELECT auth_user_id, role_type, institution_context, is_active FROM user_roles;

-- Drop and recreate the trigger function to handle OAuth properly
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR(20) := 'student'; -- default
    oauth_user_type VARCHAR(20);
BEGIN
    -- Get user_type from OAuth metadata or URL params
    oauth_user_type := NEW.raw_user_meta_data->>'user_type';
    
    -- If no user_type in metadata, check if it's in the redirect URL or other sources
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

-- Function to manually fix existing users who logged in as teacher but show as student
CREATE OR REPLACE FUNCTION public.fix_teacher_users()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    result_text TEXT := '';
BEGIN
    -- Find users who might be teachers based on their auth metadata
    FOR user_record IN 
        SELECT u.auth_user_id, u.email, au.raw_user_meta_data, au.raw_app_meta_data
        FROM users u
        JOIN auth.users au ON u.auth_user_id = au.id
        WHERE u.active_role = 'student' -- Currently showing as student
    LOOP
        -- Check if they should be teachers
        IF user_record.raw_user_meta_data->>'user_type' = 'teacher' 
           OR user_record.raw_app_meta_data->>'user_type' = 'teacher' THEN
            
            -- Update their active role to teacher
            UPDATE users 
            SET active_role = 'teacher', updated_at = NOW()
            WHERE auth_user_id = user_record.auth_user_id;
            
            -- Add teacher role if not exists
            INSERT INTO user_roles (auth_user_id, role_type, institution_context)
            VALUES (user_record.auth_user_id, 'teacher', 'default')
            ON CONFLICT DO NOTHING;
            
            result_text := result_text || 'Fixed user: ' || user_record.email || ' -> teacher' || E'\n';
        END IF;
    END LOOP;
    
    IF result_text = '' THEN
        result_text := 'No users needed fixing';
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix function
SELECT public.fix_teacher_users();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fix_teacher_users TO authenticated, anon;

-- Show final state
SELECT 'Fixed users:' as info;
SELECT auth_user_id, email, name, active_role FROM users;

SELECT 'User roles:' as info;
SELECT ur.auth_user_id, u.email, ur.role_type, ur.institution_context, ur.is_active 
FROM user_roles ur
JOIN users u ON ur.auth_user_id = u.auth_user_id;

SELECT 'Fix complete!' as status;