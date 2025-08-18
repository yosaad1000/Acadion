"""
Health check endpoints for calendar service monitoring.
Provides comprehensive health status for calendar services and dependencies.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from ..models.user import UserResponse
from ..services.graceful_degradation import graceful_degradation, ServiceStatus
from ..services.retry_queue import retry_queue_service
from ..services.oauth_service import oauth_service
from ..services.monitoring_service import monitoring_service
from ..core.logging_config import get_calendar_logger, PerformanceLogger
from ..routers.auth import get_current_user

logger = get_calendar_logger(__name__)

router = APIRouter()


class ServiceHealthResponse(BaseModel):
    """Response model for service health."""
    service: str
    status: str
    last_check: datetime
    error_count: int
    last_error: Optional[str]
    response_time: Optional[float]


class SystemHealthResponse(BaseModel):
    """Response model for overall system health."""
    status: str
    timestamp: datetime
    services: Dict[str, ServiceHealthResponse]
    degraded_mode: bool
    retry_queue: Dict[str, Any]
    uptime_seconds: float


class CalendarServiceHealthResponse(BaseModel):
    """Response model for calendar service specific health."""
    google_calendar_api: ServiceHealthResponse
    oauth_service: Dict[str, Any]
    database_connection: Dict[str, Any]
    retry_queue: Dict[str, Any]
    local_fallback: Dict[str, Any]


# Track service start time for uptime calculation
SERVICE_START_TIME = datetime.utcnow()


@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health() -> SystemHealthResponse:
    """
    Get overall system health status.
    
    This endpoint provides a comprehensive health check of all calendar-related services
    and dependencies. It's designed for monitoring systems and load balancers.
    
    Returns:
        SystemHealthResponse: Overall system health information
    """
    
    with PerformanceLogger(logger, "system_health_check"):
        
        try:
            # Check all services
            google_calendar_health = await graceful_degradation.check_service_health('google_calendar')
            retry_queue_status = await retry_queue_service.get_queue_status()
            
            # Determine overall status
            overall_status = "healthy"
            if graceful_degradation.degraded_mode:
                overall_status = "degraded"
            elif google_calendar_health.status == ServiceStatus.UNAVAILABLE:
                overall_status = "unhealthy"
            
            # Calculate uptime
            uptime = (datetime.utcnow() - SERVICE_START_TIME).total_seconds()
            
            # Build service health responses
            services = {
                "google_calendar": ServiceHealthResponse(
                    service="google_calendar",
                    status=google_calendar_health.status.value,
                    last_check=google_calendar_health.last_check,
                    error_count=google_calendar_health.error_count,
                    last_error=google_calendar_health.last_error,
                    response_time=google_calendar_health.response_time
                )
            }
            
            response = SystemHealthResponse(
                status=overall_status,
                timestamp=datetime.utcnow(),
                services=services,
                degraded_mode=graceful_degradation.degraded_mode,
                retry_queue=retry_queue_status,
                uptime_seconds=uptime
            )
            
            logger.info("System health check completed", extra={
                'overall_status': overall_status,
                'degraded_mode': graceful_degradation.degraded_mode,
                'uptime_seconds': uptime
            })
            
            return response
            
        except Exception as error:
            logger.error("System health check failed", extra={
                'error': str(error)
            })
            
            # Return unhealthy status on error
            return SystemHealthResponse(
                status="unhealthy",
                timestamp=datetime.utcnow(),
                services={},
                degraded_mode=True,
                retry_queue={'error': str(error)},
                uptime_seconds=(datetime.utcnow() - SERVICE_START_TIME).total_seconds()
            )


@router.get("/health/calendar", response_model=CalendarServiceHealthResponse)
async def get_calendar_service_health() -> CalendarServiceHealthResponse:
    """
    Get detailed calendar service health status.
    
    This endpoint provides detailed health information specifically for calendar-related
    services including Google Calendar API, OAuth, database, and retry queue.
    
    Returns:
        CalendarServiceHealthResponse: Detailed calendar service health
    """
    
    with PerformanceLogger(logger, "calendar_service_health_check"):
        
        try:
            # Check Google Calendar API health
            google_calendar_health = await graceful_degradation.check_service_health('google_calendar')
            
            # Check OAuth service health
            oauth_health = await _check_oauth_service_health()
            
            # Check database connection health
            database_health = await _check_database_health()
            
            # Get retry queue status
            retry_queue_status = await retry_queue_service.get_queue_status()
            
            # Check local fallback functionality
            local_fallback_health = await _check_local_fallback_health()
            
            response = CalendarServiceHealthResponse(
                google_calendar_api=ServiceHealthResponse(
                    service="google_calendar_api",
                    status=google_calendar_health.status.value,
                    last_check=google_calendar_health.last_check,
                    error_count=google_calendar_health.error_count,
                    last_error=google_calendar_health.last_error,
                    response_time=google_calendar_health.response_time
                ),
                oauth_service=oauth_health,
                database_connection=database_health,
                retry_queue=retry_queue_status,
                local_fallback=local_fallback_health
            )
            
            logger.info("Calendar service health check completed", extra={
                'google_calendar_status': google_calendar_health.status.value,
                'oauth_status': oauth_health.get('status'),
                'database_status': database_health.get('status'),
                'retry_queue_operations': retry_queue_status.get('total_operations', 0)
            })
            
            return response
            
        except Exception as error:
            logger.error("Calendar service health check failed", extra={
                'error': str(error)
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check calendar service health"
            )


@router.get("/health/user/{user_id}")
async def get_user_calendar_health(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get calendar health status for a specific user.
    
    This endpoint checks the calendar connection and sync status for a specific user.
    Only accessible by the user themselves or administrators.
    
    Args:
        user_id: User ID to check
        current_user: Current authenticated user
        
    Returns:
        dict: User-specific calendar health information
        
    Raises:
        HTTPException: If user doesn't have permission or health check fails
    """
    
    # Check permissions
    if current_user.user_id != user_id and current_user.user_type.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to check this user's calendar health"
        )
    
    with PerformanceLogger(logger, "user_calendar_health_check", user_id=user_id):
        
        try:
            # Check user's calendar connection status
            connection_status = await oauth_service.get_connection_status(user_id)
            
            # Check if user has any pending retry operations
            user_retry_operations = await _get_user_retry_operations(user_id)
            
            # Check last sync status
            last_sync_info = await _get_user_last_sync_info(user_id)
            
            # Determine overall user calendar health
            user_health_status = "healthy"
            issues = []
            
            if not connection_status.get("is_connected"):
                user_health_status = "disconnected"
                issues.append("Google Calendar not connected")
            elif connection_status.get("error"):
                user_health_status = "error"
                issues.append(f"Connection error: {connection_status['error']}")
            elif user_retry_operations.get("failed_operations", 0) > 0:
                user_health_status = "degraded"
                issues.append(f"{user_retry_operations['failed_operations']} failed operations")
            
            response = {
                "user_id": user_id,
                "status": user_health_status,
                "timestamp": datetime.utcnow().isoformat(),
                "issues": issues,
                "calendar_connection": connection_status,
                "retry_operations": user_retry_operations,
                "last_sync": last_sync_info,
                "recommendations": _get_user_health_recommendations(
                    user_health_status, 
                    connection_status, 
                    user_retry_operations
                )
            }
            
            logger.info(f"User calendar health check completed", extra={
                'user_id': user_id,
                'status': user_health_status,
                'is_connected': connection_status.get("is_connected", False),
                'pending_operations': user_retry_operations.get("pending_operations", 0)
            })
            
            return response
            
        except Exception as error:
            logger.error(f"User calendar health check failed", extra={
                'user_id': user_id,
                'error': str(error)
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check user calendar health"
            )


@router.get("/health/monitoring")
async def get_monitoring_status() -> Dict[str, Any]:
    """
    Get comprehensive monitoring status for calendar services.
    
    This endpoint provides detailed monitoring information including health checks,
    metrics, and alerting status for all calendar-related services.
    
    Returns:
        dict: Comprehensive monitoring status
    """
    try:
        status = await monitoring_service.get_service_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get monitoring status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve monitoring status"
        )


