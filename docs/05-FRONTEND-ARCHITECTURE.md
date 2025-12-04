# ⚛️ Frontend Architecture Explanation

## React Frontend Structure

### Directory Structure
```
frontend/src/
├── components/       # Reusable UI components
├── contexts/        # React Context (global state)
├── pages/          # Full page components
├── services/       # API calls
├── lib/           # Utilities (Supabase client)
└── App.tsx        # Main app component
```

### Key Concepts

#### 1. **React Context API** - Global State

**File:** `frontend/src/contexts/AuthContext.tsx`

**What it does:**
Shares user authentication state across entire app.

**Without Context:**
```
LoginPage → needs user data
Dashboard → needs user data
Header → needs user data
// Each component fetches separately (inefficient!)
```

**With Context:**
```
AuthContext (fetches once)
  ↓
All components access same data
```

**Key Functions:**
- `login()` - Logs user in
- `logout()` - Logs user out
- `user` - Current user object
- `session` - Supabase session

#### 2. **React Router** - Navigation

**File:** `frontend/src/App.tsx`

**What it does:**
Maps URLs to components.

**Example:**
```
/login → LoginPage component
/dashboard → Dashboard component
/subjects → SubjectsPage component
```

**Protected Routes:**
Some routes require authentication.
If not logged in → redirect to login page.

#### 3. **Supabase Client** - Database Access

**File:** `frontend/src/lib/supabase.ts`

**What it does:**
Creates connection to Supabase database.

**Usage:**
```typescript
// Read data
const { data } = await supabase
  .from('subjects')
  .select('*')

// Insert data
await supabase
  .from('subjects')
  .insert({ name: 'Math 101' })
```
