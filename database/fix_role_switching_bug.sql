-- Fix the add_user_role function to NOT automatically switch active role
-- This was causing teachers to become students when students joined

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
  
  -- DO NOT automatically update active_role - let users switch manually
  -- The old code was: UPDATE users SET active_role = p_role_type WHERE auth_user_id = p_auth_user_id;
  -- This was causing role conflicts when multiple roles were added
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update switch_user_role to be more explicit
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

SELECT 'Role switching bug fixed! add_user_role no longer auto-switches active role.' as status;