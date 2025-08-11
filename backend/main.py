from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.config import settings
from app.routers import auth, subjects, attendance

app = FastAPI(
    title="AI-Powered Student Management Platform API",
    description="Comprehensive Student Management System with Facial Attendance Recognition",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "backend", "frontend", "*.vercel.app", "*.netlify.app"]
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])

@app.get("/")
async def root():
    return {"message": "AI-Powered Student Management Platform API v2.0 - Powered by Supabase"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "supabase", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)