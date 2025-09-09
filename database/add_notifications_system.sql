-- Migration: Add Notifications System
-- This script adds the notifications system to an existing Acadion database
-- Run this in your Supabase SQL Editor

-- Check if notifications table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Create notifications table
        CREATE TABLE notifications (
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
        
        RAISE NOTICE 'Created notifications table';
    ELSE
        RAISE NOTICE 'Notifications table already exists';
    END IF;
END $$;

-- Check if notification_preferences table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        -- Create notification preferences table
        CREATE TABLE notification_preferences (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            notification_type VARCHAR(50) NOT NULL,
            enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, notification_type)
        );
        
        RAISE NOTICE 'Created notification_preferences table';
    ELSE
        RAISE NOTICE 'Notification_preferences table already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    -- Notifications indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notifications_recipient_id') THEN
        CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
        RAISE NOTICE 'Created index: idx_notifications_recipient_id';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
        RAISE NOTICE 'Created index: idx_notifications_created_at';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notifications_recipient_unread') THEN
        CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
        RAISE NOTICE 'Created index: idx_notifications_recipient_unread';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
        CREATE INDEX idx_notifications_type ON notifications(type);
        RAISE NOTICE 'Created index: idx_notifications_type';
    END IF;
    
    -- Notification preferences indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notification_preferences_user_id') THEN
        CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
        RAISE NOTICE 'Created index: idx_notification_preferences_user_id';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_notification_preferences_type') THEN
        CREATE INDEX idx_notification_preferences_type ON notification_preferences(notification_type);
        RAISE NOTICE 'Created index: idx_notification_preferences_type';
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Backend can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON notification_preferences;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Backend can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for notification preferences
CREATE POLICY "Users can view their own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();

-- Create or replace function for default notification preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $
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
$ LANGUAGE plpgsql;

-- Note: The trigger on auth.users needs to be created manually in Supabase dashboard
-- or you can run this separately if you have the necessary permissions:
-- CREATE OR REPLACE TRIGGER create_user_notification_preferences
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_default_notification_preferences();

-- Enable real-time for the new tables
DO $$
BEGIN
    -- Add tables to real-time publication
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
    RAISE NOTICE 'Added tables to real-time publication';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Tables already in real-time publication';
END $$;

-- Add constraints for notification types
DO $$
BEGIN
    -- Add constraint for notification types if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_notification_type' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT check_notification_type 
            CHECK (type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed'));
        RAISE NOTICE 'Added notification type constraint';
    END IF;
    
    -- Add constraint for preference types if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_preference_type' 
        AND table_name = 'notification_preferences'
    ) THEN
        ALTER TABLE notification_preferences ADD CONSTRAINT check_preference_type 
            CHECK (notification_type IN ('student_joined', 'attendance_marked', 'attendance_failed', 'class_joined', 'join_failed'));
        RAISE NOTICE 'Added preference type constraint';
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE notifications IS 'Stores all user notifications with real-time support';
COMMENT ON TABLE notification_preferences IS 'Stores user preferences for different notification types';
COMMENT ON COLUMN notifications.type IS 'Notification types: student_joined, attendance_marked, attendance_failed, class_joined, join_failed';
COMMENT ON COLUMN notifications.data IS 'Additional JSON data specific to each notification type';

RAISE NOTICE 'Notifications system migration completed successfully!';