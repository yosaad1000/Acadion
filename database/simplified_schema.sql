-- Simplified Google Classroom-style Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (both teachers and students)
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS subjects (
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
CREATE TABLE IF NOT EXISTS subject_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(subject_id, student_id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
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
CREATE SEQUENCE IF NOT EXISTS subject_code_seq START 1;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON subject_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = user_id);

-- Teachers can view their subjects
CREATE POLICY "Teachers can view their subjects" ON subjects
    FOR SELECT USING (auth.uid() = teacher_id);

-- Students can view subjects they're enrolled in
CREATE POLICY "Students can view enrolled subjects" ON subjects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subject_enrollments 
            WHERE subject_id = subjects.subject_id 
            AND student_id = auth.uid()
        )
    );

-- Teachers can create subjects
CREATE POLICY "Teachers can create subjects" ON subjects
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND user_type = 'teacher')
    );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO users (email, name, user_type, password_hash) VALUES 
('teacher1@college.edu', 'Dr. John Smith', 'teacher', '$2b$12$sample_hash_here'),
('teacher2@college.edu', 'Prof. Jane Doe', 'teacher', '$2b$12$sample_hash_here')
ON CONFLICT (email) DO NOTHING;