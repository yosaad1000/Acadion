# 🌐 API Endpoints Explanation

## Backend API Routes

### Authentication Routes
**File:** `backend/app/routers/auth.py`

#### POST /api/auth/register
**Purpose:** Create new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe",
  "user_type": "student"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": { "user_id": "...", "email": "..." }
}
```

#### POST /api/auth/login
**Purpose:** Login existing user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:** Same as register

#### GET /api/auth/me
**Purpose:** Get current user info

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user_id": "...",
  "email": "user@example.com",
  "name": "John Doe",
  "organization_id": "...",
  "active_role": "student"
}
```

### Subject Routes
**File:** `backend/app/routers/subjects.py`

#### POST /api/subjects
**Purpose:** Create new class/subject

**Request:**
```json
{
  "subject_code": "CS101",
  "name": "Introduction to Computer Science",
  "description": "Learn programming basics"
}
```

#### GET /api/subjects
**Purpose:** Get all subjects for current user

**Response:**
```json
[
  {
    "subject_id": "...",
    "name": "CS101",
    "teacher_name": "Dr. Smith",
    "invite_code": "ABC123"
  }
]
```

#### POST /api/subjects/enroll
**Purpose:** Student joins class with invite code

**Request:**
```json
{
  "invite_code": "ABC123"
}
```

### Attendance Routes
**File:** `backend/app/routers/attendance.py`

#### POST /api/attendance/mark
**Purpose:** Mark student attendance

**Request:**
```json
{
  "session_id": "...",
  "student_id": "...",
  "status": "present"
}
```

#### GET /api/attendance/session/{session_id}
**Purpose:** Get all attendance for a session

**Response:**
```json
[
  {
    "student_name": "John Doe",
    "status": "present",
    "marked_at": "2024-12-04T10:30:00Z"
  }
]
```
