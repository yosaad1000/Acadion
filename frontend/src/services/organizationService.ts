import { supabase } from '../lib/supabase'
import type { Organization, ProfileCreationResult } from '../lib/supabase'

export class OrganizationService {
  /**
   * Ensure user profile exists after OAuth login
   * Calls the ensure_user_profile RPC function
   */
  static async ensureUserProfile(): Promise<ProfileCreationResult> {
    try {
      const { data, error } = await supabase.rpc('ensure_user_profile')
      
      if (error) {
        console.error('❌ RPC Error:', error)
        return {
          success: false,
          error: error.message
        }
      }
      
      console.log('✅ Profile creation result:', data)
      return data as ProfileCreationResult
      
    } catch (error) {
      console.error('❌ Error ensuring user profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get user profile with organization context
   * Calls the get_user_profile_with_context RPC function
   */
  static async getUserProfileWithContext(): Promise<ProfileCreationResult> {
    try {
      const { data, error } = await supabase.rpc('get_user_profile_with_context')
      
      if (error) {
        console.error('❌ RPC Error:', error)
        return {
          success: false,
          error: error.message
        }
      }
      
      console.log('✅ Profile with context result:', data)
      return data as ProfileCreationResult
      
    } catch (error) {
      console.error('❌ Error getting user profile with context:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Switch user role within organization context
   * Calls the switch_user_role RPC function
   */
  static async switchUserRole(targetRole: 'teacher' | 'student'): Promise<ProfileCreationResult> {
    try {
      const { data, error } = await supabase.rpc('switch_user_role', {
        target_role: targetRole
      })
      
      if (error) {
        console.error('❌ RPC Error:', error)
        return {
          success: false,
          error: error.message
        }
      }
      
      console.log('✅ Role switch result:', data)
      return data as ProfileCreationResult
      
    } catch (error) {
      console.error('❌ Error switching user role:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get all organizations (for admin use)
   */
  static async getOrganizations(): Promise<Organization[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) {
        console.error('❌ Error fetching organizations:', error)
        return []
      }
      
      return data || []
      
    } catch (error) {
      console.error('❌ Error getting organizations:', error)
      return []
    }
  }

  /**
   * Create a new organization (admin function)
   */
  static async createOrganization(name: string, description?: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          description,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error creating organization:', error)
        return null
      }
      
      console.log('✅ Organization created:', data)
      return data
      
    } catch (error) {
      console.error('❌ Error creating organization:', error)
      return null
    }
  }

  /**
   * Check if organization name is available
   */
  static async checkOrganizationNameAvailability(name: string): Promise<{ isAvailable: boolean; message: string }> {
    try {
      // Trim and normalize the name for comparison
      const normalizedName = name.trim()
      
      if (normalizedName.length < 2) {
        return {
          isAvailable: false,
          message: 'Organization name must be at least 2 characters'
        }
      }

      // Check for exact match (case-insensitive) with active organizations
      const { data, error } = await supabase
        .from('organizations')
        .select('organization_id, name')
        .eq('is_active', true)
        .ilike('name', normalizedName)
        .limit(1)
      
      if (error) {
        console.error('❌ Error checking organization name:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // If it's an RLS error, assume name is available (user can't see existing orgs)
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          console.warn('⚠️ RLS blocking SELECT, assuming name is available')
          return {
            isAvailable: true,
            message: '✓ Organization name is available'
          }
        }
        
        return {
          isAvailable: false,
          message: 'Unable to check availability. Please try again.'
        }
      }
      
      // Check if any returned names are exact matches (case-insensitive)
      const exactMatch = data?.find(org => 
        org.name.toLowerCase() === normalizedName.toLowerCase()
      )
      
      const isAvailable = !exactMatch
      
      return {
        isAvailable,
        message: isAvailable 
          ? '✓ Organization name is available' 
          : 'This organization name is already taken'
      }
      
    } catch (error) {
      console.error('❌ Error checking organization name availability:', error)
      return {
        isAvailable: false,
        message: 'Unable to check availability. Please try again.'
      }
    }
  }

  /**
   * Check if organization domain is available
   */
  static async checkOrganizationDomainAvailability(domain: string): Promise<{ isAvailable: boolean; message: string }> {
    try {
      // Trim and normalize the domain for comparison
      const normalizedDomain = domain.trim().toLowerCase()
      
      if (!normalizedDomain) {
        return {
          isAvailable: true,
          message: 'Domain is optional'
        }
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
      if (!domainRegex.test(normalizedDomain)) {
        return {
          isAvailable: false,
          message: 'Invalid domain format'
        }
      }

      // Check for exact match with active organizations
      const { data, error } = await supabase
        .from('organizations')
        .select('organization_id, name')
        .eq('is_active', true)
        .not('domain', 'is', null)
        .ilike('domain', normalizedDomain)
        .limit(1)
      
      if (error) {
        console.error('❌ Error checking organization domain:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // If it's an RLS error, assume domain is available
        if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
          console.warn('⚠️ RLS blocking SELECT, assuming domain is available')
          return {
            isAvailable: true,
            message: '✓ Domain is available'
          }
        }
        
        return {
          isAvailable: false,
          message: 'Unable to check domain availability. Please try again.'
        }
      }
      
      const isAvailable = !data || data.length === 0
      
      return {
        isAvailable,
        message: isAvailable 
          ? '✓ Domain is available' 
          : 'This domain is already registered with another organization'
      }
      
    } catch (error) {
      console.error('❌ Error checking organization domain availability:', error)
      return {
        isAvailable: false,
        message: 'Unable to check domain availability. Please try again.'
      }
    }
  }

  /**
   * Create organization with administrator during onboarding
   */
  static async createOrganizationWithAdmin(organizationData: {
    organizationName: string;
    organizationDomain?: string;
    adminName: string;
    adminEmail: string;
  }): Promise<{ success: boolean; message: string; organizationId?: string }> {
    try {
      // First check if organization name is available
      const availability = await this.checkOrganizationNameAvailability(organizationData.organizationName)
      
      if (!availability.isAvailable) {
        return {
          success: false,
          message: availability.message
        }
      }

      // Create organization
      console.log('🔄 Attempting to create organization:', {
        name: organizationData.organizationName,
        description: organizationData.organizationDomain ? `Organization domain: ${organizationData.organizationDomain}` : undefined,
        is_active: true
      });

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationData.organizationName,
          description: organizationData.organizationDomain ? `Organization domain: ${organizationData.organizationDomain}` : undefined,
          is_active: true
        })
        .select()
        .single()
      
      if (orgError) {
        console.error('❌ Error creating organization:', orgError)
        console.error('❌ Error details:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        })
        return {
          success: false,
          message: `Failed to create organization: ${orgError.message}`
        }
      }

      console.log('✅ Organization created successfully:', orgData)
      
      return {
        success: true,
        message: 'Organization created successfully',
        organizationId: orgData.organization_id
      }
      
    } catch (error) {
      console.error('❌ Error in organization creation flow:', error)
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      }
    }
  }
}