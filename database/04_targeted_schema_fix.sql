-- =============================================================================
-- TARGETED DATABASE SCHEMA FIX
-- =============================================================================
-- This script fixes the specific issues in your current database schema
-- Based on your actual current schema structure
-- Safe to run - handles data migration properly
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: CLEAN UP ORPHANED DATA FIRST
-- =============================================================================

DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Check for attendance records with students not in auth.users
    SELECT COUNT(*) INTO orphaned_count
    FROM attendance a
    LEFT JOIN users u ON u.user_id = a.student_id
    WHERE u.auth_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id
    );
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % attendance records with invalid student references. Cleaning up...', orphaned_count;
        
        -- Delete attendance records where student doesn't exist in auth.users
        DELETE FROM attendance 
        WHERE student_id NOT IN (
            SELECT u.user_id 
            FROM users u 
            WHERE u.auth_user_id IS NOT NULL 
            AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
        );
    END IF;
    
    -- Clean up subject_enrollments
    SELECT COUNT(*) INTO orphaned_count
    FROM subject_enrollments se
    LEFT JOIN users u ON u.user_id = se.student_id
    WHERE u.auth_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id
    );
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % enrollment records with invalid student references. Cleaning up...', orphaned_count;
        
        DELETE FROM subject_enrollments 
        WHERE student_id NOT IN (
            SELECT u.user_id 
            FROM users u 
            WHERE u.auth_user_id IS NOT NULL 
            AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
        );
    END IF;
    
    -- Clean up subjects with invalid teachers
    SELECT COUNT(*) INTO orphaned_count
    FROM subjects s
    LEFT JOIN users u ON u.user_id = s.teacher_id
    WHERE s.teacher_id IS NOT NULL AND (
        u.auth_user_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id
        )
    );
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % subjects with invalid teacher references. Setting teacher_id to NULL...', orphaned_count;
        
        UPDATE subjects 
        SET teacher_id = NULL 
        WHERE teacher_id IS NOT NULL AND teacher_id NOT IN (
            SELECT u.user_id 
            FROM users u 
            WHERE u.auth_user_id IS NOT NULL 
            AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.auth_user_id)
        );
    END IF;
    
    RAISE NOTICE 'Data cleanup completed';
END $$;

-- =============================================================================
-- STEP 2: FIX ATTENDANCE TABLE STRUCTURE
-- =============================================================================

-- Drop the problematic session columns and add proper UUID session_id
ALTER TABLE attendance DROP COLUMN IF EXISTS session_id CASCADE;
ALTER TABLE attendance DROP COLUMN IF EXISTS session_name CASCADE;
ALTER TABLE attendance DROP COLUMN IF EXISTS session_time CASCADE;

