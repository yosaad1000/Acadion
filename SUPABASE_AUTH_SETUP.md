# Supabase Authentication Setup Guide

This guide will help you set up dual authentication (email/password + Google OAuth) using Supabase's built-in authentication system.

## 🚀 Quick Setup

### 1. Apply Database Migration

Run the migration script to see the SQL:
```bash
python apply_supabase_auth_migration.py
```

Then copy the SQL and run it in your Supabase SQL Editor.

### 2. Configure Supabase Authentication

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication > Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - **Client ID**: `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
   - **Client Secret**: `YOUR_GOOGLE_CLIENT_SECRET`
5. Set **Redirect URL** to: `http://localhost:3000/auth/callback`

### 3. Update Google Cloud Console

In your Google Cloud Console OAuth client, add these authorized redirect URIs:
- `https://scijpejtvneuqbhkoxuz.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`

### 4. Start the Application

```bash
# Backend
cd backend
uvicorn main:app --reload --port 8000

# Frontend  
cd frontend
npm run dev
```

## 🔧 How It Works

### Frontend (Supabase Client)
- Uses `@supabase/supabase-js` for authentication
- Handles both email/password and Google OAuth
- Automatically manages sessions and tokens
- Creates user profiles in your custom `users` table

### Backend (Token Verification)
- Verifies Supabase JWT tokens
- Links Supabase auth users to your custom user profiles
- Maintains existing API structure

### Database Schema
```sql
users (
  user_id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id), -- Links to Supabase auth
  email VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  user_type VARCHAR(10) NOT NULL, -- 'teacher' or 'student'
  auth_provider VARCHAR(20) DEFAULT 'email', -- 'email' or 'google'
  is_face_registered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🎯 Authentication Flow

### Email/Password Signup:
1. User fills signup form
2. Supabase creates auth user
3. Trigger automatically creates profile in `users` table
4. User is logged in with Supabase session

### Google OAuth:
1. User clicks "Continue with Google"
2. Selects user type (Teacher/Student)
3. Redirected to Google OAuth
4. Google redirects to `/auth/callback`
5. Callback page creates user profile if needed
6. User is logged in with Supabase session

### API Authentication:
1. Frontend sends Supabase JWT token
2. Backend verifies token (development: no signature verification)
3. Backend fetches user profile using `auth_user_id`
4. API returns user data

## 🔐 Security Features

- **Supabase Auth**: Industry-standard JWT tokens
- **Row Level Security**: Users can only access their own data
- **OAuth Integration**: Secure Google authentication
- **No Password Storage**: Google OAuth users don't need passwords
- **Automatic Profile Creation**: Triggers handle user profile creation

## 🧪 Testing

### Test Email/Password:
1. Go to `http://localhost:3000/signup`
2. Fill in the form and submit
3. Should automatically log in and redirect to dashboard

### Test Google OAuth:
1. Go to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Select user type (Teacher/Student)
4. Complete Google OAuth flow
5. Should redirect to dashboard

## 🔍 API Endpoints

### Supabase Auth Endpoints:
- `GET /api/supabase-auth/me` - Get current user (uses Supabase token)

### Legacy Endpoints (still work):
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/me` - Get current user (uses custom JWT)

## 🐛 Troubleshooting

### Google OAuth Not Working:
1. Check redirect URIs in Google Cloud Console
2. Verify Supabase Google provider is enabled
3. Check browser console for errors

### Users Not Appearing in Dashboard:
1. Check if the trigger function was created
2. Verify RLS policies are correct
3. Check Supabase logs for errors

### Token Verification Issues:
1. In production, implement proper JWT signature verification
2. Check Supabase project settings for JWT secret

## 🚀 Production Considerations

1. **JWT Signature Verification**: Implement proper signature verification using Supabase's public key
2. **HTTPS**: Use HTTPS for all OAuth redirects
3. **Environment Variables**: Move sensitive data to environment variables
4. **Error Handling**: Add comprehensive error handling
5. **Rate Limiting**: Implement rate limiting for auth endpoints

## 📊 Migration from Custom Auth

If you have existing users with custom authentication:
1. The old auth system still works alongside Supabase Auth
2. Users can continue using email/password login
3. New users will use Supabase Auth
4. Gradually migrate existing users to Supabase Auth

This setup gives you the best of both worlds: Supabase's robust authentication system with your existing application structure!