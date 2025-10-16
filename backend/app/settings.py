import os
import logging
from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Dict, Any, Optional
import asyncio
from functools import lru_cache

# Set up logging
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # Environment and deployment
    ENVIRONMENT: str = Field(default="dev", description="Deployment environment")
    AWS_REGION: str = Field(default="us-east-1", description="AWS region")
    
    # Supabase Configuration
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_KEY: str = Field(default="", description="Supabase anon key")
    SUPABASE_SERVICE_KEY: str = Field(default="", description="Supabase service role key")
    
    # Appwrite Configuration (Legacy - to be phased out)
    APPWRITE_ENDPOINT: str = Field(default="http://localhost", description="Appwrite endpoint")
    APPWRITE_PROJECT_ID: str = Field(default="", description="Appwrite project ID")
    APPWRITE_API_KEY: str = Field(default="", description="Appwrite API key")
    APPWRITE_DATABASE_ID: str = Field(default="main", description="Appwrite database ID")
    
    # Security Configuration
    SECRET_KEY: str = Field(default="supersecretkey", description="JWT signing secret")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="JWT token expiration in minutes")
    
    # Face Recognition Configuration
    PINECONE_API_KEY: str = Field(default="", description="Pinecone API key")
    PINECONE_ENVIRONMENT: str = Field(default="us-east-1", description="Pinecone environment")
    PINECONE_ENV: str = Field(default="aws", description="Pinecone cloud provider")
    PINECONE_REGION: str = Field(default="us-east-1", description="Pinecone region")
    PINECONE_INDEX_NAME: str = Field(default="student-face-encodings", description="Pinecone index name")
    FACE_THRESHOLD: float = Field(default=0.6, ge=0.0, le=1.0, description="Face recognition threshold")
    FACE_ENCODING_DIMENSION: int = Field(default=128, description="Face encoding dimension")
    FACE_METRIC: str = Field(default="euclidean", description="Face similarity metric")
    
    # Face Recognition Service Configuration
    FACE_RECOGNITION_SERVICE_URL: str = Field(default="http://face-recognition-service:8001", description="Face recognition service URL")
    FACE_RECOGNITION_TIMEOUT: float = Field(default=30.0, description="Face recognition service timeout")
    FACE_RECOGNITION_FALLBACK_ENABLED: bool = Field(default=True, description="Enable face recognition fallback")
    
    # External Services
    STRIPE_SECRET_KEY: str = Field(default="", description="Stripe secret key")
    SENDGRID_API_KEY: str = Field(default="", description="SendGrid API key")
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth client secret")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:3000/auth/google/callback", description="Google OAuth redirect URI")
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, description="Maximum file upload size in bytes")
    ALLOWED_EXTENSIONS: str = Field(default=".jpg,.jpeg,.png,.pdf,.csv", description="Allowed file extensions")
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:8081", description="Allowed CORS origins")
    
    # Database Connection Configuration
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, description="Database connection pool max overflow")
    DATABASE_POOL_TIMEOUT: int = Field(default=30, description="Database connection pool timeout")
    DATABASE_POOL_RECYCLE: int = Field(default=3600, description="Database connection pool recycle time")
    DATABASE_POOL_PRE_PING: bool = Field(default=True, description="Database connection pool pre-ping")
    
    # Redis Configuration
    REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
    REDIS_POOL_SIZE: int = Field(default=10, description="Redis connection pool size")
    REDIS_TIMEOUT: int = Field(default=5, description="Redis connection timeout")
    
    # SQS Configuration
    SQS_ENABLED: bool = Field(default=True, description="Enable SQS for async processing")
    SQS_REGION: str = Field(default="us-east-1", description="SQS region")
    SQS_QUEUE_PREFIX: str = Field(default="acadion", description="SQS queue name prefix")
    SQS_VISIBILITY_TIMEOUT: int = Field(default=300, description="SQS message visibility timeout")
    SQS_MESSAGE_RETENTION: int = Field(default=1209600, description="SQS message retention period (14 days)")
    SQS_MAX_RECEIVE_COUNT: int = Field(default=3, description="Max retries before dead letter queue")
    SQS_LONG_POLLING: int = Field(default=20, description="SQS long polling wait time")
    
    # Async Processing Configuration
    ASYNC_PROCESSING_ENABLED: bool = Field(default=True, description="Enable asynchronous processing")
    WORKER_COUNT: int = Field(default=1, description="Number of background workers")
    JOB_TIMEOUT: int = Field(default=300, description="Job processing timeout in seconds")
    JOB_RETRY_ATTEMPTS: int = Field(default=3, description="Number of job retry attempts")
    JOB_HISTORY_RETENTION_DAYS: int = Field(default=7, description="Job history retention in days")
    
    # Application Performance Configuration
    WORKER_PROCESSES: int = Field(default=1, description="Number of worker processes")
    WORKER_CONNECTIONS: int = Field(default=1000, description="Number of worker connections")
    KEEPALIVE_TIMEOUT: int = Field(default=5, description="Keep-alive timeout")
    
    # Monitoring and Logging
    LOG_LEVEL: str = Field(default="INFO", description="Application log level")
    ENABLE_METRICS: bool = Field(default=True, description="Enable application metrics")
    METRICS_PORT: int = Field(default=9090, description="Metrics server port")
    
    # Parameter Store Configuration
    PARAMETER_STORE_ENABLED: bool = Field(default=True, description="Enable Parameter Store integration")
    PARAMETER_STORE_CACHE_TTL: int = Field(default=300, description="Parameter Store cache TTL in seconds")
    PARAMETER_STORE_PREFIX: str = Field(default="", description="Parameter Store prefix override")
    
    @validator('FACE_THRESHOLD')
    def validate_face_threshold(cls, v):
        """Validate face recognition threshold is between 0.0 and 1.0"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('FACE_THRESHOLD must be between 0.0 and 1.0')
        return v
    
    @validator('ALGORITHM')
    def validate_jwt_algorithm(cls, v):
        """Validate JWT algorithm is supported"""
        valid_algorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']
        if v not in valid_algorithms:
            raise ValueError(f'ALGORITHM must be one of: {", ".join(valid_algorithms)}')
        return v
    
    @validator('ACCESS_TOKEN_EXPIRE_MINUTES')
    def validate_token_expiration(cls, v):
        """Validate token expiration is positive"""
        if v <= 0:
            raise ValueError('ACCESS_TOKEN_EXPIRE_MINUTES must be positive')
        return v
    
    @validator('SUPABASE_URL')
    def validate_supabase_url(cls, v):
        """Validate Supabase URL format"""
        if v and not v.startswith('https://'):
            raise ValueError('SUPABASE_URL must start with https://')
        return v
    
    @validator('LOG_LEVEL')
    def validate_log_level(cls, v):
        """Validate log level"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'LOG_LEVEL must be one of: {", ".join(valid_levels)}')
        return v.upper()
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Get CORS allowed origins as a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Get allowed file extensions as a list"""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database connection configuration"""
        return {
            "pool_size": self.DATABASE_POOL_SIZE,
            "max_overflow": self.DATABASE_MAX_OVERFLOW,
            "pool_timeout": self.DATABASE_POOL_TIMEOUT,
            "pool_recycle": self.DATABASE_POOL_RECYCLE,
            "pool_pre_ping": self.DATABASE_POOL_PRE_PING
        }
    
    @property
    def redis_config(self) -> Dict[str, Any]:
        """Get Redis connection configuration"""
        return {
            "url": self.REDIS_URL,
            "pool_size": self.REDIS_POOL_SIZE,
            "timeout": self.REDIS_TIMEOUT
        }
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT.lower() in ['prod', 'production']
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT.lower() in ['dev', 'development', 'local']
    
    def get_parameter_store_prefix(self) -> str:
        """Get the Parameter Store prefix for this environment"""
        if self.PARAMETER_STORE_PREFIX:
            return self.PARAMETER_STORE_PREFIX
        return f"/{self.ENVIRONMENT}/acadion"
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file
        validate_assignment = True  # Validate on assignment

