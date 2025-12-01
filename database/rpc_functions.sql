-- =============================================================================
-- MULTI-TENANT USER PROFILE MANAGEMENT RPC FUNCTIONS
-- =============================================================================
-- These functions handle user profile creation and management in organization context
-- Following Supabase OAuth guidelines - no triggers on auth.users, use RPC approach

-- =============================================================================
-- USER PROFILE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to ensure user profile exists after OAuth
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_email text;
    user_name text;
    user_provider text;
    existing_profile record;
    default_org_id uuid;
    result json;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get user info from auth.users
    SELECT email, 
           COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', email) as name,
           CASE 
               WHEN raw_user_meta_data->>'provider_id' IS NOT NULL THEN 'google'
               ELSE 'email'
           END as provider
    INTO user_email, user_name, user_provider
    FROM auth.users 
    WHERE id = current_user_id;
    
    IF user_email IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found in auth system'
        );
    END IF;
    
    -- Check if profile already exists
    SELECT * INTO existing_profile
    FROM public.users 
    WHERE auth_user_id = current_user_id;
    
    IF existing_profile IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Profile already exists',
            'user_id', existing_profile.user_id,
            'organization_id', existing_profile.organization_id
        );
    END IF;
    
    -- Get or create default organization
    SELECT organization_id INTO default_org_id
    FROM public.organizations 
    WHERE name = 'Default Organization'
    LIMIT 1;
    
    IF default_org_id IS NULL THEN
        INSERT INTO public.organizations (name, description, is_active)
        VALUES ('Default Organization', 'Default organization for new users', true)
        RETURNING organization_id INTO default_org_id;
    END IF;
    
    -- Create user profile
    INSERT INTO public.users (
        auth_user_id,
        organization_id,
        email,
        name,
        active_role,
        auth_provider,
        is_face_registered
    ) VALUES (
        current_user_id,
        default_org_id,
        user_email,
        user_name,
        'student', -- Default role
        user_provider,
        false
    );
    
    -- Get the created profile
    SELECT * INTO existing_profile
    FROM public.users 
    WHERE auth_user_id = current_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Profile created successfully',
        'user_id', existing_profile.user_id,
        'organization_id', existing_profile.organization_id,
        'email', existing_profile.email,
        'name', existing_profile.name,
        'active_role', existing_profile.active_role
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to switch user role within organization context
CREATE OR REPLACE FUNCTION public.switch_user_role(target_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_profile record;
    result json;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Validate role
    IF target_role NOT IN ('teacher', 'student') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be teacher or student'
        );
    END IF;
    
    -- Get user profile
    SELECT * INTO user_profile
    FROM public.users 
    WHERE auth_user_id = current_user_id;
    
    IF user_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    -- Update user role
    UPDATE public.users 
    SET active_role = target_role,
        updated_at = now()
    WHERE auth_user_id = current_user_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Role switched successfully',
        'user_id', user_profile.user_id,
        'organization_id', user_profile.organization_id,
        'previous_role', user_profile.active_role,
        'new_role', target_role
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to add user to organization (for admin use)
CREATE OR REPLACE FUNCTION public.add_user_to_organization(
    user_email text,
    target_organization_id uuid,
    user_role text DEFAULT 'student'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    current_user_profile record;
    target_user_id uuid;
    target_organization record;
    result json;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get current user profile to check permissions
    SELECT * INTO current_user_profile
    FROM public.users 
    WHERE auth_user_id = current_user_id;
    
    IF current_user_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Current user profile not found'
        );
    END IF;
    
    -- Check if current user is in the same organization (basic permission check)
    IF current_user_profile.organization_id != target_organization_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot add users to different organization'
        );
    END IF;
    
    -- Validate target organization exists
    SELECT * INTO target_organization
    FROM public.organizations 
    WHERE organization_id = target_organization_id AND is_active = true;
    
    IF target_organization IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Target organization not found or inactive'
        );
    END IF;
    
    -- Validate role
    IF user_role NOT IN ('teacher', 'student') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Must be teacher or student'
        );
    END IF;
    
    -- Get target user by email from auth.users
    SELECT id INTO target_user_id
    FROM auth.users 
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Target user not found in auth system'
        );
    END IF;
    
    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = target_user_id) THEN
        -- Update existing profile
        UPDATE public.users 
        SET organization_id = target_organization_id,
            active_role = user_role,
            updated_at = now()
        WHERE auth_user_id = target_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'User updated in organization',
            'organization_name', target_organization.name,
            'user_email', user_email,
            'role', user_role
        );
    ELSE
        -- Create new profile
        INSERT INTO public.users (
            auth_user_id,
            organization_id,
            email,
            name,
            active_role,
            auth_provider,
            is_face_registered
        ) VALUES (
            target_user_id,
            target_organization_id,
            user_email,
            user_email, -- Use email as name if no name available
            user_role,
            'email',
            false
        );
        
        RETURN json_build_object(
            'success', true,
            'message', 'User added to organization',
            'organization_name', target_organization.name,
            'user_email', user_email,
            'role', user_role
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to validate organization context for operations
CREATE OR REPLACE FUNCTION public.validate_organization_context(
    target_organization_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_profile record;
    organization record;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get user profile
    SELECT * INTO user_profile
    FROM public.users 
    WHERE auth_user_id = current_user_id;
    
    IF user_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    -- Check if user belongs to the target organization
    IF user_profile.organization_id != target_organization_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User does not belong to target organization'
        );
    END IF;
    
    -- Get organization details
    SELECT * INTO organization
    FROM public.organizations 
    WHERE organization_id = target_organization_id AND is_active = true;
    
    IF organization IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Organization not found or inactive'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_profile.user_id,
        'organization_id', organization.organization_id,
        'organization_name', organization.name,
        'user_role', user_profile.active_role
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to get user profile with organization context
CREATE OR REPLACE FUNCTION public.get_user_profile_with_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    user_profile record;
    organization record;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get user profile with organization
    SELECT u.*, o.name as organization_name, o.description as organization_description
    INTO user_profile
    FROM public.users u
    JOIN public.organizations o ON u.organization_id = o.organization_id
    WHERE u.auth_user_id = current_user_id AND o.is_active = true;
    
    IF user_profile IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_profile.user_id,
        'auth_user_id', user_profile.auth_user_id,
        'email', user_profile.email,
        'name', user_profile.name,
        'active_role', user_profile.active_role,
        'is_face_registered', user_profile.is_face_registered,
        'auth_provider', user_profile.auth_provider,
        'organization', json_build_object(
            'id', user_profile.organization_id,
            'name', user_profile.organization_name,
            'description', user_profile.organization_description
        ),
        'created_at', user_profile.created_at,
        'updated_at', user_profile.updated_at
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 'Multi-tenant user profile RPC functions created successfully!' as status,
       'Functions: ensure_user_profile, switch_user_role, add_user_to_organization, validate_organization_context, get_user_profile_with_context' as functions;