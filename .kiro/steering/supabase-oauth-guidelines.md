# Supabase OAuth & Database Guidelines

## Critical Rules for OAuth Implementation

### ❌ NEVER DO THESE THINGS

1. **Never add foreign key constraints FROM your tables TO auth.users**
   ```sql
   -- ❌ WRONG - This will break OAuth
   ALTER TABLE public.users ADD CONSTRAINT users_auth_user_id_fkey 
   FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
   ```
   
2. **Never create triggers on auth.users table**
   ```sql
   -- ❌ WRONG - This will cause "Database error saving new user"
   CREATE TRIGGER on_auth_user_created 
   AFTER INSERT ON auth.users 
   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
   ```

3. **Never try to "fix" OAuth by modifying Supabase's auth system**
   - The error "Database error saving new user" happens during OAuth callback
   - It's caused by constraints/triggers blocking auth.users creation
   - Don't try to debug Supabase's internal auth process

### ✅ CORRECT APPROACH

1. **Use RPC functions for user profile creation**
   ```sql
   -- ✅ CORRECT - Create a function that runs AFTER OAuth succeeds
   CREATE OR REPLACE FUNCTION public.ensure_user_profile()
   RETURNS json
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   -- Function body that creates user profile
   $$;
   ```

2. **Call the function from frontend after OAuth**
   ```typescript
   // ✅ CORRECT - Call after successful OAuth
   const { data: { session } } = await supabase.auth.getSession();
   if (session) {
     await supabase.rpc('ensure_user_profile');
   }
   ```

3. **Use foreign keys FROM auth.users TO your tables**
   ```sql
   -- ✅ CORRECT - This direction is safe
   ALTER TABLE public.subjects ADD CONSTRAINT subjects_teacher_id_fkey 
   FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

## OAuth Flow Best Practices

### The Working Pattern
1. User clicks "Sign in with Google"
2. Google authenticates user
3. **Supabase creates record in auth.users** (must not be blocked)
4. User redirected to /auth/callback
5. **Frontend calls ensure_user_profile()** (creates public.users record)
6. User can access the app

### Frontend Implementation
```typescript
// In AuthCallback component
useEffect(() => {
  const handleCallback = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Create user profile after successful auth
      const result = await supabase.rpc('ensure_user_profile');
      
      // Redirect to dashboard
      navigate('/dashboard');
    }
  };
  
  handleCallback();
}, []);
```

## Database Schema Guidelines

### Safe Schema Pattern
```sql
-- ✅ Users table with auth_user_id reference (no FK constraint)
CREATE TABLE public.users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE, -- Reference but NO foreign key
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  -- other fields
);

-- ✅ Other tables can safely reference auth.users
CREATE TABLE public.subjects (
  subject_id uuid PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- other fields
);
```

### Required RPC Functions
```sql
-- User profile creation
CREATE FUNCTION public.ensure_user_profile() RETURNS json;

-- Role management
CREATE FUNCTION public.add_user_role(uuid, text) RETURNS json;
CREATE FUNCTION public.switch_user_role(uuid, text) RETURNS json;
```

## Troubleshooting OAuth Issues

### If you see "Database error saving new user"
1. **Check for triggers on auth.users** - Remove them all
2. **Check for FK constraints TO auth.users** - Remove them
3. **Check RLS policies** - Temporarily disable if needed
4. **Use the RPC function approach** instead of triggers

### Debugging Steps
1. Check Supabase logs in Dashboard > Logs
2. Look for constraint violations or trigger errors
3. Verify auth.users table is accessible
4. Test RPC functions work independently

## Migration from Broken Schema

If you have a broken OAuth setup:

1. **Remove problematic constraints**
   ```sql
   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;
   ```

2. **Remove triggers**
   ```sql
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   ```

3. **Create RPC functions**
   ```sql
   CREATE FUNCTION public.ensure_user_profile() -- implementation
   ```

4. **Update frontend to use RPC approach**

## Key Takeaways

- **OAuth must create auth.users without interference**
- **Use RPC functions for user profile creation**
- **Never add constraints that block auth.users creation**
- **Test OAuth thoroughly after any schema changes**
- **Keep auth.users table clean and accessible**

This approach ensures OAuth works reliably while maintaining data integrity through application-level logic rather than database constraints.