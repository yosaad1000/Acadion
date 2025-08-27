import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (data.session) {
          // Get user type from multiple sources (URL params, localStorage, default)
          const userTypeFromUrl = searchParams.get('user_type');
          const userTypeFromStorage = localStorage.getItem('oauth_user_type');
          const userType = userTypeFromUrl || userTypeFromStorage || 'student';
          
          console.log('OAuth callback - user_type sources:', {
            fromUrl: userTypeFromUrl,
            fromStorage: userTypeFromStorage,
            final: userType
          });
          
          // Clean up localStorage
          localStorage.removeItem('oauth_user_type');
          
          // Update the user's auth metadata with the user_type for the trigger
          const { error: updateError } = await supabase.auth.updateUser({
            data: { user_type: userType }
          });

          if (updateError) {
            console.warn('Could not update user metadata:', updateError);
          }

          // Wait a moment for the trigger to process
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if user profile exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', data.session.user.id)
            .maybeSingle();

          if (!existingUser) {
            console.log('No user profile found, trigger should have created it. Creating manually...');
            // Manual fallback - create user profile directly
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                auth_user_id: data.session.user.id,
                email: data.session.user.email,
                name: data.session.user.user_metadata?.name || data.session.user.email,
                active_role: userType,
                auth_provider: 'google',
                is_face_registered: false
              });

            if (insertError) {
              console.error('Manual user creation failed:', insertError);
            } else {
              console.log('User profile created manually');
              
              // Add the role to user_roles table
              await supabase
                .from('user_roles')
                .insert({
                  auth_user_id: data.session.user.id,
                  role_type: userType,
                  institution_context: 'default'
                });
            }
          } else {
            console.log('Existing user found:', existingUser);
            console.log('Current active_role:', existingUser.active_role, 'Requested role:', userType);
            
            // Add the requested role if user doesn't have it
            const { error: roleError } = await supabase.rpc('add_user_role', {
              p_auth_user_id: data.session.user.id,
              p_role_type: userType
            });

            if (roleError) {
              console.error('Error adding role:', roleError);
            }

            // Switch to the requested role
            const { error: switchError } = await supabase.rpc('switch_user_role', {
              p_auth_user_id: data.session.user.id,
              p_role_type: userType
            });

            if (switchError) {
              console.error('Error switching role:', switchError);
            } else {
              console.log('Successfully switched to role:', userType);
            }
          }

          // Force a page reload to ensure AuthContext refetches the user profile
          // This ensures the correct dashboard is shown based on updated user_type
          window.location.href = '/dashboard';
        } else {
          throw new Error('No session found');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-600">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;