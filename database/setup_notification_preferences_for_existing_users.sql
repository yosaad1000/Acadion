-- Setup Default Notification Preferences for Existing Users
-- Run this script after adding the notifications system to create default preferences for existing users

-- Create default notification preferences for all existing users who don't have them
INSERT INTO notification_preferences (user_id, notification_type, enabled)
SELECT 
    u.id as user_id,
    notification_type,
    TRUE as enabled
FROM 
    auth.users u
CROSS JOIN (
    VALUES 
        ('student_joined'),
        ('attendance_marked'),
        ('attendance_failed'),
        ('class_joined'),
        ('join_failed')
) AS types(notification_type)
WHERE NOT EXISTS (
    SELECT 1 
    FROM notification_preferences np 
    WHERE np.user_id = u.id 
    AND np.notification_type = types.notification_type
);

-- Show summary of what was created
SELECT 
    'Created default preferences for ' || COUNT(DISTINCT user_id) || ' users' as summary
FROM notification_preferences
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Show current preference counts by type
SELECT 
    notification_type,
    COUNT(*) as user_count,
    COUNT(CASE WHEN enabled THEN 1 END) as enabled_count
FROM notification_preferences
GROUP BY notification_type
ORDER BY notification_type;