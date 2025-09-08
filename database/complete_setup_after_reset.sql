-- Complete setup after database reset
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    active_role VARCHAR(20) DEFAULT 'student' CHECK (active_role IN ('teacher', 'student')),
    auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
    is_face_registered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table to track all roles a user can have
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('teacher', 'student')),
    institution_context VARCHAR(100) DEFAULT 'default',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id, role_type, institution_context)
);

-- Create subjects table (classrooms)
CREATE TABLE IF NOT EXISTS subjects (
    subject_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subject enrollments table
CREATE TABLE IF NOT EXISTS subject_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(subject_id, student_id)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES users(auth_user_id),
    confidence_score FLOAT,
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, student_id, date)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow user creation" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

-- Create policies for user_roles table
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage own roles" ON user_roles
  FOR ALL USING (
    auth.uid() = auth_user_id OR
    auth.role() = 'service_role'
  );

-- Create policies for subjects table
CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create subjects" ON subjects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND active_role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update own subjects" ON subjects
  FOR UPDATE USING (
    teacher_id = auth.uid()
  );

-- Create policies for subject_enrollments table
CREATE POLICY "Users can view enrollments" ON subject_enrollments
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM subjects s 
      WHERE s.subject_id = subject_enrollments.subject_id 
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can enroll themselves" ON subject_enrollments
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
  );

-- Create policies for attendance table
CREATE POLICY "Users can view relevant attendance" ON attendance
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM subjects s 
      WHERE s.subject_id = attendance.subject_id 
      AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can mark attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects s 
      WHERE s.subject_id = attendance.subject_id 
      AND s.teacher_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT ON users TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles TO authenticated;
GRANT SELECT, INSERT ON user_roles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO authenticated;
GRANT SELECT ON subjects TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON subject_enrollments TO authenticated;
GRANT SELECT ON subject_enrollments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO authenticated;
GRANT SELECT ON attendance TO anon;

-- Create helper functions for generating codes
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS VARCHAR(8) AS $
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_subject_code() RETURNS VARCHAR(20) AS $
DECLARE
    result VARCHAR(20);
    counter INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(subject_code FROM 4) AS INTEGER)), 0) + 1 
    INTO counter 
    FROM subjects 
    WHERE subject_code ~ '^SUB[0-9]+$';
    
    result := 'SUB' || LPAD(counter::text, 6, '0');
    RETURN result;
END;
$ LANGUAGE plpgsql;

-- Trigger to auto-generate codes for subjects
CREATE OR REPLACE FUNCTION set_subject_codes() RETURNS TRIGGER AS $
BEGIN
    IF NEW.subject_code IS NULL OR NEW.subject_code = '' THEN
        NEW.subject_code := generate_subject_code();
    END IF;
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM subjects WHERE invite_code = NEW.invite_code);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_subject_codes
    BEFORE INSERT ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION set_subject_codes();

-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $
BEGIN
  -- Create user profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
    INSERT INTO public.users (auth_user_id, email, name, auth_provider, is_face_registered, active_role)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'full_name',
        NEW.email
      ), 
      CASE 
        WHEN NEW.raw_user_meta_data->>'provider_id' IS NOT NULL THEN 'google'
        ELSE 'email'
      END,
      false,
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')
    );
    
    -- Create default role based on user_type or default to student
    INSERT INTO public.user_roles (auth_user_id, role_type, institution_context)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'user_type', 'student'), 'default');
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to switch user role
CREATE OR REPLACE FUNCTION public.switch_user_role(
  p_auth_user_id UUID,
  p_role_type VARCHAR(20),
  p_institution_context VARCHAR(100) DEFAULT 'default'
)
RETURNS BOOLEAN AS $
BEGIN
  -- Check if user has this role
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE auth_user_id = p_auth_user_id 
    AND role_type = p_role_type 
    AND (institution_context = p_institution_context OR institution_context IS NULL)
    AND is_active = true
  ) THEN
    -- Update active_role in users table
    UPDATE users 
    SET active_role = p_role_type, updated_at = NOW()
    WHERE auth_user_id = p_auth_user_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a new role to user
CREATE OR REPLACE FUNCTION public.add_user_role(
  p_auth_user_id UUID,
  p_role_type VARCHAR(20),
  p_institution_context VARCHAR(100) DEFAULT 'default'
)
RETURNS BOOLEAN AS $
BEGIN
  -- Add role if it doesn't exist
  INSERT INTO user_roles (auth_user_id, role_type, institution_context)
  VALUES (p_auth_user_id, p_role_type, p_institution_context)
  ON CONFLICT (auth_user_id, role_type, institution_context) 
  DO UPDATE SET is_active = true, updated_at = NOW();
  
  -- Update active_role in users table if this is the first role or requested
  UPDATE users 
  SET active_role = p_role_type, updated_at = NOW()
  WHERE auth_user_id = p_auth_user_id;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.switch_user_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_user_role TO authenticated, anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_auth_user_id ON user_roles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject_id ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student_id ON subject_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

SELECT 'Database setup complete! You can now use OAuth login.' as status;