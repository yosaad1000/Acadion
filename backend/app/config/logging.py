"""
Structured logging configuration for Acadion backend services.
Provides JSON-formatted logging with correlation IDs and CloudWatch integration.
"""

import logging
import logging.config
import json
import sys
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from contextvars import ContextVar
from pythonjsonlogger import jsonlogger

# Context variable for correlation ID tracking across requests
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)

class CorrelationIdFilter(logging.Filter):
    """Add correlation ID to log records for request tracing."""
    
    def filter(self, record):
        record.correlation_id = correlation_id.get() or str(uuid.uuid4())
        return True

class StructuredFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional metadata."""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]):
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp in ISO format
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add service information
        log_record['service'] = 'acadion-backend'
        log_record['version'] = '2.0.0'
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add module and function information
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add correlation ID if available
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add request information if available
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'endpoint'):
            log_record['endpoint'] = record.endpoint
        if hasattr(record, 'method'):
            log_record['method'] = record.method
        if hasattr(record, 'status_code'):
            log_record['status_code'] = record.status_code
        if hasattr(record, 'response_time'):
            log_record['response_time'] = record.response_time

def get_log_level() -> str:
    """Get log level from environment or default to INFO."""
    import os
    return os.getenv('LOG_LEVEL', 'INFO').upper()

def setup_logging(log_level: Optional[str] = None) -> None:
    """
    Configure structured logging for the application.
    
    Args:
        log_level: Optional log level override
    """
    if log_level is None:
        log_level = get_log_level()
    
    # Logging configuration
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'structured': {
                '()': StructuredFormatter,
                'format': '%(timestamp)s %(level)s %(service)s %(module)s %(message)s'
            },
            'simple': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            }
        },
        'filters': {
            'correlation_id': {
                '()': CorrelationIdFilter,
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': 'structured',
                'filters': ['correlation_id'],
                'stream': sys.stdout
            },
            'error_console': {
                'class': 'logging.StreamHandler',
                'level': 'ERROR',
                'formatter': 'structured',
                'filters': ['correlation_id'],
                'stream': sys.stderr
            }
        },
        'loggers': {
            # Application loggers
            'app': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'acadion': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            # FastAPI and Uvicorn loggers
            'uvicorn': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False
            },
            'uvicorn.access': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False
            },
            'fastapi': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False
            },
            # Third-party library loggers (reduce noise)
            'httpx': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            },
            'boto3': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            },
            'botocore': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            },
            'urllib3': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            }
        },
        'root': {
            'level': log_level,
            'handlers': ['console', 'error_console']
        }
    }
    
    logging.config.dictConfig(config)

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with structured formatting.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

def set_correlation_id(correlation_id_value: str) -> None:
    """Set correlation ID for the current context."""
    correlation_id.set(correlation_id_value)

def get_correlation_id() -> Optional[str]:
    """Get current correlation ID."""
    return correlation_id.get()

def log_request_start(logger: logging.Logger, method: str, endpoint: str, user_id: Optional[str] = None) -> str:
    """
    Log the start of a request and return a request ID.
    
    Args:
        logger: Logger instance
        method: HTTP method
        endpoint: Request endpoint
        user_id: Optional user ID
    
    Returns:
        Generated request ID
    """
    request_id = str(uuid.uuid4())
    
    logger.info(
        "Request started",
        extra={
            'request_id': request_id,
            'method': method,
            'endpoint': endpoint,
            'user_id': user_id,
            'event_type': 'request_start'
        }
    )
    
    return request_id

def log_request_end(
    logger: logging.Logger,
    request_id: str,
    status_code: int,
    response_time: float,
    method: str,
    endpoint: str,
    user_id: Optional[str] = None
) -> None:
    """
    Log the end of a request.
    
    Args:
        logger: Logger instance
        request_id: Request ID from log_request_start
        status_code: HTTP status code
        response_time: Response time in seconds
        method: HTTP method
        endpoint: Request endpoint
        user_id: Optional user ID
    """
    logger.info(
        "Request completed",
        extra={
            'request_id': request_id,
            'method': method,
            'endpoint': endpoint,
            'status_code': status_code,
            'response_time': response_time,
            'user_id': user_id,
            'event_type': 'request_end'
        }
    )

def log_business_event(
    logger: logging.Logger,
    event_type: str,
    event_data: Dict[str, Any],
    user_id: Optional[str] = None
) -> None:
    """
    Log a business event with structured data.
    
    Args:
        logger: Logger instance
        event_type: Type of business event
        event_data: Event-specific data
        user_id: Optional user ID
    """
    logger.info(
        f"Business event: {event_type}",
        extra={
            'event_type': event_type,
            'event_data': event_data,
            'user_id': user_id
        }
    )

def log_error_with_context(
    logger: logging.Logger,
    error: Exception,
    context: Dict[str, Any],
    user_id: Optional[str] = None
) -> None:
    """
    Log an error with additional context.
    
    Args:
        logger: Logger instance
        error: Exception that occurred
        context: Additional context information
        user_id: Optional user ID
    """
    logger.error(
        f"Error occurred: {str(error)}",
        extra={
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'user_id': user_id,
            'event_type': 'error'
        },
        exc_info=True
    )

# Initialize logging on module import
setup_logging()