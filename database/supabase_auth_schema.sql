-- Simplified Google Classroom-style Schema with Supabase Auth
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Subjects/Classrooms table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(20) UNIQUE, -- Auto-generated unique code
    name VARCHAR(100) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL, -- 6-8 character invite code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subject enrollments (students joining subjects)
CREATE TABLE IF NOT EXISTS subject_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(subject_id, student_id)
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by UUID REFERENCES auth.users(id), -- Teacher who marked
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
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON subject_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects
CREATE POLICY "Teachers can view their subjects" ON subjects
    FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view enrolled subjects" ON subjects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subject_enrollments 
            WHERE subject_id = subjects.subject_id 
            AND student_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Teachers can create subjects" ON subjects
    FOR INSERT WITH CHECK (
        auth.uid() = teacher_id AND
        (auth.jwt() ->> 'user_metadata' ->> 'user_type') = 'teacher'
    );

CREATE POLICY "Teachers can update their subjects" ON subjects
    FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their subjects" ON subjects
    FOR DELETE USING (auth.uid() = teacher_id);

-- RLS Policies for enrollments
CREATE POLICY "Users can view their enrollments" ON subject_enrollments
    FOR SELECT USING (
        auth.uid() = student_id OR 
        EXISTS (SELECT 1 FROM subjects WHERE subject_id = subject_enrollments.subject_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Students can enroll themselves" ON subject_enrollments
    FOR INSERT WITH CHECK (
        auth.uid() = student_id AND
        (auth.jwt() ->> 'user_metadata' ->> 'user_type') = 'student'
    );

-- RLS Policies for attendance
CREATE POLICY "Users can view relevant attendance" ON attendance
    FOR SELECT USING (
        auth.uid() = student_id OR 
        EXISTS (SELECT 1 FROM subjects WHERE subject_id = attendance.subject_id AND teacher_id = auth.uid())
    );

CREATE POLICY "Teachers can mark attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM subjects WHERE subject_id = attendance.subject_id AND teacher_id = auth.uid()) AND
        (auth.jwt() ->> 'user_metadata' ->> 'user_type') = 'teacher'
    );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();