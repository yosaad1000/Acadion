# Low-Level System Design Architecture

## Overview

This document provides detailed technical specifications for the Acadion student management platform, including component interactions, data models, API specifications, and implementation details.

## Detailed Component Architecture

### 1. Backend Service Architecture

#### FastAPI Application Structure
```
backend/
├── app/
│   ├── core/                 # Core utilities and configurations
│   │   ├── __init__.py
│   │   ├── security.py       # JWT, password hashing, encryption
│   │   └── exceptions.py     # Custom exception handlers
│   ├── middleware/           # Custom middleware components
│   │   ├── __init__.py
│   │   ├── cors.py          # CORS configuration
│   │   ├── auth.py          # Authentication middleware
│   │   └── supabase_auth.py # Supabase authentication integration
│   ├── models/              # Pydantic data models
│   │   ├── __init__.py
│   │   ├── user.py          # User-related models
│   │   ├── student.py       # Student models
│   │   ├── subject.py       # Subject/class models
│   │   ├── attendance.py    # Attendance models
│   │   └── notification.py  # Notification models
│   ├── routers/             # FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── supabase_auth.py # Supabase auth integration
│   │   ├── subjects.py      # Subject management
│   │   ├── attendance.py    # Attendance tracking
│   │   └── notifications.py # Notification system
│   ├── services/            # Business logic services
│   │   ├── __init__.py
│   │   ├── local_supabase.py    # Supabase HTTP client
│   │   ├── face_recognition.py  # Face processing service
│   │   ├── notification_service.py # Notification handling
│   │   ├── google_oauth.py      # Google OAuth integration
│   │   └── pinecone_service.py  # Vector database operations
│   ├── config.py            # Configuration management
│   └── __init__.py
├── main.py                  # FastAPI application entry point
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables
```

#### Service Layer Implementation

##### Authentication Service (`app/services/auth_service.py`)
```python
class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"])
        self.db = LocalSupabase()
    
    async def register_user(self, user_data: UserCreate) -> UserResponse:
        # Password hashing
        # Email validation
        # Database insertion
        # JWT token generation
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserResponse]:
        # User lookup
        # Password verification
        # Return user data
    
    async def create_access_token(self, user_id: str, user_type: str) -> str:
        # JWT token creation with expiration
        # Include user context in payload
```

##### Face Recognition Service (`app/services/face_recognition.py`)
```python
class FaceRecognitionService:
    def __init__(self):
        self.pinecone_client = PineconeService()
        self.face_threshold = settings.FACE_THRESHOLD
    
    def extract_face_encoding(self, image_data: bytes) -> List[float]:
        # OpenCV face detection
        # Face encoding extraction using face_recognition library
        # Return 128-dimensional face encoding vector
    
    async def register_student_face(self, student_id: str, image_data: bytes) -> bool:
        # Extract face encoding
        # Store in Pinecone vector database
        # Update student record
    
    async def identify_faces_in_group_photo(self, image_data: bytes) -> List[str]:
        # Detect multiple faces in image
        # Extract encodings for each face
        # Query Pinecone for similar faces
        # Return list of identified student IDs
```

##### Notification Service (`app/services/notification_service.py`)
```python
class NotificationService:
    def __init__(self):
        self.db = LocalSupabase()
        self.email_service = SendGridService()
    
    async def create_notification(self, notification_data: NotificationCreate) -> bool:
        # Insert notification into database
        # Trigger real-time updates via Supabase
    
    async def send_email_notification(self, user_id: str, template: str, data: dict) -> bool:
        # Get user email from database
        # Send email via SendGrid
        # Log delivery status
    
    async def get_user_notifications(self, user_id: str) -> List[NotificationResponse]:
        # Fetch user notifications
        # Mark as read if requested
        # Return paginated results
```

### 2. Database Schema Design

#### Core Tables

##### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'teacher', 'admin')),
    auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    auth_user_id UUID, -- Supabase auth user ID
    is_face_registered BOOLEAN DEFAULT FALSE,
    profile_image_url TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_user_type ON users(user_type);
```

##### Subjects Table
```sql
CREATE TABLE subjects (
    subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    teacher_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    academic_year VARCHAR(10),
    semester VARCHAR(20),
    credits INTEGER DEFAULT 3,
    max_students INTEGER DEFAULT 50,
    schedule_days VARCHAR(20), -- JSON array of days
    schedule_time TIME,
    classroom VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX idx_subjects_invite_code ON subjects(invite_code);
CREATE INDEX idx_subjects_subject_code ON subjects(subject_code);
CREATE INDEX idx_subjects_is_active ON subjects(is_active);
```

##### Subject Enrollments Table
```sql
CREATE TABLE subject_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    grade VARCHAR(5),
    attendance_percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(subject_id, student_id)
);

