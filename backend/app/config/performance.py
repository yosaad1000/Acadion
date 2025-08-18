"""
Performance optimization configuration for the backend
"""
import os
from typing import Dict, Any

class PerformanceConfig:
    """Configuration for performance optimizations"""
    
    # Cache settings
    CACHE_TTL = {
        'student_count': int(os.getenv('CACHE_TTL_STUDENT_COUNT', 300)),      # 5 minutes
        'subject_data': int(os.getenv('CACHE_TTL_SUBJECT_DATA', 600)),        # 10 minutes
        'user_data': int(os.getenv('CACHE_TTL_USER_DATA', 900)),              # 15 minutes
        'attendance_stats': int(os.getenv('CACHE_TTL_ATTENDANCE_STATS', 180)), # 3 minutes
        'dashboard_data': int(os.getenv('CACHE_TTL_DASHBOARD_DATA', 120))     # 2 minutes
    }
    
    # Connection pool settings
    MAX_KEEPALIVE_CONNECTIONS = int(os.getenv('MAX_KEEPALIVE_CONNECTIONS', 20))
    MAX_CONNECTIONS = int(os.getenv('MAX_CONNECTIONS', 100))
    CONNECTION_TIMEOUT = float(os.getenv('CONNECTION_TIMEOUT', 30.0))
    CONNECT_TIMEOUT = float(os.getenv('CONNECT_TIMEOUT', 10.0))
    
    # Cache size limits
    MAX_CACHE_SIZE = int(os.getenv('MAX_CACHE_SIZE', 1000))
    CACHE_CLEANUP_THRESHOLD = int(os.getenv('CACHE_CLEANUP_THRESHOLD', 200))
    
    # Performance monitoring
    SLOW_QUERY_THRESHOLD_MS = int(os.getenv('SLOW_QUERY_THRESHOLD_MS', 100))
    ENABLE_PERFORMANCE_LOGGING = os.getenv('ENABLE_PERFORMANCE_LOGGING', 'true').lower() == 'true'
    
    # Database query limits
    DEFAULT_QUERY_LIMIT = int(os.getenv('DEFAULT_QUERY_LIMIT', 1000))
    ATTENDANCE_RECORDS_LIMIT = int(os.getenv('ATTENDANCE_RECORDS_LIMIT', 5000))
    
    # Batch processing settings
    BATCH_SIZE_STUDENT_COUNTS = int(os.getenv('BATCH_SIZE_STUDENT_COUNTS', 50))
    BATCH_SIZE_ATTENDANCE_PROCESSING = int(os.getenv('BATCH_SIZE_ATTENDANCE_PROCESSING', 100))
    
    @classmethod
    def get_cache_config(cls) -> Dict[str, Any]:
        """Get cache configuration"""
        return {
            'ttl': cls.CACHE_TTL,
            'max_size': cls.MAX_CACHE_SIZE,
            'cleanup_threshold': cls.CACHE_CLEANUP_THRESHOLD
        }
    
    @classmethod
    def get_connection_config(cls) -> Dict[str, Any]:
        """Get HTTP connection configuration"""
        return {
            'max_keepalive_connections': cls.MAX_KEEPALIVE_CONNECTIONS,
            'max_connections': cls.MAX_CONNECTIONS,
            'timeout': cls.CONNECTION_TIMEOUT,
            'connect_timeout': cls.CONNECT_TIMEOUT
        }
    
    @classmethod
    def get_monitoring_config(cls) -> Dict[str, Any]:
        """Get performance monitoring configuration"""
        return {
            'slow_query_threshold_ms': cls.SLOW_QUERY_THRESHOLD_MS,
            'enable_logging': cls.ENABLE_PERFORMANCE_LOGGING
        }

# Environment-specific optimizations
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

if ENVIRONMENT == 'production':
    # Production optimizations
    PerformanceConfig.CACHE_TTL['student_count'] = 600  # 10 minutes in production
    PerformanceConfig.CACHE_TTL['subject_data'] = 1200  # 20 minutes in production
    PerformanceConfig.MAX_CONNECTIONS = 200
    PerformanceConfig.SLOW_QUERY_THRESHOLD_MS = 50  # Stricter in production
elif ENVIRONMENT == 'development':
    # Development settings for faster iteration
    PerformanceConfig.CACHE_TTL['student_count'] = 60   # 1 minute in development
    PerformanceConfig.CACHE_TTL['dashboard_data'] = 30  # 30 seconds in development
    PerformanceConfig.ENABLE_PERFORMANCE_LOGGING = True