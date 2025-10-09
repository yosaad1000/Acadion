-- Sessions and Assignments Migration
-- This migration adds session management and assignment tracking to the Acadion platform
-- Run this in your Supabase SQL Editor after the base schema is installed

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================

-- Sessions table - represents individual class sessions within subjects
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(subject_id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    session_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attendance_taken BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ASSIGNMENTS TABLE
-- =============================================================================

-- Assignments table - tracks assignments given during sessions
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('homework', 'test', 'project')),
    google_drive_link TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ASSIGNMENT SUBMISSIONS TABLE
-- =============================================================================

-- Assignment submissions - tracks student submission status
CREATE TABLE IF NOT EXISTS assignment_submissions (
    submission_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(assignment_id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    submission_status VARCHAR(20) DEFAULT 'pending' CHECK (submission_status IN ('pending', 'submitted', 'graded', 'overdue')),
    submission_date TIMESTAMP WITH TIME ZONE,
    google_drive_link TEXT,
    grade VARCHAR(10),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- =============================================================================
-- GOOGLE INTEGRATION TABLE
-- =============================================================================

-- Google integrations - stores Google Workspace integration settings per user
CREATE TABLE IF NOT EXISTS google_integrations (
    integration_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    google_calendar_id TEXT,
    google_drive_folder_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to automatically create assignment submissions for all enrolled students
CREATE OR REPLACE FUNCTION create_assignment_submissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Create submission records for all students enrolled in the subject
    INSERT INTO assignment_submissions (assignment_id, student_id, submission_status)
    SELECT 
        NEW.assignment_id,
        se.student_id,
        'pending'
    FROM subject_enrollments se
    JOIN sessions s ON s.subject_id = se.subject_id
    WHERE s.session_id = NEW.session_id
    AND se.is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update assignment submission status based on due date
CREATE OR REPLACE FUNCTION update_overdue_assignments()
RETURNS void AS $$
BEGIN
    UPDATE assignment_submissions 
    SET submission_status = 'overdue', updated_at = NOW()
    WHERE submission_status = 'pending'
    AND assignment_id IN (
        SELECT assignment_id 
        FROM assignments 
        WHERE due_date < NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update timestamps for sessions
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps for assignments
CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps for assignment submissions
CREATE TRIGGER update_assignment_submissions_updated_at 
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps for google integrations
CREATE TRIGGER update_google_integrations_updated_at 
    BEFORE UPDATE ON google_integrations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create assignment submissions when new assignment is created
CREATE TRIGGER create_assignment_submissions_trigger
    AFTER INSERT ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION create_assignment_submissions();

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_subject_date ON sessions(subject_id, session_date DESC);

-- Assignments table indexes
CREATE INDEX IF NOT EXISTS idx_assignments_session_id ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_status ON assignment_submissions(student_id, submission_status);

-- Google integrations indexes
CREATE INDEX IF NOT EXISTS idx_google_integrations_user_id ON google_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_google_integrations_active ON google_integrations(is_active);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;

-- Sessions table policies
CREATE POLICY "Users can view sessions in their subjects" ON sessions
    FOR SELECT USING (
        -- Students can view sessions in subjects they're enrolled in
        EXISTS (
            SELECT 1 FROM subject_enrollments se 
            WHERE se.subject_id = sessions.subject_id 
            AND se.student_id = auth.uid()
            AND se.is_active = true
        ) OR
        -- Teachers can view sessions in subjects they teach
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR
        -- Service role can view all
        auth.role() = 'service_role'
    );

CREATE POLICY "Teachers can create sessions in their subjects" ON sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update sessions in their subjects" ON sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete sessions in their subjects" ON sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = sessions.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

-- Assignments table policies
CREATE POLICY "Users can view assignments in accessible sessions" ON assignments
    FOR SELECT USING (
        -- Students can view assignments in sessions they have access to
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN subject_enrollments se ON se.subject_id = s.subject_id
            WHERE s.session_id = assignments.session_id
            AND se.student_id = auth.uid()
            AND se.is_active = true
        ) OR
        -- Teachers can view assignments in their sessions
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE s.session_id = assignments.session_id
            AND sub.teacher_id = auth.uid()
        ) OR
        -- Service role can view all
        auth.role() = 'service_role'
    );

CREATE POLICY "Teachers can create assignments in their sessions" ON assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE s.session_id = assignments.session_id
            AND sub.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update assignments in their sessions" ON assignments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE s.session_id = assignments.session_id
            AND sub.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete assignments in their sessions" ON assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions s
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE s.session_id = assignments.session_id
            AND sub.teacher_id = auth.uid()
        )
    );

-- Assignment submissions policies
CREATE POLICY "Users can view relevant assignment submissions" ON assignment_submissions
    FOR SELECT USING (
        -- Students can view their own submissions
        student_id = auth.uid() OR
        -- Teachers can view submissions for their assignments
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN sessions s ON s.session_id = a.session_id
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE a.assignment_id = assignment_submissions.assignment_id
            AND sub.teacher_id = auth.uid()
        ) OR
        -- Service role can view all
        auth.role() = 'service_role'
    );

CREATE POLICY "Students can update their own submissions" ON assignment_submissions
    FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Teachers can update submissions for their assignments" ON assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN sessions s ON s.session_id = a.session_id
            JOIN subjects sub ON sub.subject_id = s.subject_id
            WHERE a.assignment_id = assignment_submissions.assignment_id
            AND sub.teacher_id = auth.uid()
        )
    );

-- Google integrations policies
CREATE POLICY "Users can manage their own Google integrations" ON google_integrations
    FOR ALL USING (
        user_id = auth.uid() OR
        auth.role() = 'service_role'
    );

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT ON sessions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO authenticated;
GRANT SELECT ON assignments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO authenticated;
GRANT SELECT ON assignment_submissions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON google_integrations TO authenticated;
GRANT SELECT ON google_integrations TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_overdue_assignments TO authenticated, service_role;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time for sessions and assignments
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 'Sessions and Assignments migration complete!' as status,
       'Tables created: sessions, assignments, assignment_submissions, google_integrations' as tables,
       'Features: Session management, assignment tracking, Google Workspace integration support' as features;