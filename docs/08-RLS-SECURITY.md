# 🔒 Row Level Security (RLS) Explanation

## What is RLS?

**Row Level Security** = Database-level access control

**Without RLS:**
```sql
SELECT * FROM users;
-- Returns ALL users from ALL organizations
```

**With RLS:**
```sql
SELECT * FROM users;
-- Returns only users from YOUR organization
```

### How RLS Works in Supabase

**Policies** = Rules that filter data

**Example Policy:**
```sql
CREATE POLICY "users_select_own_org"
ON users
FOR SELECT
USING (organization_id = current_user_org_id());
```

**What this means:**
- When you query users table
- Supabase automatically adds WHERE clause
- You only see users from your organization

### RLS Policies in Acadion

#### 1. **Organizations Table**

**SELECT Policy:**
```sql
-- Anyone can read organizations
USING (true)
```

**INSERT Policy:**
```sql
-- Authenticated users can create organizations
WITH CHECK (auth.role() = 'authenticated')
```

#### 2. **Users Table**

**SELECT Policy:**
```sql
-- Users can see users in their organization
USING (organization_id = current_user_org_id())
```

**UPDATE Policy:**
```sql
-- Users can only update their own profile
USING (auth.uid() = auth_user_id)
```

#### 3. **Subjects Table**

**SELECT Policy:**
```sql
-- Users can see subjects in their organization
USING (organization_id = current_user_org_id())
```

**INSERT Policy:**
```sql
-- Only teachers can create subjects
WITH CHECK (
  auth.role() = 'authenticated' AND
  user_role() = 'teacher'
)
```

### Why RLS is Important

**Security Benefits:**
1. **Data Isolation** - Organizations can't see each other
2. **Automatic** - No code needed, database enforces
3. **Prevents Bugs** - Can't accidentally query wrong data
4. **Defense in Depth** - Even if frontend has bug, database protects

### Common RLS Issues

**Problem:** "new row violates row-level security policy"

**Cause:** INSERT policy is too restrictive

**Solution:** Update policy to allow operation
```sql
CREATE POLICY "allow_insert"
WITH CHECK (true);  -- Allow all inserts
```
