import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>(['student']);
  const [currentRole, setCurrentRole] = useState<string>('student');

  // Use refs to avoid stale closures and infinite loops
  const isFetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    console.log('🔄 AuthContext initializing...');

    // Timeout protection - force loading to false after 8 seconds
    const timeout = setTimeout(() => {
      console.log('⏰ Auth timeout - forcing loading to false');
      setLoading(false);
      isFetchingProfile.current = false;
    }, 8000);

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
        // Try to fetch user profile with a timeout
        const profilePromise = supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        let userData, error;
        try {
          const result = await Promise.race([profilePromise, timeoutPromise]) as any;
          userData = result.data;
          error = result.error;
        } catch (timeoutError) {
          console.warn('⚠️ Profile fetch timeout, using fallback');
          error = null;
          userData = null;
        }

        console.log('📊 Profile query result:', { userData, error });

        if (userData && !error) {
          console.log('✅ User profile found in database');

          // Fetch user roles
          const { data: userRolesData } = await supabase
            .from('user_roles')
            .select('role_type')
            .eq('auth_user_id', session.user.id)
            .eq('is_active', true);

          const roles = userRolesData?.map(r => r.role_type) || [userData.active_role || 'student'];

          setUser(userData);
          currentUserRef.current = userData;
          setCurrentRole(userData.active_role || 'student');
          setUserRoles(roles);

          console.log('✅ Profile loaded successfully');
          localStorage.removeItem('selected_user_type');
          return;
        }

        // No user profile found, create one
        console.log('⚠️ No user profile found, creating new profile...');

        const userType = localStorage.getItem('oauth_user_type') ||
          localStorage.getItem('selected_user_type') ||
          session.user.user_metadata?.user_type ||
          'student';

        // Creating user profile

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            auth_user_id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || 'Unknown User',
            active_role: userType,
            auth_provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
            is_face_registered: false
          })
          .select()
          .single();

        if (newUser && !insertError) {
          console.log('✅ Created new user profile in database');

          // Create user role
          await supabase
            .from('user_roles')
            .insert({
              auth_user_id: session.user.id,
              role_type: userType,
              institution_context: 'default',
              is_active: true
            });

          setUser(newUser);
          currentUserRef.current = newUser;
          setCurrentRole(userType);
          setUserRoles([userType]);
          localStorage.removeItem('selected_user_type');
          return;
        }

        // If database operations fail, create temporary user
        console.warn('⚠️ Database operations failed, creating temporary user');
        const tempUser: User = {
          auth_user_id: session.user.id,
          user_id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || 'Unknown User',
          user_type: userType as 'teacher' | 'student',
          active_role: userType as 'teacher' | 'student',
          auth_provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
          is_face_registered: false,
          created_at: new Date().toISOString()
        };

        setUser(tempUser);
        currentUserRef.current = tempUser;
        setCurrentRole(userType);
        setUserRoles([userType]);
        localStorage.removeItem('selected_user_type');

      } catch (error) {
        console.error('❌ Profile fetch error:', error);

        // Create fallback user
        const userType = localStorage.getItem('oauth_user_type') ||
          localStorage.getItem('selected_user_type') ||
          session.user.user_metadata?.user_type ||
          'student';

        const fallbackUser: User = {
          auth_user_id: session.user.id,
          user_id: session.user.id,
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

        console.log('🔧 Created fallback user profile');
      } finally {
        isFetchingProfile.current = false;
        console.log('🏁 Profile fetch process completed');
      }
    };

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

      // Use the database function to switch role properly
      const { data: switchResult, error } = await supabase.rpc('switch_user_role', {
        p_auth_user_id: session.user.id,
        p_role_type: role,
        p_institution_context: 'default'
      });

      if (error) {
        console.error('Error switching role:', error);
        throw error;
      }

      if (!switchResult) {
        throw new Error(`You don't have permission to switch to ${role} role`);
      }

      // Update local state
      setCurrentRole(role);

      // Fetch updated user profile to get the latest active_role
      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single();

      if (updatedUser) {
        setUser(updatedUser);
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

  const signOut = async () => {
    console.log('🚪 Signing out user');

    // Clear local storage
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('oauth_user_type');

    // Reset state immediately to prevent stale data
    setUser(null);
    currentUserRef.current = null;
    setSession(null);
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