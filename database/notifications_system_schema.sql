-- Notifications System Database Schema
-- Run this in your Supabase SQL Editor after the main schema is set up

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- Users can only update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- System/backend can create notifications for any user
-- This policy allows the backend service to create notifications
CREATE POLICY "Backend can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users cannot delete notifications (optional - uncomment if you want to allow deletion)
-- CREATE POLICY "Users can delete their own notifications" ON notifications
--     FOR DELETE USING (auth.uid() = recipient_id);

-- RLS Policies for notification preferences
-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can create their own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default preferences for all notification types
    INSERT INTO notification_preferences (user_id, notification_type, enabled) VALUES
        (NEW.id, 'student_joined', TRUE),
        (NEW.id, 'attendance_marked', TRUE),
        (NEW.id, 'attendance_failed', TRUE),
        (NEW.id, 'class_joined', TRUE),
        (NEW.id, 'join_failed', TRUE)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create default preferences for new users
-- Note: This trigger is on auth.users which is managed by Supabase
-- You may need to create this trigger manually in the Supabase dashboard
-- or handle default preferences creation in your application code
CREATE OR REPLACE TRIGGER create_user_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Enable real-time for notifications table
-- This allows Supabase real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;

-- Insert some sample notification types documentation
-- This is just for reference - the actual types are defined in the application code
COMMENT ON COLUMN notifications.type IS 'Notification types: student_joined, attendance_marked, attendance_failed, class_joined, join_failed';

-- Add constraints for notification types (optional - can be handled in application)
ALTER TABLE notifications ADD CONSTRAINT check_notification_type 
    CHECK (type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed'));

ALTER TABLE notification_preferences ADD CONSTRAINT check_preference_type 
    CHECK (notification_type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed'));