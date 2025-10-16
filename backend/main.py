from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.settings import settings
from app.routers import auth, subjects, attendance, supabase_auth, notifications, sessions, assignments, google_integration, students, face_recognition, test_router
from app.middleware.logging_middleware import LoggingMiddleware
from app.config.logging import setup_logging, get_logger
from app.config.xray import configure_xray, add_xray_middleware, XRayRequestMiddleware
# from app.routers import face_migration  # Temporarily disabled due to Supabase client initialization issue

# Initialize structured logging and X-Ray tracing
setup_logging()
configure_xray()
logger = get_logger(__name__)

app = FastAPI(
    title="AI-Powered Student Management Platform API",
    description="Comprehensive Student Management System with Facial Attendance Recognition",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    """Initialize and validate configuration on application startup"""
    
    try:
        from app.config.loader import initialize_application_configuration, schedule_configuration_refresh
        
        # Initialize configuration with Parameter Store integration
        logger.info("🚀 Starting application configuration initialization...")
        
        config_success = await initialize_application_configuration()
        
        if config_success:
            logger.info("✅ Application configuration initialized successfully")
            
            # Schedule periodic configuration refresh (every 60 minutes)
            # This ensures configuration stays up-to-date with Parameter Store changes
            schedule_configuration_refresh(interval_minutes=60)
            
        else:
            logger.error("❌ Configuration initialization failed")
            logger.warning("Application will continue but may not function correctly")
        
    except Exception as e:
        logger.error(f"❌ Configuration initialization failed on startup: {e}")
        logger.warning("Application will continue but may not function correctly")
        # Don't fail startup, just log the error
    
    # Initialize caching and connection pooling services
    try:
        from app.core.cache_init import initialize_caching_services
        
        logger.info("🚀 Initializing caching and connection pooling services...")
        
        cache_success = await initialize_caching_services()
        
        if cache_success:
            logger.info("✅ Caching and connection pooling services initialized successfully")
        else:
            logger.error("❌ Caching services initialization failed")
            logger.warning("Application will continue with reduced performance")
        
    except Exception as e:
        logger.error(f"❌ Caching services initialization failed on startup: {e}")
        logger.warning("Application will continue with reduced performance")
        # Don't fail startup, just log the error

# X-Ray middleware (should be first for complete tracing)
add_xray_middleware(app)
app.add_middleware(XRayRequestMiddleware)

# Logging middleware (should be early to capture all requests)
app.add_middleware(LoggingMiddleware)

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
    allowed_hosts=[
        "localhost", 
        "127.0.0.1", 
        "localhost:8000",  # Local development with port
        "127.0.0.1:8000",  # Local development with port
        "backend", 
        "frontend", 
        "54.167.95.26",     # Production IP
        "54.167.95.26:8000",  # Production IP with port (this was missing!)
        "*.vercel.app", 
        "*.netlify.app"
    ]
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(supabase_auth.router, prefix="/api/supabase-auth", tags=["Supabase Authentication"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(test_router.router, prefix="/api/test", tags=["Test"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(face_recognition.router, prefix="/api/face-recognition", tags=["Face Recognition"])
app.include_router(google_integration.router, tags=["Google Integration"])
# app.include_router(face_migration.router, tags=["Face Migration"])  # Temporarily disabled

@app.get("/")
async def root():
    return {"message": "AI-Powered Student Management Platform API v2.0 - Powered by Supabase"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "supabase", "version": "2.0.0"}

@app.get("/api/config/info")
async def config_info():
    """Get information about the current configuration setup"""
    from app.settings import get_configuration_info
    return get_configuration_info()

@app.get("/api/config/status")
async def config_status():
    """Get detailed configuration status and validation results"""
    from app.config.loader import validate_application_configuration
    
    return await validate_application_configuration()

@app.get("/api/config/health")
async def config_health():
    """Get configuration health status"""
    from app.config.loader import get_application_configuration_health
    
    return await get_application_configuration_health()

@app.get("/api/config/summary")
async def config_summary():
    """Get secure configuration summary (no sensitive data)"""
    from app.settings import get_secure_configuration_summary
    
    return get_secure_configuration_summary()

@app.post("/api/config/refresh")
async def refresh_config():
    """Refresh configuration from Parameter Store with validation"""
    from app.config.loader import refresh_application_configuration
    
    result = await refresh_application_configuration()
    
    if result["success"]:
        return {
            "status": "success", 
            "message": "Configuration refreshed successfully",
            "details": result
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to refresh configuration: {result.get('error', 'Unknown error')}"
        )

@app.post("/api/config/validate")
async def validate_config():
    """Validate current configuration with connectivity checks"""
    from app.config.loader import validate_application_configuration
    
    result = await validate_application_configuration()
    
    return {
        "status": "success" if result["valid"] else "error",
        "valid": result["valid"],
        "message": "Configuration validation completed",
        "details": result
    }

@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown of application services"""
    try:
        from app.core.cache_init import shutdown_caching_services
        
        logger.info("🛑 Shutting down caching and connection services...")
        await shutdown_caching_services()
        logger.info("✅ Application shutdown completed")
        
    except Exception as e:
        logger.error(f"❌ Error during application shutdown: {e}")

# Health check endpoints for caching services
@app.get("/api/cache/health")
async def cache_health():
    """Get health status of caching services"""
    try:
        from app.core.cache_init import get_caching_health_status
        return await get_caching_health_status()
    except Exception as e:
        return {"error": str(e), "status": "unhealthy"}

@app.get("/api/cache/stats")
async def cache_stats():
    """Get cache performance statistics"""
    try:
        from app.services.cache_manager import get_cache_manager
        cache_manager = get_cache_manager()
        return await cache_manager.get_stats()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/connections/stats")
async def connection_stats():
    """Get connection pool statistics"""
    try:
        from app.services.connection_pool import get_connection_manager
        connection_manager = get_connection_manager()
        return await connection_manager.get_combined_stats()
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)