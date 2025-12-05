# Backend Development Scope

## CRITICAL: Limited Python Backend Scope

The Python FastAPI backend should ONLY implement features related to facial recognition and AI processing. Do NOT implement general CRUD operations, authentication flows, or business logic that can be handled by Supabase + React.

## What TO Implement in Python Backend

### Facial Recognition Features
- Face encoding generation using OpenCV
- Face comparison and matching algorithms
- Pinecone vector database integration for face storage
- Attendance marking via facial recognition
- Face registration for new students
- Group photo processing for batch attendance
- Confidence scoring for face matches

### AI/ML Services
- Computer vision utilities
- Image processing pipelines
- Face detection and encoding services
- Vector similarity calculations

### Integration Services
- Pinecone client and vector operations
- OpenCV image processing
- Face recognition model management
- Attendance result posting to Supabase

## What NOT to Implement in Python Backend

### Authentication & Authorization
- User login/logout flows
- OAuth integration
- JWT token generation
- Password management
- Session management
- Role-based access control

### CRUD Operations
- User profile management
- Organization management
- Subject/class creation and management
- Student enrollment
- Manual attendance tracking
- Notification systems

### Business Logic
- Invite code generation
- Email notifications
- Calendar integrations
- File uploads (except face images)
- Reporting and analytics

## Architecture Pattern

```
React Frontend + Supabase
├── Handles all CRUD operations
├── Manages authentication
├── Provides real-time updates
└── Calls Python backend ONLY for facial recognition

Python FastAPI Backend
├── Receives face images
├── Processes with OpenCV
├── Stores/retrieves from Pinecone
├── Returns attendance results
└── NO direct database operations (except via Supabase API)
```

## Integration Points

The Python backend should:
1. Receive face images from React frontend
2. Process images using OpenCV
3. Store/query face encodings in Pinecone
4. Return results to frontend
5. Let frontend handle all database operations via Supabase

## Key Principle

**If it's not directly related to facial recognition or AI processing, it belongs in the React frontend + Supabase, NOT in the Python backend.**