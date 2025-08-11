-- Complete clean setup for Google Classroom-style system
-- This will delete old data and create new schema
-- Run this in your Supabase SQL Editor

-- STEP 1: Clean up old tables (if they exist)
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Drop old sequences if they exist
DROP SEQUENCE IF EXISTS subject_code_seq CASCADE;

-- STEP 2: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 3: Create new Google Classroom-style schema

-- Users table (both teachers and students)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('teacher', 'student')),
    password_hash VARCHAR(255) NOT NULL,
    face_encoding_id VARCHAR(100), -- Reference to Pinecone vector ID (students only)
    is_face_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects/Classrooms table
CREATE TABLE subjects (
    subject_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated unique code
    name VARCHAR(100) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL, -- 6-8 character invite code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subject enrollments (students joining subjects)
CREATE TABLE subject_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(subject_id, student_id)
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES users(user_id), -- Teacher who marked
    confidence_score FLOAT, -- Face recognition confidence
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(subject_id, student_id, date)
);

-- STEP 4: Create helper functions

-- Function to generate unique invite codes
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

-- Function to generate unique subject codes
CREATE OR REPLACE FUNCTION generate_subject_code() RETURNS VARCHAR(20) AS $$
DECLARE
    result VARCHAR(20);
BEGIN
    result := 'SUB' || LPAD(nextval('subject_code_seq')::text, 6, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for subject codes
CREATE SEQUENCE subject_code_seq START 1;

-- Trigger to auto-generate codes for subjects
CREATE OR REPLACE FUNCTION set_subject_codes() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subject_code IS NULL THEN
        NEW.subject_code := generate_subject_code();
    END IF;
    IF NEW.invite_code IS NULL THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM subjects WHERE invite_code = NEW.invite_code);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_subject_codes
    BEFORE INSERT ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION set_subject_codes();

-- STEP 5: Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX idx_enrollments_subject ON subject_enrollments(subject_id);
CREATE INDEX idx_enrollments_student ON subject_enrollments(student_id);
CREATE INDEX idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);

-- STEP 6: Insert demo data for testing
INSERT INTO users (email, name, user_type, password_hash) VALUES 
('teacher@example.com', 'Demo Teacher', 'teacher', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/XZm'), -- password: password123
('student@example.com', 'Demo Student', 'student', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF/XZm'); -- password: password123

-- Success message
SELECT 'Google Classroom schema setup complete! You can now login with:' as message
UNION ALL
SELECT 'Teacher: teacher@example.com / password123' as message
UNION ALL  
SELECT 'Student: student@example.com / password123' as message;