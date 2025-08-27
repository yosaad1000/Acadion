# MVP Authentication Test Plan

## Setup Steps

1. **Run the database fix**:
   ```sql
   -- Copy and paste database/mvp_oauth_fix.sql into Supabase SQL console
   ```

2. **Clear all test users** (if needed):
   ```sql
   -- Copy and paste database/delete_all_users.sql into Supabase SQL console
   ```

## Test Scenarios

### Test 1: Google OAuth as Teacher
1. Go to `/login`
2. Click "Continue with Google"
3. Select "Teacher" in the modal
4. Complete Google OAuth
5. **Expected**: Land on TeacherDashboard with teacher-specific UI

### Test 2: Google OAuth as Student  
1. Sign out (if logged in)
2. Go to `/login`
3. Click "Continue with Google"
4. Select "Student" in the modal
5. Complete Google OAuth
6. **Expected**: Land on StudentDashboard with student-specific UI

### Test 3: Email/Password as Teacher
1. Go to `/signup`
2. Fill form with Teacher selected
3. Complete signup
4. **Expected**: Land on TeacherDashboard

### Test 4: Email/Password as Student
1. Go to `/signup` 
2. Fill form with Student selected
3. Complete signup
4. **Expected**: Land on StudentDashboard

### Test 5: Sign Out Functionality
1. While logged in, click user menu
2. Click "Sign out"
3. **Expected**: Redirect to login page, session cleared

## Debug Information

The AuthCallback now logs detailed information:
- Check browser console for user_type sources
- Check Supabase logs for profile creation
- Verify user_type in database after each test

## Success Criteria

✅ OAuth flow correctly captures and stores user_type  
✅ Users land on correct dashboard based on their type  
✅ Sign out works properly  
✅ Both email and OAuth authentication work  
✅ No RLS policy errors in console