from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.config import settings
from app.routers import auth, subjects, attendance, profile, calendar, scheduling, user_preferences, health, analytics, students, teachers, departments
from app.core.logging_config import setup_logging, get_calendar_logger
from app.services.graceful_degradation import graceful_degradation
from app.services.retry_queue import retry_queue_service
from app.services.security_startup import security_startup_service
from app.middleware.security_middleware import SecurityMiddleware

# Setup structured logging
setup_logging()
logger = get_calendar_logger(__name__)

app = FastAPI(
    title="AI-Powered Student Management Platform API",
    description="Comprehensive Student Management System with Facial Attendance Recognition",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enhanced CORS middleware with security headers and calendar-specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-Calendar-Timezone",  # Calendar-specific header
        "X-Sync-Mode",  # Calendar sync mode header
        "X-Audit-Context"  # Audit context header
    ],
    expose_headers=[
        "X-Total-Count", 
        "X-Rate-Limit-Remaining",
        "X-Calendar-Sync-Status",  # Calendar sync status
        "X-Token-Expires-At",  # OAuth token expiration
        "X-Audit-ID"  # Audit trail ID
    ],
    max_age=86400,  # 24 hours
)

# Trusted host middleware - allow test hosts for testing
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "backend", "frontend", "*.vercel.app", "*.netlify.app", "test", "testserver"]
)

# Security middleware for calendar endpoints
app.add_middleware(SecurityMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(scheduling.router, prefix="/api/schedules", tags=["Scheduling"])
app.include_router(user_preferences.router, prefix="/api/preferences", tags=["User Preferences"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(teachers.router, prefix="/api/teachers", tags=["Teachers"])
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])
app.include_router(health.router, prefix="/api/health", tags=["Health & Monitoring"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting AI-Powered Student Management Platform API v2.0")
    
    # Initialize security features first
    security_results = await security_startup_service.initialize_security_features()
    if security_results["overall_status"] == "error":
        logger.error("Security initialization failed - some features may not work properly")
        for error in security_results["errors"]:
            logger.error(f"Security error: {error}")
    elif security_results["warnings"]:
        logger.warning("Security initialization completed with warnings")
        for warning in security_results["warnings"]:
            logger.warning(f"Security warning: {warning}")
    else:
        logger.info("Security features initialized successfully")
    
    # Start background services
    await graceful_degradation.start_background_tasks()
    await retry_queue_service.start_background_processor()
    
    logger.info("Background services started successfully")

@app.get("/")
async def root():
    return {"message": "AI-Powered Student Management Platform API v2.0 - Powered by Supabase"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "supabase", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)