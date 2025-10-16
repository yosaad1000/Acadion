"""
AWS X-Ray tracing configuration for distributed tracing across microservices.
"""

import os
from typing import Optional
from aws_xray_sdk.core import xray_recorder, patch_all
from aws_xray_sdk.core.context import Context
from aws_xray_sdk.core.models import http
# Note: aws_xray_sdk.ext.fastapi doesn't exist, we'll use custom middleware
from fastapi import FastAPI, Request
from app.config.logging import get_logger

logger = get_logger(__name__)

def is_xray_enabled() -> bool:
    """Check if X-Ray tracing is enabled."""
    return os.getenv('XRAY_ENABLED', 'false').lower() == 'true'

def configure_xray() -> None:
    """Configure X-Ray SDK with appropriate settings."""
    if not is_xray_enabled():
        logger.info("X-Ray tracing is disabled")
        return
    
    try:
        # Configure X-Ray recorder
        xray_recorder.configure(
            service='acadion-backend',
            dynamic_naming='*.acadion.com',
            plugins=('ECSPlugin', 'EC2Plugin'),
            daemon_address=os.getenv('XRAY_DAEMON_ADDRESS', '127.0.0.1:2000'),
            use_ssl=False
        )
        
        # Patch libraries for automatic tracing
        libraries_to_patch = ['httpx', 'boto3', 'botocore', 'requests']
        patch_all(libraries_to_patch)
        
        logger.info("X-Ray tracing configured successfully")
        
    except Exception as e:
        logger.error(f"Failed to configure X-Ray: {e}")
        # Don't fail the application if X-Ray setup fails
        pass

def add_xray_middleware(app: FastAPI) -> None:
    """Add X-Ray middleware to FastAPI application."""
    if not is_xray_enabled():
        return
    
    try:
        # Use our custom X-Ray middleware instead of the non-existent FastAPI extension
        app.add_middleware(XRayRequestMiddleware)
        logger.info("X-Ray middleware added to FastAPI application")
    except Exception as e:
        logger.error(f"Failed to add X-Ray middleware: {e}")

def create_subsegment(name: str, namespace: str = 'local'):
    """
    Create a subsegment for custom tracing.
    
    Args:
        name: Name of the subsegment
        namespace: Namespace for the subsegment
    
    Returns:
        Subsegment context manager or None if X-Ray is disabled
    """
    if not is_xray_enabled():
        return None
    
    try:
        return xray_recorder.in_subsegment(name, namespace=namespace)
    except Exception as e:
        logger.error(f"Failed to create X-Ray subsegment: {e}")
        return None

def add_annotation(key: str, value: str) -> None:
    """
    Add annotation to current X-Ray segment.
    
    Args:
        key: Annotation key
        value: Annotation value
    """
    if not is_xray_enabled():
        return
    
    try:
        xray_recorder.put_annotation(key, value)
    except Exception as e:
        logger.debug(f"Failed to add X-Ray annotation: {e}")

def add_metadata(key: str, value: dict, namespace: str = 'default') -> None:
    """
    Add metadata to current X-Ray segment.
    
    Args:
        key: Metadata key
        value: Metadata dictionary
        namespace: Metadata namespace
    """
    if not is_xray_enabled():
        return
    
    try:
        xray_recorder.put_metadata(key, value, namespace)
    except Exception as e:
        logger.debug(f"Failed to add X-Ray metadata: {e}")

def trace_face_recognition_request(user_id: Optional[str] = None):
    """
    Decorator for tracing face recognition requests.
    
    Args:
        user_id: Optional user ID for tracing
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not is_xray_enabled():
                return func(*args, **kwargs)
            
            with xray_recorder.in_subsegment('face_recognition_request') as subsegment:
                if subsegment:
                    subsegment.put_annotation('service', 'face-recognition')
                    if user_id:
                        subsegment.put_annotation('user_id', user_id)
                
                return func(*args, **kwargs)
        return wrapper
    return decorator

def trace_database_operation(operation: str, table: str):
    """
    Decorator for tracing database operations.
    
    Args:
        operation: Database operation (SELECT, INSERT, UPDATE, DELETE)
        table: Database table name
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not is_xray_enabled():
                return func(*args, **kwargs)
            
            with xray_recorder.in_subsegment(f'database_{operation.lower()}') as subsegment:
                if subsegment:
                    subsegment.put_annotation('operation', operation)
                    subsegment.put_annotation('table', table)
                    subsegment.put_annotation('database', 'supabase')
                
                return func(*args, **kwargs)
        return wrapper
    return decorator

def trace_external_service_call(service_name: str, endpoint: str):
    """
    Decorator for tracing external service calls.
    
    Args:
        service_name: Name of the external service
        endpoint: Service endpoint
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not is_xray_enabled():
                return func(*args, **kwargs)
            
            with xray_recorder.in_subsegment(f'external_{service_name}') as subsegment:
                if subsegment:
                    subsegment.put_annotation('service', service_name)
                    subsegment.put_annotation('endpoint', endpoint)
                
                return func(*args, **kwargs)
        return wrapper
    return decorator

class XRayRequestMiddleware:
    """Custom middleware to add request-specific X-Ray annotations."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if not is_xray_enabled() or scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Add request annotations
        add_annotation('http.method', request.method)
        add_annotation('http.url', str(request.url))
        
        # Add user information if available
        if hasattr(request.state, 'user') and request.state.user:
            add_annotation('user.id', str(request.state.user.id))
            add_annotation('user.role', getattr(request.state.user, 'role', 'unknown'))
        
        # Add correlation ID if available
        correlation_id = request.headers.get('X-Correlation-ID')
        if correlation_id:
            add_annotation('correlation_id', correlation_id)
        
        await self.app(scope, receive, send)