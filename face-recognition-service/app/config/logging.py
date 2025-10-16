"""
Structured logging configuration for Face Recognition microservice.
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
        log_record['service'] = 'acadion-face-recognition'
        log_record['version'] = '1.0.0'
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add module and function information
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add correlation ID if available
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add face processing specific fields
        if hasattr(record, 'processing_time'):
            log_record['processing_time'] = record.processing_time
        if hasattr(record, 'faces_detected'):
            log_record['faces_detected'] = record.faces_detected
        if hasattr(record, 'image_size'):
            log_record['image_size'] = record.image_size

def get_log_level() -> str:
    """Get log level from environment or default to INFO."""
    import os
    return os.getenv('LOG_LEVEL', 'INFO').upper()

def setup_logging(log_level: Optional[str] = None) -> None:
    """
    Configure structured logging for the face recognition service.
    
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
            }
        },
        'loggers': {
            'app': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False
            },
            'uvicorn': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False
            },
            'fastapi': {
                'level': 'INFO',
                'handlers': ['console'],
                'propagate': False
            }
        },
        'root': {
            'level': log_level,
            'handlers': ['console']
        }
    }
    
    logging.config.dictConfig(config)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with structured formatting."""
    return logging.getLogger(name)

def set_correlation_id(correlation_id_value: str) -> None:
    """Set correlation ID for the current context."""
    correlation_id.set(correlation_id_value)

def get_correlation_id() -> Optional[str]:
    """Get current correlation ID."""
    return correlation_id.get()

def log_face_processing_event(
    logger: logging.Logger,
    event_type: str,
    processing_time: float,
    faces_detected: int,
    image_size: Optional[tuple] = None
) -> None:
    """
    Log a face processing event with metrics.
    
    Args:
        logger: Logger instance
        event_type: Type of processing event
        processing_time: Time taken for processing
        faces_detected: Number of faces detected
        image_size: Optional image dimensions
    """
    logger.info(
        f"Face processing: {event_type}",
        extra={
            'event_type': event_type,
            'processing_time': processing_time,
            'faces_detected': faces_detected,
            'image_size': image_size
        }
    )

# Initialize logging on module import
setup_logging()