-- Calendar Integration Migration
-- This migration adds tables for Google Calendar integration functionality
-- Run this in your Supabase SQL Editor after the main schema

-- First, ensure required tables exist (create them if they don't)
-- This makes the migration more robust

-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
    dept_id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hod VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create faculty table if it doesn't exist
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    departments VARCHAR(10) REFERENCES departments(dept_id),
    subjects TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create students table if it doesn't exist
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    department_id VARCHAR(10) REFERENCES departments(dept_id),
    batch_year INTEGER NOT NULL,
    current_semester INTEGER NOT NULL,
    course_enrolled_ids TEXT[],
    face_encoding_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create subjects table if it doesn't exist
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

-- Calendar connections table for storing OAuth tokens and connection info
CREATE TABLE IF NOT EXISTS calendar_connections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL, -- References students.student_id or faculty.faculty_id
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('student', 'faculty')),
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    calendar_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, user_type, provider)
);

-- Class schedules table for storing scheduled classes
CREATE TABLE IF NOT EXISTS class_schedules (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(20) NOT NULL, -- Will add foreign key constraint after ensuring faculty table exists
    subject_id VARCHAR(20) NOT NULL, -- Will add foreign key constraint after ensuring subjects table exists
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    recurrence_pattern JSONB, -- {type: 'weekly', interval: 1, days: [1,3,5], end_date: '2024-12-31', occurrence_count: 10}
    google_event_id VARCHAR(255),
    google_recurring_event_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
    -- Add faculty foreign key constraint if faculty table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'faculty') THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'class_schedules_teacher_id_fkey'
        ) THEN
            ALTER TABLE class_schedules 
            ADD CONSTRAINT class_schedules_teacher_id_fkey 
            FOREIGN KEY (teacher_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- Add subjects foreign key constraint if subjects table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subjects') THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'class_schedules_subject_id_fkey'
        ) THEN
            ALTER TABLE class_schedules 
            ADD CONSTRAINT class_schedules_subject_id_fkey 
            FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Schedule instances for tracking individual occurrences of recurring events
CREATE TABLE IF NOT EXISTS schedule_instances (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
    instance_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    google_event_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed', 'modified')),
    modifications JSONB, -- Store any instance-specific modifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schedule_id, instance_datetime)
);

-- Student schedule access for managing which students can see which schedules
CREATE TABLE IF NOT EXISTS student_schedule_access (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL, -- Will add foreign key constraint after ensuring students table exists
    schedule_id INTEGER NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
    sync_to_personal_calendar BOOLEAN DEFAULT FALSE,
    access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, schedule_id)
);

-- Add foreign key constraint for students if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students') THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'student_schedule_access_student_id_fkey'
        ) THEN
            ALTER TABLE student_schedule_access 
            ADD CONSTRAINT student_schedule_access_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher ON class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_subject ON class_schedules(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_datetime ON class_schedules(start_datetime);
CREATE INDEX IF NOT EXISTS idx_class_schedules_active ON class_schedules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_schedule_instances_schedule ON schedule_instances(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_instances_datetime ON schedule_instances(instance_datetime);
CREATE INDEX IF NOT EXISTS idx_schedule_instances_status ON schedule_instances(status);
CREATE INDEX IF NOT EXISTS idx_student_schedule_access_student ON student_schedule_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_schedule_access_schedule ON student_schedule_access(schedule_id);

-- Add updated_at triggers for the new tables
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON class_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_instances_updated_at BEFORE UPDATE ON schedule_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for calendar tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_schedule_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_connections
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
    FOR ALL USING (
        (user_type = 'student' AND user_id = auth.uid()::text) OR
        (user_type = 'faculty' AND user_id = auth.uid()::text) OR
        auth.role() = 'admin'
    );

-- RLS Policies for class_schedules
CREATE POLICY "Teachers can manage their own schedules" ON class_schedules
    FOR ALL USING (
        teacher_id = auth.uid()::text OR
        auth.role() = 'admin'
    );

CREATE POLICY "Students can view schedules they have access to" ON class_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_schedule_access 
            WHERE student_schedule_access.schedule_id = class_schedules.id 
            AND student_schedule_access.student_id = auth.uid()::text
        ) OR
        auth.role() IN ('faculty', 'admin')
    );

-- RLS Policies for schedule_instances
CREATE POLICY "Teachers can manage instances of their schedules" ON schedule_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM class_schedules 
            WHERE class_schedules.id = schedule_instances.schedule_id 
            AND class_schedules.teacher_id = auth.uid()::text
        ) OR
        auth.role() = 'admin'
    );

CREATE POLICY "Students can view instances they have access to" ON schedule_instances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM student_schedule_access 
            JOIN class_schedules ON class_schedules.id = student_schedule_access.schedule_id
            WHERE student_schedule_access.schedule_id = schedule_instances.schedule_id 
            AND student_schedule_access.student_id = auth.uid()::text
        ) OR
        auth.role() IN ('faculty', 'admin')
    );

-- RLS Policies for student_schedule_access
CREATE POLICY "Teachers can manage access to their schedules" ON student_schedule_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM class_schedules 
            WHERE class_schedules.id = student_schedule_access.schedule_id 
            AND class_schedules.teacher_id = auth.uid()::text
        ) OR
        auth.role() = 'admin'
    );

CREATE POLICY "Students can view their own schedule access" ON student_schedule_access
    FOR SELECT USING (
        student_id = auth.uid()::text OR
        auth.role() IN ('faculty', 'admin')
    );

