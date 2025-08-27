# Dual Authentication Setup Guide

This guide explains how to set up both email/password and Google OAuth authentication in your application.

## 🔧 Backend Setup

### 1. Database Migration

First, apply the OAuth migration to add the necessary columns to your users table:

```bash
python apply_oauth_migration.py
```

**Or manually run this SQL in your Supabase dashboard:**

```sql
-- Add auth_provider column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email' 
CHECK (auth_provider IN ('email', 'google'));

-- Add google_id column for Google OAuth users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;

-- Make password_hash nullable for OAuth users
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Update existing users to have email auth_provider
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add constraint to ensure password_hash is required for email auth
ALTER TABLE users 
ADD CONSTRAINT check_password_for_email 
CHECK (
    (auth_provider = 'email' AND password_hash IS NOT NULL) OR 
    (auth_provider = 'google' AND google_id IS NOT NULL)
);
```

### 2. Google OAuth Configuration

Your Google OAuth credentials are already configured in `backend/.env`:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### 3. Google Cloud Console Setup

In your Google Cloud Console OAuth client, make sure you have these authorized redirect URIs:

- `http://localhost:3000/auth/google/callback`
- `http://localhost:3000/login`
- `http://localhost:3000/signup`
- `http://127.0.0.1:3000/auth/google/callback`

## 🎨 Frontend Setup

The frontend has been updated to support both authentication methods:

### Login Page (`/login`)
- Email/password login (existing functionality)
- Google OAuth login with user type selection
- Handles OAuth callback automatically

### Signup Page (`/signup`)
- Email/password registration (existing functionality)  
- Google OAuth signup with user type selection
- Handles OAuth callback automatically

## 🔄 Authentication Flow

### Email/Password Authentication
1. User enters email and password
2. Backend validates credentials against database
3. JWT token is issued
4. User is redirected to dashboard

### Google OAuth Authentication
1. User clicks "Continue with Google"
2. Modal appears to select user type (Teacher/Student)
3. User is redirected to Google OAuth consent screen
4. Google redirects back with authorization code
5. Backend exchanges code for user info
6. User is created/logged in based on Google profile
7. JWT token is issued
8. User is redirected to dashboard

## 🔐 Security Features

- **Separate Auth Providers**: Users can't mix email/password with Google OAuth
- **User Type Selection**: Google OAuth users must specify if they're a teacher or student
- **No Email Confirmation**: As requested, no email verification is required
- **JWT Tokens**: Consistent token-based authentication for both methods
- **Database Constraints**: Ensures data integrity for different auth providers

## 🚀 Usage

### For Email/Password Users:
1. Go to `/signup` or `/login`
2. Fill in the form with email, password, and user type
3. Click "Create Account with Email" or "Sign In with Email"

### For Google OAuth Users:
1. Go to `/signup` or `/login`  
2. Click "Continue with Google"
3. Select your role (Teacher/Student) in the modal
4. Complete Google OAuth flow
5. You'll be automatically logged in

## 🧪 Testing

### Test Email/Password Auth:
```bash
# Register a new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "user_type": "student"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Google OAuth:
1. Visit `http://localhost:3000/login`
2. Click "Continue with Google"
3. Select user type and complete OAuth flow

## 📊 Database Schema

The users table now supports both authentication methods:

```sql
users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  user_type VARCHAR(10) NOT NULL, -- 'teacher' or 'student'
  auth_provider VARCHAR(20) DEFAULT 'email', -- 'email' or 'google'
  password_hash VARCHAR(255), -- NULL for Google OAuth users
  google_id VARCHAR(100) UNIQUE, -- Google user ID for OAuth users
  is_face_registered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## 🔍 API Endpoints

### New OAuth Endpoints:
- `GET /api/auth/google/url` - Get Google OAuth authorization URL
- `POST /api/auth/google/callback` - Handle Google OAuth callback

### Existing Endpoints:
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

## 🎯 Next Steps

1. **Run the migration**: `python apply_oauth_migration.py`
2. **Start the backend**: `cd backend && uvicorn main:app --reload --port 8000`
3. **Start the frontend**: `cd frontend && npm run dev`
4. **Test both authentication methods**

The system now supports both email/password and Google OAuth authentication with proper user type handling!