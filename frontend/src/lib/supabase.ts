import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Organization {
  organization_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id?: string
  auth_user_id: string
  user_id: string // Keep for backward compatibility
  organization_id: string // NEW: Organization context
  email: string
  name: string
  user_type: 'teacher' | 'student' // Keep for backward compatibility
  active_role: 'teacher' | 'student'
  auth_provider: 'email' | 'google'
  is_face_registered: boolean
  created_at: string
  updated_at?: string
  // Organization data (when joined)
  organization?: Organization
}

export interface AuthUser extends User {
  id: string // Supabase auth user ID
}

// RPC function response types
export interface ProfileCreationResult {
  success: boolean
  message?: string
  user_id?: string
  organization_id?: string
  email?: string
  name?: string
  active_role?: string
  error?: string
}