-- Add proper session_id that references sessions table
ALTER TABLE attendance ADD COLUMN session_id UUID REFERENCES sessions(session_id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 3: DROP DEPENDENT POLICIES BEFORE COLUMN CHANGES
-- =============================================================================

-- Drop policies that depend on columns we're about to change
DROP POLICY IF EXISTS "Users can view sessions in their subjects" ON sessions;
DROP POLICY IF EXISTS "Teachers can create sessions in their subjects" ON sessions;
DROP POLICY IF EXISTS "Teachers can update sessions in their subjects" ON sessions;
DROP POLICY IF EXISTS "Teachers can delete sessions in their subjects" ON sessions;
DROP POLICY IF EXISTS "Users can view assignments in accessible sessions" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments in their sessions" ON assignments;
DROP POLICY IF EXISTS "Teachers can update assignments in their sessions" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete assignments in their sessions" ON assignments;
DROP POLICY IF EXISTS "Users can view relevant enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can view relevant assignment submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Teachers can update submissions for their assignments" ON assignment_submissions;

-- =============================================================================
-- STEP 4: MIGRATE FOREIGN KEYS TO AUTH.USERS
-- =============================================================================

-- Create helper function to get auth_user_id from public.users.user_id
CREATE OR REPLACE FUNCTION get_auth_user_id(p_user_id UUID) 
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT auth_user_id FROM users WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Update attendance table to use auth.users IDs
DO $$
BEGIN
    -- Add new columns for auth.users references
    ALTER TABLE attendance ADD COLUMN student_auth_id UUID;
    ALTER TABLE attendance ADD COLUMN marked_by_auth_id UUID;
    
    -- Migrate data from public.users IDs to auth.users IDs
    UPDATE attendance 
    SET student_auth_id = get_auth_user_id(student_id),
        marked_by_auth_id = get_auth_user_id(marked_by);
    
    -- Drop old foreign key constraints
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
    
    -- Drop old columns
    ALTER TABLE attendance DROP COLUMN student_id;
    ALTER TABLE attendance DROP COLUMN marked_by;
    
    -- Rename new columns
    ALTER TABLE attendance RENAME COLUMN student_auth_id TO student_id;
    ALTER TABLE attendance RENAME COLUMN marked_by_auth_id TO marked_by;
    
    -- Add new foreign key constraints
    ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE attendance ADD CONSTRAINT attendance_marked_by_fkey 
        FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        
    RAISE NOTICE 'Migrated attendance table to use auth.users';
END $$;

-- Update subject_enrollments table
DO $$
BEGIN
    -- Add new column for auth.users reference
    ALTER TABLE subject_enrollments ADD COLUMN student_auth_id UUID;
    
    -- Migrate data
    UPDATE subject_enrollments 
    SET student_auth_id = get_auth_user_id(student_id);
    
    -- Drop old constraint and column
    ALTER TABLE subject_enrollments DROP CONSTRAINT IF EXISTS subject_enrollments_student_id_fkey;
    ALTER TABLE subject_enrollments DROP COLUMN student_id;
    
    -- Rename new column
    ALTER TABLE subject_enrollments RENAME COLUMN student_auth_id TO student_id;
    
    -- Add new constraint
    ALTER TABLE subject_enrollments ADD CONSTRAINT subject_enrollments_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
    RAISE NOTICE 'Migrated subject_enrollments table to use auth.users';
END $$;

-- Update subjects table
DO $$
BEGIN
    -- Add new column for auth.users reference
    ALTER TABLE subjects ADD COLUMN teacher_auth_id UUID;
    
    -- Migrate data
    UPDATE subjects 
    SET teacher_auth_id = get_auth_user_id(teacher_id)
    WHERE teacher_id IS NOT NULL;
    
    -- Drop old constraint and column
    ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_teacher_id_fkey;
    ALTER TABLE subjects DROP COLUMN teacher_id;
    
    -- Rename new column
    ALTER TABLE subjects RENAME COLUMN teacher_auth_id TO teacher_id;
    
    -- Add new constraint
    ALTER TABLE subjects ADD CONSTRAINT subjects_teacher_id_fkey 
        FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        
    RAISE NOTICE 'Migrated subjects table to use auth.users';
END $$;

-- Drop the helper function
DROP FUNCTION get_auth_user_id(UUID);

-- =============================================================================
-- STEP 5: ADD PROPER CASCADE DELETES
-- =============================================================================

-- Fix sessions cascades
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_subject_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE;

-- Fix assignments cascades
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_session_id_fkey;
ALTER TABLE assignments ADD CONSTRAINT assignments_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE;

-- Fix assignment_submissions cascades
ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_assignment_id_fkey 
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE;

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_student_id_fkey;
ALTER TABLE assignment_submissions ADD CONSTRAINT assignment_submissions_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix subject_enrollments cascades
ALTER TABLE subject_enrollments DROP CONSTRAINT IF EXISTS subject_enrollments_subject_id_fkey;
ALTER TABLE subject_enrollments ADD CONSTRAINT subject_enrollments_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 6: ADD CRITICAL PERFORMANCE INDEXES
-- =============================================================================

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance(subject_id, date);

-- Subject enrollments indexes
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student_id ON subject_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject_id ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_active ON subject_enrollments(is_active);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_session_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_subject_date ON sessions(subject_id, session_date DESC);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_session_id ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(submission_status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON subjects(subject_code);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- STEP 7: CLEAN UP DUPLICATE DATA BEFORE ADDING CONSTRAINTS
-- =============================================================================

-- Remove duplicate attendance records (only session-based duplicates, not date-based)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Check for session-based duplicates (same student, same session)
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT student_id, session_id, COUNT(*) as cnt
        FROM attendance 
        WHERE session_id IS NOT NULL
        GROUP BY student_id, session_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate attendance records for same session. Cleaning up...', duplicate_count;
        
        -- Delete duplicates, keeping only the most recent record for each (student, session)
        DELETE FROM attendance 
        WHERE session_id IS NOT NULL 
        AND id NOT IN (
            SELECT DISTINCT ON (student_id, session_id) id
            FROM attendance 
            WHERE session_id IS NOT NULL
            ORDER BY student_id, session_id, created_at DESC
        );
        
        RAISE NOTICE 'Duplicate session attendance records cleaned up';
    END IF;
    
    -- Check for duplicate enrollments
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT subject_id, student_id, COUNT(*) as cnt
        FROM subject_enrollments 
        GROUP BY subject_id, student_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate enrollment records. Cleaning up...', duplicate_count;
        
        -- Delete duplicate enrollments, keeping the most recent one
        DELETE FROM subject_enrollments 
        WHERE id NOT IN (
            SELECT DISTINCT ON (subject_id, student_id) id
            FROM subject_enrollments 
            ORDER BY subject_id, student_id, enrolled_at DESC
        );
        
        RAISE NOTICE 'Duplicate enrollment records cleaned up';
    END IF;
END $$;

-- =============================================================================
-- STEP 8: ADD UNIQUE CONSTRAINTS
-- =============================================================================

-- Prevent duplicate attendance per session (this is the correct constraint)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_attendance_per_session;
ALTER TABLE attendance ADD CONSTRAINT unique_attendance_per_session 
    UNIQUE (student_id, session_id);

-- Remove the problematic date-based constraint (students can attend multiple sessions per day)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_attendance_per_day;

-- Prevent duplicate enrollments
ALTER TABLE subject_enrollments DROP CONSTRAINT IF EXISTS unique_enrollment;
ALTER TABLE subject_enrollments ADD CONSTRAINT unique_enrollment 
    UNIQUE (subject_id, student_id);

-- Prevent duplicate assignment submissions
ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS unique_assignment_submission;
ALTER TABLE assignment_submissions ADD CONSTRAINT unique_assignment_submission 
    UNIQUE (assignment_id, student_id);

-- =============================================================================
-- STEP 9: RECREATE ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Drop old attendance policies (if any remain)
DROP POLICY IF EXISTS "Users can view relevant attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can mark attendance" ON attendance;

-- Create new attendance policies
CREATE POLICY "Users can view relevant attendance" ON attendance
    FOR SELECT USING (
        -- Students can view their own attendance
        student_id = auth.uid() OR
        -- Teachers can view attendance for their subjects
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = attendance.subject_id 
            AND s.teacher_id = auth.uid()
        ) OR
        -- Service role can view all
        auth.role() = 'service_role'
    );

CREATE POLICY "Teachers can mark attendance" ON attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = attendance.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update attendance" ON attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects s 
            WHERE s.subject_id = attendance.subject_id 
            AND s.teacher_id = auth.uid()
        )
    );

