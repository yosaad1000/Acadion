# Development Guide

This guide covers development workflows, architecture, and best practices for the Student Management Platform.

## Project Structure

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── core/           # Core utilities
│   ├── main.py             # FastAPI app entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── types/          # TypeScript types
│   └── package.json        # Node.js dependencies
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── screens/        # Mobile screens
│   │   ├── navigation/     # Navigation setup
│   │   └── contexts/       # Shared contexts
│   └── package.json        # React Native dependencies
└── docs/                   # Documentation
```

## Development Workflow

### 1. Setting up Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd student-management-platform

# Set up backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration

# Set up frontend
cd ../frontend
npm install

# Set up mobile (optional)
cd ../mobile
npm install
```

### 2. Running in Development Mode

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Mobile (optional)
cd mobile
npx expo start
```

### 3. Using Docker for Development

```bash
# Start all services
docker-compose up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

## Backend Development

### API Structure

The backend follows a modular structure with FastAPI:

```python
# app/routers/students.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class StudentCreate(BaseModel):
    student_id: str
    name: str
    email: str

@router.post("/")
async def create_student(student: StudentCreate):
    # Implementation here
    pass
```

### Adding New Endpoints

1. Create or modify router files in `app/routers/`
2. Define Pydantic models for request/response
3. Implement business logic in `app/services/`
4. Add router to `main.py`

### Database Operations

```python
# app/services/student_service.py
from app.services.supabase_adapter import SupabaseAdapter

class StudentService:
    def __init__(self):
        self.db = SupabaseAdapter()
    
    async def create_student(self, student_data):
        return self.db.add_student(student_data)
```

### Face Recognition Integration

```python
# app/services/face_service.py
import face_recognition
import numpy as np

class FaceService:
    def encode_face(self, image_array, face_location):
        face_encoding = face_recognition.face_encodings(
            image_array, [face_location]
        )[0]
        return face_encoding.tolist()
    
    def compare_faces(self, known_encodings, face_encoding, threshold=0.6):
        distances = face_recognition.face_distance(
            known_encodings, face_encoding
        )
        return distances < threshold
```

## Frontend Development

### Component Structure

```typescript
// src/components/StudentCard.tsx
import React from 'react';

interface StudentCardProps {
  student: {
    id: string;
    name: string;
    email: string;
  };
}

const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold">{student.name}</h3>
      <p className="text-gray-600">{student.email}</p>
    </div>
  );
};

export default StudentCard;
```

### State Management

Using React Query for server state:

```typescript
// src/hooks/useStudents.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: () => api.get('/students').then(res => res.data),
  });
};
```

### API Integration

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };
```

## Mobile Development

### Navigation Setup

```typescript
// src/navigation/MainNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
    </Tab.Navigator>
  );
};
```

### Camera Integration

```typescript
// src/screens/AttendanceScreen.tsx
import { Camera } from 'expo-camera';

const AttendanceScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      // Process photo for attendance
    }
  };
};
```

## Testing

### Backend Testing

```python
# tests/test_students.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_student():
    response = client.post("/api/students/", json={
        "student_id": "STU001",
        "name": "John Doe",
        "email": "john@example.com"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "John Doe"
```

### Frontend Testing

```typescript
// src/components/__tests__/StudentCard.test.tsx
import { render, screen } from '@testing-library/react';
import StudentCard from '../StudentCard';

test('renders student information', () => {
  const student = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com'
  };
  
  render(<StudentCard student={student} />);
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});
```

## Deployment

### Production Build

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
# Serve with nginx or similar

# Mobile
cd mobile
eas build --platform android
eas build --platform ios
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Best Practices

### Code Style

1. **Python**: Follow PEP 8, use type hints
2. **TypeScript**: Use strict mode, define interfaces
3. **React**: Use functional components with hooks
4. **Git**: Use conventional commits

### Security

1. **Environment Variables**: Never commit secrets
2. **Input Validation**: Use Pydantic for API validation
3. **Authentication**: Implement proper JWT handling
4. **CORS**: Configure appropriately for production

### Performance

1. **Database**: Use proper indexing
2. **API**: Implement pagination for large datasets
3. **Frontend**: Use React.memo for expensive components
4. **Images**: Optimize face recognition images

### Error Handling

```python
# Backend
from fastapi import HTTPException

@router.get("/students/{student_id}")
async def get_student(student_id: str):
    student = await student_service.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
```

```typescript
// Frontend
const { data, error, isLoading } = useStudents();

if (error) {
  return <div>Error loading students: {error.message}</div>;
}

if (isLoading) {
  return <div>Loading...</div>;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and test thoroughly
4. Commit with conventional commits: `git commit -m "feat: add student search"`
5. Push and create a pull request

## Debugging

### Backend Debugging

```python
# Add logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@router.post("/students/")
async def create_student(student: StudentCreate):
    logger.debug(f"Creating student: {student.dict()}")
    # Implementation
```

### Frontend Debugging

```typescript
// Use React Developer Tools
// Add console.log for debugging
console.log('Student data:', student);

// Use browser network tab to inspect API calls
```

### Mobile Debugging

```bash
# View logs
npx expo logs

# Debug on device
npx expo start --dev-client

# Use Flipper for advanced debugging
```

This development guide should help you understand the codebase and contribute effectively to the project.