-- Indexes
CREATE INDEX idx_enrollments_subject_id ON subject_enrollments(subject_id);
CREATE INDEX idx_enrollments_student_id ON subject_enrollments(student_id);
CREATE INDEX idx_enrollments_is_active ON subject_enrollments(is_active);
```

##### Attendance Table
```sql
CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_id VARCHAR(50) NOT NULL,
    session_name VARCHAR(255) NOT NULL,
    session_time TIMESTAMP WITH TIME ZONE NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by UUID REFERENCES users(user_id),
    marking_method VARCHAR(20) DEFAULT 'manual' CHECK (marking_method IN ('manual', 'face_recognition', 'qr_code')),
    confidence_score DECIMAL(3,2), -- For AI-based attendance
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(subject_id, student_id, session_id, date)
);

-- Indexes
CREATE INDEX idx_attendance_subject_id ON attendance(subject_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_status ON attendance(status);
```

##### Notifications Table
```sql
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('attendance', 'enrollment', 'grade', 'system', 'reminder')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB, -- Additional data for the notification
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

#### Database Triggers and Functions

##### Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON subject_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

##### Attendance Percentage Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_attendance_percentage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update attendance percentage for the student in this subject
    UPDATE subject_enrollments 
    SET attendance_percentage = (
        SELECT ROUND(
            (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / COUNT(*)), 2
        )
        FROM attendance 
        WHERE subject_id = NEW.subject_id 
        AND student_id = NEW.student_id
    )
    WHERE subject_id = NEW.subject_id 
    AND student_id = NEW.student_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attendance_percentage 
    AFTER INSERT OR UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION calculate_attendance_percentage();
```

### 3. API Endpoint Specifications

#### Authentication Endpoints

##### POST /api/auth/register
```python
# Request Body
{
    "email": "student@example.com",
    "password": "securePassword123",
    "name": "John Doe",
    "user_type": "student"
}

# Response
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "student@example.com",
        "name": "John Doe",
        "user_type": "student",
        "is_face_registered": false,
        "created_at": "2024-01-15T10:30:00Z"
    }
}
```

##### POST /api/auth/login
```python
# Request Body
{
    "email": "student@example.com",
    "password": "securePassword123"
}

# Response (same as register)
```

##### GET /api/auth/me
```python
# Headers
Authorization: Bearer <jwt_token>

# Response
{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "student@example.com",
    "name": "John Doe",
    "user_type": "student",
    "is_face_registered": true,
    "created_at": "2024-01-15T10:30:00Z"
}
```

#### Subject Management Endpoints

##### POST /api/subjects/create
```python
# Request Body (Teacher only)
{
    "name": "Introduction to Computer Science",
    "description": "Basic programming concepts and algorithms",
    "subject_code": "CS101",
    "academic_year": "2024-2025",
    "semester": "Fall",
    "credits": 3,
    "max_students": 30,
    "schedule_days": ["Monday", "Wednesday", "Friday"],
    "schedule_time": "10:00:00",
    "classroom": "Room 101"
}

# Response
{
    "subject_id": "456e7890-e89b-12d3-a456-426614174001",
    "invite_code": "ABC123XYZ",
    "name": "Introduction to Computer Science",
    "teacher_name": "Dr. Smith",
    "student_count": 0,
    "created_at": "2024-01-15T10:30:00Z"
}
```

##### POST /api/subjects/enroll
```python
# Request Body (Student only)
{
    "invite_code": "ABC123XYZ"
}

# Response
{
    "message": "Successfully enrolled in Introduction to Computer Science",
    "subject": {
        "subject_id": "456e7890-e89b-12d3-a456-426614174001",
        "name": "Introduction to Computer Science",
        "teacher_name": "Dr. Smith",
        "schedule_days": ["Monday", "Wednesday", "Friday"],
        "schedule_time": "10:00:00"
    }
}
```

#### Attendance Endpoints

##### POST /api/attendance/mark-group
```python
# Request Body (Teacher only)
# Content-Type: multipart/form-data
{
    "subject_id": "456e7890-e89b-12d3-a456-426614174001",
    "session_name": "Lecture 1: Introduction",
    "file": <image_file>,
    "date": "2024-01-15"
}

