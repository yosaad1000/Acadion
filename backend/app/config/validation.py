"""
Configuration validation module.
Validates that all required configuration parameters are present and valid.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class ConfigurationError(Exception):
    """Raised when configuration validation fails"""
    pass

class ConfigValidator:
    """Validates application configuration"""
    
    # Required configuration parameters
    REQUIRED_PARAMS = {
        "SUPABASE_URL": "Supabase project URL",
        "SUPABASE_KEY": "Supabase anon key", 
        "SUPABASE_SERVICE_KEY": "Supabase service role key",
        "SECRET_KEY": "JWT secret key",
        "PINECONE_API_KEY": "Pinecone API key",
        "PINECONE_INDEX_NAME": "Pinecone index name"
    }
    
    # Optional parameters with defaults
    OPTIONAL_PARAMS = {
        "PINECONE_ENVIRONMENT": "us-east-1",
        "FACE_THRESHOLD": "0.6",
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": "30"
    }
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate_required_parameters(self, settings_instance=None) -> bool:
        """
        Validate that all required parameters are present and non-empty.
        
        Args:
            settings_instance: Settings instance to validate (if None, imports dynamically)
        
        Returns:
            True if all required parameters are valid
        """
        if settings_instance is None:
            # Import dynamically to avoid circular imports
            from app.settings import settings
            settings_instance = settings
        
        valid = True
        
        for param_name, description in self.REQUIRED_PARAMS.items():
            value = getattr(settings_instance, param_name, None)
            
            if not value or (isinstance(value, str) and value.strip() == ""):
                self.errors.append(f"Missing required parameter: {param_name} ({description})")
                valid = False
            else:
                logger.debug(f"✅ {param_name}: Present")
        
        return valid
    
    def validate_parameter_formats(self, settings_instance=None) -> bool:
        """
        Validate parameter formats and values.
        
        Args:
            settings_instance: Settings instance to validate (if None, imports dynamically)
        
        Returns:
            True if all parameters have valid formats
        """
        if settings_instance is None:
            # Import dynamically to avoid circular imports
            from app.settings import settings
            settings_instance = settings
        
        valid = True
        
        # Validate Supabase URL format
        if hasattr(settings_instance, 'SUPABASE_URL') and settings_instance.SUPABASE_URL:
            if not settings_instance.SUPABASE_URL.startswith('https://'):
                self.errors.append("SUPABASE_URL must start with https://")
                valid = False
            elif not '.supabase.co' in settings_instance.SUPABASE_URL:
                self.warnings.append("SUPABASE_URL doesn't appear to be a standard Supabase URL")
        
        # Validate face threshold
        if hasattr(settings_instance, 'FACE_THRESHOLD'):
            try:
                threshold = float(settings_instance.FACE_THRESHOLD)
                if not 0.0 <= threshold <= 1.0:
                    self.errors.append("FACE_THRESHOLD must be between 0.0 and 1.0")
                    valid = False
            except (ValueError, TypeError):
                self.errors.append("FACE_THRESHOLD must be a valid float")
                valid = False
        
        # Validate token expiration
        if hasattr(settings_instance, 'ACCESS_TOKEN_EXPIRE_MINUTES'):
            try:
                expire_minutes = int(settings_instance.ACCESS_TOKEN_EXPIRE_MINUTES)
                if expire_minutes <= 0:
                    self.errors.append("ACCESS_TOKEN_EXPIRE_MINUTES must be positive")
                    valid = False
                elif expire_minutes > 1440:  # 24 hours
                    self.warnings.append("ACCESS_TOKEN_EXPIRE_MINUTES is very long (>24 hours)")
            except (ValueError, TypeError):
                self.errors.append("ACCESS_TOKEN_EXPIRE_MINUTES must be a valid integer")
                valid = False
        
        # Validate JWT algorithm
        if hasattr(settings_instance, 'ALGORITHM'):
            valid_algorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']
            if settings_instance.ALGORITHM not in valid_algorithms:
                self.errors.append(f"ALGORITHM must be one of: {', '.join(valid_algorithms)}")
                valid = False
        
        return valid
    
    def validate_external_service_connectivity(self, settings_instance=None) -> bool:
        """
        Validate connectivity to external services (optional check).
        
        Args:
            settings_instance: Settings instance to validate (if None, imports dynamically)
        
        Returns:
            True if all services are reachable (or check is skipped)
        """
        if settings_instance is None:
            # Import dynamically to avoid circular imports
            from app.settings import settings
            settings_instance = settings
        
        # This is an optional validation that can be enabled in production
        # For now, we'll just log the configuration
        
        logger.info("External service configuration:")
        logger.info(f"  Supabase URL: {getattr(settings_instance, 'SUPABASE_URL', 'Not set')[:50]}...")
        logger.info(f"  Pinecone Environment: {getattr(settings_instance, 'PINECONE_ENVIRONMENT', 'Not set')}")
        logger.info(f"  Face Recognition Threshold: {getattr(settings_instance, 'FACE_THRESHOLD', 'Not set')}")
        
        return True
    
    def validate_all(self, check_connectivity: bool = False, settings_instance=None) -> bool:
        """
        Run all validation checks.
        
        Args:
            check_connectivity: Whether to check external service connectivity
            settings_instance: Settings instance to validate (if None, imports dynamically)
            
        Returns:
            True if all validations pass
        """
        self.errors.clear()
        self.warnings.clear()
        
        logger.info("Starting configuration validation...")
        
        # Run all validation checks
        required_valid = self.validate_required_parameters(settings_instance)
        format_valid = self.validate_parameter_formats(settings_instance)
        
        connectivity_valid = True
        if check_connectivity:
            connectivity_valid = self.validate_external_service_connectivity(settings_instance)
        
        # Log results
        if self.errors:
            logger.error("Configuration validation failed:")
            for error in self.errors:
                logger.error(f"  ❌ {error}")
        
        if self.warnings:
            logger.warning("Configuration warnings:")
            for warning in self.warnings:
                logger.warning(f"  ⚠️ {warning}")
        
        all_valid = required_valid and format_valid and connectivity_valid
        
        if all_valid:
            logger.info("✅ Configuration validation passed")
        else:
            logger.error("❌ Configuration validation failed")
        
        return all_valid
    
    def get_validation_report(self) -> Dict[str, Any]:
        """
        Get a detailed validation report.
        
        Returns:
            Dictionary containing validation results
        """
        return {
            "valid": len(self.errors) == 0,
            "errors": self.errors,
            "warnings": self.warnings,
            "required_params_checked": len(self.REQUIRED_PARAMS),
            "optional_params_available": len(self.OPTIONAL_PARAMS)
        }

def validate_configuration(check_connectivity: bool = False, settings_instance=None) -> bool:
    """
    Convenience function to validate configuration.
    
    Args:
        check_connectivity: Whether to check external service connectivity
        settings_instance: Settings instance to validate (if None, imports dynamically)
        
    Returns:
        True if configuration is valid
        
    Raises:
        ConfigurationError: If validation fails
    """
    validator = ConfigValidator()
    is_valid = validator.validate_all(check_connectivity=check_connectivity, settings_instance=settings_instance)
    
    if not is_valid:
        error_msg = "Configuration validation failed:\n" + "\n".join(validator.errors)
        raise ConfigurationError(error_msg)
    
    return True

def get_configuration_status() -> Dict[str, Any]:
    """
    Get current configuration status without raising exceptions.
    
    Returns:
        Dictionary with configuration status
    """
    try:
        validator = ConfigValidator()
        validator.validate_all(check_connectivity=False)
        
        return {
            "status": "valid" if len(validator.errors) == 0 else "invalid",
            "validation_report": validator.get_validation_report(),
            "parameter_store_info": None  # Will be filled by caller if available
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "validation_report": None,
            "parameter_store_info": None
        }

async def validate_configuration_async(check_connectivity: bool = False, settings_instance=None) -> bool:
    """
    Async version of validate_configuration.
    """
    import asyncio
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        validate_configuration,
        check_connectivity,
        settings_instance
    )