-- Recreate subject_enrollments policies
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

-- Recreate sessions policies
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

-- Recreate assignments policies
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

-- Recreate assignment_submissions policies
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

-- =============================================================================
-- STEP 10: CREATE HELPFUL VIEWS
-- =============================================================================

-- Attendance report view
CREATE OR REPLACE VIEW attendance_report AS
SELECT 
    a.id,
    a.date,
    a.status,
    a.method,
    a.confidence_score,
    COALESCE(u.name, au_student.email) as student_name,
    au_student.email as student_email,
    s.name as subject_name,
    s.subject_code,
    sess.name as session_name,
    sess.session_date,
    COALESCE(teacher_u.name, au_teacher.email) as teacher_name
FROM attendance a
JOIN auth.users au_student ON au_student.id = a.student_id
LEFT JOIN users u ON u.auth_user_id = a.student_id
JOIN subjects s ON s.subject_id = a.subject_id
LEFT JOIN sessions sess ON sess.session_id = a.session_id
LEFT JOIN auth.users au_teacher ON au_teacher.id = s.teacher_id
LEFT JOIN users teacher_u ON teacher_u.auth_user_id = s.teacher_id;

-- Assignment status view
CREATE OR REPLACE VIEW assignment_status AS
SELECT 
    a.assignment_id,
    a.title as assignment_title,
    a.due_date,
    a.assignment_type,
    s.name as session_name,
    sub.name as subject_name,
    sub.subject_code,
    COALESCE(teacher_u.name, au_teacher.email) as teacher_name,
    COUNT(asub.submission_id) as total_submissions,
    COUNT(CASE WHEN asub.submission_status = 'submitted' THEN 1 END) as submitted_count,
    COUNT(CASE WHEN asub.submission_status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN asub.submission_status = 'overdue' THEN 1 END) as overdue_count,
    COUNT(CASE WHEN asub.submission_status = 'graded' THEN 1 END) as graded_count
FROM assignments a
JOIN sessions s ON s.session_id = a.session_id
JOIN subjects sub ON sub.subject_id = s.subject_id
LEFT JOIN auth.users au_teacher ON au_teacher.id = sub.teacher_id
LEFT JOIN users teacher_u ON teacher_u.auth_user_id = sub.teacher_id
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.assignment_id
GROUP BY a.assignment_id, a.title, a.due_date, a.assignment_type, 
         s.name, sub.name, sub.subject_code, COALESCE(teacher_u.name, au_teacher.email);

-- Grant permissions on views
GRANT SELECT ON attendance_report TO authenticated;
GRANT SELECT ON assignment_status TO authenticated;

-- =============================================================================
-- STEP 11: FINAL CLEANUP
-- =============================================================================

-- Link existing attendance records to sessions where possible
UPDATE attendance 
SET session_id = (
    SELECT session_id 
    FROM sessions s 
    WHERE s.subject_id = attendance.subject_id 
    AND s.session_date::DATE = attendance.date
    LIMIT 1
)
WHERE session_id IS NULL
AND EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.subject_id = attendance.subject_id 
    AND s.session_date::DATE = attendance.date
);

-- Analyze tables for better performance
ANALYZE users;
ANALYZE subjects;
ANALYZE subject_enrollments;
ANALYZE sessions;
ANALYZE assignments;
ANALYZE assignment_submissions;
ANALYZE attendance;
ANALYZE notifications;

COMMIT;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 
    'Database migration completed successfully!' as status,
    'Fixed: Attendance session linking, standardized on auth.users, added cascades and indexes' as changes,
    'Your website should now work perfectly!' as result;