# Response
{
    "session_id": "session_20240115_101",
    "total_faces_detected": 15,
    "students_identified": 12,
    "attendance_marked": [
        {
            "student_id": "123e4567-e89b-12d3-a456-426614174000",
            "student_name": "John Doe",
            "confidence": 0.85,
            "status": "present"
        }
    ],
    "unidentified_faces": 3,
    "processing_time": 2.3
}
```

##### GET /api/attendance/subject/{subject_id}
```python
# Query Parameters
?date=2024-01-15&session_id=session_20240115_101

# Response
{
    "subject_name": "Introduction to Computer Science",
    "date": "2024-01-15",
    "sessions": [
        {
            "session_id": "session_20240115_101",
            "session_name": "Lecture 1: Introduction",
            "session_time": "2024-01-15T10:00:00Z",
            "total_students": 25,
            "present_count": 22,
            "absent_count": 3,
            "attendance_records": [
                {
                    "student_id": "123e4567-e89b-12d3-a456-426614174000",
                    "student_name": "John Doe",
                    "status": "present",
                    "marked_at": "2024-01-15T10:05:00Z",
                    "marking_method": "face_recognition",
                    "confidence_score": 0.85
                }
            ]
        }
    ]
}
```

### 4. Frontend Component Architecture

#### React Component Structure
```
frontend/src/
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── layout/              # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── auth/                # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── GoogleAuthButton.tsx
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/           # Dashboard components
│   │   ├── DashboardCard.tsx
│   │   ├── StatisticsWidget.tsx
│   │   └── RecentActivity.tsx
│   ├── subjects/            # Subject management
│   │   ├── SubjectCard.tsx
│   │   ├── CreateSubjectForm.tsx
│   │   ├── EnrollmentForm.tsx
│   │   └── SubjectDetails.tsx
│   ├── attendance/          # Attendance components
│   │   ├── AttendanceUpload.tsx
│   │   ├── AttendanceTable.tsx
│   │   ├── AttendanceChart.tsx
│   │   └── FaceRegistration.tsx
│   └── notifications/       # Notification components
│       ├── NotificationList.tsx
│       ├── NotificationItem.tsx
│       └── NotificationBell.tsx
├── pages/                   # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SubjectsPage.tsx
│   ├── AttendancePage.tsx
│   └── ProfilePage.tsx
├── contexts/                # React contexts
│   ├── AuthContext.tsx
│   ├── NotificationContext.tsx
│   └── ThemeContext.tsx
├── hooks/                   # Custom hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   ├── useNotifications.ts
│   └── useLocalStorage.ts
├── services/                # API services
│   ├── api.ts
│   ├── authService.ts
│   ├── subjectService.ts
│   ├── attendanceService.ts
│   └── notificationService.ts
├── types/                   # TypeScript type definitions
│   ├── auth.ts
│   ├── user.ts
│   ├── subject.ts
│   ├── attendance.ts
│   └── api.ts
└── utils/                   # Utility functions
    ├── constants.ts
    ├── formatters.ts
    ├── validators.ts
    └── helpers.ts
```

#### Key React Components Implementation

##### Authentication Context
```typescript
interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => void;
    loading: boolean;
    error: string | null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Implementation details...
};
```

##### API Service Layer
```typescript
class ApiService {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('access_token');
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // Auth methods
    async login(email: string, password: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    // Subject methods
    async getSubjects(): Promise<Subject[]> {
        return this.request<Subject[]>('/api/subjects/my-subjects');
    }

    // Attendance methods
    async markGroupAttendance(
        subjectId: string,
        sessionName: string,
        file: File,
        date: string
    ): Promise<AttendanceResponse> {
        const formData = new FormData();
        formData.append('subject_id', subjectId);
        formData.append('session_name', sessionName);
        formData.append('file', file);
        formData.append('date', date);

        return this.request<AttendanceResponse>('/api/attendance/mark-group', {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set Content-Type for FormData
        });
    }
}
```

### 5. Mobile Application Architecture

#### React Native Structure
```
mobile/src/
├── components/
│   ├── common/              # Reusable components
│   ├── forms/               # Form components
│   └── navigation/          # Navigation components
├── screens/
│   ├── auth/                # Authentication screens
│   ├── dashboard/           # Dashboard screens
│   ├── subjects/            # Subject screens
│   ├── attendance/          # Attendance screens
│   └── profile/             # Profile screens
├── navigation/
│   ├── AppNavigator.tsx     # Main navigation
│   ├── AuthNavigator.tsx    # Auth flow navigation
│   └── TabNavigator.tsx     # Bottom tab navigation
├── services/
│   ├── api.ts               # API service
│   ├── camera.ts            # Camera service
│   ├── storage.ts           # Secure storage
│   └── notifications.ts     # Push notifications
├── hooks/
│   ├── useAuth.ts
│   ├── useCamera.ts
│   └── useNotifications.ts
├── types/                   # TypeScript types
└── utils/                   # Utility functions
```

#### Camera Integration for Face Registration
```typescript
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

export const FaceRegistrationScreen: React.FC = () => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [faceDetected, setFaceDetected] = useState(false);