@router.post("/health/test-connection")
async def test_calendar_connection(
    current_user: UserResponse = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Test the current user's calendar connection.
    
    This endpoint performs a live test of the user's Google Calendar connection
    by making a simple API call to verify connectivity and token validity.
    
    Returns:
        dict: Connection test results
        
    Raises:
        HTTPException: If connection test fails
    """
    
    with PerformanceLogger(logger, "test_calendar_connection", user_id=current_user.user_id):
        
        try:
            # Check connection status first
            connection_status = await oauth_service.get_connection_status(current_user.user_id)
            
            if not connection_status.get("is_connected"):
                return {
                    "success": False,
                    "message": "Google Calendar is not connected",
                    "test_results": {
                        "connection_exists": False,
                        "token_valid": False,
                        "api_accessible": False
                    },
                    "recommendations": [
                        "Connect your Google Calendar in settings",
                        "Ensure you grant all required permissions"
                    ]
                }
            
            # Test token validity
            token = await oauth_service.get_valid_token(current_user.user_id)
            token_valid = token is not None
            
            # Test API accessibility
            api_accessible = False
            api_error = None
            
            if token_valid:
                try:
                    from ..services.calendar_service import CalendarService
                    calendar_service = CalendarService()
                    
                    # Try to get a small list of events (this tests API access)
                    start_date = datetime.utcnow()
                    end_date = start_date + timedelta(days=1)
                    
                    events = await calendar_service.get_events(
                        current_user.user_id,
                        start_date,
                        end_date
                    )
                    
                    api_accessible = True
                    
                except Exception as api_error_exc:
                    api_error = str(api_error_exc)
            
            # Determine overall test result
            success = connection_status.get("is_connected") and token_valid and api_accessible
            
            test_results = {
                "connection_exists": connection_status.get("is_connected", False),
                "token_valid": token_valid,
                "api_accessible": api_accessible,
                "calendar_id": connection_status.get("calendar_id"),
                "connected_at": connection_status.get("connected_at")
            }
            
            if api_error:
                test_results["api_error"] = api_error
            
            # Generate recommendations based on test results
            recommendations = []
            if not test_results["connection_exists"]:
                recommendations.append("Connect your Google Calendar")
            elif not test_results["token_valid"]:
                recommendations.append("Reconnect your Google Calendar (token expired)")
            elif not test_results["api_accessible"]:
                recommendations.append("Check Google Calendar permissions")
                if api_error:
                    recommendations.append(f"API Error: {api_error}")
            else:
                recommendations.append("Calendar connection is working properly")
            
            response = {
                "success": success,
                "message": "Calendar connection is working" if success else "Calendar connection has issues",
                "test_results": test_results,
                "recommendations": recommendations,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Calendar connection test completed", extra={
                'user_id': current_user.user_id,
                'success': success,
                'token_valid': token_valid,
                'api_accessible': api_accessible
            })
            
            return response
            
        except Exception as error:
            logger.error("Calendar connection test failed", extra={
                'user_id': current_user.user_id,
                'error': str(error)
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to test calendar connection"
            )


# Helper functions

async def _check_oauth_service_health() -> Dict[str, Any]:
    """Check OAuth service health."""
    try:
        # Test OAuth service by checking configuration
        from ..services.oauth_service import oauth_service
        
        # Basic configuration check
        has_config = all([
            oauth_service.client_id,
            oauth_service.client_secret,
            oauth_service.redirect_uri
        ])
        
        return {
            "status": "healthy" if has_config else "misconfigured",
            "configuration_valid": has_config,
            "last_check": datetime.utcnow().isoformat()
        }
        
    except Exception as error:
        return {
            "status": "error",
            "error": str(error),
            "last_check": datetime.utcnow().isoformat()
        }


async def _check_database_health() -> Dict[str, Any]:
    """Check database connection health."""
    try:
        from ..services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        # Test database connection with a simple query
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/",
                headers=db.headers
            )
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "response_time": response.elapsed.total_seconds() if hasattr(response, 'elapsed') else None,
                    "last_check": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "last_check": datetime.utcnow().isoformat()
                }
                
    except Exception as error:
        return {
            "status": "error",
            "error": str(error),
            "last_check": datetime.utcnow().isoformat()
        }


async def _check_local_fallback_health() -> Dict[str, Any]:
    """Check local fallback functionality health."""
    try:
        # Test local event storage
        from ..services.graceful_degradation import graceful_degradation
        
        # Check if local storage is accessible
        test_user_id = 0  # Use test user ID
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=1)
        
        # This should not fail even if no events exist
        events = await graceful_degradation.get_local_events(test_user_id, start_date, end_date)
        
        return {
            "status": "healthy",
            "local_storage_accessible": True,
            "last_check": datetime.utcnow().isoformat()
        }
        
    except Exception as error:
        return {
            "status": "error",
            "error": str(error),
            "local_storage_accessible": False,
            "last_check": datetime.utcnow().isoformat()
        }


async def _get_user_retry_operations(user_id: int) -> Dict[str, Any]:
    """Get retry operations for a specific user."""
    try:
        from ..services.local_supabase import LocalSupabase
        
        db = LocalSupabase()
        
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/retry_operations",
                headers=db.headers,
                params={
                    'user_id': f'eq.{user_id}',
                    'select': 'status'
                }
            )
            
            if response.status_code == 200:
                operations = response.json()
                
                status_counts = {
                    'pending_operations': 0,
                    'processing_operations': 0,
                    'failed_operations': 0,
                    'successful_operations': 0
                }
                
                for op in operations:
                    status = op.get('status', 'unknown')
                    if status == 'pending':
                        status_counts['pending_operations'] += 1
                    elif status == 'processing':
                        status_counts['processing_operations'] += 1
                    elif status == 'failed':
                        status_counts['failed_operations'] += 1
                    elif status == 'success':
                        status_counts['successful_operations'] += 1
                
                return status_counts
            else:
                return {'error': f'Failed to get user operations: {response.status_code}'}
                
    except Exception as error:
        return {'error': str(error)}


async def _get_user_last_sync_info(user_id: int) -> Dict[str, Any]:
    """Get last sync information for a user."""
    try:
        # This would typically check sync logs or timestamps
        # For now, return basic info
        return {
            "last_sync_attempt": None,
            "last_successful_sync": None,
            "sync_status": "unknown"
        }
        
    except Exception as error:
        return {'error': str(error)}


def _get_user_health_recommendations(
    health_status: str,
    connection_status: Dict[str, Any],
    retry_operations: Dict[str, Any]
) -> List[str]:
    """Generate health recommendations for a user."""
    
    recommendations = []
    
    if health_status == "disconnected":
        recommendations.extend([
            "Connect your Google Calendar in settings",
            "Ensure you grant all required permissions during setup"
        ])
    elif health_status == "error":
        recommendations.extend([
            "Try disconnecting and reconnecting your Google Calendar",
            "Check your Google account security settings",
            "Contact support if the issue persists"
        ])
    elif health_status == "degraded":
        if retry_operations.get("failed_operations", 0) > 0:
            recommendations.extend([
                "Some calendar operations have failed and need attention",
                "Check your calendar connection and try manual sync",
                "Failed operations will be retried automatically"
            ])
        if retry_operations.get("pending_operations", 0) > 5:
            recommendations.extend([
                "You have many pending calendar operations",
                "This may indicate connectivity issues",
                "Operations will be processed when connection improves"
            ])
    else:  # healthy
        recommendations.append("Your calendar connection is working properly")
    
    return recommendations