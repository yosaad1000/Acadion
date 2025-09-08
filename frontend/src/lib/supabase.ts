import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id?: string
  auth_user_id: string
  user_id: string // Keep for backward compatibility
  email: string
  name: string
  user_type: 'teacher' | 'student' // Keep for backward compatibility
  active_role: 'teacher' | 'student'
  auth_provider: 'email' | 'google'
  is_face_registered: boolean
  created_at: string
  updated_at?: string
}

export interface AuthUser extends User {
  id: string // Supabase auth user ID
}