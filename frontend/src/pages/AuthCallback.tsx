import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { OrganizationService } from '../services/organizationService';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Starting auth callback handling...');
        
        // Handle OAuth callback - check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.has('code') || urlParams.has('access_token');
        
        // Check for authentication parameters

        let session = null;

        // Check if there's an error in the URL first
        const urlError = urlParams.get('error');
        const urlErrorDescription = urlParams.get('error_description');
        
        if (urlError) {
          console.error('❌ OAuth error in URL:', { error: urlError, description: urlErrorDescription });
          throw new Error(`OAuth error: ${urlError} - ${urlErrorDescription}`);
        }

        if (hasAuthParams) {
          // If we have auth parameters in URL, let Supabase handle the callback
          console.log('📥 Processing OAuth callback from URL...');
          
          // Try to exchange the code for a session
          const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(urlParams.get('code') || '');
          
          if (authError) {
            console.error('❌ Code exchange error:', authError);
            throw authError;
          }
          
          session = authData.session;
          console.log('✅ Session from code exchange:', session ? 'Success' : 'Failed');
        } else {
          // No auth params, just check for existing session
          // No auth params, check existing session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            throw sessionError;
          }
          
          session = sessionData.session;
        }

        console.log('📱 Session status:', session ? 'Found' : 'Not found');

        if (session) {
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
          
          console.log('✅ Session found, user:', session.user.email);
          
          // Update the user's auth metadata with the user_type
          const { error: updateError } = await supabase.auth.updateUser({
            data: { user_type: userType }
          });

          if (updateError) {
            console.warn('Could not update user metadata:', updateError);
          }

          // Use the organization service to ensure user profile is created
          console.log('🔄 Creating user profile with organization context...');
          const profileResult = await OrganizationService.ensureUserProfile();

          if (!profileResult.success) {
            console.error('❌ Profile creation error:', profileResult.error);
            throw new Error(`Failed to create user profile: ${profileResult.error}`);
          }

          console.log('✅ Profile creation result:', profileResult);

          // If user requested a different role than default, handle role switching
          if (userType !== 'student') {
            console.log('🔄 Switching to requested role:', userType);
            
            const switchResult = await OrganizationService.switchUserRole(userType as 'teacher' | 'student');
            
            if (!switchResult.success) {
              console.error('Error switching role:', switchResult.error);
            } else {
              console.log('✅ Successfully switched to role:', userType);
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