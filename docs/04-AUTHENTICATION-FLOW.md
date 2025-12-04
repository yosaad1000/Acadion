# 🔐 Authentication System Explanation

## How Authentication Works

### 1. **Supabase Auth (Primary)**

Acadion uses Supabase's built-in authentication system.

**Flow:**
```
User Signs Up/In → Supabase Auth → JWT Token → Stored in Browser
```

**Two Tables:**
- `auth.users` - Managed by Supabase (email, password hash)
- `public.users` - Your custom user data (name, role, organization)

### 2. **Google OAuth Integration**

**File:** `backend/app/services/google_oauth.py`

**Flow:**
1. User clicks "Sign in with Google"
2. Frontend gets Google auth URL
3. User authorizes on Google
4. Google redirects back with code
5. Backend exchanges code for token
6. Backend gets user info from Google
7. Creates/updates user in database
8. Returns JWT token to frontend

**Key Functions:**
- `get_authorization_url()` - Gets Google login URL
- `exchange_code_for_token()` - Trades code for access token
- `get_user_info()` - Gets user's Google profile

### 3. **JWT Tokens**

**File:** `backend/app/routers/auth.py`

**What is JWT?**
JSON Web Token - a secure way to identify users.

**Structure:**
```
Header.Payload.Signature
```

**Payload contains:**
- user_id
- user_type (teacher/student)
- expiration time (30 minutes)

**How it works:**
1. User logs in successfully
2. Backend creates JWT with user info
3. Frontend stores JWT in localStorage
4. Every API request includes JWT in header
5. Backend verifies JWT signature
6. If valid, allows request
