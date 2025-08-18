-- Migration for user preferences and customization features
-- Adds user_preferences table for storing scheduling and calendar customization settings

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    scheduling_preferences JSONB NOT NULL DEFAULT '{
        "default_duration_minutes": 60,
        "buffer_time_minutes": 15,
        "preferred_start_time": null,
        "preferred_end_time": null,
        "default_days_of_week": [0, 2, 4],
        "timezone": "UTC",
        "auto_sync_to_calendar": true,
        "conflict_detection_enabled": true
    }',
    calendar_preferences JSONB NOT NULL DEFAULT '{
        "event_color": "#4285f4",
        "show_student_count": true,
        "include_subject_code": true,
        "notification_minutes_before": [15, 60],
        "event_title_template": "{subject_code}: {title}"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add timezone column to class_schedules table for multi-timezone support
ALTER TABLE class_schedules 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER DEFAULT 15;

-- Create index for timezone-based queries
CREATE INDEX IF NOT EXISTS idx_class_schedules_timezone ON class_schedules(timezone);

-- Add custom days of week support to recurrence patterns
-- This is handled in the JSONB recurrence_pattern column, no schema change needed

-- Create a view for enhanced schedule queries with timezone conversion
CREATE OR REPLACE VIEW enhanced_schedule_view AS
SELECT 
    cs.*,
    up.scheduling_preferences->>'timezone' as user_timezone,
    up.calendar_preferences->>'event_color' as event_color,
    up.calendar_preferences->>'event_title_template' as title_template,
    s.subject_name,
    s.subject_code,
    u.name as teacher_name,
    (
        SELECT COUNT(*)::INTEGER 
        FROM student_schedule_access ssa 
        WHERE ssa.schedule_id = cs.id
    ) as enrolled_student_count
FROM class_schedules cs
LEFT JOIN user_preferences up ON cs.teacher_id = up.user_id
LEFT JOIN subjects s ON cs.subject_id = s.subject_id
LEFT JOIN users u ON cs.teacher_id = u.user_id
WHERE cs.is_active = true;

-- Create function to check schedule conflicts with buffer time
CREATE OR REPLACE FUNCTION check_schedule_conflicts(
    p_user_id VARCHAR(255),
    p_start_datetime TIMESTAMP WITH TIME ZONE,
    p_duration_minutes INTEGER,
    p_exclude_schedule_id INTEGER DEFAULT NULL,
    p_include_buffer BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    schedule_id INTEGER,
    title VARCHAR(255),
    start_datetime TIMESTAMP WITH TIME ZONE,
    end_datetime TIMESTAMP WITH TIME ZONE,
    conflict_type VARCHAR(50)
) AS $$
DECLARE
    buffer_minutes INTEGER := 0;
    proposed_end TIMESTAMP WITH TIME ZONE;
    buffer_start TIMESTAMP WITH TIME ZONE;
    buffer_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user's buffer time preference
    IF p_include_buffer THEN
        SELECT COALESCE((scheduling_preferences->>'buffer_time_minutes')::INTEGER, 15)
        INTO buffer_minutes
        FROM user_preferences
        WHERE user_id = p_user_id;
    END IF;
    
    -- Calculate time boundaries
    proposed_end := p_start_datetime + (p_duration_minutes || ' minutes')::INTERVAL;
    buffer_start := p_start_datetime - (buffer_minutes || ' minutes')::INTERVAL;
    buffer_end := proposed_end + (buffer_minutes || ' minutes')::INTERVAL;
    
    -- Find conflicts
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.start_datetime,
        cs.start_datetime + (cs.duration_minutes || ' minutes')::INTERVAL as end_datetime,
        CASE 
            WHEN cs.start_datetime < proposed_end AND 
                 (cs.start_datetime + (cs.duration_minutes || ' minutes')::INTERVAL) > p_start_datetime 
            THEN 'direct_overlap'
            ELSE 'buffer_conflict'
        END as conflict_type
    FROM class_schedules cs
    WHERE cs.teacher_id = p_user_id
      AND cs.is_active = true
      AND (p_exclude_schedule_id IS NULL OR cs.id != p_exclude_schedule_id)
      AND (
          -- Direct overlap
          (cs.start_datetime < proposed_end AND 
           (cs.start_datetime + (cs.duration_minutes || ' minutes')::INTERVAL) > p_start_datetime)
          OR
          -- Buffer conflict (only if buffer checking is enabled)
          (p_include_buffer AND buffer_minutes > 0 AND
           cs.start_datetime < buffer_end AND 
           (cs.start_datetime + (cs.duration_minutes || ' minutes')::INTERVAL) > buffer_start)
      );
