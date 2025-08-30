# Face Registration Fix After Google Auth Setup

## Problem
After setting up Google Auth, students were unable to register their faces. The frontend was not visible/accessible for face registration.

## Root Cause
The face registration endpoint (`/api/auth/register-face`) was using the old JWT authentication system (`get_current_user`) instead of the new Supabase authentication system (`get_current_user_supabase`). This caused authentication failures when students tried to register their faces after logging in with Google OAuth.

## Solution Applied

### 1. Updated Authentication in Auth Router
**File:** `backend/app/routers/auth.py`

- **Added import:** `from app.middleware.supabase_auth import get_current_user_supabase`
- **Updated face registration endpoint:** Changed `Depends(get_current_user)` to `Depends(get_current_user_supabase)`
- **Updated user info endpoint:** Changed `Depends(get_current_user)` to `Depends(get_current_user_supabase)`

### 2. Authentication Flow
The system now properly uses Supabase JWT tokens for authentication:
1. Student logs in with Google OAuth
2. Supabase generates JWT token
3. Frontend stores token in localStorage
4. API calls include `Authorization: Bearer <supabase_token>`
5. Backend validates token using Supabase auth middleware

## How to Test the Fix

### Automated Test
Run the test script to verify all endpoints are working:
```bash
python test_face_registration_fix.py
```

### Manual Testing Steps

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Open the frontend:**
   - Go to http://localhost:3000

3. **Login as a student:**
   - Click "Login with Google"
   - Select "Student" role
   - Complete Google OAuth flow

4. **Check face registration status:**
   - After login, you should see the Dashboard
   - Look for "Face Registered: No" in the stats section
   - You should see a yellow alert: "Face Registration Required"

5. **Access face registration:**
   - Click on your profile picture (top right)
   - Select "Profile" from the dropdown menu
   - You should see the Profile page with face registration section

6. **Register your face:**
   - In the "Face Recognition" section, click "Upload Photo"
   - Select a clear image of your face
   - The system should process and register your face
   - You should see "Face registered successfully!" message

7. **Verify registration:**
   - Refresh the page or go back to Dashboard
   - "Face Registered" should now show "Yes"
   - The yellow alert should disappear

## Technical Details

### Frontend Navigation Flow
```
Login → Dashboard → Profile (via user menu) → Face Registration
```

### API Endpoints Used
- `POST /api/auth/register-face` - Register face with uploaded image
- `GET /api/auth/me` - Get current user info (including face registration status)

### Authentication Headers
```
Authorization: Bearer <supabase_jwt_token>
```

### Face Registration Process
1. Frontend uploads image file via FormData
2. Backend validates user is a student
3. Backend processes image using face recognition service
4. Face encoding stored in Pinecone vector database
5. User's `is_face_registered` status updated to `true`

## Files Modified
- `backend/app/routers/auth.py` - Updated authentication dependencies
- `test_face_registration_fix.py` - Created test script
- `FACE_REGISTRATION_FIX.md` - This documentation

## Verification
✅ Backend health check passes
✅ Auth endpoints properly protected
✅ Face registration endpoint accessible with auth
✅ Frontend accessible
✅ All authentication flows working with Supabase JWT tokens

The face registration functionality should now work correctly for students after Google Auth login.