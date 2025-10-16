"""
Database connection pooling service for improved performance
Implements connection pooling for Supabase/PostgreSQL connections
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import httpx
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class HTTPConnectionPool:
    """
    HTTP connection pool for Supabase API calls
    Provides connection reuse and proper resource management
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: str,
        max_connections: int = 20,
        max_keepalive_connections: int = 10,
        keepalive_expiry: int = 30,
        timeout: int = 30
    ):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.max_connections = max_connections
        self.max_keepalive_connections = max_keepalive_connections
        self.keepalive_expiry = keepalive_expiry
        self.timeout = timeout
        
        # Connection pool statistics
        self.stats = {
            'total_requests': 0,
            'active_connections': 0,
            'pool_hits': 0,
            'pool_misses': 0,
            'connection_errors': 0,
            'timeouts': 0
        }
        
        self._client: Optional[httpx.AsyncClient] = None
        self._is_initialized = False
    
    async def initialize(self):
        """Initialize the HTTP client with connection pooling"""
        try:
            # Configure connection limits and timeouts
            limits = httpx.Limits(
                max_connections=self.max_connections,
                max_keepalive_connections=self.max_keepalive_connections,
                keepalive_expiry=self.keepalive_expiry
            )
            
            timeout = httpx.Timeout(
                connect=10.0,
                read=self.timeout,
                write=10.0,
                pool=5.0
            )
            
            # Default headers for Supabase
            headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                limits=limits,
                timeout=timeout,
                http2=True,  # Enable HTTP/2 for better performance
                follow_redirects=True
            )
            
            self._is_initialized = True
            logger.info(f"✅ HTTP connection pool initialized: {self.max_connections} max connections")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize HTTP connection pool: {e}")
            raise
    
    async def close(self):
        """Close the HTTP client and all connections"""
        if self._client:
            await self._client.aclose()
            self._client = None
        self._is_initialized = False
        logger.info("HTTP connection pool closed")
    
    @asynccontextmanager
    async def get_client(self):
        """Get HTTP client with automatic connection management"""
        if not self._is_initialized:
            await self.initialize()
        
        try:
            self.stats['active_connections'] += 1
            yield self._client
        except httpx.TimeoutException:
            self.stats['timeouts'] += 1
            logger.warning("HTTP request timeout")
            raise
        except httpx.ConnectError as e:
            self.stats['connection_errors'] += 1
            logger.error(f"HTTP connection error: {e}")
            raise
        finally:
            self.stats['active_connections'] -= 1
    
    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        retry_count: int = 3
    ) -> httpx.Response:
        """
        Make HTTP request with connection pooling and retry logic
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            params: Query parameters
            json_data: JSON request body
            headers: Additional headers
            retry_count: Number of retries on failure
            
        Returns:
            HTTP response
        """
        self.stats['total_requests'] += 1
        
        for attempt in range(retry_count + 1):
            try:
                async with self.get_client() as client:
                    response = await client.request(
                        method=method,
                        url=endpoint,
                        params=params,
                        json=json_data,
                        headers=headers
                    )
                    
                    # Log slow requests
                    if hasattr(response, 'elapsed') and response.elapsed.total_seconds() > 2:
                        logger.warning(f"Slow request: {method} {endpoint} took {response.elapsed.total_seconds():.2f}s")
                    
                    return response
                    
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                if attempt < retry_count:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Request failed (attempt {attempt + 1}/{retry_count + 1}), retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Request failed after {retry_count + 1} attempts: {e}")
                    raise
            except Exception as e:
                logger.error(f"Unexpected error in HTTP request: {e}")
                raise
    
    async def get(self, endpoint: str, params: Optional[Dict] = None, **kwargs) -> httpx.Response:
        """GET request with connection pooling"""
        return await self.request("GET", endpoint, params=params, **kwargs)
    
    async def post(self, endpoint: str, json_data: Optional[Dict] = None, **kwargs) -> httpx.Response:
        """POST request with connection pooling"""
        return await self.request("POST", endpoint, json_data=json_data, **kwargs)
    
    async def put(self, endpoint: str, json_data: Optional[Dict] = None, **kwargs) -> httpx.Response:
        """PUT request with connection pooling"""
        return await self.request("PUT", endpoint, json_data=json_data, **kwargs)
    
    async def patch(self, endpoint: str, json_data: Optional[Dict] = None, **kwargs) -> httpx.Response:
        """PATCH request with connection pooling"""
        return await self.request("PATCH", endpoint, json_data=json_data, **kwargs)
    
    async def delete(self, endpoint: str, **kwargs) -> httpx.Response:
        """DELETE request with connection pooling"""
        return await self.request("DELETE", endpoint, **kwargs)
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        return {
            **self.stats,
            'max_connections': self.max_connections,
            'max_keepalive_connections': self.max_keepalive_connections,
            'is_initialized': self._is_initialized,
            'pool_utilization': (self.stats['active_connections'] / self.max_connections) * 100 if self.max_connections > 0 else 0
        }

