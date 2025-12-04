# 🔧 Backend Architecture Explanation

## FastAPI Backend Structure

### Directory Structure
```
backend/
├── app/
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, CORS, etc.
│   ├── models/          # Data models
│   └── settings.py      # Configuration
├── main.py              # Application entry point
└── requirements.txt     # Python dependencies
```

### Main Components

#### 1. **main.py** - Application Entry Point

**What it does:**
- Creates the FastAPI application
- Configures CORS (Cross-Origin Resource Sharing)
- Registers all API routers
- Sets up startup/shutdown events
- Initializes caching and connection pooling

**Key Code:**
```python
app = FastAPI(title="Acadion API")

# CORS - allows frontend to call backend
app.add_middleware(CORSMiddleware, 
    allow_origins=["http://localhost:5173"])

# Register routers
app.include_router(auth.router, prefix="/api/auth")
app.include_router(subjects.router, prefix="/api/subjects")
```

#### 2. **app/settings.py** - Configuration Management

**What it does:**
- Loads environment variables from .env file
- Validates configuration
- Provides settings to entire application

**Key Settings:**
- SUPABASE_URL, SUPABASE_KEY - Database connection
- SECRET_KEY - JWT token signing
- PINECONE_API_KEY - Face recognition (optional)
- AWS credentials - For production features
