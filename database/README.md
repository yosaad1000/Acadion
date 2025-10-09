# Acadion Database Schema

This directory contains the complete database schema for the Acadion AI-powered student management platform.

## 📁 Files Overview

### Core Schema Files

- **`00_complete_schema.sql`** - Complete, up-to-date database schema for new installations
- **`NOTIFICATIONS_SYSTEM_README.md`** - Detailed notifications system documentation
- **`README.md`** - This file

## 🚀 Quick Start

### For New Installations

If you're setting up Acadion for the first time:

```sql
-- Run in your Supabase SQL Editor
\i 00_complete_schema.sql
```

This will create all necessary tables, functions, triggers, indexes, and RLS policies.

## 📊 Database Schema Overview

The current schema includes the following tables:

- **users** - User profiles linked to Supabase auth
- **user_roles** - Multi-role support system
- **subjects** - Classroom/course management
- **subject_enrollments** - Student enrollment tracking
- **sessions** - Individual class sessions
- **attendance** - Session-based attendance tracking
- **assignments** - Assignment management
- **assignment_submissions** - Student submission tracking
- **notifications** - Comprehensive notification system
- **notification_preferences** - User notification settings
- **google_integrations** - Google Calendar/Drive integration

## 🔧 Key Features

- **Auto-Generated Codes**: Subject codes (SUB000001) and invite codes
- **Multi-Role Support**: Users can be both teachers and students
- **Face Recognition**: Pinecone integration for AI attendance
- **Google Integration**: Calendar and Drive integration
- **Notifications**: Real-time notification system
- **Security**: Comprehensive Row Level Security (RLS) policies

## 🚨 Important Notes

- The schema is designed for Supabase with proper RLS policies
- OAuth integration follows Supabase best practices
- Face recognition uses Pinecone vector database
- All foreign keys reference `auth.users(id)` directly

## 📝 Usage

Run the complete schema file in your Supabase SQL Editor for a fresh installation. The schema includes all necessary functions, triggers, and security policies.