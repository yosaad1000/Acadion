-- Acadion Complete Database Schema
-- This is the consolidated, final schema for the Acadion platform
-- Run this in your Supabase SQL Editor for a fresh installation

-- =============================================================================
-- EXTENSIONS AND SETUP
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (linked to Supabase auth.users)
-- This table extends Supabase's built-in authentication with our app-specific data
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    active_role VARCHAR(20) DEFAULT 'student' CHECK (active_role IN ('teacher', 'student')),
    auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
    is_face_registered BOOLEAN DEFAULT false,
    face_encoding_id VARCHAR(100), -- Reference to Pinecone vector ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table - supports multiple roles per user
-- A user can be both teacher and student in different contexts
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

-- Subjects table (equivalent to classrooms in Google Classroom)
-- Each subject is created by a teacher and students can join using invite codes
CREATE TABLE IF NOT EXISTS subjects (
    subject_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_code VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated (SUB000001, SUB000002, etc.)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL, -- Random 8-character code for students to join
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subject enrollments - tracks which students are enrolled in which subjects
CREATE TABLE IF NOT EXISTS subject_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(subject_id, student_id)
);

-- Attendance tracking with support for manual and AI-powered face recognition
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(auth_user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES users(auth_user_id), -- Teacher who marked attendance
    confidence_score FLOAT, -- Face recognition confidence (0.0 to 1.0)
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id, student_id, date)
);

-- =============================================================================
-- NOTIFICATIONS SYSTEM
-- =============================================================================

-- Notifications table - stores all user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional structured data for the notification
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences - allows users to control which notifications they receive
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed')),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate unique 8-character invite codes for subjects
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

-- Generate sequential subject codes (SUB000001, SUB000002, etc.)
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

-- Auto-generate subject codes and invite codes when creating new subjects
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

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO notification_preferences (user_id, notification_type, enabled) VALUES
        (NEW.id, 'student_joined', TRUE),
        (NEW.id, 'attendance_marked', TRUE),
        (NEW.id, 'attendance_failed', TRUE),
        (NEW.id, 'class_joined', TRUE),
        (NEW.id, 'join_failed', TRUE)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Handle new user registration from Supabase Auth
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

-- Function to switch user's active role
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

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate subject codes and invite codes
CREATE OR REPLACE TRIGGER trigger_set_subject_codes
    BEFORE INSERT ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION set_subject_codes();

-- Auto-update timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at 
    BEFORE UPDATE ON subjects
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Handle new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Create default notification preferences for new users
CREATE OR REPLACE TRIGGER create_user_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active_role ON users(active_role);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_auth_user_id ON user_roles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON user_roles(role_type);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON subjects(subject_code);

-- Subject enrollments indexes
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject_id ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student_id ON subject_enrollments(student_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_method ON attendance(method);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users table policies
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

-- User roles table policies
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

-- Subjects table policies
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
    FOR UPDATE USING (teacher_id = auth.uid());

-- Subject enrollments policies
CREATE POLICY "Users can view relevant enrollments" ON subject_enrollments
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = subject_enrollments.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can enroll themselves" ON subject_enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Attendance policies
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

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Backend can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
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

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_preferences TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.switch_user_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_user_role TO authenticated, anon;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time for notifications (allows WebSocket subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 'Acadion database schema setup complete!' as status,
       'Tables created: users, user_roles, subjects, subject_enrollments, attendance, notifications, notification_preferences' as tables,
       'Features: Multi-role support, OAuth integration, notifications system, face recognition support' as features;