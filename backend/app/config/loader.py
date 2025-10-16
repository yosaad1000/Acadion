"""
Configuration loader service for secure credential loading at application startup.
Provides runtime configuration refresh capabilities and validation.
"""

import os
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConfigurationLoader:
    """
    Service for loading and managing application configuration.
    Handles Parameter Store integration, validation, and runtime refresh.
    """
    
    def __init__(self):
        self.startup_time = datetime.utcnow()
        self.last_refresh_time: Optional[datetime] = None
        self.refresh_count = 0
        self.validation_errors: List[str] = []
        self.validation_warnings: List[str] = []
        
    async def initialize_configuration(self) -> bool:
        """
        Initialize application configuration at startup.
        
        Returns:
            True if configuration loaded successfully
        """
        logger.info("🚀 Initializing application configuration...")
        
        try:
            # Import configuration components
            from app.settings import create_settings_async, settings
            from app.config.validation import validate_configuration_async
            
            # Load configuration asynchronously
            logger.info("Loading configuration from Parameter Store and environment...")
            await create_settings_async()
            
            # Validate configuration
            logger.info("Validating configuration...")
            is_valid = await validate_configuration_async(check_connectivity=False)
            
            if is_valid:
                logger.info("✅ Configuration initialized successfully")
                
                # Log configuration summary (without sensitive data)
                await self._log_configuration_summary()
                
                return True
            else:
                logger.error("❌ Configuration validation failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize configuration: {e}")
            return False
    
    async def refresh_configuration_with_validation(self) -> Dict[str, Any]:
        """
        Refresh configuration and validate the result.
        
        Returns:
            Dictionary with refresh status and validation results
        """
        logger.info("🔄 Refreshing application configuration...")
        
        try:
            from app.settings import refresh_configuration_async
            from app.config.validation import validate_configuration_async, get_configuration_status
            
            # Refresh configuration
            refresh_success = await refresh_configuration_async()
            
            if not refresh_success:
                return {
                    "success": False,
                    "error": "Failed to refresh configuration from Parameter Store",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Validate refreshed configuration
            try:
                is_valid = await validate_configuration_async(check_connectivity=True)
                validation_status = get_configuration_status()
            except Exception as e:
                logger.error(f"Configuration validation failed after refresh: {e}")
                is_valid = False
                validation_status = {"status": "error", "error": str(e)}
            
            # Update tracking
            self.last_refresh_time = datetime.utcnow()
            self.refresh_count += 1
            
            result = {
                "success": True,
                "valid": is_valid,
                "refresh_count": self.refresh_count,
                "last_refresh": self.last_refresh_time.isoformat(),
                "validation_status": validation_status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if is_valid:
                logger.info("✅ Configuration refreshed and validated successfully")
            else:
                logger.warning("⚠️ Configuration refreshed but validation failed")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error during configuration refresh: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def validate_current_configuration(self) -> Dict[str, Any]:
        """
        Validate the current configuration without refreshing.
        
        Returns:
            Dictionary with validation results
        """
        logger.info("🔍 Validating current configuration...")
        
        try:
            from app.config.validation import validate_configuration_async, get_configuration_status
            from app.settings import get_configuration_info
            
            # Run validation
            is_valid = await validate_configuration_async(check_connectivity=True)
            validation_status = get_configuration_status()
            config_info = get_configuration_info()
            
            result = {
                "valid": is_valid,
                "validation_status": validation_status,
                "configuration_info": config_info,
                "startup_time": self.startup_time.isoformat(),
                "last_refresh": self.last_refresh_time.isoformat() if self.last_refresh_time else None,
                "refresh_count": self.refresh_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if is_valid:
                logger.info("✅ Configuration validation passed")
            else:
                logger.warning("⚠️ Configuration validation failed")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error during configuration validation: {e}")
            return {
                "valid": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_configuration_health(self) -> Dict[str, Any]:
        """
        Get comprehensive configuration health status.
        
        Returns:
            Dictionary with health information
        """
        try:
            from app.settings import get_configuration_info, get_secure_configuration_summary
            
            config_info = get_configuration_info()
            config_summary = get_secure_configuration_summary()
            
            # Calculate uptime
            uptime = datetime.utcnow() - self.startup_time
            
            # Determine health status
            health_status = "healthy"
            if not config_info.get("parameter_store_available", False):
                health_status = "degraded"  # Still works with env vars
            
            if "error" in config_summary:
                health_status = "unhealthy"
            
            return {
                "status": health_status,
                "uptime_seconds": int(uptime.total_seconds()),
                "startup_time": self.startup_time.isoformat(),
                "last_refresh": self.last_refresh_time.isoformat() if self.last_refresh_time else None,
                "refresh_count": self.refresh_count,
                "parameter_store_available": config_info.get("parameter_store_available", False),
                "environment": config_summary.get("environment", "unknown"),
                "configuration_source": config_info.get("configuration_source", "unknown"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting configuration health: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _log_configuration_summary(self):
        """Log a summary of the loaded configuration (without sensitive data)"""
        try:
            from app.settings import get_secure_configuration_summary
            
            summary = get_secure_configuration_summary()
            
            logger.info("📋 Configuration Summary:")
            logger.info(f"  Environment: {summary.get('environment', 'unknown')}")
            logger.info(f"  AWS Region: {summary.get('aws_region', 'unknown')}")
            logger.info(f"  Parameter Store: {'✅ Available' if summary.get('configuration_source', {}).get('parameter_store_available') else '❌ Not Available'}")
            logger.info(f"  Face Recognition Threshold: {summary.get('face_threshold', 'unknown')}")
            logger.info(f"  JWT Algorithm: {summary.get('algorithm', 'unknown')}")
            logger.info(f"  Token Expiration: {summary.get('token_expire_minutes', 'unknown')} minutes")
            logger.info(f"  Log Level: {summary.get('log_level', 'unknown')}")
            logger.info(f"  Database Pool Size: {summary.get('database_config', {}).get('pool_size', 'unknown')}")
            logger.info(f"  Redis Pool Size: {summary.get('redis_config', {}).get('pool_size', 'unknown')}")
            
        except Exception as e:
            logger.warning(f"Could not log configuration summary: {e}")
    
    def schedule_periodic_refresh(self, interval_minutes: int = 60):
        """
        Schedule periodic configuration refresh.
        
        Args:
            interval_minutes: Refresh interval in minutes
        """
        async def periodic_refresh():
            while True:
                try:
                    await asyncio.sleep(interval_minutes * 60)
                    logger.info(f"🔄 Performing scheduled configuration refresh (every {interval_minutes} minutes)")
                    
                    result = await self.refresh_configuration_with_validation()
                    
                    if result["success"]:
                        logger.info("✅ Scheduled configuration refresh completed successfully")
                    else:
                        logger.error(f"❌ Scheduled configuration refresh failed: {result.get('error', 'Unknown error')}")
                        
                except asyncio.CancelledError:
                    logger.info("Periodic configuration refresh cancelled")
                    break
                except Exception as e:
                    logger.error(f"Error in periodic configuration refresh: {e}")
        
        # Start the periodic refresh task
        asyncio.create_task(periodic_refresh())
        logger.info(f"📅 Scheduled periodic configuration refresh every {interval_minutes} minutes")

# Global configuration loader instance
configuration_loader = ConfigurationLoader()

async def initialize_application_configuration() -> bool:
    """
    Initialize application configuration at startup.
    
    Returns:
        True if configuration loaded successfully
    """
    return await configuration_loader.initialize_configuration()

async def refresh_application_configuration() -> Dict[str, Any]:
    """
    Refresh application configuration with validation.
    
    Returns:
        Dictionary with refresh status and validation results
    """
    return await configuration_loader.refresh_configuration_with_validation()

async def validate_application_configuration() -> Dict[str, Any]:
    """
    Validate current application configuration.
    
    Returns:
        Dictionary with validation results
    """
    return await configuration_loader.validate_current_configuration()

async def get_application_configuration_health() -> Dict[str, Any]:
    """
    Get application configuration health status.
    
    Returns:
        Dictionary with health information
    """
    return await configuration_loader.get_configuration_health()

def schedule_configuration_refresh(interval_minutes: int = 60):
    """
    Schedule periodic configuration refresh.
    
    Args:
        interval_minutes: Refresh interval in minutes
    """
    configuration_loader.schedule_periodic_refresh(interval_minutes)