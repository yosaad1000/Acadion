-- =============================================================================
-- ACADION COMPLETE DATABASE SCHEMA
-- =============================================================================
-- This is the complete, up-to-date schema for the Acadion AI-powered student management platform
-- Run this in your Supabase SQL Editor for a fresh installation
-- 
-- Features:
-- - Multi-role user system (teacher/student)
-- - Subject/classroom management with invite codes
-- - Session-based attendance tracking
-- - Assignment management with Google Drive integration
-- - Comprehensive notifications system
-- - Face recognition support via Pinecone integration
-- - Google Calendar and Drive integration
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE USER MANAGEMENT
-- =============================================================================

-- Users table - extends Supabase auth with app-specific data
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    active_role VARCHAR DEFAULT 'student' CHECK (active_role IN ('teacher', 'student')),
    face_encoding_id VARCHAR,
    is_face_registered BOOLEAN DEFAULT false,
    auth_provider VARCHAR DEFAULT 'google' CHECK (auth_provider IN ('email', 'google')),
    google_id VARCHAR UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

-- User roles table - supports multiple roles per user
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL,
    role_type VARCHAR NOT NULL CHECK (role_type IN ('teacher', 'student')),
    institution_context VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- SUBJECT AND SESSION MANAGEMENT
-- =============================================================================

-- Subjects table - equivalent to classrooms
CREATE TABLE IF NOT EXISTS public.subjects (
    subject_id UUID NOT NULL DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    subject_code VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    description TEXT,
    invite_code VARCHAR NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT subjects_pkey PRIMARY KEY (subject_id),
    CONSTRAINT subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id)
);

-- Subject enrollments - tracks student enrollment in subjects
CREATE TABLE IF NOT EXISTS public.subject_enrollments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    student_id UUID NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT subject_enrollments_pkey PRIMARY KEY (id),
    CONSTRAINT subject_enrollments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id),
    CONSTRAINT subject_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id)
);

-- Sessions table - individual class sessions within subjects
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    created_by UUID NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    session_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attendance_taken BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT sessions_pkey PRIMARY KEY (session_id),
    CONSTRAINT sessions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id),
    CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- =============================================================================
-- ATTENDANCE TRACKING
-- =============================================================================

-- Attendance table - tracks student attendance per session
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    subject_id UUID,
    student_id UUID NOT NULL,
    marked_by UUID,
    date DATE NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    confidence_score DOUBLE PRECISION,
    method VARCHAR DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT attendance_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id),
    CONSTRAINT attendance_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(subject_id),
    CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id),
    CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES auth.users(id)
);

-- =============================================================================
-- ASSIGNMENT MANAGEMENT
-- =============================================================================

-- Assignments table - tracks assignments given during sessions
CREATE TABLE IF NOT EXISTS public.assignments (
    assignment_id UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    created_by UUID NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    assignment_type VARCHAR NOT NULL CHECK (assignment_type IN ('homework', 'test', 'project')),
    google_drive_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id),
    CONSTRAINT assignments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id),
    CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Assignment submissions - tracks student submission status
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    submission_id UUID NOT NULL DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    student_id UUID NOT NULL,
    submission_status VARCHAR DEFAULT 'pending' CHECK (submission_status IN ('pending', 'submitted', 'graded', 'overdue')),
    submission_date TIMESTAMP WITH TIME ZONE,
    google_drive_link TEXT,
    grade VARCHAR,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT assignment_submissions_pkey PRIMARY KEY (submission_id),
    CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id),
    CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- NOTIFICATIONS SYSTEM
-- =============================================================================

-- Notifications table - stores all user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    sender_id UUID,
    type VARCHAR NOT NULL CHECK (type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed', 'assignment_created', 'assignment_graded')),
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
    CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);

-- Notification preferences - allows users to control notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
    CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- GOOGLE INTEGRATIONS
-- =============================================================================

-- Google integrations - stores Google Calendar and Drive integration data
CREATE TABLE IF NOT EXISTS public.google_integrations (
    integration_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    google_calendar_id TEXT,
    google_drive_folder_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT google_integrations_pkey PRIMARY KEY (integration_id),
    CONSTRAINT google_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate unique 8-character invite codes for subjects
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS VARCHAR(8) AS $$
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
$$ LANGUAGE plpgsql;

-- Generate sequential subject codes (SUB000001, SUB000002, etc.)
CREATE OR REPLACE FUNCTION generate_subject_code() RETURNS VARCHAR(20) AS $$
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
$$ LANGUAGE plpgsql;

-- Auto-generate subject codes and invite codes when creating new subjects
CREATE OR REPLACE FUNCTION set_subject_codes() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id, notification_type, enabled) VALUES
        (NEW.id, 'student_joined', TRUE),
        (NEW.id, 'attendance_marked', TRUE),
        (NEW.id, 'attendance_failed', TRUE),
        (NEW.id, 'class_joined', TRUE),
        (NEW.id, 'join_failed', TRUE),
        (NEW.id, 'assignment_created', TRUE),
        (NEW.id, 'assignment_graded', TRUE)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate subject codes and invite codes
