"""
Logging middleware for request/response tracking and correlation ID management.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config.logging import (
    get_logger,
    set_correlation_id,
    log_request_start,
    log_request_end
)
from app.services.cloudwatch_metrics import get_cloudwatch_metrics

logger = get_logger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle request logging and correlation ID tracking."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract correlation ID
        correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        set_correlation_id(correlation_id)
        
        # Extract user information if available
        user_id = None
        if hasattr(request.state, 'user') and request.state.user:
            user_id = getattr(request.state.user, 'id', None)
        
        # Log request start
        start_time = time.time()
        request_id = log_request_start(
            logger=logger,
            method=request.method,
            endpoint=str(request.url.path),
            user_id=user_id
        )
        
        # Store request ID in request state for use in route handlers
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Add correlation ID to response headers
            response.headers['X-Correlation-ID'] = correlation_id
            
            # Log request completion
            log_request_end(
                logger=logger,
                request_id=request_id,
                status_code=response.status_code,
                response_time=response_time,
                method=request.method,
                endpoint=str(request.url.path),
                user_id=user_id
            )
            
            # Record metrics to CloudWatch
            get_cloudwatch_metrics().record_api_request(
                endpoint=str(request.url.path),
                method=request.method,
                status_code=response.status_code,
                response_time=response_time
            )
            
            return response
            
        except Exception as e:
            # Calculate response time for error case
            response_time = time.time() - start_time
            
            # Log error
            logger.error(
                f"Request failed: {str(e)}",
                extra={
                    'request_id': request_id,
                    'method': request.method,
                    'endpoint': str(request.url.path),
                    'response_time': response_time,
                    'user_id': user_id,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'event_type': 'request_error'
                },
                exc_info=True
            )
            
            # Re-raise the exception
            raise