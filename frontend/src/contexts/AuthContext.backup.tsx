import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('student');

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    if (!loading) {
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserRoles([]);
        setCurrentRole('student');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUserId: string) => {
    console.log('Fetching user profile for:', authUserId);
    try {
      // Don't set loading to true here - it causes infinite loading
      // setLoading(true);
      
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        setUser(null);
        setCurrentRole('student');
        setUserRoles(['student']); // Default fallback
        setLoading(false); // CRITICAL: Set loading to false
        return;
      }

      if (!userData) {
        console.log('No user profile found for auth user:', authUserId);
        setUser(null);
        setCurrentRole('student');
        setUserRoles(['student']); // Default fallback
        setLoading(false); // CRITICAL: Set loading to false
        return;
      }

      console.log('User profile found:', userData);
      setUser(userData);
      setCurrentRole(userData.active_role || 'student');

      // Try to fetch user roles, but don't fail if table doesn't exist
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role_type')
          .eq('auth_user_id', authUserId)
          .eq('is_active', true);

        if (rolesError) {
          console.warn('Error fetching user roles (table might not exist):', rolesError);
          // Fallback to user's active_role or default
          setUserRoles([userData.active_role || 'student']);
        } else if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map(r => r.role_type);
          console.log('User roles found:', roles);
          setUserRoles(roles);
        } else {
          // No roles found, use active_role as fallback
          setUserRoles([userData.active_role || 'student']);
        }
      } catch (roleError) {
        console.warn('User roles table might not exist, using fallback:', roleError);
        setUserRoles([userData.active_role || 'student']);
      }

    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      setUserRoles(['student']);
      setCurrentRole('student');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, userType: 'teacher' | 'student') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          auth_provider: 'email'
        }
      }
    });

    if (error) throw error;

    // The trigger will create the user profile and default student role
    // Add the requested role if it's different from default
    if (data.user && userType === 'teacher') {
      await supabase.rpc('add_user_role', {
        p_auth_user_id: data.user.id,
        p_role_type: 'teacher'
      });
      
      // Switch to teacher role
      await supabase.rpc('switch_user_role', {
        p_auth_user_id: data.user.id,
        p_role_type: 'teacher'
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signInWithGoogle = async (userType: 'teacher' | 'student') => {
    // Store user_type in localStorage temporarily for the OAuth callback
    localStorage.setItem('oauth_user_type', userType);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?user_type=${userType}`,
        queryParams: {
          user_type: userType
        }
      }
    });

    if (error) throw error;
  };

  const switchRole = async (role: 'teacher' | 'student') => {
    if (!session?.user) return;
    
    const { data, error } = await supabase.rpc('switch_user_role', {
      p_auth_user_id: session.user.id,
      p_role_type: role
    });

    if (error) {
      console.error('Error switching role:', error);
      throw error;
    }

    // Refetch user profile to get updated current_role
    await fetchUserProfile(session.user.id);
  };

  const addRole = async (role: 'teacher' | 'student') => {
    if (!session?.user) return;
    
    const { data, error } = await supabase.rpc('add_user_role', {
      p_auth_user_id: session.user.id,
      p_role_type: role
    });

    if (error) {
      console.error('Error adding role:', error);
      throw error;
    }

    // Refetch user profile to get updated roles
    await fetchUserProfile(session.user.id);
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setCurrentRole('student');
      setLoading(false);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if sign out fails, clear local state
      setUser(null);
      setSession(null);
      setUserRoles([]);
      setCurrentRole('student');
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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