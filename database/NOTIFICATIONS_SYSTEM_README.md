# Notifications System Database Setup

This directory contains the database schema and migration scripts for the Acadion notifications system.

## Files Overview

- `notifications_system_schema.sql` - Complete schema for new installations
- `add_notifications_system.sql` - Migration script for existing databases
- `setup_notification_preferences_for_existing_users.sql` - Creates default preferences for existing users
- `verify_notifications_system.sql` - Verification script to check setup

## Setup Instructions

### For New Installations

If you're setting up a fresh database, run the complete schema:

```sql
-- Run in Supabase SQL Editor
\i notifications_system_schema.sql
```

### For Existing Databases (Recommended)

If you already have an Acadion database running, use the migration script:

1. **Run the migration script:**
   ```sql
   -- Run in Supabase SQL Editor
   \i add_notifications_system.sql
   ```

2. **Setup preferences for existing users:**
   ```sql
   -- Run in Supabase SQL Editor
   \i setup_notification_preferences_for_existing_users.sql
   ```

3. **Verify the setup:**
   ```sql
   -- Run in Supabase SQL Editor
   \i verify_notifications_system.sql
   ```

## Database Schema

### Tables Created

#### `notifications`
- Stores all user notifications
- Supports real-time subscriptions
- Includes RLS policies for user privacy

#### `notification_preferences`
- Stores user preferences for different notification types
- Allows users to enable/disable specific notification types
- Automatically creates defaults for new users

### Notification Types

The system supports these notification types:
- `student_joined` - When a student joins a class
- `attendance_marked` - When attendance is successfully marked
- `attendance_failed` - When attendance marking fails
- `class_joined` - When a student successfully joins a class
- `join_failed` - When a student fails to join a class

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- Users can only see their own notifications and preferences
- Backend services can create notifications for any user
- Proper foreign key constraints with cascade deletes

### Performance Features

- Optimized indexes for common queries
- Partial index for unread notifications
- Automatic timestamp updates via triggers

## Real-time Setup

The tables are automatically added to Supabase's real-time publication, enabling:
- Instant notification delivery
- Real-time preference updates
- WebSocket-based subscriptions

## Manual Steps Required

### 1. Auth Trigger (Optional)

The trigger for creating default preferences for new users needs to be created manually in Supabase:

```sql
CREATE OR REPLACE TRIGGER create_user_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();
```

**Note:** This may require elevated permissions. Alternatively, handle default preference creation in your application code.

### 2. Real-time Configuration

Ensure your Supabase project has real-time enabled for the notifications tables. This should be automatic, but verify in your Supabase dashboard under Database > Replication.

## Testing the Setup

After running the migration scripts, you can test the setup:

1. **Check table creation:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('notifications', 'notification_preferences');
   ```

2. **Test notification creation:**
   ```sql
   INSERT INTO notifications (recipient_id, type, title, message) 
   VALUES (auth.uid(), 'student_joined', 'Test Notification', 'This is a test message');
   ```

3. **Check preferences:**
   ```sql
   SELECT * FROM notification_preferences WHERE user_id = auth.uid();
   ```

## Troubleshooting

### Common Issues

1. **RLS Policies Not Working:**
   - Ensure you're authenticated when testing
   - Check that `auth.uid()` returns a valid UUID

2. **Real-time Not Working:**
   - Verify tables are in the `supabase_realtime` publication
   - Check your Supabase project's real-time settings

3. **Foreign Key Errors:**
   - Ensure the `auth.users` table exists and has the expected structure
   - Verify user IDs are valid UUIDs

### Rollback Instructions

If you need to remove the notifications system:

```sql
-- Drop tables (this will remove all notification data)
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_notifications_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_default_notification_preferences() CASCADE;

-- Remove from real-time publication
ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE notification_preferences;
```

## Next Steps

After setting up the database schema:

1. Implement the backend notification service (Task 2)
2. Create the API endpoints (Task 4)
3. Build the frontend notification components (Tasks 6-9)
4. Test the complete notification flow (Task 13)

## Support

If you encounter issues with the database setup, check:
- Supabase project permissions
- Database connection settings
- RLS policy configurations
- Real-time subscription settings