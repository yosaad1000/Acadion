# 📚 Acadion - Complete Code Explanation

## Part 1: Project Overview

### What is Acadion?

Acadion is an **AI-Powered Student Management Platform** with these core features:

1. **Multi-tenant Organization System** - Multiple schools/institutions can use it
2. **Student & Teacher Management** - Role-based access control
3. **Attendance Tracking** - Both manual and AI-powered face recognition
4. **Class/Subject Management** - Teachers create classes, students enroll
5. **Session Management** - Track individual class sessions
6. **Real-time Notifications** - WebSocket-based updates
7. **OAuth Integration** - Google Sign-In support

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (navigation)
- Supabase JS Client (database)

**Backend:**
- FastAPI (Python web framework)
- Uvicorn (ASGI server)
- Supabase (PostgreSQL database)
- Redis (caching)
- JWT (authentication)
- Face Recognition (optional AI feature)

**Infrastructure:**
- Docker (containerization)
- Nginx (reverse proxy)
- AWS EC2 (backend hosting)
- Vercel (frontend hosting)
- GitHub Actions (CI/CD)

### Architecture Pattern

**Multi-Tenant SaaS Architecture:**
```
User → Organization → Classes → Students/Teachers → Sessions → Attendance
```

Every user belongs to an organization (school/institution).
