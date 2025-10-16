"""
Configuration package for the Acadion backend application.
Provides Parameter Store integration and enhanced configuration management.
"""

# Import main configuration components first
import sys
import os

# Add the parent directory to the path to avoid circular imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from .parameter_store import (
    ParameterStoreLoader,
    ParameterStoreError,
    get_parameter_store_loader,
    load_parameter_store_config,
    load_parameter_store_config_async
)

from .validation import (
    ConfigValidator,
    ConfigurationError,
    validate_configuration,
    validate_configuration_async,
    get_configuration_status
)

from .loader import (
    ConfigurationLoader,
    configuration_loader,
    initialize_application_configuration,
    refresh_application_configuration,
    validate_application_configuration,
    get_application_configuration_health,
    schedule_configuration_refresh
)

__all__ = [
    "ParameterStoreLoader",
    "ParameterStoreError", 
    "get_parameter_store_loader",
    "load_parameter_store_config",
    "load_parameter_store_config_async",
    "ConfigValidator",
    "ConfigurationError",
    "validate_configuration",
    "validate_configuration_async",
    "get_configuration_status",
    "ConfigurationLoader",
    "configuration_loader",
    "initialize_application_configuration",
    "refresh_application_configuration",
    "validate_application_configuration",
    "get_application_configuration_health",
    "schedule_configuration_refresh"
]