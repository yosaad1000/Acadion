"""
AWS X-Ray tracing configuration for Face Recognition microservice.
"""

import os
from aws_xray_sdk.core import xray_recorder, patch_all
from aws_xray_sdk.ext.fastapi import XRayMiddleware
from fastapi import FastAPI
from app.config.logging import get_logger

logger = get_logger(__name__)

def is_xray_enabled() -> bool:
    """Check if X-Ray tracing is enabled."""
    return os.getenv('XRAY_ENABLED', 'false').lower() == 'true'

def configure_xray() -> None:
    """Configure X-Ray SDK for face recognition service."""
    if not is_xray_enabled():
        logger.info("X-Ray tracing is disabled")
        return
    
    try:
        # Configure X-Ray recorder
        xray_recorder.configure(
            service='acadion-face-recognition',
            dynamic_naming='*.acadion.com',
            plugins=('ECSPlugin', 'EC2Plugin'),
            daemon_address=os.getenv('XRAY_DAEMON_ADDRESS', '127.0.0.1:2000'),
            use_ssl=False
        )
        
        # Patch libraries for automatic tracing
        libraries_to_patch = ['httpx', 'requests']
        patch_all(libraries_to_patch)
        
        logger.info("X-Ray tracing configured successfully for face recognition service")
        
    except Exception as e:
        logger.error(f"Failed to configure X-Ray: {e}")

def add_xray_middleware(app: FastAPI) -> None:
    """Add X-Ray middleware to FastAPI application."""
    if not is_xray_enabled():
        return
    
    try:
        app.add_middleware(XRayMiddleware)
        logger.info("X-Ray middleware added to face recognition service")
    except Exception as e:
        logger.error(f"Failed to add X-Ray middleware: {e}")

def trace_face_processing(func):
    """Decorator for tracing face processing operations."""
    def wrapper(*args, **kwargs):
        if not is_xray_enabled():
            return func(*args, **kwargs)
        
        with xray_recorder.in_subsegment('face_processing') as subsegment:
            if subsegment:
                subsegment.put_annotation('service', 'face-recognition')
                subsegment.put_annotation('operation', 'process_faces')
            
            result = func(*args, **kwargs)
            
            if subsegment and hasattr(result, 'faces_detected'):
                subsegment.put_annotation('faces_detected', result.faces_detected)
            
            return result
    return wrapper

def add_processing_metadata(faces_detected: int, processing_time: float, image_size: tuple) -> None:
    """Add face processing metadata to current X-Ray segment."""
    if not is_xray_enabled():
        return
    
    try:
        xray_recorder.put_metadata('face_processing', {
            'faces_detected': faces_detected,
            'processing_time': processing_time,
            'image_width': image_size[0] if image_size else None,
            'image_height': image_size[1] if image_size else None
        })
    except Exception as e:
        logger.debug(f"Failed to add X-Ray metadata: {e}")