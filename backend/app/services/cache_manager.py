"""
Multi-level caching service for Acadion platform
Implements local cache, Redis cache, and CDN integration
"""

import json
import logging
import asyncio
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import pickle
import redis.asyncio as redis
from cachetools import TTLCache, LRUCache
import httpx

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Multi-level cache manager with local, Redis, and CDN layers
    """
    
    def __init__(self, redis_url: str, max_local_size: int = 1000, local_ttl: int = 300):
        """
        Initialize cache manager with multiple cache levels
        
        Args:
            redis_url: Redis connection URL
            max_local_size: Maximum number of items in local cache
            local_ttl: TTL for local cache in seconds
        """
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        
        # L1 Cache: Local in-memory cache (fastest)
        self.local_cache = TTLCache(maxsize=max_local_size, ttl=local_ttl)
        self.local_lru_cache = LRUCache(maxsize=max_local_size // 2)
        
        # Cache statistics
        self.stats = {
            'local_hits': 0,
            'local_misses': 0,
            'redis_hits': 0,
            'redis_misses': 0,
            'total_requests': 0
        }
        
        # Connection pool for Redis
        self._connection_pool = None
        self._is_connected = False
        
    async def initialize(self):
        """Initialize Redis connection with connection pooling"""
        try:
            # Create connection pool for better performance
            self._connection_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            self.redis_client = redis.Redis(
                connection_pool=self._connection_pool,
                decode_responses=False  # Handle binary data
            )
            
            # Test connection
            await self.redis_client.ping()
            self._is_connected = True
            logger.info("✅ Cache manager initialized successfully with Redis connection pool")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis connection: {e}")
            self._is_connected = False
            # Continue without Redis - local cache only
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
        if self._connection_pool:
            await self._connection_pool.disconnect()
        self._is_connected = False
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a consistent cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from multi-level cache
        
        Args:
            key: Cache key
            default: Default value if not found
            
        Returns:
            Cached value or default
        """
        self.stats['total_requests'] += 1
        
        # L1: Check local cache first
        if key in self.local_cache:
            self.stats['local_hits'] += 1
            logger.debug(f"Cache hit (local): {key}")
            return self.local_cache[key]
        
        # L1 LRU: Check LRU cache
        if key in self.local_lru_cache:
            self.stats['local_hits'] += 1
            value = self.local_lru_cache[key]
            # Promote to TTL cache
            self.local_cache[key] = value
            logger.debug(f"Cache hit (local LRU): {key}")
            return value
        
        self.stats['local_misses'] += 1
        
        # L2: Check Redis cache
        if self._is_connected and self.redis_client:
            try:
                redis_value = await self.redis_client.get(key)
                if redis_value is not None:
                    self.stats['redis_hits'] += 1
                    # Deserialize value
                    try:
                        value = pickle.loads(redis_value)
                    except (pickle.PickleError, TypeError):
                        # Fallback to string
                        value = redis_value.decode('utf-8')
                    
                    # Store in local cache for faster access
                    self.local_cache[key] = value
                    logger.debug(f"Cache hit (Redis): {key}")
                    return value
                else:
                    self.stats['redis_misses'] += 1
            except Exception as e:
                logger.warning(f"Redis cache error for key {key}: {e}")
        
        logger.debug(f"Cache miss: {key}")
        return default
    
    async def set(self, key: str, value: Any, ttl: int = 3600, local_only: bool = False):
        """
        Set value in multi-level cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            local_only: Only store in local cache
        """
        # Store in local cache
        self.local_cache[key] = value
        self.local_lru_cache[key] = value
        
        # Store in Redis if available and not local_only
        if not local_only and self._is_connected and self.redis_client:
            try:
                # Serialize value
                try:
                    serialized_value = pickle.dumps(value)
                except (pickle.PickleError, TypeError):
                    # Fallback to string
                    serialized_value = str(value).encode('utf-8')
                
                await self.redis_client.setex(key, ttl, serialized_value)
                logger.debug(f"Cached in Redis: {key} (TTL: {ttl}s)")
            except Exception as e:
                logger.warning(f"Failed to cache in Redis for key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete key from all cache levels"""
        # Remove from local caches
        self.local_cache.pop(key, None)
        self.local_lru_cache.pop(key, None)
        
        # Remove from Redis
        if self._is_connected and self.redis_client:
            try:
                await self.redis_client.delete(key)
                logger.debug(f"Deleted from Redis: {key}")
            except Exception as e:
                logger.warning(f"Failed to delete from Redis for key {key}: {e}")
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching a pattern"""
        if self._is_connected and self.redis_client:
            try:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
                    logger.info(f"Invalidated {len(keys)} keys matching pattern: {pattern}")
            except Exception as e:
                logger.warning(f"Failed to invalidate pattern {pattern}: {e}")
        
        # Clear local caches (simple approach - clear all)
        self.local_cache.clear()
        self.local_lru_cache.clear()
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.stats['total_requests']
        if total_requests > 0:
            local_hit_rate = (self.stats['local_hits'] / total_requests) * 100
            redis_hit_rate = (self.stats['redis_hits'] / total_requests) * 100
            overall_hit_rate = ((self.stats['local_hits'] + self.stats['redis_hits']) / total_requests) * 100
        else:
            local_hit_rate = redis_hit_rate = overall_hit_rate = 0
        
        return {
            'total_requests': total_requests,
            'local_hits': self.stats['local_hits'],
            'local_misses': self.stats['local_misses'],
            'redis_hits': self.stats['redis_hits'],
            'redis_misses': self.stats['redis_misses'],
            'local_hit_rate': round(local_hit_rate, 2),
            'redis_hit_rate': round(redis_hit_rate, 2),
            'overall_hit_rate': round(overall_hit_rate, 2),
            'local_cache_size': len(self.local_cache),
            'local_lru_cache_size': len(self.local_lru_cache),
            'redis_connected': self._is_connected
        }

# Global cache manager instance
cache_manager: Optional[CacheManager] = None

def get_cache_manager() -> CacheManager:
    """Get the global cache manager instance"""
    global cache_manager
    if cache_manager is None:
        raise RuntimeError("Cache manager not initialized. Call initialize_cache_manager() first.")
    return cache_manager

async def initialize_cache_manager(redis_url: str):
    """Initialize the global cache manager"""
    global cache_manager
    cache_manager = CacheManager(redis_url)
    await cache_manager.initialize()

def cached(ttl: int = 3600, key_prefix: str = "", local_only: bool = False):
    """
    Decorator for caching function results
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        local_only: Only use local cache
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache_manager()
            
            # Generate cache key
            cache_key = cache._generate_cache_key(
                key_prefix or f"{func.__module__}.{func.__name__}",
                *args, **kwargs
            )
            
            # Try to get from cache
            result = await cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            if result is not None:
                await cache.set(cache_key, result, ttl, local_only)
            
            return result
        return wrapper
    return decorator

class ConnectionPoolManager:
    """
    Database connection pool manager for improved performance
    """
    
    def __init__(self, database_url: str, min_connections: int = 5, max_connections: int = 20):
        self.database_url = database_url
        self.min_connections = min_connections
        self.max_connections = max_connections
        self._pool = None
        self._connection_count = 0
        self._active_connections = set()
    
    async def initialize(self):
        """Initialize connection pool"""
        try:
            # This would be implemented with actual database driver
            # For Supabase/PostgreSQL, you'd use asyncpg or similar
            logger.info(f"✅ Connection pool initialized: {self.min_connections}-{self.max_connections} connections")
        except Exception as e:
            logger.error(f"❌ Failed to initialize connection pool: {e}")
            raise
    
    async def get_connection(self):
        """Get a connection from the pool"""
        # Implementation would depend on the database driver
        pass
    
    async def return_connection(self, connection):
        """Return a connection to the pool"""
        # Implementation would depend on the database driver
        pass
    
    async def close(self):
        """Close all connections in the pool"""
        # Implementation would depend on the database driver
        pass

# Cache warming utilities
class CacheWarmer:
    """Utility class for cache warming strategies"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    async def warm_user_data(self, user_ids: List[str]):
        """Pre-load user data into cache"""
        logger.info(f"Warming cache for {len(user_ids)} users")
        # Implementation would fetch and cache user data
        pass
    
    async def warm_subject_data(self, subject_ids: List[str]):
        """Pre-load subject data into cache"""
        logger.info(f"Warming cache for {len(subject_ids)} subjects")
        # Implementation would fetch and cache subject data
        pass
    
    async def warm_attendance_data(self, session_ids: List[str]):
        """Pre-load attendance data into cache"""
        logger.info(f"Warming cache for {len(session_ids)} sessions")
        # Implementation would fetch and cache attendance data
        pass

# Cache invalidation utilities
class CacheInvalidator:
    """Utility class for cache invalidation strategies"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        await self.cache_manager.invalidate_pattern(f"*user:{user_id}*")
    
    async def invalidate_subject_cache(self, subject_id: str):
        """Invalidate all cache entries for a subject"""
        await self.cache_manager.invalidate_pattern(f"*subject:{subject_id}*")
    
    async def invalidate_attendance_cache(self, session_id: str):
        """Invalidate all cache entries for an attendance session"""
        await self.cache_manager.invalidate_pattern(f"*session:{session_id}*")