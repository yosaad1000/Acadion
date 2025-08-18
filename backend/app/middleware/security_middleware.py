"""
Security middleware for calendar endpoints and sensitive operations.
Implements rate limiting, input validation, and security headers.
"""

import logging
import time
from typing import Dict, Any, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import json
from datetime import datetime, timedelta

from ..core.security import input_sanitizer, rate_limiter, SecurityError
from ..core.logging_config import get_calendar_logger

logger = get_calendar_logger(__name__)
security = HTTPBearer()


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware for calendar endpoints.
    Implements input sanitization, rate limiting, and security headers.
    """
    
    # Rate limiting configuration
    RATE_LIMITS = {
        "/api/calendar/connect": {"limit": 5, "window": 300},  # 5 requests per 5 minutes
        "/api/calendar/callback": {"limit": 10, "window": 300},  # 10 requests per 5 minutes
        "/api/schedules": {"limit": 100, "window": 3600},  # 100 requests per hour
        "/api/calendar": {"limit": 50, "window": 3600},  # 50 requests per hour
    }
    
    # Endpoints that require input sanitization
    SANITIZE_ENDPOINTS = [
        "/api/schedules",
        "/api/calendar",
    ]
    
    # Security headers to add to all responses
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    }
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security middleware."""
        start_time = time.time()
        
        try:
            # Apply rate limiting
            await self._apply_rate_limiting(request)
            
            # Sanitize input for specific endpoints
            if self._should_sanitize_input(request):
                await self._sanitize_request_input(request)
            
            # Process request
            response = await call_next(request)
            
            # Add security headers
            self._add_security_headers(response)
            
            # Log request metrics
            self._log_request_metrics(request, response, start_time)
            
            return response
            
        except HTTPException as e:
            # Handle security-related HTTP exceptions
            logger.warning(f"Security middleware blocked request: {e.detail}", extra={
                "path": request.url.path,
                "method": request.method,
                "client_ip": self._get_client_ip(request),
                "status_code": e.status_code
            })
            
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail, "error_code": "SECURITY_VIOLATION"}
            )
            self._add_security_headers(response)
            return response
            
        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Security middleware error: {e}", extra={
                "path": request.url.path,
                "method": request.method,
                "client_ip": self._get_client_ip(request)
            }, exc_info=True)
            
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal security error", "error_code": "SECURITY_ERROR"}
            )
            self._add_security_headers(response)
            return response
    
    async def _apply_rate_limiting(self, request: Request) -> None:
        """Apply rate limiting based on endpoint and client."""
        path = request.url.path
        client_ip = self._get_client_ip(request)
        
        # Find matching rate limit configuration
        rate_config = None
        for endpoint_pattern, config in self.RATE_LIMITS.items():
            if path.startswith(endpoint_pattern):
                rate_config = config
                break
        
        if not rate_config:
            return  # No rate limiting for this endpoint
        
        # Create rate limit identifier
        identifier = f"{client_ip}:{path}"
        
        # Check rate limit
        if not rate_limiter.is_allowed(
            identifier=identifier,
            limit=rate_config["limit"],
            window_seconds=rate_config["window"]
        ):
            logger.warning(f"Rate limit exceeded for {client_ip} on {path}", extra={
                "client_ip": client_ip,
                "path": path,
                "rate_limit": rate_config
            })
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {rate_config['limit']} requests per {rate_config['window']} seconds.",
                headers={"Retry-After": str(rate_config["window"])}
            )
    
    def _should_sanitize_input(self, request: Request) -> bool:
        """Check if request input should be sanitized."""
        path = request.url.path
        method = request.method
        
        # Only sanitize POST, PUT, PATCH requests to specific endpoints
        if method not in ["POST", "PUT", "PATCH"]:
            return False
        
        return any(path.startswith(endpoint) for endpoint in self.SANITIZE_ENDPOINTS)
    
    async def _sanitize_request_input(self, request: Request) -> None:
        """Sanitize request input data."""
        if request.headers.get("content-type", "").startswith("application/json"):
            try:
                # Read and parse JSON body
                body = await request.body()
                if body:
                    data = json.loads(body)
                    
                    # Sanitize calendar event data if present
                    if self._is_calendar_event_data(data):
                        sanitized_data = input_sanitizer.sanitize_calendar_event_data(data)
                        
                        # Replace request body with sanitized data
                        sanitized_body = json.dumps(sanitized_data).encode()
                        request._body = sanitized_body
                        
                        logger.debug("Request input sanitized", extra={
                            "path": request.url.path,
                            "original_size": len(body),
                            "sanitized_size": len(sanitized_body)
                        })
                    
            except json.JSONDecodeError:
                logger.warning("Invalid JSON in request body", extra={
                    "path": request.url.path,
                    "content_type": request.headers.get("content-type")
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON format"
                )
            except SecurityError as e:
                logger.warning(f"Input sanitization failed: {e.message}", extra={
                    "path": request.url.path,
                    "error_code": e.error_code,
                    "field": e.field
                })
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid input: {e.message}"
                )
    
    def _is_calendar_event_data(self, data: Dict[str, Any]) -> bool:
        """Check if data contains calendar event fields."""
        calendar_fields = {
            'title', 'description', 'start_datetime', 'end_datetime',
            'attendees', 'location', 'recurrence_pattern'
        }
        return any(field in data for field in calendar_fields)
    
    def _add_security_headers(self, response: Response) -> None:
        """Add security headers to response."""
        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        # Check for forwarded headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    def _log_request_metrics(self, request: Request, response: Response, start_time: float) -> None:
        """Log request metrics for monitoring."""
        duration = time.time() - start_time
        
        logger.info("Request processed", extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "client_ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "content_length": response.headers.get("content-length", 0)
        })


