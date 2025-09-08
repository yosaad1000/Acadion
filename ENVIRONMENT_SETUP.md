# Environment Setup Guide

## 🔐 Security Notice
**NEVER commit `.env` files to version control!** They contain sensitive keys and passwords.

## Frontend Environment Setup

1. Copy the example environment file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Update `frontend/.env` with your actual Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Backend Environment Setup

1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Update `backend/.env` with your actual credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   SECRET_KEY=your-super-secret-jwt-token-with-at-least-32-characters-long
   PINECONE_API_KEY=your_pinecone_api_key
   # ... other keys
   ```

## Getting Your Supabase Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the following:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public** key → `SUPABASE_KEY` / `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (backend only)

## Security Best Practices

- ✅ Use `.env.example` files to document required variables
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use different keys for development/production
- ✅ Rotate keys regularly
- ❌ Never hardcode keys in source code
- ❌ Never commit `.env` files to Git
- ❌ Never share keys in chat/email

## If You Already Committed Keys

If you've already committed sensitive keys to Git:

1. **Immediately rotate all exposed keys** in your service dashboards
2. Remove the keys from Git history:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch frontend/src/lib/supabase.ts' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push to remove from remote:
   ```bash
   git push origin --force --all
   ```
4. Update all team members to pull the cleaned history

## Key Differences

- **Frontend (.env)**: Uses `VITE_` prefix for Vite to expose to browser
- **Backend (.env)**: No prefix needed, stays server-side
- **Anon Key**: Safe to expose in frontend (public key)
- **Service Key**: NEVER expose in frontend (admin privileges)