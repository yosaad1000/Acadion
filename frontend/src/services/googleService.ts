import { supabase } from '../lib/supabase';

export interface GoogleIntegrationResponse {
  integration_id: string;
  user_id: string;
  google_calendar_id?: string;
  google_drive_folder_id?: string;
  is_active: boolean;
  is_token_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoogleAuthRequest {
  authorization_code: string;
  redirect_uri: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  integration?: GoogleIntegrationResponse;
}

export interface GoogleAuthUrl {
  success: boolean;
  auth_url: string;
  message: string;
}

class GoogleService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Get Google OAuth authorization URL
   */
  async getAuthUrl(state?: string): Promise<GoogleAuthUrl> {
    try {
      const headers = await this.getAuthHeaders();
      const url = new URL(`${this.baseUrl}/api/google/auth-url`);
      
      if (state) {
        url.searchParams.append('state', state);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      throw error;
    }
  }

  /**
   * Complete Google OAuth authentication
   */
  async authenticate(authRequest: GoogleAuthRequest): Promise<GoogleAuthResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/authenticate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(authRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      throw error;
    }
  }

  /**
   * Get current user's Google integration
   */
  async getIntegration(): Promise<GoogleIntegrationResponse | null> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/integration`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No integration found
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data || null;
    } catch (error) {
      console.error('Error getting Google integration:', error);
      throw error;
    }
  }

  /**
   * Revoke Google integration
   */
  async revokeIntegration(): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/integration`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error revoking Google integration:', error);
      throw error;
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshToken(): Promise<{ success: boolean; message: string; has_valid_token: boolean }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/refresh-token`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw error;
    }
  }

  /**
   * Check Google integration service health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/google/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking Google service health:', error);
      throw error;
    }
  }

  /**
   * Generate OAuth redirect URI for current environment
   */
  getRedirectUri(): string {
    const currentOrigin = window.location.origin;
    return `${currentOrigin}/auth/google/callback`;
  }

  /**
   * Parse OAuth callback URL for authorization code
   */
  parseCallbackUrl(url: string): { code?: string; error?: string; state?: string } {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      return {
        code: params.get('code') || undefined,
        error: params.get('error') || undefined,
        state: params.get('state') || undefined,
      };
    } catch (error) {
      console.error('Error parsing callback URL:', error);
      return { error: 'Invalid callback URL' };
    }
  }
}

export const googleService = new GoogleService();