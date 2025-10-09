# Acadion Database Schema

This directory contains the complete database schema and migration scripts for the Acadion AI-powered student management platform.

## 📁 Files Overview

### Core Schema Files

- **`00_complete_schema.sql`** - Complete database schema for new installations
- **`01_migration_from_existing.sql`** - Migration script for existing databases
- **`cleanup_old_files.sql`** - Documentation of cleanup process
- **`NOTIFICATIONS_SYSTEM_README.md`** - Detailed notifications system documentation
- **`README.md`** - This file

## 🚀 Quick Start

### For New Installations

If you're setting up Acadion for the first time:

```sql
-- Run in your Supabase SQL Editor
\i 00_complete_schema.sql
```

### For Existing Databases

If you already have an Acadion database and want to update:

```sql
-- Run in your Supabase SQL Editor  
\i 01_migration_from_existing.sql
```

## 📊 Database Schema Overview

### Core Tables

#### `users`
- Extends Supabase's built-in authentication
- Supports both teachers and students
- Links to `auth.users` via `auth_user_id`
- Includes face recognition support

#### `user_roles`
- Enables multi-role support (user can be both teacher and student)
- Supports different institutional contexts
- Tracks active/inactive roles

#### `subjects`
- Google Classroom-style subjects/classrooms
- Auto-generated subject codes (SUB000001, SUB000002, etc.)
- Unique invite codes for student enrollment
- Created and managed by teachers

#### `subject_enrollments`
- Tracks student enrollment in subjects
- Many-to-many relationship between users and subjects
- Supports enrollment history

#### `attendance`
- Tracks student attendance per subject per date
- Supports both manual and AI-powered face recognition
- Includes confidence scores for AI-marked attendance
- Prevents duplicate attendance entries

### Notifications System

#### `notifications`
- Stores all user notifications
- Supports real-time delivery via Supabase subscriptions
- Includes structured data field for rich notifications
- Tracks read/unread status

#### `notification_preferences`
- User-configurable notification preferences
- Granular control over notification types
- Automatic defaults for new users

## 🔧 Key Features

### Authentication Integration
- **Supabase Auth**: Full integration with Supabase's built-in authentication
- **OAuth Support**: Google OAuth and email/password authentication
- **Multi-Role**: Users can switch between teacher and student roles
- **Row Level Security**: Comprehensive RLS policies for data protection

### AI-Powered Attendance
- **Face Recognition**: Integration with Pinecone vector database
- **Confidence Scoring**: AI confidence levels for attendance marking
- **Fallback Support**: Manual attendance marking when AI fails
- **Duplicate Prevention**: Unique constraints prevent double-marking

### Real-Time Features
- **Live Notifications**: WebSocket-based real-time notifications
- **Instant Updates**: Real-time subscription support for key tables
- **Cross-Platform**: Works with web, mobile, and desktop clients

### Performance Optimizations
- **Strategic Indexing**: Optimized indexes for common query patterns
- **Efficient Queries**: Designed for fast attendance lookups and reporting
- **Scalable Design**: Supports thousands of concurrent users

## 🔐 Security Features

### Row Level Security (RLS)
- **User Isolation**: Users can only access their own data
- **Role-Based Access**: Teachers can manage their subjects, students can view their enrollments
- **Service Role Access**: Backend services have appropriate permissions
- **Audit Trail**: All changes tracked with timestamps

### Data Protection
- **Cascade Deletes**: Proper foreign key relationships with cascade deletes
- **Constraint Validation**: Database-level validation for data integrity
- **Secure Functions**: Security definer functions for privileged operations

## 🛠️ Helper Functions

### Code Generation
- `generate_invite_code()` - Creates unique 8-character invite codes
- `generate_subject_code()` - Creates sequential subject codes (SUB000001, etc.)

### User Management
- `handle_new_user()` - Automatically creates user profiles from Supabase auth
- `switch_user_role()` - Allows users to switch between available roles
- `add_user_role()` - Adds new roles to existing users

### Notifications
- `create_default_notification_preferences()` - Sets up default preferences for new users

## 📈 Performance Considerations

### Indexes
- **User Lookups**: Fast user authentication and profile queries
- **Attendance Queries**: Optimized for date-range and student-specific queries
- **Subject Management**: Fast teacher-subject and student-enrollment lookups
- **Notifications**: Efficient unread notification queries

### Query Patterns
- **Attendance Reports**: Optimized for teacher dashboard queries
- **Student Progress**: Fast student-specific attendance and enrollment queries
- **Real-Time Updates**: Efficient notification delivery and preference queries

## 🔄 Migration History

The database schema has evolved through several phases:

1. **Traditional University Schema** - Complex departmental structure
2. **Google Classroom Simplification** - Streamlined for ease of use
3. **Supabase Auth Integration** - Migration from custom to built-in auth
4. **Multi-Role Support** - Added support for users with multiple roles
5. **Notifications System** - Comprehensive notification infrastructure
6. **Consolidation** - Cleaned up and consolidated all schemas

## 🧪 Testing

### Verification Queries

```sql
-- Check table creation
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('users', 'user_roles', 'subjects', 'subject_enrollments', 'attendance', 'notifications', 'notification_preferences');

-- Test user creation
SELECT * FROM users LIMIT 5;

-- Test subject creation
SELECT * FROM subjects LIMIT 5;

-- Check notification preferences
SELECT * FROM notification_preferences LIMIT 10;
```

### Sample Data

The schema includes triggers that automatically:
- Generate unique subject codes and invite codes
- Create user profiles when users sign up via Supabase Auth
- Set up default notification preferences
- Update timestamps on record changes

## 🚨 Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure you're authenticated when testing queries
2. **Foreign Key Violations**: Check that referenced users exist in auth.users
3. **Duplicate Constraints**: Unique constraints prevent duplicate enrollments/attendance
4. **Permission Errors**: Verify service role permissions for backend operations

### Debug Queries

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Check user profile
SELECT * FROM users WHERE auth_user_id = auth.uid();

-- Check user roles
SELECT * FROM user_roles WHERE auth_user_id = auth.uid();

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'subjects', 'attendance', 'notifications');
```

## 📞 Support

For issues with the database schema:

1. Check the troubleshooting section above
2. Verify your Supabase project settings
3. Ensure proper authentication setup
4. Review the RLS policies for your use case

## 🔮 Future Enhancements

Planned improvements:
- **Analytics Tables**: Dedicated tables for performance analytics
- **Gradebook Integration**: Grade tracking and reporting
- **Advanced Notifications**: Email and SMS notification channels
- **Audit Logging**: Comprehensive audit trail for compliance
- **Multi-Tenant Support**: Institution-level data isolation