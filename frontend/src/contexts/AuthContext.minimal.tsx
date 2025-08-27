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
  const [userRoles, setUserRoles] = useState<string[]>(['student']);
  const [currentRole, setCurrentRole] = useState<string>('student');

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) {
          console.log('❌ Component unmounted, aborting');
          return;
        }

        if (error) {
          console.error('❌ Error getting session:', error);
          setLoading(false);
          return;
        }

        console.log('✅ Session retrieved:', session ? 'exists' : 'none');
        setSession(session);
        
        if (session?.user) {
          console.log('👤 User found, fetching profile...');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('👤 No user, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('🔄 Auth state changed:', event, session?.user?.id);
      setSession(session);

      if (session?.user) {
        console.log('👤 User in auth change, fetching profile...');
        await fetchUserProfile(session.user.id);
      } else {
        console.log('👤 No user in auth change, clearing state');
        setUser(null);
        setUserRoles(['student']);
        setCurrentRole('student');
        setLoading(false);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth context');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUserId: string) => {
    console.log('🔍 Fetching user profile for:', authUserId);
    
    try {
      // Always set loading to true when starting
      setLoading(true);
      
      // Simple timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      
      const { data: userData, error: userError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (userError) {
        console.error('❌ Error fetching user profile:', userError);
        // Set defaults and stop loading
        setUser(null);
        setCurrentRole('student');
        setUserRoles(['student']);
        setLoading(false);
        return;
      }

      if (!userData) {
        console.log('❌ No user profile found for auth user:', authUserId);
        // Set defaults and stop loading
        setUser(null);
        setCurrentRole('student');
        setUserRoles(['student']);
        setLoading(false);
        return;
      }

      console.log('✅ User profile found:', userData);
      setUser(userData);
      setCurrentRole(userData.active_role || 'student');

      // Try to fetch roles with timeout
      try {
        const rolesPromise = supabase
          .from('user_roles')
          .select('role_type')
          .eq('auth_user_id', authUserId)
          .eq('is_active', true);
          
        const { data: rolesData, error: rolesError } = await Promise.race([
          rolesPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Roles fetch timeout')), 5000))
        ]) as any;

        if (rolesError || !rolesData) {
          console.warn('⚠️ Could not fetch roles, using fallback:', rolesError?.message);
          setUserRoles([userData.active_role || 'student']);
        } else {
          const roles = rolesData.map((r: any) => r.role_type);
          console.log('✅ User roles found:', roles);
          setUserRoles(roles.length > 0 ? roles : [userData.active_role || 'student']);
        }
      } catch (roleError) {
        console.warn('⚠️ Roles fetch failed, using fallback:', roleError);
        setUserRoles([userData.active_role || 'student']);
      }

    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      setUser(null);
      setUserRoles(['student']);
      setCurrentRole('student');
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  };

  // Simplified functions
  const signUp = async (email: string, password: string, name: string, userType: 'teacher' | 'student') => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, user_type: userType }
      }
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
    if (!session?.user) return;
    
    try {
      await supabase.rpc('switch_user_role', {
        p_auth_user_id: session.user.id,
        p_role_type: role
      });
      await fetchUserProfile(session.user.id);
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  const addRole = async (role: 'teacher' | 'student') => {
    if (!session?.user) return;
    
    try {
      await supabase.rpc('add_user_role', {
        p_auth_user_id: session.user.id,
        p_role_type: role
      });
      await fetchUserProfile(session.user.id);
    } catch (error) {
      console.error('Error adding role:', error);
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setUserRoles(['student']);
    setCurrentRole('student');
    setLoading(false);
    
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error:', error);
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