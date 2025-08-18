"""
Security startup service for initializing security features on application startup.
Validates configuration, sets up monitoring, and initializes security services.
"""

import logging
from typing import List, Dict, Any
from datetime import datetime

from ..config import settings
from ..core.logging_config import get_calendar_logger
from ..services.secret_management import secret_manager
from ..services.data_retention_service import data_retention_service
from ..services.monitoring_service import monitoring_service

logger = get_calendar_logger(__name__)


class SecurityStartupService:
    """Service for initializing security features on application startup."""
    
    def __init__(self):
        self.startup_time = datetime.utcnow()
        self.initialization_results = {}
    
    async def initialize_security_features(self) -> Dict[str, Any]:
        """
        Initialize all security features on application startup.
        
        Returns:
            dict: Initialization results
        """
        logger.info("Starting security features initialization")
        
        results = {
            "startup_time": self.startup_time.isoformat(),
            "components": {},
            "warnings": [],
            "errors": [],
            "overall_status": "success"
        }
        
        # 1. Validate security configuration
        config_result = await self._validate_security_configuration()
        results["components"]["configuration"] = config_result
        
        # 2. Initialize secret management
        secret_result = await self._initialize_secret_management()
        results["components"]["secret_management"] = secret_result
        
        # 3. Initialize data retention
        retention_result = await self._initialize_data_retention()
        results["components"]["data_retention"] = retention_result
        
        # 4. Initialize monitoring
        monitoring_result = await self._initialize_monitoring()
        results["components"]["monitoring"] = monitoring_result
        
        # 5. Perform initial health checks
        health_result = await self._perform_initial_health_checks()
        results["components"]["health_checks"] = health_result
        
        # Collect warnings and errors
        for component, result in results["components"].items():
            if result.get("warnings"):
                results["warnings"].extend([f"{component}: {w}" for w in result["warnings"]])
            if result.get("errors"):
                results["errors"].extend([f"{component}: {e}" for e in result["errors"]])
        
        # Determine overall status
        if results["errors"]:
            results["overall_status"] = "error"
        elif results["warnings"]:
            results["overall_status"] = "warning"
        
        logger.info(f"Security initialization completed with status: {results['overall_status']}")
        
        self.initialization_results = results
        return results
    
    async def _validate_security_configuration(self) -> Dict[str, Any]:
        """Validate security configuration."""
        try:
            issues = settings.validate_security_config()
            
            return {
                "status": "success" if not issues else "warning",
                "issues": issues,
                "warnings": issues,
                "message": f"Found {len(issues)} configuration issues" if issues else "Configuration valid"
            }
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            return {
                "status": "error",
                "errors": [str(e)],
                "message": "Configuration validation failed"
            }
    
    async def _initialize_secret_management(self) -> Dict[str, Any]:
        """Initialize secret management service."""
        try:
            security_status = secret_manager.get_security_status()
            config_issues = secret_manager.validate_configuration()
            
            return {
                "status": "success" if not config_issues else "warning",
                "security_status": security_status,
                "warnings": config_issues,
                "message": "Secret management initialized"
            }
        except Exception as e:
            logger.error(f"Secret management initialization failed: {e}")
            return {
                "status": "error",
                "errors": [str(e)],
                "message": "Secret management initialization failed"
            }
    
    async def _initialize_data_retention(self) -> Dict[str, Any]:
        """Initialize data retention service."""
        try:
            # Get retention status
            retention_status = await data_retention_service.get_retention_status()
            
            # Clean up expired tokens immediately
            cleanup_result = await data_retention_service.cleanup_expired_tokens()
            
            return {
                "status": "success",
                "retention_status": retention_status,
                "cleanup_result": cleanup_result,
                "message": "Data retention service initialized"
            }
        except Exception as e:
            logger.error(f"Data retention initialization failed: {e}")
            return {
                "status": "error",
                "errors": [str(e)],
                "message": "Data retention initialization failed"
            }
    
    async def _initialize_monitoring(self) -> Dict[str, Any]:
        """Initialize monitoring service."""
        try:
            # Collect initial metrics
            metrics = await monitoring_service.collect_metrics()
            
            return {
                "status": "success",
                "initial_metrics": {
                    "active_connections": metrics.active_connections,
                    "timestamp": metrics.timestamp.isoformat()
                },
                "message": "Monitoring service initialized"
            }
        except Exception as e:
            logger.error(f"Monitoring initialization failed: {e}")
            return {
                "status": "error",
                "errors": [str(e)],
                "message": "Monitoring initialization failed"
            }
    
    async def _perform_initial_health_checks(self) -> Dict[str, Any]:
        """Perform initial health checks."""
        try:
            health_checks = await monitoring_service.perform_health_checks()
            
            # Count health check results
            healthy_count = sum(1 for check in health_checks.values() if check.status.value == "healthy")
            total_count = len(health_checks)
            
            warnings = []
            errors = []
            
            for name, check in health_checks.items():
                if check.status.value == "warning":
                    warnings.append(f"{name}: {check.message}")
                elif check.status.value == "critical":
                    errors.append(f"{name}: {check.message}")
            
            return {
                "status": "success" if not errors else "error",
                "healthy_count": healthy_count,
                "total_count": total_count,
                "warnings": warnings,
                "errors": errors,
                "message": f"Health checks completed: {healthy_count}/{total_count} healthy"
            }
        except Exception as e:
            logger.error(f"Initial health checks failed: {e}")
            return {
                "status": "error",
                "errors": [str(e)],
                "message": "Initial health checks failed"
            }
    
    def get_initialization_results(self) -> Dict[str, Any]:
        """Get the results of the last initialization."""
        return self.initialization_results


# Global security startup service instance
security_startup_service = SecurityStartupService()