END;
$$ LANGUAGE plpgsql;

-- Create function to generate alternative time suggestions
CREATE OR REPLACE FUNCTION suggest_alternative_times(
    p_user_id VARCHAR(255),
    p_date DATE,
    p_duration_minutes INTEGER,
    p_max_suggestions INTEGER DEFAULT 3
) RETURNS TABLE (
    suggested_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    preferred_start TIME;
    preferred_end TIME;
    user_timezone VARCHAR(50);
    current_time TIMESTAMP WITH TIME ZONE;
    end_boundary TIMESTAMP WITH TIME ZONE;
    suggestion_count INTEGER := 0;
BEGIN
    -- Get user preferences
    SELECT 
        COALESCE((scheduling_preferences->>'preferred_start_time')::TIME, '09:00'::TIME),
        COALESCE((scheduling_preferences->>'preferred_end_time')::TIME, '17:00'::TIME),
        COALESCE(scheduling_preferences->>'timezone', 'UTC')
    INTO preferred_start, preferred_end, user_timezone
    FROM user_preferences
    WHERE user_id = p_user_id;
    
    -- Set time boundaries for the given date
    current_time := (p_date + preferred_start) AT TIME ZONE user_timezone;
    end_boundary := (p_date + preferred_end) AT TIME ZONE user_timezone;
    
    -- Generate hourly suggestions
    WHILE current_time + (p_duration_minutes || ' minutes')::INTERVAL <= end_boundary 
          AND suggestion_count < p_max_suggestions LOOP
        
        -- Check if this time slot is free
        IF NOT EXISTS (
            SELECT 1 FROM check_schedule_conflicts(
                p_user_id, 
                current_time, 
                p_duration_minutes, 
                NULL, 
                TRUE
            )
        ) THEN
            suggested_time := current_time;
            suggestion_count := suggestion_count + 1;
            RETURN NEXT;
        END IF;
        
        current_time := current_time + '1 hour'::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_timestamp
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_timestamp();

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, scheduling_preferences, calendar_preferences)
SELECT 
    u.user_id,
    '{
        "default_duration_minutes": 60,
        "buffer_time_minutes": 15,
        "preferred_start_time": null,
        "preferred_end_time": null,
        "default_days_of_week": [0, 2, 4],
        "timezone": "UTC",
        "auto_sync_to_calendar": true,
        "conflict_detection_enabled": true
    }'::JSONB,
    '{
        "event_color": "#4285f4",
        "show_student_count": true,
        "include_subject_code": true,
        "notification_minutes_before": [15, 60],
        "event_title_template": "{subject_code}: {title}"
    }'::JSONB
FROM users u
WHERE u.user_type IN ('teacher', 'faculty')
  AND NOT EXISTS (
      SELECT 1 FROM user_preferences up WHERE up.user_id = u.user_id
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_preferences_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION check_schedule_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_alternative_times TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'User preferences for scheduling and calendar customization';
COMMENT ON COLUMN user_preferences.scheduling_preferences IS 'JSON object containing scheduling preferences like default duration, buffer time, timezone, etc.';
COMMENT ON COLUMN user_preferences.calendar_preferences IS 'JSON object containing calendar display preferences like colors, templates, notifications, etc.';
COMMENT ON FUNCTION check_schedule_conflicts IS 'Function to detect scheduling conflicts with buffer time consideration';
COMMENT ON FUNCTION suggest_alternative_times IS 'Function to generate alternative time suggestions when conflicts exist';