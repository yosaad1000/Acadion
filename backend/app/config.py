import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Face Recognition
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "student-faces")
    FACE_THRESHOLD: float = 0.6
    
    # External Services
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    
    # Google Calendar OAuth Configuration
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")
    GOOGLE_CALENDAR_SCOPES: str = os.getenv("GOOGLE_CALENDAR_SCOPES", "https://www.googleapis.com/auth/calendar")
    
    # Token encryption key for secure storage
    TOKEN_ENCRYPTION_KEY: str = os.getenv("TOKEN_ENCRYPTION_KEY", "")
    
    # Security Configuration
    OAUTH_STATE_SECRET: str = os.getenv("OAUTH_STATE_SECRET", "")
    AUDIT_LOG_ENCRYPTION_KEY: str = os.getenv("AUDIT_LOG_ENCRYPTION_KEY", "")
    
    # Data Retention Configuration
    TOKEN_RETENTION_DAYS: int = int(os.getenv("TOKEN_RETENTION_DAYS", "90"))
    AUDIT_LOG_RETENTION_DAYS: int = int(os.getenv("AUDIT_LOG_RETENTION_DAYS", "2555"))  # 7 years
    SCHEDULE_RETENTION_DAYS: int = int(os.getenv("SCHEDULE_RETENTION_DAYS", "730"))  # 2 years
    
    # Security Monitoring
    ENABLE_SECURITY_MONITORING: bool = os.getenv("ENABLE_SECURITY_MONITORING", "true").lower() == "true"
    SECURITY_ALERT_WEBHOOK: str = os.getenv("SECURITY_ALERT_WEBHOOK", "")
    
    def validate_security_config(self) -> List[str]:
        """Validate security configuration and return any issues."""
        issues = []
        
        if not self.TOKEN_ENCRYPTION_KEY:
            issues.append("TOKEN_ENCRYPTION_KEY is required for secure token storage")
        elif len(self.TOKEN_ENCRYPTION_KEY) < 32:
            issues.append("TOKEN_ENCRYPTION_KEY must be at least 32 characters long")
        
        if not self.OAUTH_STATE_SECRET:
            issues.append("OAUTH_STATE_SECRET is required for OAuth security")
        elif len(self.OAUTH_STATE_SECRET) < 32:
            issues.append("OAUTH_STATE_SECRET must be at least 32 characters long")
        
        if not self.GOOGLE_CLIENT_ID:
            issues.append("GOOGLE_CLIENT_ID is required for Google Calendar integration")
        
        if not self.GOOGLE_CLIENT_SECRET:
            issues.append("GOOGLE_CLIENT_SECRET is required for Google Calendar integration")
        
        if not self.SECRET_KEY or self.SECRET_KEY == "supersecretkey":
            issues.append("SECRET_KEY must be set to a secure value in production")
        
        return issues
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: str = ".jpg,.jpeg,.png,.pdf,.csv"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8081"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    @property
    def google_calendar_scopes_list(self) -> List[str]:
        return [scope.strip() for scope in self.GOOGLE_CALENDAR_SCOPES.split(",")]
    
    class Config:
        env_file = ".env"

settings = Settings()