# Project Structure

## Root Directory Organization

```
acadion/
├── backend/              # FastAPI backend application
├── frontend/             # React TypeScript web application
├── mobile/               # React Native Expo mobile app
├── database/             # SQL migration scripts and database setup
├── docs/                 # Project documentation
├── scripts/              # Setup and deployment scripts
├── supabase/             # Supabase configuration
├── .kiro/                # Kiro AI assistant configuration
└── docker-compose.yml    # Multi-service container orchestration
```

## Backend Structure (`backend/`)

```
backend/
├── app/
│   ├── core/             # Core utilities and configurations
│   ├── middleware/       # Custom middleware components
│   ├── models/           # Pydantic data models
│   ├── routers/          # FastAPI route handlers
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── supabase_auth.py  # Supabase auth integration
│   │   ├── subjects.py   # Subject management
│   │   └── attendance.py # Attendance tracking
│   └── services/         # Business logic services
├── logs/                 # Application logs
├── migrations/           # Database migration scripts
├── tests/                # Backend test suite
├── main.py               # FastAPI application entry point
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables (not in git)
```

## Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API service functions
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── App.tsx           # Main application component
├── public/               # Static assets
├── dist/                 # Build output (generated)
├── package.json          # Node.js dependencies and scripts
├── vite.config.ts        # Vite build configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Mobile Structure (`mobile/`)

```
mobile/
├── src/
│   ├── components/       # React Native components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API and device services
│   ├── hooks/            # Custom hooks
│   └── types/            # TypeScript definitions
├── App.tsx               # Main app component
├── app.json              # Expo configuration
└── package.json          # Dependencies and scripts
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `StudentCard.tsx`)
- **Services**: camelCase (e.g., `authService.ts`)
- **Routes**: snake_case for URLs (e.g., `/api/auth/login`)
- **Database**: snake_case for tables and columns

### Import Organization
```typescript
// External libraries
import React from 'react'
import { FastAPI } from 'fastapi'

// Internal modules (absolute paths preferred)
import { AuthService } from '@/services/auth'
import { StudentModel } from '@/models/student'

// Relative imports (only for closely related files)
import './Component.css'
```

### API Route Structure
- **Authentication**: `/api/auth/*`
- **Supabase Auth**: `/api/supabase-auth/*`
- **Subjects**: `/api/subjects/*`
- **Attendance**: `/api/attendance/*`
- **Health Check**: `/api/health`

### Environment Files
- `backend/.env` - Backend configuration (not committed)
- `backend/.env.example` - Template for environment variables
- `backend/.env.template` - Alternative template format

### Configuration Files
- **Docker**: `docker-compose.yml`, `Dockerfile`, `frontend/Dockerfile`
- **Database**: SQL files in `database/` directory
- **Documentation**: Markdown files in `docs/` directory
- **Scripts**: Shell scripts in `scripts/` for automation

### Testing Structure
- Backend tests in `backend/tests/`
- Follow pytest conventions for Python tests
- Use descriptive test file names (e.g., `test_auth_endpoints.py`)

### Documentation Organization
- `README.md` - Main project overview
- `QUICKSTART.md` - 5-minute setup guide
- `docs/SETUP.md` - Detailed setup instructions
- `docs/DEVELOPMENT.md` - Development guidelines
- `docs/api-documentation.md` - API reference
- `docs/architecture.md` - System architecture

### Database Scripts
- Migration scripts in `database/` with descriptive names
- Use timestamp prefixes for ordering when applicable
- Separate setup, migration, and utility scripts