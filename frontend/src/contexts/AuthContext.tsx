import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { OrganizationService } from '../services/organizationService';
import type { User, Organization } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  loading: boolean;
  userRoles: string[];
  currentRole: string;
  signUp: (email: string, password: string, name: string, userType: 'teacher' | 'student') => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (userType: 'teacher' | 'student') => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: 'teacher' | 'student') => Promise<void>;
  addRole: (role: 'teacher' | 'student') => Promise<void>;
  ensureProfile: () => Promise<boolean>;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>(['student']);
  const [currentRole, setCurrentRole] = useState<string>('student');

  // Use refs to avoid stale closures and infinite loops
  const isFetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const fetchUserProfile = async (session: any) => {
    if (!session?.user) {
      console.log('❌ No session or user found');
      return;
    }

    if (isFetchingProfile.current) {
      console.log('⏳ Profile fetch already in progress, skipping...');
      return;
    }

    isFetchingProfile.current = true;

    try {
      console.log('🔍 Fetching user profile with organization context...');

      // First, try to get existing profile with organization context
      const profileResult = await OrganizationService.getUserProfileWithContext();

      if (profileResult.success && profileResult.user_id) {
        console.log('✅ User profile found with organization context');

        // Create user object from RPC result
        const userData: User = {
          auth_user_id: session.user.id,
          user_id: profileResult.user_id,
          organization_id: profileResult.organization_id || '',
          email: profileResult.email || session.user.email || '',
          name: profileResult.name || session.user.user_metadata?.name || 'Unknown User',
          user_type: profileResult.active_role as 'teacher' | 'student' || 'student',
          active_role: profileResult.active_role as 'teacher' | 'student' || 'student',
          auth_provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
          is_face_registered: false, // Will be updated from database if needed
          created_at: new Date().toISOString()
        };

        // Get organization details if we have organization_id
        if (profileResult.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('organization_id', profileResult.organization_id)
            .single();

          if (orgData) {
            setOrganization(orgData);
            userData.organization = orgData;
          }
        }

        setUser(userData);
        currentUserRef.current = userData;
        setCurrentRole(userData.active_role);
        setUserRoles([userData.active_role]);
        localStorage.removeItem('selected_user_type');
        return;
      }

      // No profile found, create one using RPC function
      console.log('⚠️ No user profile found, creating with organization context...');

      const createResult = await OrganizationService.ensureUserProfile();

      if (createResult.success && createResult.user_id) {
        console.log('✅ User profile created with organization context');

        // Create user object from creation result
        const userData: User = {
          auth_user_id: session.user.id,
          user_id: createResult.user_id,
          organization_id: createResult.organization_id || '',
          email: createResult.email || session.user.email || '',
          name: createResult.name || session.user.user_metadata?.name || 'Unknown User',
          user_type: createResult.active_role as 'teacher' | 'student' || 'student',
          active_role: createResult.active_role as 'teacher' | 'student' || 'student',
          auth_provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
          is_face_registered: false,
          created_at: new Date().toISOString()
        };

        // Get organization details
        if (createResult.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('organization_id', createResult.organization_id)
            .single();

          if (orgData) {
            setOrganization(orgData);
            userData.organization = orgData;
          }
        }

        setUser(userData);
        currentUserRef.current = userData;
        setCurrentRole(userData.active_role);
        setUserRoles([userData.active_role]);
        localStorage.removeItem('selected_user_type');
        return;
      }

      // If RPC functions fail, create fallback user (should rarely happen)
      console.warn('⚠️ RPC functions failed, creating fallback user');
      const userType = localStorage.getItem('oauth_user_type') || 'student';

      const fallbackUser: User = {
        auth_user_id: session.user.id,
        user_id: session.user.id,
        organization_id: '', // Will be empty until profile is properly created
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email || 'Unknown User',
        user_type: userType as 'teacher' | 'student',
        active_role: userType as 'teacher' | 'student',
        auth_provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
        is_face_registered: false,
        created_at: new Date().toISOString()
      };

      setUser(fallbackUser);
      currentUserRef.current = fallbackUser;
      setCurrentRole(userType);
      setUserRoles([userType]);
      localStorage.removeItem('selected_user_type');

    } catch (error) {
      console.error('❌ Profile fetch error:', error);

      // Create minimal fallback user
      const userType = localStorage.getItem('oauth_user_type') || 'student';
      const fallbackUser: User = {
        auth_user_id: session.user.id,
        user_id: session.user.id,
        organization_id: '',
        email: session.user.email || '',
        name: session.user.user_metadata?.name || 'Unknown User',
        user_type: userType as 'teacher' | 'student',
        active_role: userType as 'teacher' | 'student',
        auth_provider: 'google',
        is_face_registered: false,
        created_at: new Date().toISOString()
      };

      setUser(fallbackUser);
      currentUserRef.current = fallbackUser;
      setCurrentRole(userType);
      setUserRoles([userType]);
    } finally {
      isFetchingProfile.current = false;
      console.log('🏁 Profile fetch process completed');
    }
  };

  useEffect(() => {
    console.log('🔄 AuthContext initializing...');

    // Timeout protection - force loading to false after 8 seconds
    const timeout = setTimeout(() => {
      console.log('⏰ Auth timeout - forcing loading to false');
      setLoading(false);
      isFetchingProfile.current = false;
    }, 8000);

    const initAuth = async () => {
      try {
        console.log('🚀 Starting initial auth check...');
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          console.log('📱 Session found, storing token and fetching profile...');
          // Store the session token for API calls
          if (session.access_token) {
            localStorage.setItem('supabase_token', session.access_token);
          }

          lastFetchedUserId.current = session.user.id;
          await fetchUserProfile(session);
        } else {
          console.log('❌ No session found, resetting to defaults');
          // No session, reset everything
          setUser(null);
          currentUserRef.current = null;
          setCurrentRole('student');
          setUserRoles(['student']);
        }
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        console.log('🏁 Initial auth check completed, setting loading to false');
        clearTimeout(timeout);
        setLoading(false);
        isFetchingProfile.current = false;
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);

      // Clear timeout when auth state changes
      clearTimeout(timeout);

      setSession(session);

      if (session?.access_token) {
        localStorage.setItem('supabase_token', session.access_token);
      } else {
        localStorage.removeItem('supabase_token');
      }

      if (session?.user) {
        // Check if this is a new user session that needs profile fetching
        const isNewUser = lastFetchedUserId.current !== session.user.id;
        const isNotFetching = !isFetchingProfile.current;
        const hasNoUserData = !currentUserRef.current || currentUserRef.current.user_id !== session.user.id;

        if (isNewUser && isNotFetching && hasNoUserData) {
          console.log('🔄 New user session detected, fetching profile...');
          lastFetchedUserId.current = session.user.id;
          await fetchUserProfile(session);
        } else {
          console.log('✅ Skipping profile fetch - already loaded or in progress');
        }
      } else {
        // User signed out, reset everything
        console.log('🚪 User signed out, resetting state');
        setUser(null);
        currentUserRef.current = null;
        setUserRoles(['student']);
        setCurrentRole('student');
        lastFetchedUserId.current = null;
      }

      // Always set loading to false after handling auth state change
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to prevent infinite loops

  const signUp = async (email: string, password: string, name: string, userType: 'teacher' | 'student') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, user_type: userType } }
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async (userType: 'teacher' | 'student') => {
    localStorage.setItem('oauth_user_type', userType);

    // Use production URL for OAuth redirect to ensure consistency
    const redirectUrl = import.meta.env.PROD
      ? 'https://acadion-gamma.vercel.app/auth/callback'
      : `${window.location.origin}/auth/callback`;

    console.log('🔍 OAuth redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}?user_type=${userType}`,
      }
    });
    if (error) throw error;
  };

  const switchRole = async (role: 'teacher' | 'student') => {
    if (!user || !session) return;

    try {
      console.log('🔄 Switching role to:', role);

      // Use the organization service to switch role
      const switchResult = await OrganizationService.switchUserRole(role);

      if (!switchResult.success) {
        throw new Error(switchResult.error || `Failed to switch to ${role} role`);
      }

      // Update local state
      setCurrentRole(role);

      // Update user object
      if (user) {
        const updatedUser = {
          ...user,
          active_role: role,
          user_type: role
        };
        setUser(updatedUser);
        currentUserRef.current = updatedUser;
      }

      console.log('✅ Role switched successfully to:', role);
    } catch (error) {
      console.error('Failed to switch role:', error);
      throw error;
    }
  };

  const addRole = async (role: 'teacher' | 'student') => {
    if (!user || !session) return;

    try {
      console.log('➕ Adding role:', role);

      // Use the database function to add role properly
      const { data: addResult, error } = await supabase.rpc('add_user_role', {
        p_auth_user_id: session.user.id,
        p_role_type: role,
        p_institution_context: 'default'
      });

      if (error) {
        console.error('Error adding role:', error);
        throw error;
      }

      // Fetch updated user roles
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true);

      const roles = userRolesData?.map(r => r.role_type) || [];
      setUserRoles(roles);

      // Update current role to the newly added role
      setCurrentRole(role);

      console.log('✅ Role added successfully:', role);
    } catch (error) {
      console.error('Failed to add role:', error);
      throw error;
    }
  };

  const ensureProfile = async (): Promise<boolean> => {
    if (!session?.user) {
      console.log('❌ No session found for profile creation');
      return false;
    }

    try {
      console.log('🔄 Ensuring user profile exists...');
      const result = await OrganizationService.ensureUserProfile();

      if (result.success) {
        console.log('✅ Profile ensured successfully');
        // Refresh the user profile
        await fetchUserProfile(session);
        return true;
      } else {
        console.error('❌ Failed to ensure profile:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error ensuring profile:', error);
      return false;
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out user');

    // Clear local storage
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('oauth_user_type');

    // Reset state immediately to prevent stale data
    setUser(null);
    currentUserRef.current = null;
    setSession(null);
    setOrganization(null);
    setUserRoles(['student']);
    setCurrentRole('student');
    setLoading(false);
    lastFetchedUserId.current = null;

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Force a page reload to ensure clean state
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        organization,
        isAuthenticated: !!session,
        loading,
        userRoles,
        currentRole,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        switchRole,
        addRole,
        ensureProfile,
        isTeacher: currentRole === 'teacher',
        isStudent: currentRole === 'student',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};