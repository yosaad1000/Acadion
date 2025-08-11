-- Student Management Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    dept_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hod VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Faculty table
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    departments VARCHAR(10) REFERENCES departments(dept_id),
    subjects TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    department_id VARCHAR(10) REFERENCES departments(dept_id),
    batch_year INTEGER NOT NULL,
    current_semester INTEGER NOT NULL,
    course_enrolled_ids TEXT[],
    face_encoding_id VARCHAR(100), -- Reference to Pinecone vector ID
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id VARCHAR(10) REFERENCES departments(dept_id),
    credits INTEGER DEFAULT 3,
    semester INTEGER NOT NULL,
    is_elective BOOLEAN DEFAULT FALSE,
    enrolled_students TEXT[],
    faculty_ids TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(20) REFERENCES students(student_id),
    subject_id VARCHAR(20) REFERENCES subjects(subject_id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by VARCHAR(20) REFERENCES faculty(faculty_id),
    confidence_score FLOAT,
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, date)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(20) REFERENCES students(student_id),
    subject_id VARCHAR(20) REFERENCES subjects(subject_id),
    exam_type VARCHAR(50) NOT NULL,
    marks_obtained FLOAT NOT NULL,
    max_marks FLOAT NOT NULL,
    percentage FLOAT GENERATED ALWAYS AS (marks_obtained * 100.0 / max_marks) STORED,
    comments TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(20) REFERENCES students(student_id),
    fee_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample departments
INSERT INTO departments (dept_id, name) VALUES 
('CS', 'Computer Science'),
('EE', 'Electrical Engineering'),
('ME', 'Mechanical Engineering'),
('CE', 'Civil Engineering'),
('IT', 'Information Technology')
ON CONFLICT (dept_id) DO NOTHING;

-- Insert sample subjects
INSERT INTO subjects (subject_id, name, department_id, semester) VALUES 
('CS101', 'Introduction to Programming', 'CS', 1),
('CS201', 'Data Structures', 'CS', 3),
('CS301', 'Database Systems', 'CS', 5),
('MATH101', 'Calculus I', 'CS', 1),
('PHY101', 'Physics I', 'CS', 1)
ON CONFLICT (subject_id) DO NOTHING;

-- Insert sample faculty
INSERT INTO faculty (faculty_id, name, email, departments, subjects) VALUES 
('FAC001', 'Dr. John Smith', 'john.smith@university.edu', 'CS', ARRAY['CS101', 'CS201']),
('FAC002', 'Dr. Jane Doe', 'jane.doe@university.edu', 'CS', ARRAY['CS301', 'MATH101'])
ON CONFLICT (faculty_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

-- Create policies (basic examples - adjust based on your auth requirements)
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (auth.uid()::text = student_id);

CREATE POLICY "Faculty can view all students" ON students
    FOR SELECT USING (auth.role() = 'faculty' OR auth.role() = 'admin');

CREATE POLICY "Admin can do everything" ON students
    FOR ALL USING (auth.role() = 'admin');

-- Similar policies for other tables
CREATE POLICY "Users can view attendance" ON attendance
    FOR SELECT USING (true);

CREATE POLICY "Faculty can mark attendance" ON attendance
    FOR INSERT WITH CHECK (auth.role() IN ('faculty', 'admin'));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();