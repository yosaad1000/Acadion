-- Initial database schema for Student Management Platform
-- Run this in your Supabase SQL Editor or via supabase CLI

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    dept_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hod VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    department_id VARCHAR(50) REFERENCES departments(dept_id),
    batch_year INTEGER,
    current_semester INTEGER,
    course_enrolled_ids TEXT[],
    face_encoding_id VARCHAR(255), -- Reference to Pinecone vector ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Faculty table
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    department_id VARCHAR(50) REFERENCES departments(dept_id),
    subjects TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
    subject_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(dept_id),
    credits INTEGER DEFAULT 0,
    semester INTEGER,
    is_elective BOOLEAN DEFAULT FALSE,
    enrolled_students TEXT[],
    faculty_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) REFERENCES students(student_id),
    subject_id VARCHAR(50) REFERENCES subjects(subject_id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    marked_by VARCHAR(50), -- faculty_id who marked attendance
    confidence_score FLOAT, -- For face recognition confidence
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual', 'face_recognition', 'qr_code')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id, date) -- Prevent duplicate attendance for same day
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) REFERENCES students(student_id),
    subject_id VARCHAR(50) REFERENCES subjects(subject_id),
    exam_type VARCHAR(50) NOT NULL, -- 'midterm', 'final', 'quiz', 'assignment'
    marks_obtained DECIMAL(5,2) NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((marks_obtained / max_marks) * 100) STORED,
    grade_letter VARCHAR(2), -- 'A+', 'A', 'B+', etc.
    comments TEXT,
    marked_by VARCHAR(50), -- faculty_id who assigned grade
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) REFERENCES students(student_id),
    fee_type VARCHAR(50) NOT NULL, -- 'tuition', 'library', 'lab', 'exam'
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
    payment_method VARCHAR(50), -- 'cash', 'card', 'bank_transfer', 'online'
    transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table (many-to-many relationship between students and subjects)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) REFERENCES students(student_id),
    subject_id VARCHAR(50) REFERENCES subjects(subject_id),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments(subject_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO departments (dept_id, name) VALUES 
    ('CS', 'Computer Science'),
    ('EE', 'Electrical Engineering'),
    ('ME', 'Mechanical Engineering'),
    ('CE', 'Civil Engineering')
ON CONFLICT (dept_id) DO NOTHING;

INSERT INTO faculty (faculty_id, name, email, department_id, subjects) VALUES 
    ('FAC001', 'Dr. John Smith', 'john.smith@university.edu', 'CS', ARRAY['CS101', 'CS201']),
    ('FAC002', 'Dr. Jane Doe', 'jane.doe@university.edu', 'CS', ARRAY['CS102', 'CS301']),
    ('FAC003', 'Dr. Bob Wilson', 'bob.wilson@university.edu', 'EE', ARRAY['EE101', 'EE201'])
ON CONFLICT (faculty_id) DO NOTHING;

INSERT INTO subjects (subject_id, name, department_id, credits, semester, faculty_ids) VALUES 
    ('CS101', 'Introduction to Programming', 'CS', 3, 1, ARRAY['FAC001']),
    ('CS102', 'Data Structures', 'CS', 4, 2, ARRAY['FAC002']),
    ('CS201', 'Algorithms', 'CS', 4, 3, ARRAY['FAC001']),
    ('CS301', 'Database Systems', 'CS', 3, 5, ARRAY['FAC002']),
    ('EE101', 'Circuit Analysis', 'EE', 4, 1, ARRAY['FAC003']),
    ('EE201', 'Digital Electronics', 'EE', 3, 3, ARRAY['FAC003'])
ON CONFLICT (subject_id) DO NOTHING;

INSERT INTO students (student_id, name, email, department_id, batch_year, current_semester) VALUES 
    ('STU001', 'Alice Johnson', 'alice.johnson@student.edu', 'CS', 2023, 2),
    ('STU002', 'Bob Brown', 'bob.brown@student.edu', 'CS', 2023, 2),
    ('STU003', 'Charlie Davis', 'charlie.davis@student.edu', 'EE', 2022, 4),
    ('STU004', 'Diana Wilson', 'diana.wilson@student.edu', 'CS', 2024, 1)
ON CONFLICT (student_id) DO NOTHING;

-- Enroll students in subjects
INSERT INTO enrollments (student_id, subject_id) VALUES 
    ('STU001', 'CS102'),
    ('STU001', 'CS201'),
    ('STU002', 'CS102'),
    ('STU002', 'CS201'),
    ('STU003', 'EE201'),
    ('STU004', 'CS101')
ON CONFLICT (student_id, subject_id) DO NOTHING;

-- Add some sample attendance records
INSERT INTO attendance (student_id, subject_id, date, status, marked_by, method) VALUES 
    ('STU001', 'CS102', CURRENT_DATE - INTERVAL '1 day', 'present', 'FAC002', 'manual'),
    ('STU001', 'CS201', CURRENT_DATE - INTERVAL '1 day', 'present', 'FAC001', 'manual'),
    ('STU002', 'CS102', CURRENT_DATE - INTERVAL '1 day', 'absent', 'FAC002', 'manual'),
    ('STU002', 'CS201', CURRENT_DATE - INTERVAL '1 day', 'present', 'FAC001', 'manual'),
    ('STU003', 'EE201', CURRENT_DATE - INTERVAL '1 day', 'present', 'FAC003', 'manual'),
    ('STU004', 'CS101', CURRENT_DATE - INTERVAL '1 day', 'present', 'FAC001', 'manual')
ON CONFLICT (student_id, subject_id, date) DO NOTHING;

-- Add some sample grades
INSERT INTO grades (student_id, subject_id, exam_type, marks_obtained, max_marks, grade_letter, marked_by) VALUES 
    ('STU001', 'CS102', 'midterm', 85.5, 100.0, 'A', 'FAC002'),
    ('STU001', 'CS201', 'midterm', 78.0, 100.0, 'B+', 'FAC001'),
    ('STU002', 'CS102', 'midterm', 92.0, 100.0, 'A+', 'FAC002'),
    ('STU002', 'CS201', 'midterm', 88.5, 100.0, 'A', 'FAC001'),
    ('STU003', 'EE201', 'midterm', 76.0, 100.0, 'B', 'FAC003'),
    ('STU004', 'CS101', 'quiz', 95.0, 100.0, 'A+', 'FAC001')
ON CONFLICT DO NOTHING;

-- Add some sample fee records
INSERT INTO fees (student_id, fee_type, amount, due_date, status) VALUES 
    ('STU001', 'tuition', 5000.00, CURRENT_DATE + INTERVAL '30 days', 'pending'),
    ('STU002', 'tuition', 5000.00, CURRENT_DATE + INTERVAL '30 days', 'paid'),
    ('STU003', 'tuition', 5000.00, CURRENT_DATE + INTERVAL '30 days', 'pending'),
    ('STU004', 'tuition', 5000.00, CURRENT_DATE + INTERVAL '30 days', 'pending'),
    ('STU001', 'library', 100.00, CURRENT_DATE + INTERVAL '15 days', 'paid'),
    ('STU002', 'lab', 200.00, CURRENT_DATE + INTERVAL '20 days', 'pending')
ON CONFLICT DO NOTHING;