class DatabaseConnectionManager:
    """
    Enhanced database connection manager with pooling and caching
    """
    
    def __init__(self, supabase_url: str, supabase_key: str, service_key: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.service_key = service_key
        
        # Connection pools for different types of operations
        self.read_pool: Optional[HTTPConnectionPool] = None
        self.write_pool: Optional[HTTPConnectionPool] = None
        self.admin_pool: Optional[HTTPConnectionPool] = None
        
        self._is_initialized = False
    
    async def initialize(self):
        """Initialize connection pools"""
        try:
            # Read pool (higher connection limit for read operations)
            self.read_pool = HTTPConnectionPool(
                base_url=f"{self.supabase_url}/rest/v1",
                api_key=self.supabase_key,
                max_connections=30,
                max_keepalive_connections=15,
                keepalive_expiry=60,
                timeout=30
            )
            
            # Write pool (moderate connection limit for write operations)
            self.write_pool = HTTPConnectionPool(
                base_url=f"{self.supabase_url}/rest/v1",
                api_key=self.service_key,
                max_connections=20,
                max_keepalive_connections=10,
                keepalive_expiry=30,
                timeout=45
            )
            
            # Admin pool (lower connection limit for admin operations)
            self.admin_pool = HTTPConnectionPool(
                base_url=f"{self.supabase_url}/rest/v1",
                api_key=self.service_key,
                max_connections=10,
                max_keepalive_connections=5,
                keepalive_expiry=30,
                timeout=60
            )
            
            # Initialize all pools
            await asyncio.gather(
                self.read_pool.initialize(),
                self.write_pool.initialize(),
                self.admin_pool.initialize()
            )
            
            self._is_initialized = True
            logger.info("✅ Database connection manager initialized with connection pools")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database connection manager: {e}")
            raise
    
    async def close(self):
        """Close all connection pools"""
        if self._is_initialized:
            await asyncio.gather(
                self.read_pool.close() if self.read_pool else asyncio.sleep(0),
                self.write_pool.close() if self.write_pool else asyncio.sleep(0),
                self.admin_pool.close() if self.admin_pool else asyncio.sleep(0)
            )
        self._is_initialized = False
    
    def get_read_pool(self) -> HTTPConnectionPool:
        """Get read connection pool"""
        if not self._is_initialized or not self.read_pool:
            raise RuntimeError("Database connection manager not initialized")
        return self.read_pool
    
    def get_write_pool(self) -> HTTPConnectionPool:
        """Get write connection pool"""
        if not self._is_initialized or not self.write_pool:
            raise RuntimeError("Database connection manager not initialized")
        return self.write_pool
    
    def get_admin_pool(self) -> HTTPConnectionPool:
        """Get admin connection pool"""
        if not self._is_initialized or not self.admin_pool:
            raise RuntimeError("Database connection manager not initialized")
        return self.admin_pool
    
    async def get_combined_stats(self) -> Dict[str, Any]:
        """Get statistics from all connection pools"""
        if not self._is_initialized:
            return {"error": "Connection manager not initialized"}
        
        read_stats = await self.read_pool.get_stats() if self.read_pool else {}
        write_stats = await self.write_pool.get_stats() if self.write_pool else {}
        admin_stats = await self.admin_pool.get_stats() if self.admin_pool else {}
        
        return {
            "read_pool": read_stats,
            "write_pool": write_stats,
            "admin_pool": admin_stats,
            "total_connections": (
                read_stats.get('active_connections', 0) +
                write_stats.get('active_connections', 0) +
                admin_stats.get('active_connections', 0)
            ),
            "total_requests": (
                read_stats.get('total_requests', 0) +
                write_stats.get('total_requests', 0) +
                admin_stats.get('total_requests', 0)
            )
        }

# Global connection manager instance
connection_manager: Optional[DatabaseConnectionManager] = None

def get_connection_manager() -> DatabaseConnectionManager:
    """Get the global connection manager instance"""
    global connection_manager
    if connection_manager is None:
        raise RuntimeError("Connection manager not initialized")
    return connection_manager

async def initialize_connection_manager(supabase_url: str, supabase_key: str, service_key: str):
    """Initialize the global connection manager"""
    global connection_manager
    connection_manager = DatabaseConnectionManager(supabase_url, supabase_key, service_key)
    await connection_manager.initialize()

# Connection pool decorators
def with_read_pool(func):
    """Decorator to inject read connection pool"""
    async def wrapper(*args, **kwargs):
        pool = get_connection_manager().get_read_pool()
        return await func(pool, *args, **kwargs)
    return wrapper

def with_write_pool(func):
    """Decorator to inject write connection pool"""
    async def wrapper(*args, **kwargs):
        pool = get_connection_manager().get_write_pool()
        return await func(pool, *args, **kwargs)
    return wrapper

def with_admin_pool(func):
    """Decorator to inject admin connection pool"""
    async def wrapper(*args, **kwargs):
        pool = get_connection_manager().get_admin_pool()
        return await func(pool, *args, **kwargs)
    return wrapper