"""
AWS Systems Manager Parameter Store configuration loader.
This module provides functionality to load configuration from Parameter Store
and integrate with the existing Pydantic Settings class.
"""

import os
import boto3
import logging
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError, NoCredentialsError
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)

class ParameterStoreError(Exception):
    """Custom exception for Parameter Store operations"""
    pass

class ParameterStoreLoader:
    """
    Loads configuration parameters from AWS Systems Manager Parameter Store.
    Supports both synchronous and asynchronous operations.
    """
    
    def __init__(self, 
                 environment: Optional[str] = None,
                 project_name: str = "acadion",
                 region_name: Optional[str] = None,
                 use_cache: bool = True,
                 cache_ttl: int = 300):  # 5 minutes
        """
        Initialize Parameter Store loader.
        
        Args:
            environment: Environment name (dev, staging, prod)
            project_name: Project name for parameter hierarchy
            region_name: AWS region name
            use_cache: Whether to cache parameters
            cache_ttl: Cache TTL in seconds
        """
        self.environment = environment or os.getenv("ENVIRONMENT", "dev")
        self.project_name = project_name
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.use_cache = use_cache
        self.cache_ttl = cache_ttl
        
        # Parameter prefix for this environment
        self.parameter_prefix = f"/{self.environment}/{self.project_name}"
        
        # Initialize AWS SSM client
        try:
            self.ssm_client = boto3.client('ssm', region_name=self.region_name)
            self._connection_healthy = True
            logger.info(f"✅ Parameter Store client initialized for {self.environment} environment")
        except (NoCredentialsError, ClientError) as e:
            logger.warning(f"⚠️ Failed to initialize Parameter Store client: {e}")
            logger.warning("Falling back to environment variables only")
            self.ssm_client = None
            self._connection_healthy = False
        
        # Cache for parameters
        self._parameter_cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
    
    def is_available(self) -> bool:
        """Check if Parameter Store is available and accessible"""
        return self._connection_healthy and self.ssm_client is not None
    
    def get_parameter(self, name: str, decrypt: bool = True, default: Any = None) -> Any:
        """
        Get a single parameter from Parameter Store.
        
        Args:
            name: Parameter name (without prefix)
            decrypt: Whether to decrypt SecureString parameters
            default: Default value if parameter not found
            
        Returns:
            Parameter value or default
        """
        if not self.is_available():
            logger.debug(f"Parameter Store not available, using default for {name}")
            return default
        
        full_name = f"{self.parameter_prefix}/{name}"
        
        # Check cache first
        if self.use_cache and self._is_cached_and_valid(full_name):
            logger.debug(f"Using cached value for parameter {full_name}")
            return self._parameter_cache[full_name]
        
        try:
            response = self.ssm_client.get_parameter(
                Name=full_name,
                WithDecryption=decrypt
            )
            
            value = response['Parameter']['Value']
            
            # Cache the value
            if self.use_cache:
                import time
                self._parameter_cache[full_name] = value
                self._cache_timestamps[full_name] = time.time()
            
            logger.debug(f"Retrieved parameter {full_name} from Parameter Store")
            return value
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ParameterNotFound':
                logger.debug(f"Parameter {full_name} not found, using default")
                return default
            else:
                logger.error(f"Error retrieving parameter {full_name}: {e}")
                return default
        except Exception as e:
            logger.error(f"Unexpected error retrieving parameter {full_name}: {e}")
            return default
    
    def get_parameters_by_path(self, path: str, decrypt: bool = True) -> Dict[str, str]:
        """
        Get multiple parameters by path prefix.
        
        Args:
            path: Parameter path (without environment prefix)
            decrypt: Whether to decrypt SecureString parameters
            
        Returns:
            Dictionary of parameter names to values
        """
        if not self.is_available():
            logger.debug(f"Parameter Store not available for path {path}")
            return {}
        
        full_path = f"{self.parameter_prefix}/{path}"
        parameters = {}
        
        try:
            paginator = self.ssm_client.get_paginator('get_parameters_by_path')
            
            for page in paginator.paginate(
                Path=full_path,
                Recursive=True,
                WithDecryption=decrypt
            ):
                for param in page['Parameters']:
                    # Remove the full path prefix to get relative name
                    relative_name = param['Name'].replace(f"{full_path}/", "")
                    parameters[relative_name] = param['Value']
            
            logger.debug(f"Retrieved {len(parameters)} parameters from path {full_path}")
            return parameters
            
        except ClientError as e:
            logger.error(f"Error retrieving parameters by path {full_path}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error retrieving parameters by path {full_path}: {e}")
            return {}
    
    def get_all_parameters(self) -> Dict[str, str]:
        """
        Get all parameters for the current environment.
        
        Returns:
            Dictionary of all parameters
        """
        return self.get_parameters_by_path("", decrypt=True)
    
    def refresh_cache(self):
        """Clear the parameter cache to force refresh on next access"""
        self._parameter_cache.clear()
        self._cache_timestamps.clear()
        logger.info("Parameter cache cleared")
    
    def _is_cached_and_valid(self, parameter_name: str) -> bool:
        """Check if parameter is cached and still valid"""
        if parameter_name not in self._parameter_cache:
            return False
        
        if parameter_name not in self._cache_timestamps:
            return False
        
        import time
        age = time.time() - self._cache_timestamps[parameter_name]
        return age < self.cache_ttl
    
    async def get_parameter_async(self, name: str, decrypt: bool = True, default: Any = None) -> Any:
        """
        Async version of get_parameter.
        Runs the synchronous operation in a thread pool.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            self.get_parameter, 
            name, 
            decrypt, 
            default
        )
    
    async def get_parameters_by_path_async(self, path: str, decrypt: bool = True) -> Dict[str, str]:
        """
        Async version of get_parameters_by_path.
        Runs the synchronous operation in a thread pool.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.get_parameters_by_path,
            path,
            decrypt
        )

