"""
Monitoring and alerting service for calendar service health.
Provides health checks, metrics collection, and alerting capabilities.
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import json

from ..config import settings
from ..core.logging_config import get_calendar_logger
from ..services.supabase_client import get_supabase_client
from ..services.oauth_service import oauth_service

logger = get_calendar_logger(__name__)


class HealthStatus(Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    """Health check result."""
    name: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    response_time_ms: Optional[float] = None


@dataclass
class ServiceMetrics:
    """Service metrics data."""
    timestamp: datetime
    active_connections: int
    failed_requests_1h: int
    avg_response_time_ms: float
    token_refresh_failures: int
    sync_failures: int
    rate_limit_hits: int


class MonitoringService:
    """
    Comprehensive monitoring service for calendar functionality.
    Provides health checks, metrics collection, and alerting.
    """
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self._metrics_cache = {}
        self._last_health_check = None
        self._alert_cooldown = {}  # Prevent alert spam
    
    async def perform_health_checks(self) -> Dict[str, HealthCheck]:
        """
        Perform comprehensive health checks for calendar services.
        
        Returns:
            dict: Health check results by component
        """
        logger.info("Starting calendar service health checks")
        
        health_checks = {}
        
        # Database connectivity check
        health_checks["database"] = await self._check_database_health()
        
        # Google Calendar API connectivity check
        health_checks["google_calendar_api"] = await self._check_google_api_health()
        
        # OAuth service health check
        health_checks["oauth_service"] = await self._check_oauth_service_health()
        
        # Token encryption health check
        health_checks["token_encryption"] = await self._check_encryption_health()
        
        # Configuration validation check
        health_checks["configuration"] = await self._check_configuration_health()
        
        # Service dependencies check
        health_checks["dependencies"] = await self._check_dependencies_health()
        
        # Overall system health
        health_checks["overall"] = self._calculate_overall_health(health_checks)
        
        self._last_health_check = datetime.utcnow()
        
        # Log health check summary
        healthy_count = sum(1 for check in health_checks.values() if check.status == HealthStatus.HEALTHY)
        total_count = len(health_checks)
        
        logger.info(f"Health checks completed: {healthy_count}/{total_count} healthy")
        
        # Send alerts for critical issues
        await self._process_health_alerts(health_checks)
        
        return health_checks
    
    async def _check_database_health(self) -> HealthCheck:
        """Check database connectivity and performance."""
        start_time = datetime.utcnow()
        
        try:
            # Test basic connectivity
            response = self.supabase.table("calendar_connections").select("count", count="exact").limit(1).execute()
            
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Check response time
            if response_time > 5000:  # 5 seconds
                return HealthCheck(
                    name="database",
                    status=HealthStatus.WARNING,
                    message=f"Database response time high: {response_time:.0f}ms",
                    details={"response_time_ms": response_time},
                    timestamp=datetime.utcnow(),
                    response_time_ms=response_time
                )
            
            return HealthCheck(
                name="database",
                status=HealthStatus.HEALTHY,
                message="Database connectivity normal",
                details={"response_time_ms": response_time},
                timestamp=datetime.utcnow(),
                response_time_ms=response_time
            )
            
        except Exception as e:
            return HealthCheck(
                name="database",
                status=HealthStatus.CRITICAL,
                message=f"Database connectivity failed: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_google_api_health(self) -> HealthCheck:
        """Check Google Calendar API connectivity."""
        start_time = datetime.utcnow()
        
        try:
            # Test Google Calendar API endpoint
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                    headers={"Authorization": "Bearer invalid_token_for_test"},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                    
                    # We expect 401 (unauthorized) which means API is reachable
                    if response.status == 401:
                        return HealthCheck(
                            name="google_calendar_api",
                            status=HealthStatus.HEALTHY,
                            message="Google Calendar API reachable",
                            details={"response_time_ms": response_time, "status_code": response.status},
                            timestamp=datetime.utcnow(),
                            response_time_ms=response_time
                        )
                    else:
                        return HealthCheck(
                            name="google_calendar_api",
                            status=HealthStatus.WARNING,
                            message=f"Unexpected API response: {response.status}",
                            details={"response_time_ms": response_time, "status_code": response.status},
                            timestamp=datetime.utcnow(),
                            response_time_ms=response_time
                        )
                        
        except asyncio.TimeoutError:
            return HealthCheck(
                name="google_calendar_api",
                status=HealthStatus.CRITICAL,
                message="Google Calendar API timeout",
                details={"error": "timeout"},
                timestamp=datetime.utcnow()
            )
        except Exception as e:
            return HealthCheck(
                name="google_calendar_api",
                status=HealthStatus.CRITICAL,
                message=f"Google Calendar API unreachable: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_oauth_service_health(self) -> HealthCheck:
        """Check OAuth service functionality."""
        try:
            # Test OAuth service configuration
            from ..services.secret_management import secret_manager
            
            config_issues = secret_manager.validate_configuration()
            
            if config_issues:
                return HealthCheck(
                    name="oauth_service",
                    status=HealthStatus.WARNING,
                    message=f"OAuth configuration issues: {len(config_issues)}",
                    details={"issues": config_issues},
                    timestamp=datetime.utcnow()
                )
            
            # Check for recent OAuth failures
            recent_failures = await self._count_recent_oauth_failures()
            
            if recent_failures > 10:  # More than 10 failures in last hour
                return HealthCheck(
                    name="oauth_service",
                    status=HealthStatus.WARNING,
                    message=f"High OAuth failure rate: {recent_failures} in last hour",
                    details={"recent_failures": recent_failures},
                    timestamp=datetime.utcnow()
                )
            
            return HealthCheck(
                name="oauth_service",
                status=HealthStatus.HEALTHY,
                message="OAuth service operational",
                details={"recent_failures": recent_failures},
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheck(
                name="oauth_service",
                status=HealthStatus.CRITICAL,
                message=f"OAuth service check failed: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_encryption_health(self) -> HealthCheck:
        """Check token encryption functionality."""
        try:
            from ..services.secret_management import secret_manager
            
            # Test encryption/decryption
            test_token = "test_token_12345"
            test_user_id = 999999  # Test user ID
            
            encrypted = secret_manager.encrypt_token(test_token, test_user_id)
            decrypted = secret_manager.decrypt_token(encrypted, test_user_id)
            
            if decrypted == test_token:
                return HealthCheck(
                    name="token_encryption",
                    status=HealthStatus.HEALTHY,
                    message="Token encryption working correctly",
                    details={"test_passed": True},
                    timestamp=datetime.utcnow()
                )
            else:
                return HealthCheck(
                    name="token_encryption",
                    status=HealthStatus.CRITICAL,
                    message="Token encryption test failed",
                    details={"test_passed": False},
                    timestamp=datetime.utcnow()
                )
                
        except Exception as e:
            return HealthCheck(
                name="token_encryption",
                status=HealthStatus.CRITICAL,
                message=f"Token encryption check failed: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_configuration_health(self) -> HealthCheck:
        """Check system configuration."""
        try:
            config_issues = settings.validate_security_config()
            
            if not config_issues:
                return HealthCheck(
                    name="configuration",
                    status=HealthStatus.HEALTHY,
                    message="Configuration valid",
                    details={"issues": []},
                    timestamp=datetime.utcnow()
                )
            
            # Determine severity based on issues
            critical_keywords = ["required", "SECRET_KEY", "encryption"]
            has_critical = any(any(keyword in issue for keyword in critical_keywords) for issue in config_issues)
            
            status = HealthStatus.CRITICAL if has_critical else HealthStatus.WARNING
            
            return HealthCheck(
                name="configuration",
                status=status,
                message=f"Configuration issues found: {len(config_issues)}",
                details={"issues": config_issues},
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheck(
                name="configuration",
                status=HealthStatus.CRITICAL,
                message=f"Configuration check failed: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_dependencies_health(self) -> HealthCheck:
        """Check external service dependencies."""
        try:
            dependencies = {
                "supabase": await self._test_supabase_connection(),
                "google_oauth": await self._test_google_oauth_endpoint(),
            }
            
            failed_deps = [name for name, status in dependencies.items() if not status]
            
            if not failed_deps:
                return HealthCheck(
                    name="dependencies",
                    status=HealthStatus.HEALTHY,
                    message="All dependencies healthy",
                    details=dependencies,
                    timestamp=datetime.utcnow()
                )
            
            return HealthCheck(
                name="dependencies",
                status=HealthStatus.WARNING,
                message=f"Dependencies failing: {', '.join(failed_deps)}",
                details=dependencies,
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthCheck(
                name="dependencies",
                status=HealthStatus.CRITICAL,
                message=f"Dependency check failed: {e}",
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    def _calculate_overall_health(self, health_checks: Dict[str, HealthCheck]) -> HealthCheck:
        """Calculate overall system health from individual checks."""
        # Exclude overall check from calculation
        checks = {k: v for k, v in health_checks.items() if k != "overall"}
        
        if not checks:
            return HealthCheck(
                name="overall",
                status=HealthStatus.UNKNOWN,
                message="No health checks performed",
                details={},
                timestamp=datetime.utcnow()
            )
        
        # Count status levels
        status_counts = {}
        for check in checks.values():
            status_counts[check.status] = status_counts.get(check.status, 0) + 1
        
        # Determine overall status
        if status_counts.get(HealthStatus.CRITICAL, 0) > 0:
            overall_status = HealthStatus.CRITICAL
            message = f"Critical issues detected in {status_counts[HealthStatus.CRITICAL]} components"
        elif status_counts.get(HealthStatus.WARNING, 0) > 0:
            overall_status = HealthStatus.WARNING
            message = f"Warnings in {status_counts[HealthStatus.WARNING]} components"
        else:
            overall_status = HealthStatus.HEALTHY
            message = "All components healthy"
        
        return HealthCheck(
            name="overall",
            status=overall_status,
            message=message,
            details=status_counts,
            timestamp=datetime.utcnow()
        )
    
    async def _count_recent_oauth_failures(self) -> int:
        """Count OAuth failures in the last hour."""
        try:
            # This would query audit logs for OAuth failures
            # For now, return 0 as placeholder
            return 0
        except Exception:
            return 0
    
    async def _test_supabase_connection(self) -> bool:
        """Test Supabase connection."""
        try:
            self.supabase.table("users").select("count", count="exact").limit(1).execute()
            return True
        except Exception:
            return False
    
    async def _test_google_oauth_endpoint(self) -> bool:
        """Test Google OAuth endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://accounts.google.com/.well-known/openid_configuration",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def _process_health_alerts(self, health_checks: Dict[str, HealthCheck]) -> None:
        """Process health check results and send alerts if needed."""
        if not settings.ENABLE_SECURITY_MONITORING:
            return
        
        critical_checks = [
            check for check in health_checks.values()
            if check.status == HealthStatus.CRITICAL
        ]
        
        if critical_checks:
            await self._send_critical_alert(critical_checks)
    
    async def _send_critical_alert(self, critical_checks: List[HealthCheck]) -> None:
        """Send critical health alert."""
        try:
            if not settings.SECURITY_ALERT_WEBHOOK:
                logger.warning("Critical health issues detected but no alert webhook configured")
                return
            
            # Check cooldown to prevent spam
            alert_key = "critical_health"
            if self._is_alert_in_cooldown(alert_key):
                return
            
            alert_data = {
                "alert_type": "critical_health",
                "timestamp": datetime.utcnow().isoformat(),
                "service": "calendar_service",
                "critical_issues": [
                    {
                        "component": check.name,
                        "message": check.message,
                        "details": check.details
                    }
                    for check in critical_checks
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    settings.SECURITY_ALERT_WEBHOOK,
                    json=alert_data,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Critical health alert sent for {len(critical_checks)} issues")
                        self._set_alert_cooldown(alert_key, minutes=30)
                    else:
                        logger.error(f"Failed to send health alert: HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to send critical health alert: {e}")
    
    def _is_alert_in_cooldown(self, alert_key: str) -> bool:
        """Check if alert is in cooldown period."""
        cooldown_until = self._alert_cooldown.get(alert_key)
        if cooldown_until and datetime.utcnow() < cooldown_until:
            return True
        return False
    
    def _set_alert_cooldown(self, alert_key: str, minutes: int) -> None:
        """Set alert cooldown period."""
        self._alert_cooldown[alert_key] = datetime.utcnow() + timedelta(minutes=minutes)
    
    async def collect_metrics(self) -> ServiceMetrics:
        """
        Collect service metrics for monitoring.
        
        Returns:
            ServiceMetrics: Current service metrics
        """
        try:
            # Count active calendar connections
            active_connections_response = self.supabase.table("calendar_connections").select(
                "count", count="exact"
            ).execute()
            active_connections = active_connections_response.count or 0
            
            # This would collect more detailed metrics from logs/database
            # For now, return basic metrics
            metrics = ServiceMetrics(
                timestamp=datetime.utcnow(),
                active_connections=active_connections,
                failed_requests_1h=0,  # Would be calculated from logs
                avg_response_time_ms=0.0,  # Would be calculated from logs
                token_refresh_failures=0,  # Would be calculated from logs
                sync_failures=0,  # Would be calculated from logs
                rate_limit_hits=0  # Would be calculated from logs
            )
            
            # Cache metrics
            self._metrics_cache["latest"] = metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            # Return empty metrics on error
            return ServiceMetrics(
                timestamp=datetime.utcnow(),
                active_connections=0,
                failed_requests_1h=0,
                avg_response_time_ms=0.0,
                token_refresh_failures=0,
                sync_failures=0,
                rate_limit_hits=0
            )
    
    async def get_service_status(self) -> Dict[str, Any]:
        """
        Get comprehensive service status.
        
        Returns:
            dict: Service status information
        """
        # Perform health checks if not done recently
        if (not self._last_health_check or 
            datetime.utcnow() - self._last_health_check > timedelta(minutes=5)):
            health_checks = await self.perform_health_checks()
        else:
            health_checks = {"message": "Recent health check data not available"}
        
        # Collect current metrics
        metrics = await self.collect_metrics()
        
        return {
            "service": "calendar_service",
            "timestamp": datetime.utcnow().isoformat(),
            "health_checks": {k: asdict(v) for k, v in health_checks.items()} if isinstance(health_checks, dict) and health_checks.get("message") is None else health_checks,
            "metrics": asdict(metrics),
            "configuration": {
                "monitoring_enabled": settings.ENABLE_SECURITY_MONITORING,
                "alert_webhook_configured": bool(settings.SECURITY_ALERT_WEBHOOK)
            }
        }


# Global monitoring service instance
monitoring_service = MonitoringService()