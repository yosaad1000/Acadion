# 🤖 AI Agents Navigation Guide

This document provides AI agents with comprehensive information about the Acadion codebase structure, patterns, and navigation guidelines.

## 📁 Project Structure

```
acadion/
├── 🔧 backend/                 # FastAPI backend application
│   ├── app/                    # Main application code
│   │   ├── core/              # Core utilities and configurations
│   │   ├── models/            # Pydantic models and schemas
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic services
│   │   └── middleware/        # Custom middleware
│   ├── migrations/            # Database migration scripts
│   ├── tests/                 # Backend test suite
│   ├── main.py               # FastAPI application entry point
│   ├── config.py             # Configuration management
│   └── requirements.txt      # Python dependencies
├── 🌐 frontend/               # React TypeScript frontend
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── contexts/        # React contexts
│   ├── public/              # Static assets
│   └── package.json         # Node.js dependencies
├── 📱 mobile/                 # React Native mobile app
│   ├── src/                 # Mobile app source
│   ├── app.json            # Expo configuration
│   └── package.json        # Mobile dependencies
├── 🐳 docker-compose.yml      # Container orchestration
├── 📚 docs/                   # GitHub Pages documentation
├── 🚀 scripts/               # Setup and deployment scripts
└── 📋 README.md              # Main project documentation
```

## 🎯 Key Components

### Backend Architecture (FastAPI)

#### Main Application (`backend/main.py`)
- **Purpose**: FastAPI application entry point
- **Key Features**: CORS middleware, router inclusion, health checks
- **Dependencies**: FastAPI, Pydantic, Supabase client

#### Configuration (`backend/app/config.py`)
- **Purpose**: Environment variable management
- **Key Settings**: Database URLs, API keys, CORS origins
- **Pattern**: Pydantic Settings for type-safe configuration

#### Routers (`backend/app/routers/`)
- **auth.py**: User authentication and registration
- **subjects.py**: Class/course management
- **attendance.py**: Attendance tracking and face recognition
- **supabase_auth.py**: Supabase-specific authentication

#### Services (`backend/app/services/`)
- **face_recognition.py**: AI face processing logic
- **supabase_client.py**: Database operations
- **auth_service.py**: Authentication business logic

#### Models (`backend/app/models/`)
- **user.py**: User-related Pydantic models
- **subject.py**: Subject/class models
- **attendance.py**: Attendance record models

### Frontend Architecture (React + TypeScript)

