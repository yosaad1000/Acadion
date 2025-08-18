-- Performance Optimization Migration
-- This migration adds comprehensive database optimizations for better performance
-- Run this in your Supabase SQL Editor

-- STEP 1: Add additional performance indexes
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_attendance_subject_student_date 
ON attendance(subject_id, student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_date_status 
ON attendance(date, status);

CREATE INDEX IF NOT EXISTS idx_attendance_method_confidence 
ON attendance(method, confidence_score) 
WHERE method = 'face_recognition';

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_enrollments_active_subject 
ON subject_enrollments(subject_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_enrollments_active_student 
ON subject_enrollments(student_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_subjects_active_teacher 
ON subjects(teacher_id) 
WHERE is_active = true;

-- Index for face registered users
CREATE INDEX IF NOT EXISTS idx_users_face_registered 
ON users(user_type, is_face_registered) 
WHERE is_face_registered = true;

-- STEP 2: Create materialized view for attendance statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS attendance_stats AS
SELECT 
    s.subject_id,
    s.name as subject_name,
    s.teacher_id,
    COUNT(DISTINCT a.student_id) as unique_students_attended,
    COUNT(DISTINCT a.date) as total_session_days,
    COUNT(DISTINCT a.session_id) as total_sessions,
    COUNT(*) as total_attendance_records,
    COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
    COUNT(*) FILTER (WHERE a.status = 'absent') as absent_count,
    COUNT(*) FILTER (WHERE a.status = 'late') as late_count,
    ROUND(
        (COUNT(*) FILTER (WHERE a.status = 'present')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as attendance_rate,
    MAX(a.date) as last_attendance_date,
    COUNT(DISTINCT se.student_id) as enrolled_students_count
FROM subjects s
LEFT JOIN attendance a ON s.subject_id = a.subject_id
LEFT JOIN subject_enrollments se ON s.subject_id = se.subject_id AND se.is_active = true
WHERE s.is_active = true
GROUP BY s.subject_id, s.name, s.teacher_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_stats_subject 
ON attendance_stats(subject_id);

-- STEP 3: Create function to refresh attendance stats
CREATE OR REPLACE FUNCTION refresh_attendance_stats()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY attendance_stats;
END;
$ LANGUAGE plpgsql;

-- STEP 4: Create trigger to auto-refresh stats on attendance changes
CREATE OR REPLACE FUNCTION trigger_refresh_attendance_stats()
RETURNS TRIGGER AS $
BEGIN
    -- Use pg_notify to trigger async refresh
    PERFORM pg_notify('refresh_stats', NEW.subject_id::text);
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for attendance inserts/updates
DROP TRIGGER IF EXISTS attendance_stats_refresh ON attendance;
CREATE TRIGGER attendance_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_attendance_stats();

-- STEP 5: Create optimized function for student count queries
CREATE OR REPLACE FUNCTION get_subject_student_counts(subject_ids UUID[])
RETURNS TABLE(subject_id UUID, student_count BIGINT) AS $
BEGIN
    RETURN QUERY
    SELECT 
        se.subject_id,
        COUNT(se.student_id) as student_count
    FROM subject_enrollments se
    WHERE se.subject_id = ANY(subject_ids)
    AND se.is_active = true
    GROUP BY se.subject_id;
END;
$ LANGUAGE plpgsql;

-- STEP 6: Create function for optimized attendance dashboard data
CREATE OR REPLACE FUNCTION get_attendance_dashboard_data(p_subject_id UUID)
RETURNS JSON AS $
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'stats', (
            SELECT json_build_object(
                'total_students', enrolled_students_count,
                'total_sessions', total_sessions,
                'present_count', present_count,
                'absent_count', absent_count,
                'late_count', late_count,
                'attendance_rate', attendance_rate
            )
            FROM attendance_stats 
            WHERE subject_id = p_subject_id
        ),
        'recent_sessions', (
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'session_id', session_id,
                    'session_timestamp', session_timestamp,
                    'present_count', COUNT(*) FILTER (WHERE status = 'present'),
                    'absent_count', COUNT(*) FILTER (WHERE status = 'absent'),
                    'late_count', COUNT(*) FILTER (WHERE status = 'late'),
                    'total_records', COUNT(*)
                )
                ORDER BY date DESC, session_timestamp DESC
            )
            FROM (
                SELECT DISTINCT 
                    date, 
                    session_id, 
                    session_timestamp,
                    status
                FROM attendance 
                WHERE subject_id = p_subject_id 
                AND date >= CURRENT_DATE - INTERVAL '30 days'
            ) recent_attendance
            GROUP BY date, session_id, session_timestamp
            LIMIT 20
        ),
        'students', (
            SELECT json_agg(
                json_build_object(
                    'user_id', u.user_id,
                    'name', u.name,
                    'email', u.email,
                    'is_face_registered', u.is_face_registered,
                    'attendance_count', COALESCE(student_stats.attendance_count, 0),
                    'attendance_rate', COALESCE(student_stats.attendance_rate, 0)
                )
            )
            FROM subject_enrollments se
            JOIN users u ON se.student_id = u.user_id
            LEFT JOIN (
                SELECT 
                    student_id,
                    COUNT(*) FILTER (WHERE status = 'present') as attendance_count,
                    ROUND(
                        (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
                        2
                    ) as attendance_rate
                FROM attendance 
                WHERE subject_id = p_subject_id
                GROUP BY student_id
            ) student_stats ON u.user_id = student_stats.student_id
            WHERE se.subject_id = p_subject_id 
            AND se.is_active = true
        )
    ) INTO result;
    
    RETURN result;
END;
$ LANGUAGE plpgsql;

-- STEP 7: Create connection pooling optimization settings
-- These should be set at the database level, but we can suggest optimal values
SELECT 'Performance optimization suggestions:' as info;
SELECT 'Set shared_buffers = 256MB (or 25% of RAM)' as suggestion;
SELECT 'Set effective_cache_size = 1GB (or 75% of RAM)' as suggestion;
SELECT 'Set work_mem = 4MB for complex queries' as suggestion;
SELECT 'Set maintenance_work_mem = 64MB' as suggestion;
SELECT 'Set checkpoint_completion_target = 0.9' as suggestion;
SELECT 'Set wal_buffers = 16MB' as suggestion;

-- STEP 8: Create query performance monitoring
CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_type VARCHAR(50) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    subject_id UUID,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_query_performance_type_time 
ON query_performance_log(query_type, created_at);

-- STEP 9: Create function to log slow queries
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_type VARCHAR(50),
    p_execution_time_ms INTEGER,
    p_subject_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS void AS $
BEGIN
    -- Only log queries that take longer than 100ms
    IF p_execution_time_ms > 100 THEN
        INSERT INTO query_performance_log (
            query_type, 
            execution_time_ms, 
            subject_id, 
            user_id
        ) VALUES (
            p_query_type, 
            p_execution_time_ms, 
            p_subject_id, 
            p_user_id
        );
    END IF;
END;
$ LANGUAGE plpgsql;

-- STEP 10: Create cleanup function for old performance logs
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS void AS $
BEGIN
    DELETE FROM query_performance_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$ LANGUAGE plpgsql;

-- STEP 11: Analyze tables for better query planning
ANALYZE users;
ANALYZE subjects;
ANALYZE subject_enrollments;
ANALYZE attendance;

-- STEP 12: Refresh the materialized view
SELECT refresh_attendance_stats();

-- Verification queries
SELECT 'Database performance optimization completed!' as status;

-- Show all indexes on key tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('users', 'subjects', 'subject_enrollments', 'attendance')
ORDER BY tablename, indexname;

-- Show materialized view info
SELECT 
    schemaname,
    matviewname,
    definition
FROM pg_matviews 
WHERE matviewname = 'attendance_stats';