class ConfigurationManager:
    """
    Manages application configuration with Parameter Store integration.
    Provides secure credential loading and runtime refresh capabilities.
    """
    
    def __init__(self):
        self._settings: Optional[Settings] = None
        self._parameter_store_loader = None
        self._last_refresh = None
        
    def _get_parameter_store_loader(self):
        """Get or create Parameter Store loader"""
        if self._parameter_store_loader is None:
            try:
                from .config.parameter_store import get_parameter_store_loader
                self._parameter_store_loader = get_parameter_store_loader()
            except ImportError:
                logger.info("Parameter Store module not available")
                self._parameter_store_loader = None
        return self._parameter_store_loader
    
    def _load_from_parameter_store(self) -> Dict[str, Any]:
        """Load configuration from Parameter Store"""
        loader = self._get_parameter_store_loader()
        
        if not loader or not loader.is_available():
            logger.info("Parameter Store not available, using environment variables only")
            return {}
        
        try:
            from .config.parameter_store import load_parameter_store_config
            
            # Load all parameters from Parameter Store
            parameter_store_config = load_parameter_store_config()
            
            if parameter_store_config:
                logger.info(f"✅ Loaded {len(parameter_store_config)} parameters from Parameter Store")
                
                # Log parameter categories (without values for security)
                categories = {}
                for key in parameter_store_config.keys():
                    category = key.split('_')[0] if '_' in key else 'other'
                    categories[category] = categories.get(category, 0) + 1
                
                logger.info(f"Parameter categories: {dict(categories)}")
                return parameter_store_config
            else:
                logger.info("No parameters found in Parameter Store")
                return {}
                
        except Exception as e:
            logger.error(f"Error loading Parameter Store configuration: {e}")
            return {}
    
    async def _load_from_parameter_store_async(self) -> Dict[str, Any]:
        """Async version of Parameter Store loading"""
        loader = self._get_parameter_store_loader()
        
        if not loader or not loader.is_available():
            logger.info("Parameter Store not available, using environment variables only")
            return {}
        
        try:
            from .config.parameter_store import load_parameter_store_config_async
            
            # Load all parameters from Parameter Store asynchronously
            parameter_store_config = await load_parameter_store_config_async()
            
            if parameter_store_config:
                logger.info(f"✅ Loaded {len(parameter_store_config)} parameters from Parameter Store (async)")
                return parameter_store_config
            else:
                logger.info("No parameters found in Parameter Store")
                return {}
                
        except Exception as e:
            logger.error(f"Error loading Parameter Store configuration (async): {e}")
            return {}
    
    def _merge_configurations(self, parameter_store_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge Parameter Store config with environment variables.
        Environment variables take precedence for local development.
        """
        merged_config = {}
        
        # Start with Parameter Store values
        for key, value in parameter_store_config.items():
            merged_config[key] = value
        
        # Override with environment variables if they exist
        # This allows local development overrides
        env_overrides = 0
        for key in parameter_store_config.keys():
            env_value = os.getenv(key)
            if env_value is not None:
                merged_config[key] = env_value
                env_overrides += 1
                logger.debug(f"Using environment variable override for {key}")
        
        if env_overrides > 0:
            logger.info(f"Applied {env_overrides} environment variable overrides")
        
        return merged_config
    
    def _apply_configuration(self, config: Dict[str, Any]):
        """Apply configuration to environment variables for Pydantic"""
        applied_count = 0
        
        for key, value in config.items():
            # Only set if not already in environment (preserve existing env vars)
            if key not in os.environ:
                os.environ[key] = str(value)
                applied_count += 1
        
        if applied_count > 0:
            logger.info(f"Applied {applied_count} configuration parameters to environment")
    
    def create_settings(self) -> Settings:
        """
        Create Settings instance with Parameter Store integration.
        Falls back to environment variables if Parameter Store is not available.
        """
        try:
            # Load configuration from Parameter Store
            parameter_store_config = self._load_from_parameter_store()
            
            if parameter_store_config:
                # Merge with environment variables
                merged_config = self._merge_configurations(parameter_store_config)
                
                # Apply to environment for Pydantic
                self._apply_configuration(merged_config)
                
                logger.info("✅ Configuration loaded with Parameter Store integration")
            else:
                logger.info("Using environment variables only")
                
        except Exception as e:
            logger.warning(f"Error during configuration loading: {e}")
            logger.info("Falling back to environment variables only")
        
        # Create and validate Settings instance
        try:
            settings_instance = Settings()
            
            # Store reference for refresh operations
            self._settings = settings_instance
            self._last_refresh = asyncio.get_event_loop().time() if hasattr(asyncio, 'get_event_loop') else None
            
            logger.info("✅ Settings instance created successfully")
            return settings_instance
            
        except Exception as e:
            logger.error(f"Error creating Settings instance: {e}")
            raise
    
    async def create_settings_async(self) -> Settings:
        """
        Async version of create_settings.
        """
        try:
            # Load configuration from Parameter Store asynchronously
            parameter_store_config = await self._load_from_parameter_store_async()
            
            if parameter_store_config:
                # Merge with environment variables
                merged_config = self._merge_configurations(parameter_store_config)
                
                # Apply to environment for Pydantic
                self._apply_configuration(merged_config)
                
                logger.info("✅ Configuration loaded with Parameter Store integration (async)")
            else:
                logger.info("Using environment variables only")
                
        except Exception as e:
            logger.warning(f"Error during async configuration loading: {e}")
            logger.info("Falling back to environment variables only")
        
        # Create and validate Settings instance
        try:
            settings_instance = Settings()
            
            # Store reference for refresh operations
            self._settings = settings_instance
            import time
            self._last_refresh = time.time()
            
            logger.info("✅ Settings instance created successfully (async)")
            return settings_instance
            
        except Exception as e:
            logger.error(f"Error creating Settings instance (async): {e}")
            raise
    
    def refresh_configuration(self) -> bool:
        """
        Refresh configuration by reloading from Parameter Store.
        Useful for runtime configuration updates.
        """
        try:
            loader = self._get_parameter_store_loader()
            
            if loader:
                # Clear Parameter Store cache
                loader.refresh_cache()
                logger.info("Parameter Store cache cleared")
            
            # Recreate settings
            self._settings = self.create_settings()
            
            logger.info("✅ Configuration refreshed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error refreshing configuration: {e}")
            return False
    
    async def refresh_configuration_async(self) -> bool:
        """
        Async version of refresh_configuration.
        """
        try:
            loader = self._get_parameter_store_loader()
            
            if loader:
                # Clear Parameter Store cache
                loader.refresh_cache()
                logger.info("Parameter Store cache cleared")
            
            # Recreate settings asynchronously
            self._settings = await self.create_settings_async()
            
            logger.info("✅ Configuration refreshed successfully (async)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error refreshing configuration (async): {e}")
            return False
    
    def get_current_settings(self) -> Optional[Settings]:
        """Get the current settings instance"""
        return self._settings
    
    def get_configuration_info(self) -> Dict[str, Any]:
        """Get information about the current configuration setup"""
        try:
            loader = self._get_parameter_store_loader()
            
            if loader:
                return {
                    "parameter_store_available": loader.is_available(),
                    "environment": loader.environment,
                    "project_name": loader.project_name,
                    "region": loader.region_name,
                    "parameter_prefix": loader.parameter_prefix,
                    "cache_enabled": loader.use_cache,
                    "cache_ttl": loader.cache_ttl,
                    "last_refresh": self._last_refresh,
                    "settings_loaded": self._settings is not None
                }
            else:
                return {
                    "parameter_store_available": False,
                    "environment": os.getenv("ENVIRONMENT", "dev"),
                    "configuration_source": "environment_variables_only",
                    "last_refresh": self._last_refresh,
                    "settings_loaded": self._settings is not None
                }
                
        except Exception as e:
            return {
                "parameter_store_available": False,
                "error": str(e),
                "configuration_source": "environment_variables_only",
                "last_refresh": self._last_refresh,
                "settings_loaded": self._settings is not None
            }

# Global configuration manager instance
_config_manager = ConfigurationManager()

def create_settings() -> Settings:
    """
    Create Settings instance with Parameter Store integration.
    Falls back to environment variables if Parameter Store is not available.
    """
    return _config_manager.create_settings()

async def create_settings_async() -> Settings:
    """
    Async version of create_settings.
    """
    return await _config_manager.create_settings_async()

# Global settings instance
settings = create_settings()

# Configuration refresh functionality
def refresh_configuration() -> bool:
    """
    Refresh configuration by reloading from Parameter Store.
    Useful for runtime configuration updates.
    """
    global settings
    
    success = _config_manager.refresh_configuration()
    if success:
        settings = _config_manager.get_current_settings()
    
    return success

async def refresh_configuration_async() -> bool:
    """
    Async version of refresh_configuration.
    """
    global settings
    
    success = await _config_manager.refresh_configuration_async()
    if success:
        settings = _config_manager.get_current_settings()
    
    return success

def get_configuration_info() -> Dict[str, Any]:
    """
    Get information about the current configuration setup.
    """
    return _config_manager.get_configuration_info()

def validate_runtime_configuration() -> Dict[str, Any]:
    """
    Validate the current runtime configuration.
    Returns validation status and any issues found.
    """
    try:
        from .config.validation import get_configuration_status
        
        status = get_configuration_status()
        status["configuration_info"] = get_configuration_info()
        
        return status
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "configuration_info": get_configuration_info()
        }

def get_secure_configuration_summary() -> Dict[str, Any]:
    """
    Get a summary of configuration without exposing sensitive values.
    Useful for debugging and monitoring.
    """
    if not settings:
        return {"error": "Settings not initialized"}
    
    try:
        # Get non-sensitive configuration info
        summary = {
            "environment": settings.ENVIRONMENT,
            "aws_region": settings.AWS_REGION,
            "algorithm": settings.ALGORITHM,
            "token_expire_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "face_threshold": settings.FACE_THRESHOLD,
            "face_encoding_dimension": settings.FACE_ENCODING_DIMENSION,
            "face_metric": settings.FACE_METRIC,
            "max_file_size": settings.MAX_FILE_SIZE,
            "log_level": settings.LOG_LEVEL,
            "enable_metrics": settings.ENABLE_METRICS,
            "metrics_port": settings.METRICS_PORT,
            "parameter_store_enabled": settings.PARAMETER_STORE_ENABLED,
            "parameter_store_cache_ttl": settings.PARAMETER_STORE_CACHE_TTL,
            "database_config": settings.database_config,
            "redis_config": {
                "pool_size": settings.REDIS_POOL_SIZE,
                "timeout": settings.REDIS_TIMEOUT
            },
            "is_production": settings.is_production(),
            "is_development": settings.is_development()
        }
        
        # Add configuration source info
        config_info = get_configuration_info()
        summary["configuration_source"] = {
            "parameter_store_available": config_info.get("parameter_store_available", False),
            "parameter_store_prefix": config_info.get("parameter_prefix", ""),
            "last_refresh": config_info.get("last_refresh")
        }
        
        return summary
        
    except Exception as e:
        return {
            "error": f"Failed to generate configuration summary: {e}",
            "environment": getattr(settings, 'ENVIRONMENT', 'unknown')
        }