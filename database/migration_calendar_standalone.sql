-- Standalone Calendar Integration Migration
-- This migration creates only the calendar tables without foreign key dependencies
-- Use this if you want to set up calendar functionality independently

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    teacher_id VARCHAR(20) NOT NULL, -- References faculty.faculty_id
    subject_id VARCHAR(20) NOT NULL, -- References subjects.subject_id
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
    student_id VARCHAR(20) NOT NULL, -- References students.student_id
    schedule_id INTEGER NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
    sync_to_personal_calendar BOOLEAN DEFAULT FALSE,
    access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, schedule_id)
);

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

-- Create a function to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers for the calendar tables
DROP TRIGGER IF EXISTS update_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_schedules_updated_at ON class_schedules;
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON class_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_instances_updated_at ON schedule_instances;
CREATE TRIGGER update_schedule_instances_updated_at BEFORE UPDATE ON schedule_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for calendar tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_schedule_access ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (you may need to adjust these based on your auth setup)
-- Note: These policies assume you have proper authentication set up

-- Policies for calendar_connections
DROP POLICY IF EXISTS "Users can manage their own calendar connections" ON calendar_connections;
CREATE POLICY "Users can manage their own calendar connections" ON calendar_connections
    FOR ALL USING (
        user_id = COALESCE(auth.uid()::text, current_setting('app.current_user_id', true))
    );

-- Policies for class_schedules  
DROP POLICY IF EXISTS "Teachers can manage their own schedules" ON class_schedules;
CREATE POLICY "Teachers can manage their own schedules" ON class_schedules
    FOR ALL USING (
        teacher_id = COALESCE(auth.uid()::text, current_setting('app.current_user_id', true))
    );

DROP POLICY IF EXISTS "Users can view schedules" ON class_schedules;
CREATE POLICY "Users can view schedules" ON class_schedules
    FOR SELECT USING (true); -- Allow all authenticated users to view schedules

-- Policies for schedule_instances
DROP POLICY IF EXISTS "Teachers can manage instances of their schedules" ON schedule_instances;
CREATE POLICY "Teachers can manage instances of their schedules" ON schedule_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM class_schedules 
            WHERE class_schedules.id = schedule_instances.schedule_id 
            AND class_schedules.teacher_id = COALESCE(auth.uid()::text, current_setting('app.current_user_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can view schedule instances" ON schedule_instances;
CREATE POLICY "Users can view schedule instances" ON schedule_instances
    FOR SELECT USING (true); -- Allow all authenticated users to view instances

-- Policies for student_schedule_access
DROP POLICY IF EXISTS "Users can view their own schedule access" ON student_schedule_access;
CREATE POLICY "Users can view their own schedule access" ON student_schedule_access
    FOR SELECT USING (
        student_id = COALESCE(auth.uid()::text, current_setting('app.current_user_id', true))
    );

DROP POLICY IF EXISTS "Teachers can manage access to their schedules" ON student_schedule_access;
CREATE POLICY "Teachers can manage access to their schedules" ON student_schedule_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM class_schedules 
            WHERE class_schedules.id = student_schedule_access.schedule_id 
            AND class_schedules.teacher_id = COALESCE(auth.uid()::text, current_setting('app.current_user_id', true))
        )
    );

-- Create simplified views that don't depend on other tables
CREATE OR REPLACE VIEW calendar_schedules_view AS
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
    cs.is_active,
    cs.created_at,
    cs.updated_at
FROM class_schedules cs
WHERE cs.is_active = TRUE;

CREATE OR REPLACE VIEW student_accessible_schedules AS
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
    ssa.access_granted_at
FROM class_schedules cs
JOIN student_schedule_access ssa ON cs.id = ssa.schedule_id
WHERE cs.is_active = TRUE;

-- Grant necessary permissions for the views
GRANT SELECT ON calendar_schedules_view TO authenticated;
GRANT SELECT ON student_accessible_schedules TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE calendar_connections IS 'Stores OAuth tokens and connection information for calendar integrations';
COMMENT ON TABLE class_schedules IS 'Stores class schedule information with recurrence patterns';
COMMENT ON TABLE schedule_instances IS 'Tracks individual instances of recurring class schedules';
COMMENT ON TABLE student_schedule_access IS 'Manages which students can access which class schedules';

COMMENT ON COLUMN calendar_connections.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN calendar_connections.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN class_schedules.recurrence_pattern IS 'JSON object defining recurrence: {type, interval, days, end_date, occurrence_count}';
COMMENT ON COLUMN schedule_instances.modifications IS 'JSON object storing instance-specific modifications';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Calendar integration tables created successfully!';
    RAISE NOTICE 'Tables created: calendar_connections, class_schedules, schedule_instances, student_schedule_access';
    RAISE NOTICE 'Views created: calendar_schedules_view, student_accessible_schedules';
    RAISE NOTICE 'You can now use the calendar integration functionality.';
END $$;