DROP TRIGGER IF EXISTS trigger_set_subject_codes ON subjects;
CREATE TRIGGER trigger_set_subject_codes
    BEFORE INSERT ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION set_subject_codes();

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at 
    BEFORE UPDATE ON user_roles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at 
    BEFORE UPDATE ON subjects
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at 
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_integrations_updated_at ON google_integrations;
CREATE TRIGGER update_google_integrations_updated_at 
    BEFORE UPDATE ON google_integrations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Handle new user registration (commented out to avoid OAuth issues)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW 
--     EXECUTE FUNCTION public.handle_new_user();

-- Create default notification preferences for new users
DROP TRIGGER IF EXISTS create_user_notification_preferences ON auth.users;
CREATE TRIGGER create_user_notification_preferences
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

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_method ON attendance(method);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_session_id ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(submission_status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- Google integrations indexes
CREATE INDEX IF NOT EXISTS idx_google_integrations_user_id ON google_integrations(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        auth.uid() = auth_user_id OR
        auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        auth.uid() = auth_user_id OR
        auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Allow user creation" ON users;
CREATE POLICY "Allow user creation" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = auth_user_id OR
        auth.role() = 'service_role'
    );

-- User roles table policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (
        auth.uid() = auth_user_id OR
        auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Users can manage own roles" ON user_roles;
CREATE POLICY "Users can manage own roles" ON user_roles
    FOR ALL USING (
        auth.uid() = auth_user_id OR
        auth.role() = 'service_role'
    );

-- Subjects table policies
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can create subjects" ON subjects;
CREATE POLICY "Teachers can create subjects" ON subjects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE auth_user_id = auth.uid() 
            AND active_role = 'teacher'
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Teachers can update own subjects" ON subjects;
CREATE POLICY "Teachers can update own subjects" ON subjects
    FOR UPDATE USING (teacher_id = auth.uid() OR auth.role() = 'service_role');

-- Subject enrollments policies
DROP POLICY IF EXISTS "Users can view relevant enrollments" ON subject_enrollments;
CREATE POLICY "Users can view relevant enrollments" ON subject_enrollments
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = subject_enrollments.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can enroll themselves" ON subject_enrollments;
CREATE POLICY "Students can enroll themselves" ON subject_enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid() OR auth.role() = 'service_role');

-- Sessions policies
DROP POLICY IF EXISTS "Users can view relevant sessions" ON sessions;
CREATE POLICY "Users can view relevant sessions" ON sessions
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM subject_enrollments se 
            WHERE se.subject_id = sessions.subject_id 
            AND se.student_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Teachers can manage sessions" ON sessions;
CREATE POLICY "Teachers can manage sessions" ON sessions
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

-- Attendance policies
DROP POLICY IF EXISTS "Users can view relevant attendance" ON attendance;
CREATE POLICY "Users can view relevant attendance" ON attendance
    FOR SELECT USING (
        student_id = auth.uid() OR
        marked_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = attendance.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Teachers can mark attendance" ON attendance;
CREATE POLICY "Teachers can mark attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = attendance.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

-- Assignments policies
DROP POLICY IF EXISTS "Users can view relevant assignments" ON assignments;
CREATE POLICY "Users can view relevant assignments" ON assignments
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM sessions sess
            JOIN subjects s ON s.subject_id = sess.subject_id
            WHERE sess.session_id = assignments.session_id 
            AND (s.teacher_id = auth.uid() OR EXISTS (
                SELECT 1 FROM subject_enrollments se 
                WHERE se.subject_id = s.subject_id 
                AND se.student_id = auth.uid()
            ))
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Teachers can manage assignments" ON assignments;
CREATE POLICY "Teachers can manage assignments" ON assignments
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM sessions sess
            JOIN subjects s ON s.subject_id = sess.subject_id
            WHERE sess.session_id = assignments.session_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

-- Assignment submissions policies
DROP POLICY IF EXISTS "Users can view relevant submissions" ON assignment_submissions;
CREATE POLICY "Users can view relevant submissions" ON assignment_submissions
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN sessions sess ON sess.session_id = a.session_id
            JOIN subjects s ON s.subject_id = sess.subject_id
            WHERE a.assignment_id = assignment_submissions.assignment_id 
            AND s.teacher_id = auth.uid()
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "Students can manage own submissions" ON assignment_submissions;
CREATE POLICY "Students can manage own submissions" ON assignment_submissions
    FOR ALL USING (
        student_id = auth.uid() OR auth.role() = 'service_role'
    );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Backend can create notifications" ON notifications;
CREATE POLICY "Backend can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Google integrations policies
DROP POLICY IF EXISTS "Users can manage their own integrations" ON google_integrations;
CREATE POLICY "Users can manage their own integrations" ON google_integrations
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 'Acadion database schema setup complete!' as status,
       'Tables: users, user_roles, subjects, subject_enrollments, sessions, attendance, assignments, assignment_submissions, notifications, notification_preferences, google_integrations' as tables,
       'Features: Multi-role support, OAuth integration, session-based attendance, assignment management, notifications system, Google integrations, face recognition support' as features;