-- Function to automatically grant schedule access to enrolled students
CREATE OR REPLACE FUNCTION grant_schedule_access_to_enrolled_students()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new class schedule is created, automatically grant access to all enrolled students
    -- Only if subjects table exists and has enrolled_students column
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subjects') THEN
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'subjects' AND column_name = 'enrolled_students'
        ) THEN
            INSERT INTO student_schedule_access (student_id, schedule_id)
            SELECT 
                unnest(s.enrolled_students) as student_id,
                NEW.id as schedule_id
            FROM subjects s
            WHERE s.subject_id = NEW.subject_id
            AND s.enrolled_students IS NOT NULL
            ON CONFLICT (student_id, schedule_id) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically grant access when a schedule is created
CREATE TRIGGER auto_grant_schedule_access
    AFTER INSERT ON class_schedules
    FOR EACH ROW
    EXECUTE FUNCTION grant_schedule_access_to_enrolled_students();

-- Function to clean up schedule instances when a schedule is deactivated
CREATE OR REPLACE FUNCTION cleanup_schedule_instances()
RETURNS TRIGGER AS $$
BEGIN
    -- When a schedule is deactivated, mark future instances as cancelled
    IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        UPDATE schedule_instances 
        SET status = 'cancelled', updated_at = NOW()
        WHERE schedule_id = NEW.id 
        AND instance_datetime > NOW()
        AND status = 'scheduled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup instances when schedule is deactivated
CREATE TRIGGER cleanup_instances_on_deactivation
    AFTER UPDATE ON class_schedules
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_schedule_instances();

-- Add some helpful views for common queries (only if referenced tables exist)
DO $$
BEGIN
    -- Create student_calendar_view only if all required tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subjects') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'faculty') THEN
        
        EXECUTE '
        CREATE OR REPLACE VIEW student_calendar_view AS
        SELECT 
            cs.id as schedule_id,
            cs.title,
            cs.description,
            cs.start_datetime,
            cs.duration_minutes,
            cs.recurrence_pattern,
            COALESCE(s.name, ''Unknown Subject'') as subject_name,
            cs.subject_id,
            COALESCE(f.name, ''Unknown Teacher'') as teacher_name,
            cs.teacher_id,
            ssa.student_id,
            ssa.sync_to_personal_calendar
        FROM class_schedules cs
        LEFT JOIN subjects s ON cs.subject_id = s.subject_id
        LEFT JOIN faculty f ON cs.teacher_id = f.faculty_id
        JOIN student_schedule_access ssa ON cs.id = ssa.schedule_id
        WHERE cs.is_active = TRUE';
        
    ELSE
        -- Create a simplified view without joins if tables don't exist
        EXECUTE '
        CREATE OR REPLACE VIEW student_calendar_view AS
        SELECT 
            cs.id as schedule_id,
            cs.title,
            cs.description,
            cs.start_datetime,
            cs.duration_minutes,
            cs.recurrence_pattern,
            cs.subject_id,
            cs.teacher_id,
            ssa.student_id,
            ssa.sync_to_personal_calendar,
            ''Unknown Subject'' as subject_name,
            ''Unknown Teacher'' as teacher_name
        FROM class_schedules cs
        JOIN student_schedule_access ssa ON cs.id = ssa.schedule_id
        WHERE cs.is_active = TRUE';
    END IF;
    
    -- Create teacher_calendar_view
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subjects') THEN
        EXECUTE '
        CREATE OR REPLACE VIEW teacher_calendar_view AS
        SELECT 
            cs.id as schedule_id,
            cs.title,
            cs.description,
            cs.start_datetime,
            cs.duration_minutes,
            cs.recurrence_pattern,
            cs.google_event_id,
            cs.google_recurring_event_id,
            COALESCE(s.name, ''Unknown Subject'') as subject_name,
            cs.subject_id,
            cs.teacher_id,
            COALESCE(array_length(s.enrolled_students, 1), 0) as enrolled_student_count
        FROM class_schedules cs
        LEFT JOIN subjects s ON cs.subject_id = s.subject_id
        WHERE cs.is_active = TRUE';
    ELSE
        EXECUTE '
        CREATE OR REPLACE VIEW teacher_calendar_view AS
        SELECT 
            cs.id as schedule_id,
            cs.title,
            cs.description,
            cs.start_datetime,
            cs.duration_minutes,
            cs.recurrence_pattern,
            cs.google_event_id,
            cs.google_recurring_event_id,
            cs.subject_id,
            cs.teacher_id,
            ''Unknown Subject'' as subject_name,
            0 as enrolled_student_count
        FROM class_schedules cs
        WHERE cs.is_active = TRUE';
    END IF;
END $$;

-- Grant necessary permissions for the views
GRANT SELECT ON student_calendar_view TO authenticated;
GRANT SELECT ON teacher_calendar_view TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE calendar_connections IS 'Stores OAuth tokens and connection information for calendar integrations';
COMMENT ON TABLE class_schedules IS 'Stores class schedule information with recurrence patterns';
COMMENT ON TABLE schedule_instances IS 'Tracks individual instances of recurring class schedules';
COMMENT ON TABLE student_schedule_access IS 'Manages which students can access which class schedules';

COMMENT ON COLUMN calendar_connections.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN calendar_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN class_schedules.recurrence_pattern IS 'JSON object defining recurrence: {type, interval, days, end_date, occurrence_count}';
COMMENT ON COLUMN schedule_instances.modifications IS 'JSON object storing instance-specific modifications';