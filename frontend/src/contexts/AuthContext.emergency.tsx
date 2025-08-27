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
    console.log('🚨 EMERGENCY AUTH CONTEXT LOADED');
    
    // Force loading to false after 2 seconds max
    const emergencyTimeout = setTimeout(() => {
      console.log('🚨 EMERGENCY: Forcing loading to false');
      setLoading(false);
    }, 2000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          // Try to get user profile, but don't let it block
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .maybeSingle();
            
            if (userData) {
              setUser(userData);
              setCurrentRole(userData.active_role || 'student');
              setUserRoles([userData.active_role || 'student']);
            }
          } catch (error) {
            console.warn('Could not fetch user profile:', error);
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        clearTimeout(emergencyTimeout);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth changed:', event);
      setSession(session);
      if (!session) {
        setUser(null);
        setUserRoles(['student']);
        setCurrentRole('student');
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(emergencyTimeout);
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
    setCurrentRole(role);
    // Add actual role switching logic later
  };

  const addRole = async (role: 'teacher' | 'student') => {
    if (!userRoles.includes(role)) {
      setUserRoles([...userRoles, role]);
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setUserRoles(['student']);
    setCurrentRole('student');
    await supabase.auth.signOut();
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