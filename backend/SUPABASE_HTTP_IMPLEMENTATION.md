# Supabase HTTP Implementation Guide

## Overview

Yes, you're absolutely correct! The backend is using **direct HTTP requests** to interact with Supabase instead of the Supabase Python client. This approach was chosen to avoid proxy issues and provide more control over the database operations.

## Why HTTP Instead of Supabase Client?

Based on the steering rules, there were persistent issues with the Supabase Python client:
- Proxy parameter errors in development environments
- Connection issues with environment variables
- More reliable to use direct HTTP requests like the existing LocalSupabase service

## HTTP Implementation Pattern

### Base Configuration

```python
class LocalSupabase:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL  # e.g., https://your-project.supabase.co
        self.api_key = settings.SUPABASE_SERVICE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"  # Returns inserted/updated data
        }
```

### CRUD Operations via HTTP

#### 1. **CREATE** - POST Requests

```python
async def insert_student(self, student_data: Dict[str, Any]) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{self.base_url}/rest/v1/students",  # Supabase REST API endpoint
            headers=self.headers,
            json=student_data
        )
        return response.status_code in [200, 201]
```

#### 2. **READ** - GET Requests

```python
# Get all records
async def get_all_students(self) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{self.base_url}/rest/v1/students",
            headers=self.headers
        )
        return response.json() if response.status_code == 200 else []

# Get with filters (PostgREST query syntax)
async def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{self.base_url}/rest/v1/students",
            headers=self.headers,
            params={"student_id": f"eq.{student_id}"}  # PostgREST filter syntax
        )
        students = response.json()
        return students[0] if students else None
```

#### 3. **UPDATE** - PATCH Requests

```python
async def update_student_face_encoding(self, student_id: str, has_face_encoding: bool) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{self.base_url}/rest/v1/students",
            headers=self.headers,
            params={"student_id": f"eq.{student_id}"},  # WHERE clause
            json={"face_encoding_id": student_id if has_face_encoding else None}
        )
        return response.status_code in [200, 204]
```

#### 4. **DELETE** - DELETE Requests

```python
async def delete_student(self, student_id: str) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{self.base_url}/rest/v1/students",
            headers=self.headers,
            params={"student_id": f"eq.{student_id}"}  # WHERE clause
        )
        return response.status_code in [200, 204]
```

## PostgREST Query Syntax

Supabase uses PostgREST, so you can use powerful query parameters:

### Filtering
```python
# Equals
params={"email": "eq.user@example.com"}

# Greater than
params={"age": "gt.18"}

# In list
params={"status": "in.(active,pending)"}

# Like (pattern matching)
params={"name": "like.*john*"}

# Multiple conditions
params={"age": "gte.18", "status": "eq.active"}
```

### Ordering and Limiting
```python
# Order by
params={"order": "created_at.desc"}

# Limit
params={"limit": "10"}

# Offset (pagination)
params={"offset": "20"}

# Combined
params={"order": "name.asc", "limit": "50", "offset": "0"}
```

### Selecting Specific Fields
```python
# Select only specific columns
params={"select": "id,name,email"}

# Select with relationships
params={"select": "id,name,subjects(name,code)"}
```

## Real Examples from the Codebase

### 1. Student Management (LocalSupabase)

```python
# Create student
await client.post(
    f"{self.base_url}/rest/v1/students",
    headers=self.headers,
    json={
        "student_id": "123",
        "name": "John Doe",
        "email": "john@example.com",
        "department_id": "CS"
    }
)

# Get student by email
await client.get(
    f"{self.base_url}/rest/v1/students",
    headers=self.headers,
    params={"email": f"eq.{email}"}
)

# Update student
await client.patch(
    f"{self.base_url}/rest/v1/students",
    headers=self.headers,
    params={"student_id": f"eq.{student_id}"},
    json={"face_encoding_id": new_encoding_id}
)
```

### 2. Notification Management (NotificationService)

```python
# Create notification
await client.post(
    f"{self.base_url}/rest/v1/notifications",
    headers=self.headers,
    json={
        "user_id": user_id,
        "title": "New Assignment",
        "message": "You have a new assignment",
        "type": "assignment",
        "is_read": False
    }
)

# Get user notifications with pagination
await client.get(
    f"{self.base_url}/rest/v1/notifications",
    headers=self.headers,
    params={
        "user_id": f"eq.{user_id}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset)
    }
)

# Mark as read
await client.patch(
    f"{self.base_url}/rest/v1/notifications",
    headers=self.headers,
    params={"id": f"eq.{notification_id}", "user_id": f"eq.{user_id}"},
    json={"is_read": True, "read_at": datetime.utcnow().isoformat()}
)
```

### 3. Subject Management

```python
# Create subject
await client.post(
    f"{self.base_url}/rest/v1/subjects",
    headers=self.headers,
    json={
        "subject_id": subject_id,
        "name": "Mathematics",
        "code": "MATH101",
        "teacher_id": teacher_id,
        "invite_code": "ABC123"
    }
)

# Get subjects for teacher
await client.get(
    f"{self.base_url}/rest/v1/subjects",
    headers=self.headers,
    params={"teacher_id": f"eq.{teacher_id}"}
)

# Join subject (enrollment)
await client.post(
    f"{self.base_url}/rest/v1/subject_enrollments",
    headers=self.headers,
    json={
        "student_id": student_id,
        "subject_id": subject_id,
        "enrolled_at": datetime.utcnow().isoformat()
    }
)
```

## Authentication Handling

### Service Key vs User Token

```python
# Service key (full access) - used in backend services
headers = {
    "apikey": settings.SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
}

# User token (row-level security) - would be used for user-specific operations
headers = {
    "apikey": settings.SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {user_jwt_token}",
}
```

### Row Level Security (RLS)

When using user tokens, Supabase RLS policies automatically filter data:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);
```

## Error Handling Pattern

```python
async def safe_database_operation(self):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/rest/v1/table",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Database error: {response.status_code} - {response.text}")
                return None
                
    except httpx.RequestError as e:
        logger.error(f"Network error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None
```

## Benefits of HTTP Approach

### ✅ Advantages
1. **No Proxy Issues** - Works in all environments
2. **Direct Control** - Full control over requests and responses
3. **Consistent Pattern** - Same pattern across all services
4. **Better Debugging** - Can see exact HTTP requests/responses
5. **Flexible Queries** - Full PostgREST query capabilities
6. **No Client Dependencies** - Just uses httpx (already in use)

### ⚠️ Considerations
1. **Manual Query Building** - Need to construct PostgREST queries manually
2. **No Type Safety** - No automatic type checking like with ORM
3. **Error Handling** - Need to handle HTTP errors manually
4. **Connection Management** - Need to manage httpx clients properly

## Connection Pooling

For better performance, the advanced services use connection pooling:

```python
# From connection_pool.py
class HTTPConnectionPool:
    def __init__(self, base_url: str, api_key: str, max_connections: int = 10):
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={"apikey": api_key, "Authorization": f"Bearer {api_key}"},
            limits=httpx.Limits(max_connections=max_connections)
        )
```

## Summary

The backend uses **direct HTTP requests with httpx** to interact with Supabase's REST API, providing:

- **Reliable connectivity** without proxy issues
- **Full PostgREST capabilities** for complex queries
- **Consistent patterns** across all services
- **Better error handling** and debugging
- **Production-ready performance** with connection pooling

This approach gives you all the power of Supabase while maintaining full control over the database interactions.