# Technology Stack

## Backend
- **Framework**: FastAPI 0.104+ (Python web framework)
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: JWT with python-jose, bcrypt for password hashing
- **AI/ML**: OpenCV for computer vision, Pinecone for vector embeddings
- **Validation**: Pydantic for data models and validation
- **ASGI Server**: Uvicorn with standard extras

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS utility-first framework
- **Icons**: Heroicons React components
- **Routing**: React Router DOM v6
- **API Client**: Supabase JavaScript client

## Mobile
- **Framework**: React Native with Expo 49
- **Navigation**: React Navigation v6 (stack and bottom tabs)
- **Camera**: Expo Camera and Image Picker
- **Face Detection**: Expo Face Detector
- **HTTP Client**: Axios
- **State Management**: TanStack React Query
- **Storage**: Expo Secure Store

## Infrastructure
- **Containerization**: Docker and Docker Compose
- **Caching**: Redis 7 Alpine
- **Deployment**: AWS EC2 (backend), Vercel (frontend)
- **Environment**: python-dotenv for configuration

## Development Workflow

### Development Setup
The project uses a hybrid development approach for optimal developer experience:

1. **Backend + Redis**: Run in Docker containers for consistency
2. **Frontend**: Run locally with Vite for hot reload capabilities
3. **Mobile**: Run with Expo development server

### Available Docker Configurations
- `docker-compose.backend-only.yml` - Backend and Redis only (recommended for development)
- `docker-compose.yml` - Full stack (backend + frontend + redis)

## Common Commands

### Development Setup
```bash
# Backend + Redis (Docker) + Frontend (local with hot reload)
docker-compose -f docker-compose.backend-only.yml up -d
cd frontend && npm install && npm run dev

# Full stack in Docker
docker-compose up -d

# Mobile development
cd mobile && npm install && npx expo start
```

### Production Deployment
```bash
# Backend deploys automatically via GitHub Actions to AWS EC2
# Frontend deploys automatically via GitHub Actions to Vercel
# Manual deployment available via workflow_dispatch
```

## Environment Variables

### Required Backend Configuration
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `SECRET_KEY`: JWT signing secret
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment (default: us-east-1)
- `PINECONE_INDEX_NAME`: Pinecone index name
- `FACE_THRESHOLD`: Face recognition threshold (default: 0.6)