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
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 AuthContext initializing...');

    // Timeout protection - increased to 10 seconds for better reliability
    const timeout = setTimeout(() => {
      console.log('⏰ Auth timeout - forcing loading to false');
      setLoading(false);
    }, 10000);

    const fetchUserProfile = async (session: any) => {
      if (!session?.user) {
        console.log('❌ No session or user found');
        return;
      }

      if (isFetchingProfile) {
        console.log('⏳ Profile fetch already in progress, skipping...');
        return;
      }

      setIsFetchingProfile(true);

      try {
        console.log('🔍 Fetching user profile for:', session.user.email, 'ID:', session.user.id);

        // Try to fetch user profile with increased timeout
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        console.log('📊 Profile query result:', { userData, error });

        if (error) {
          console.error('❌ Error fetching user profile:', error);
          // Continue with fallback user creation instead of returning
        }

        if (userData && !error) {
          console.log('✅ User profile loaded:', {
            auth_user_id: userData.auth_user_id,
            name: userData.name,
            email: userData.email,
            active_role: userData.active_role
          });

          // Fetch all user roles
          const { data: userRolesData } = await supabase
            .from('user_roles')
            .select('role_type')
            .eq('auth_user_id', session.user.id)
            .eq('is_active', true);

          const roles = userRolesData?.map(r => r.role_type) || [userData.active_role || 'student'];

          setUser(userData);
          setCurrentRole(userData.active_role || 'student');
          setUserRoles(roles);

          console.log('✅ Profile fetch completed successfully');
          
          // Clear the selected user type from localStorage since we have the user profile
          localStorage.removeItem('selected_user_type');
        } else {
          console.warn('⚠️ No user profile found or error occurred for auth_user_id:', session.user.id);
          
          // Get user type from various sources
          const userType = localStorage.getItem('oauth_user_type') || 
                          localStorage.getItem('selected_user_type') ||
                          session.user.user_metadata?.user_type || 
                          'student';

          console.log('🔍 Determined user type:', userType, 'from sources:', {
            oauth: localStorage.getItem('oauth_user_type'),
            selected: localStorage.getItem('selected_user_type'),
            metadata: session.user.user_metadata?.user_type
          });

          // Try to create the user profile in the database
          try {
            console.log('🔄 Attempting to create user profile in database...');
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
              console.log('✅ Created new user profile in database:', newUser);
              
              // Also create the user role
              await supabase
                .from('user_roles')
                .insert({
                  auth_user_id: session.user.id,
                  role_type: userType,
                  institution_context: 'default',
                  is_active: true
                });
              
              setUser(newUser);
              setCurrentRole(userType);
              setUserRoles([userType]);
              
              // Clear the selected user type from localStorage
              localStorage.removeItem('selected_user_type');
              return;
            } else {
              console.warn('⚠️ Could not create user profile in database:', insertError);
            }
          } catch (dbError) {
            console.warn('⚠️ Database insert failed:', dbError);
          }

          // Create a temporary user object from session data to prevent auth failures
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
          setCurrentRole(userType);
          setUserRoles([userType]);

          console.log('🔧 Created temporary user profile to prevent auth failures');
          
          // Clear the selected user type from localStorage
          localStorage.removeItem('selected_user_type');
        }
      } catch (error) {
        console.error('❌ Could not fetch user profile:', error);

        // Create a fallback user object to prevent auth failures
        if (session?.user) {
          const userType = localStorage.getItem('oauth_user_type') || 
                          localStorage.getItem('selected_user_type') ||
                          session.user.user_metadata?.user_type || 
                          'student';
                          
          console.log('🔧 Creating fallback user with type:', userType);
                          
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
          setCurrentRole(userType);
          setUserRoles([userType]);

          console.log('🔧 Created fallback user profile after error');
          
          // Clear the selected user type from localStorage
          localStorage.removeItem('selected_user_type');
        } else {
          setUser(null);
          setCurrentRole('student');
          setUserRoles(['student']);
        }
      } finally {
        setIsFetchingProfile(false);
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          // Store the session token for API calls
          if (session.access_token) {
            localStorage.setItem('supabase_token', session.access_token);
          }

          await fetchUserProfile(session);
        } else {
          // No session, reset everything
          setUser(null);
          setCurrentRole('student');
          setUserRoles(['student']);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
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
        // Only fetch profile if we haven't fetched for this user ID, not currently fetching, and don't have user data
        if (lastFetchedUserId !== session.user.id && !isFetchingProfile && (!user || user.user_id !== session.user.id)) {
          console.log('🔄 New user session, fetching profile...');
          setLastFetchedUserId(session.user.id);
          await fetchUserProfile(session);
        } else {
          console.log('✅ User profile already loaded for this session or fetch in progress, skipping');
        }
      } else {
        // User signed out, reset everything
        console.log('🚪 User signed out, resetting state');
        setUser(null);
        setUserRoles(['student']);
        setCurrentRole('student');
        setLastFetchedUserId(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?user_type=${userType}`,
      }
    });
    if (error) throw error;
  };

  const switchRole = async (role: 'teacher' | 'student') => {
    if (!user || !session) return;

    try {
      console.log('🔄 Switching role to:', role);

      // Use the database function to switch role properly
      const { data, error } = await supabase.rpc('switch_user_role', {
        p_auth_user_id: session.user.id,
        p_role_type: role,
        p_institution_context: 'default'
      });

      if (error) {
        console.error('Error switching role:', error);
        throw error;
      }

      if (!data) {
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
      const { data, error } = await supabase.rpc('add_user_role', {
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
    setSession(null);
    setUserRoles(['student']);
    setCurrentRole('student');
    setLoading(false);

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