#### Components (`frontend/src/components/`)
- **Layout/**: Navigation, headers, footers
- **Auth/**: Login, register, profile components
- **Dashboard/**: Teacher and student dashboards
- **Attendance/**: Face recognition and manual attendance
- **Common/**: Reusable UI components

#### Pages (`frontend/src/pages/`)
- **LoginPage.tsx**: User authentication
- **DashboardPage.tsx**: Role-based dashboards
- **SubjectPage.tsx**: Class management
- **AttendancePage.tsx**: Attendance tracking

#### Services (`frontend/src/services/`)
- **api.ts**: Axios-based API client
- **auth.ts**: Authentication service
- **subjects.ts**: Subject management API calls
- **attendance.ts**: Attendance API integration

#### Types (`frontend/src/types/`)
- **user.ts**: User-related TypeScript interfaces
- **subject.ts**: Subject/class type definitions
- **attendance.ts**: Attendance record types

## 🔍 Navigation Patterns

### Finding Specific Functionality

#### Authentication Flow
1. **Frontend**: `src/pages/LoginPage.tsx` → `src/services/auth.ts`
2. **Backend**: `app/routers/auth.py` → `app/services/auth_service.py`
3. **Database**: Supabase `users` table

#### Face Recognition System
1. **Frontend**: `src/components/Attendance/FaceRecognition.tsx`
2. **Backend**: `app/routers/attendance.py` → `app/services/face_recognition.py`
3. **Storage**: Pinecone vector database

#### Subject Management
1. **Frontend**: `src/pages/SubjectPage.tsx` → `src/services/subjects.ts`
2. **Backend**: `app/routers/subjects.py`
3. **Database**: Supabase `subjects` and `subject_enrollments` tables

### Common Code Patterns

#### API Route Pattern (Backend)
```python
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter()

@router.get("/endpoint")
async def get_data(current_user: User = Depends(get_current_user)):
    # Business logic here
    return {"data": "response"}
```

#### React Component Pattern (Frontend)
```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

interface ComponentProps {
  // Props interface
}

export const Component: React.FC<ComponentProps> = ({ props }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Data fetching logic
  }, []);

  return (
    // JSX here
  );
};
```

#### Service Layer Pattern (Frontend)
```typescript
import { apiClient } from './api';
import { Subject, CreateSubjectRequest } from '../types/subject';

export const subjectService = {
  async getSubjects(): Promise<Subject[]> {
    const response = await apiClient.get('/api/subjects');
    return response.data;
  },

  async createSubject(data: CreateSubjectRequest): Promise<Subject> {
    const response = await apiClient.post('/api/subjects', data);
    return response.data;
  }
};
```

## 🛠️ Development Guidelines

### Code Organization Principles

1. **Separation of Concerns**: Business logic in services, UI in components
2. **Type Safety**: TypeScript interfaces for all data structures
3. **Error Handling**: Consistent error handling patterns
4. **Authentication**: JWT-based with role-based access control
5. **Database**: Supabase for data persistence, Pinecone for face vectors

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Services**: camelCase (e.g., `authService.ts`)
- **Types**: PascalCase interfaces (e.g., `User.ts`)
- **API Routes**: snake_case (e.g., `user_profile.py`)
- **Database**: snake_case tables (e.g., `subject_enrollments`)

### Key Dependencies

#### Backend
- **FastAPI**: Web framework
- **Supabase**: Database and auth
- **OpenCV**: Face recognition
- **Pinecone**: Vector database
- **Pydantic**: Data validation
- **JWT**: Authentication tokens

#### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Axios**: HTTP client
- **React Query**: State management
- **React Router**: Navigation

## 🔧 Common Tasks

### Adding New API Endpoint

1. **Create Model**: `backend/app/models/new_model.py`
2. **Add Router**: `backend/app/routers/new_router.py`
3. **Include Router**: Update `backend/main.py`
4. **Add Service**: `backend/app/services/new_service.py`
5. **Frontend Service**: `frontend/src/services/newService.ts`
6. **Frontend Types**: `frontend/src/types/newTypes.ts`

### Adding New Page

1. **Create Component**: `frontend/src/pages/NewPage.tsx`
2. **Add Route**: Update `frontend/src/App.tsx`
3. **Add Navigation**: Update navigation components
4. **Create Services**: Add API integration
5. **Add Types**: Define TypeScript interfaces

### Database Changes

1. **Create Migration**: `backend/migrations/new_migration.sql`
2. **Update Models**: Modify Pydantic models
3. **Update Services**: Adjust database queries
4. **Update Frontend**: Modify TypeScript types

## 🐛 Debugging Guidelines

### Backend Debugging
- **Logs**: Check `backend/logs/` directory
- **API Docs**: Visit `/docs` endpoint for interactive testing
- **Health Check**: Use `/api/health` endpoint
- **Database**: Check Supabase dashboard

### Frontend Debugging
- **Console**: Browser developer tools
- **Network**: Check API calls in Network tab
- **State**: Use React Developer Tools
- **Build**: Check Vite build output

### Common Issues
- **CORS Errors**: Check `ALLOWED_ORIGINS` in backend config
- **Auth Failures**: Verify JWT token and expiration
- **Face Recognition**: Ensure good image quality and Pinecone connection
- **Database**: Check Supabase connection and table schemas

## 📊 Database Schema

### Core Tables
- **users**: User authentication and profiles
- **subjects**: Classes/courses information
- **subject_enrollments**: Student-class relationships
- **attendance**: Attendance records with timestamps
- **face_encodings**: Face recognition data (Pinecone)

### Relationships
- Users → Subjects (many-to-many via enrollments)
- Users → Attendance (one-to-many)
- Subjects → Attendance (one-to-many)

## 🚀 Deployment Context

### Development
- **Backend**: `uvicorn main:app --reload`
- **Frontend**: `npm run dev`
- **Database**: Local Supabase or cloud instance

### Production
- **Docker**: `docker-compose -f docker-compose.prod.yml up`
- **Environment**: Production environment variables
- **SSL**: Nginx with SSL certificates
- **Monitoring**: Health checks and logging

## 🎯 AI Agent Tips

1. **Start with README.md** for project overview
2. **Check main.py** for backend entry point
3. **Look at App.tsx** for frontend routing
4. **Use /docs endpoint** for API exploration
5. **Check types/ folders** for data structures
6. **Follow service layer** for business logic
7. **Use consistent patterns** shown in existing code
8. **Test changes** with health checks and API docs

This guide should help AI agents navigate and understand the Acadion codebase efficiently. The project follows modern best practices with clear separation of concerns and consistent patterns throughout.