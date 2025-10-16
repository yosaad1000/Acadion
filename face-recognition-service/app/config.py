"""
Configuration settings for Face Recognition Microservice
"""

import os
from typing import Optional

class Settings:
    """Application settings loaded from environment variables"""
    
    # Pinecone Configuration
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "acadion-faces")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
    
    # Face Recognition Configuration
    FACE_THRESHOLD: float = float(os.getenv("FACE_THRESHOLD", "0.6"))
    
    # Service Configuration
    SERVICE_NAME: str = "face-recognition-service"
    SERVICE_VERSION: str = "1.0.0"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # GPU Configuration
    CUDA_VISIBLE_DEVICES: Optional[str] = os.getenv("CUDA_VISIBLE_DEVICES")
    
    # Performance Configuration
    MAX_CONCURRENT_REQUESTS: int = int(os.getenv("MAX_CONCURRENT_REQUESTS", "10"))
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    
    # Health Check Configuration
    HEALTH_CHECK_INTERVAL: int = int(os.getenv("HEALTH_CHECK_INTERVAL", "30"))
    
    def validate(self) -> bool:
        """Validate required configuration"""
        if not self.PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY is required")
        
        if not self.PINECONE_INDEX_NAME:
            raise ValueError("PINECONE_INDEX_NAME is required")
        
        return True

# Global settings instance
settings = Settings()

# Validate settings on import
settings.validate()