class AuditLogger:
    """
    Audit logging for sensitive calendar operations.
    Tracks all security-relevant actions for compliance and monitoring.
    """
    
    def __init__(self):
        self.logger = get_calendar_logger("audit")
    
    def log_oauth_action(
        self,
        action: str,
        user_id: Optional[int],
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None
    ) -> None:
        """Log OAuth-related actions."""
        self.logger.info(f"OAuth action: {action}", extra={
            "audit_type": "oauth",
            "action": action,
            "user_id": user_id,
            "success": success,
            "client_ip": client_ip,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    
    def log_calendar_operation(
        self,
        operation: str,
        user_id: int,
        resource_type: str,
        resource_id: Optional[str],
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None
    ) -> None:
        """Log calendar operations."""
        self.logger.info(f"Calendar operation: {operation}", extra={
            "audit_type": "calendar_operation",
            "operation": operation,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "success": success,
            "client_ip": client_ip,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    
    def log_schedule_operation(
        self,
        operation: str,
        user_id: int,
        schedule_id: Optional[int],
        success: bool,
        details: Optional[Dict[str, Any]] = None,
        client_ip: Optional[str] = None
    ) -> None:
        """Log schedule operations."""
        self.logger.info(f"Schedule operation: {operation}", extra={
            "audit_type": "schedule_operation",
            "operation": operation,
            "user_id": user_id,
            "schedule_id": schedule_id,
            "success": success,
            "client_ip": client_ip,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    
    def log_security_event(
        self,
        event_type: str,
        severity: str,
        description: str,
        user_id: Optional[int] = None,
        client_ip: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log security events."""
        log_level = logging.WARNING if severity in ["medium", "high"] else logging.INFO
        
        self.logger.log(log_level, f"Security event: {event_type}", extra={
            "audit_type": "security_event",
            "event_type": event_type,
            "severity": severity,
            "description": description,
            "user_id": user_id,
            "client_ip": client_ip,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })


# Global audit logger instance
audit_logger = AuditLogger()