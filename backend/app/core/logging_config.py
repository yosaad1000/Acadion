"""
Structured logging configuration for calendar operations and system monitoring.
Provides comprehensive logging with structured formats, error tracking, and performance metrics.
"""

import logging
import logging.config
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

from ..config import settings


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs for better parsing and analysis.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        
        # Base log structure
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info)
            }
        
        # Add extra fields from the log record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in [
                'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename',
                'module', 'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                'thread', 'threadName', 'processName', 'process', 'getMessage',
                'exc_info', 'exc_text', 'stack_info'
            ]:
                extra_fields[key] = value
        
        if extra_fields:
            log_entry["extra"] = extra_fields
        
        return json.dumps(log_entry, default=str, ensure_ascii=False)


class CalendarOperationFilter(logging.Filter):
    """
    Filter to identify and enrich calendar-related log records.
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add calendar operation context to log records."""
        
        # Check if this is a calendar-related log
        calendar_modules = [
            'app.services.calendar_service',
            'app.services.oauth_service',
            'app.services.scheduling_service',
            'app.services.sync_service',
            'app.routers.calendar',
            'app.routers.scheduling'
        ]
        
        if record.name in calendar_modules:
            record.operation_type = "calendar"
            
            # Extract operation details from message
            message = record.getMessage().lower()
            if "oauth" in message or "auth" in message:
                record.operation_category = "authentication"
            elif "sync" in message:
                record.operation_category = "synchronization"
            elif "event" in message:
                record.operation_category = "event_management"
            elif "schedule" in message:
                record.operation_category = "scheduling"
            else:
                record.operation_category = "general"
        
        return True


def setup_logging() -> None:
    """
    Configure structured logging for the application.
    Sets up different log levels, formatters, and handlers for comprehensive monitoring.
    """
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Logging configuration
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
            },
            "simple": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        },
        "filters": {
            "calendar_filter": {
                "()": CalendarOperationFilter,
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "simple",
                "stream": sys.stdout,
                "filters": ["calendar_filter"]
            },
            "file_all": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "DEBUG",
                "formatter": "structured",
                "filename": "logs/application.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "filters": ["calendar_filter"]
            },
            "file_calendar": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "DEBUG",
                "formatter": "structured",
                "filename": "logs/calendar_operations.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 10,
                "filters": ["calendar_filter"]
            },
            "file_errors": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "structured",
                "filename": "logs/errors.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 10,
                "filters": ["calendar_filter"]
            }
        },
        "loggers": {
            # Calendar-specific loggers
            "app.services.calendar_service": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            "app.services.oauth_service": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            "app.services.scheduling_service": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            "app.services.sync_service": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            "app.routers.calendar": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            "app.routers.scheduling": {
                "level": "DEBUG",
                "handlers": ["console", "file_all", "file_calendar", "file_errors"],
                "propagate": False
            },
            # Root logger
            "": {
                "level": "INFO",
                "handlers": ["console", "file_all", "file_errors"]
            }
        }
    }
    
    # Apply logging configuration
    logging.config.dictConfig(logging_config)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info("Structured logging configured successfully", extra={
        "component": "logging_system",
        "action": "startup"
    })


def get_calendar_logger(name: str) -> logging.Logger:
    """
    Get a logger specifically configured for calendar operations.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        logging.Logger: Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Add calendar-specific context
    def log_calendar_operation(level: int, message: str, **kwargs):
        """Log calendar operation with structured context."""
        extra = kwargs.pop('extra', {})
        extra.update({
            'component': 'calendar_system',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })
        logger.log(level, message, extra=extra, **kwargs)
    
    # Add convenience methods
    logger.log_calendar_operation = log_calendar_operation
    
    return logger


class PerformanceLogger:
    """
    Context manager for logging performance metrics of calendar operations.
    """
    
    def __init__(self, logger: logging.Logger, operation: str, **context):
        self.logger = logger
        self.operation = operation
        self.context = context
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        self.logger.info(f"Starting {self.operation}", extra={
            'operation': self.operation,
            'action': 'start',
            'start_time': self.start_time.isoformat() + 'Z',
            **self.context
        })
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = datetime.utcnow()
        duration = (end_time - self.start_time).total_seconds()
        
        if exc_type is None:
            # Success
            self.logger.info(f"Completed {self.operation}", extra={
                'operation': self.operation,
                'action': 'complete',
                'duration_seconds': duration,
                'start_time': self.start_time.isoformat() + 'Z',
                'end_time': end_time.isoformat() + 'Z',
                'status': 'success',
                **self.context
            })
        else:
            # Error
            self.logger.error(f"Failed {self.operation}", extra={
                'operation': self.operation,
                'action': 'error',
                'duration_seconds': duration,
                'start_time': self.start_time.isoformat() + 'Z',
                'end_time': end_time.isoformat() + 'Z',
                'status': 'error',
                'error_type': exc_type.__name__ if exc_type else None,
                'error_message': str(exc_val) if exc_val else None,
                **self.context
            })


def log_calendar_metrics(logger: logging.Logger, metrics: Dict[str, Any]) -> None:
    """
    Log calendar operation metrics in a structured format.
    
    Args:
        logger: Logger instance
        metrics: Dictionary of metrics to log
    """
    logger.info("Calendar operation metrics", extra={
        'component': 'calendar_metrics',
        'metrics': metrics,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    })


def log_api_error(
    logger: logging.Logger,
    error: Exception,
    operation: str,
    user_id: Optional[int] = None,
    **context
) -> None:
    """
    Log API errors with structured context for debugging and monitoring.
    
    Args:
        logger: Logger instance
        error: Exception that occurred
        operation: Operation that failed
        user_id: User ID if applicable
        **context: Additional context information
    """
    error_context = {
        'component': 'api_error',
        'operation': operation,
        'error_type': type(error).__name__,
        'error_message': str(error),
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    
    if user_id:
        error_context['user_id'] = user_id
    
    error_context.update(context)
    
    logger.error(f"API error in {operation}: {error}", extra=error_context, exc_info=True)