# Global instance
_parameter_store_loader: Optional[ParameterStoreLoader] = None

@lru_cache(maxsize=1)
def get_parameter_store_loader() -> ParameterStoreLoader:
    """
    Get or create the global Parameter Store loader instance.
    Uses LRU cache to ensure singleton behavior.
    """
    global _parameter_store_loader
    
    if _parameter_store_loader is None:
        _parameter_store_loader = ParameterStoreLoader()
    
    return _parameter_store_loader

def load_parameter_store_config() -> Dict[str, Any]:
    """
    Load all configuration from Parameter Store.
    
    Returns:
        Dictionary of configuration values
    """
    loader = get_parameter_store_loader()
    
    if not loader.is_available():
        logger.info("Parameter Store not available, using environment variables only")
        return {}
    
    try:
        # Load all parameters
        all_params = loader.get_all_parameters()
        
        # Organize parameters by category
        config = {}
        
        for param_path, value in all_params.items():
            # Convert parameter path to config key
            # e.g., "secrets/supabase-url" -> "SUPABASE_URL"
            if param_path.startswith("secrets/"):
                key = param_path.replace("secrets/", "").replace("-", "_").upper()
            elif param_path.startswith("app/"):
                key = param_path.replace("app/", "").replace("-", "_").upper()
            elif param_path.startswith("database/"):
                key = "DATABASE_" + param_path.replace("database/", "").replace("-", "_").upper()
            elif param_path.startswith("face-recognition/"):
                key = "FACE_" + param_path.replace("face-recognition/", "").replace("-", "_").upper()
            elif param_path.startswith("cache/"):
                key = "CACHE_" + param_path.replace("cache/", "").replace("-", "_").upper()
            elif param_path.startswith("security/"):
                key = "SECURITY_" + param_path.replace("security/", "").replace("-", "_").upper()
            else:
                key = param_path.replace("-", "_").upper()
            
            config[key] = value
        
        logger.info(f"Loaded {len(config)} configuration parameters from Parameter Store")
        return config
        
    except Exception as e:
        logger.error(f"Error loading Parameter Store configuration: {e}")
        return {}

# Async version
async def load_parameter_store_config_async() -> Dict[str, Any]:
    """
    Async version of load_parameter_store_config.
    """
    loader = get_parameter_store_loader()
    
    if not loader.is_available():
        logger.info("Parameter Store not available, using environment variables only")
        return {}
    
    try:
        # Load all parameters asynchronously
        all_params = await loader.get_parameters_by_path_async("", decrypt=True)
        
        # Organize parameters by category (same logic as sync version)
        config = {}
        
        for param_path, value in all_params.items():
            if param_path.startswith("secrets/"):
                key = param_path.replace("secrets/", "").replace("-", "_").upper()
            elif param_path.startswith("app/"):
                key = param_path.replace("app/", "").replace("-", "_").upper()
            elif param_path.startswith("database/"):
                key = "DATABASE_" + param_path.replace("database/", "").replace("-", "_").upper()
            elif param_path.startswith("face-recognition/"):
                key = "FACE_" + param_path.replace("face-recognition/", "").replace("-", "_").upper()
            elif param_path.startswith("cache/"):
                key = "CACHE_" + param_path.replace("cache/", "").replace("-", "_").upper()
            elif param_path.startswith("security/"):
                key = "SECURITY_" + param_path.replace("security/", "").replace("-", "_").upper()
            else:
                key = param_path.replace("-", "_").upper()
            
            config[key] = value
        
        logger.info(f"Loaded {len(config)} configuration parameters from Parameter Store (async)")
        return config
        
    except Exception as e:
        logger.error(f"Error loading Parameter Store configuration (async): {e}")
        return {}