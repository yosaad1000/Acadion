# 📊 Database Schema Explanation

## Supabase PostgreSQL Database

### Core Tables

#### 1. **organizations**
```sql
- organization_id (UUID, Primary Key)
- name (Text, Unique) - Organization name
- description (Text) - Optional description
- domain (Text) - Optional custom domain
- is_active (Boolean) - Active status
- created_at, updated_at (Timestamps)
```

**Purpose:** Stores schools/institutions. Each organization is isolated.

#### 2. **users** (public.users)
```sql
- user_id (UUID, Primary Key)
- auth_user_id (UUID) - Links to Supabase auth.users
- organization_id (UUID) - Which organization they belong to
- email (Text, Unique)
- name (Text)
- active_role (Text) - 'teacher', 'student', or 'admin'
- is_face_registered (Boolean) - For face recognition
- auth_provider (Text) - 'email' or 'google'
- google_id (Text) - For Google OAuth
- created_at, updated_at, deleted_at
```

**Purpose:** Stores user profiles with organization context.

#### 3. **subjects**
```sql
- subject_id (UUID, Primary Key)
- organization_id (UUID) - Belongs to organization
- teacher_id (UUID) - Who teaches it
- subject_code (Text, Unique) - Like "CS101"
- name (Text) - Subject name
- description (Text)
- invite_code (Text, Unique) - For students to join
- is_active (Boolean)
- created_at, updated_at, deleted_at
```

**Purpose:** Classes/courses that teachers create.

#### 4. **subject_enrollments**
```sql
- id (UUID, Primary Key)
- subject_id (UUID) - Which subject
- student_id (UUID) - Which student
- enrolled_at (Timestamp)
- is_active (Boolean)
```

**Purpose:** Links students to subjects (enrollment).