    const handleFacesDetected = ({ faces }: FaceDetector.FaceDetectionResult) => {
        setFaceDetected(faces.length === 1); // Ensure only one face
    };

    const takePicture = async () => {
        if (cameraRef.current && faceDetected) {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: true,
            });
            
            // Upload to backend for face registration
            await registerFace(photo.base64);
        }
    };

    return (
        <Camera
            ref={cameraRef}
            style={styles.camera}
            type={Camera.Constants.Type.front}
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
                mode: FaceDetector.FaceDetectorMode.fast,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                runClassifications: FaceDetector.FaceDetectorClassifications.none,
            }}
        >
            {/* Camera overlay and controls */}
        </Camera>
    );
};
```

### 6. Security Implementation

#### JWT Token Management
```python
# Backend JWT implementation
from jose import JWTError, jwt
from datetime import datetime, timedelta

class JWTManager:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_access_token(self, data: dict, expires_delta: timedelta = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
```

#### Password Security
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

#### Input Validation
```python
from pydantic import BaseModel, validator, EmailStr
import re

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    user_type: UserType
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        if not re.match(r'^[a-zA-Z\s]+$', v):
            raise ValueError('Name can only contain letters and spaces')
        return v.strip()
```

### 7. Performance Optimization

#### Database Query Optimization
```sql
-- Efficient attendance query with proper indexing
EXPLAIN ANALYZE
SELECT 
    a.attendance_id,
    a.date,
    a.status,
    a.session_name,
    u.name as student_name,
    s.name as subject_name
FROM attendance a
JOIN users u ON a.student_id = u.user_id
JOIN subjects s ON a.subject_id = s.subject_id
WHERE a.subject_id = $1 
    AND a.date BETWEEN $2 AND $3
ORDER BY a.date DESC, a.session_time DESC
LIMIT 50;

-- Index for optimal performance
CREATE INDEX idx_attendance_subject_date ON attendance(subject_id, date DESC);
```

#### Caching Strategy
```python
import redis
from functools import wraps
import json
import pickle

class CacheManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def cache_result(self, key: str, ttl: int = 300):
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Try to get from cache
                cached_result = self.redis.get(key)
                if cached_result:
                    return pickle.loads(cached_result)
                
                # Execute function and cache result
                result = await func(*args, **kwargs)
                self.redis.setex(key, ttl, pickle.dumps(result))
                return result
            return wrapper
        return decorator

# Usage
@cache_manager.cache_result("subjects:teacher:{teacher_id}", ttl=600)
async def get_teacher_subjects(teacher_id: str):
    return await db.get_teacher_subjects(teacher_id)
```

#### Image Processing Optimization
```python
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor

class OptimizedFaceProcessor:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def preprocess_image(self, image_data: bytes) -> np.ndarray:
        # Convert to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Resize if too large (max 1920x1080)
        height, width = image.shape[:2]
        if width > 1920 or height > 1080:
            scale = min(1920/width, 1080/height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        return image
    
    async def process_faces_parallel(self, image: np.ndarray) -> List[np.ndarray]:
        # Detect faces
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        # Extract face regions in parallel
        face_regions = []
        for (x, y, w, h) in faces:
            face_region = image[y:y+h, x:x+w]
            face_regions.append(face_region)
        
        # Process encodings in parallel
        loop = asyncio.get_event_loop()
        encodings = await asyncio.gather(*[
            loop.run_in_executor(self.executor, self.extract_encoding, face)
            for face in face_regions
        ])
        
        return encodings
```

This low-level design provides the detailed technical specifications needed to implement the Acadion student management platform with proper architecture, security, performance, and maintainability considerations.