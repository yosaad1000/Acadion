# Calendar Database Setup Guide

This guide explains how to set up the calendar integration database schema for the Google Calendar Class Scheduling feature.

## Overview

The calendar integration adds four new tables to support Google Calendar functionality:

1. **calendar_connections** - Stores OAuth tokens and connection info
2. **class_schedules** - Stores scheduled classes with recurrence patterns  
3. **schedule_instances** - Tracks individual occurrences of recurring events
4. **student_schedule_access** - Manages which students can see which schedules

## Setup Instructions

### 1. Run Database Migration

You have two migration options depending on your current database state:

#### Option A: Full Integration (if you have the main schema)
If you already have the main database schema with `faculty`, `students`, and `subjects` tables:

```sql
-- Run this file in Supabase SQL Editor
-- File: database/migration_calendar_integration.sql
```

#### Option B: Standalone Calendar Tables (recommended for new setups)
If you want to set up just the calendar functionality or don't have the main schema yet:

```sql
-- Run this file in Supabase SQL Editor  
-- File: database/migration_calendar_standalone.sql
```

The standalone migration creates the calendar tables without foreign key dependencies and includes simplified views.

The migration includes:
- Table creation with proper constraints
- Indexes for performance optimization
- Row Level Security (RLS) policies
- Triggers for automatic updates
- Helper views for common queries
- Functions for automatic access management

### 2. Docker Environment

Since you're running the backend in Docker, make sure your Docker container includes:

```dockerfile
# Add to your Dockerfile or requirements.txt
supabase==2.3.0
```

### 3. Environment Variables

Ensure these environment variables are set in your Docker container:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 4. Rebuild Docker Container

After adding the new dependencies, rebuild your Docker container:

```bash
docker-compose build backend
docker-compose up -d
```

## Database Schema Details

### Calendar Connections Table
```sql
CREATE TABLE calendar_connections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('student', 'faculty')),
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    calendar_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Class Schedules Table
```sql
CREATE TABLE class_schedules (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(20) NOT NULL REFERENCES faculty(faculty_id),
    subject_id VARCHAR(20) NOT NULL REFERENCES subjects(subject_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    recurrence_pattern JSONB,
    google_event_id VARCHAR(255),
    google_recurring_event_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Recurrence Pattern Format
The `recurrence_pattern` JSONB field supports:

```json
{
  "type": "weekly",
  "interval": 1,
  "days": [1, 3, 5],
  "end_date": "2024-12-31",
  "occurrence_count": 10
}
```

## API Models

The implementation includes comprehensive Pydantic models for:

- **Calendar Connections**: OAuth flow and connection management
- **Class Schedules**: Schedule creation with recurrence patterns
- **Schedule Instances**: Individual event occurrences
- **Student Access**: Permission management
- **Bulk Operations**: Batch schedule creation
- **Validation**: Input validation and error handling

## Testing

Run the calendar integration tests:

```bash
# In your Docker container
python -m pytest tests/test_calendar_models.py -v
python -m pytest tests/test_calendar_integration.py -v
```

## Security Features

The schema includes:

1. **Row Level Security (RLS)** - Users can only access their own data
2. **Encrypted Token Storage** - OAuth tokens are encrypted before storage
3. **Access Control** - Students only see schedules they're enrolled in
4. **Audit Trail** - Created/updated timestamps on all tables

## Helper Views

Two views are created for common queries:

1. **student_calendar_view** - Student's accessible schedules with subject/teacher info
2. **teacher_calendar_view** - Teacher's schedules with enrollment counts

## Next Steps

After setting up the database schema, you can proceed to:

1. **Task 3**: Create OAuth service for Google Calendar authentication
2. **Task 4**: Implement calendar synchronization service
3. **Task 5**: Build calendar management API endpoints

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure the Docker container has all dependencies installed
2. **Database Connection**: Verify Supabase environment variables are set correctly
3. **Migration Errors**: Run migrations in the correct order (main schema first)
4. **Permission Issues**: Check RLS policies if users can't access expected data

### Testing in Docker

To test the database models in your Docker environment:

```bash
docker exec -it your_backend_container python -m pytest tests/test_calendar_integration.py -v
```