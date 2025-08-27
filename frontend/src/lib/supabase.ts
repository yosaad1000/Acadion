import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://scijpejtvneuqbhkoxuz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  user_id: string
  email: string
  name: string
  user_type: 'teacher' | 'student'
  auth_provider: 'email' | 'google'
  is_face_registered: boolean
  created_at: string
}

export interface AuthUser extends User {
  id: string // Supabase auth user ID
}