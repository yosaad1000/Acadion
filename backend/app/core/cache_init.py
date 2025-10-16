"""
Cache and connection pool initialization module
Handles startup and shutdown of caching services
"""

import logging
import asyncio
from typing import Optional
from app.services.cache_manager import (
    CacheManager, 
    initialize_cache_manager, 
    get_cache_manager,
    CacheWarmer,
    CacheInvalidator
)
from app.services.connection_pool import (
    DatabaseConnectionManager,
    initialize_connection_manager,
    get_connection_manager
)
from app.settings import settings

logger = logging.getLogger(__name__)

class CacheInitializer:
    """
    Manages initialization and lifecycle of caching and connection pooling services
    """
    
    def __init__(self):
        self.cache_manager: Optional[CacheManager] = None
        self.connection_manager: Optional[DatabaseConnectionManager] = None
        self.cache_warmer: Optional[CacheWarmer] = None
        self.cache_invalidator: Optional[CacheInvalidator] = None
        self._initialized = False
    
    async def initialize(self) -> bool:
        """
        Initialize all caching and connection pooling services
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            logger.info("🚀 Initializing caching and connection pooling services...")
            
            # Initialize cache manager with Redis
            await self._initialize_cache_manager()
            
            # Initialize database connection manager
            await self._initialize_connection_manager()
            
            # Initialize cache utilities
            await self._initialize_cache_utilities()
            
            # Perform cache warming for critical data
            await self._perform_initial_cache_warming()
            
            self._initialized = True
            logger.info("✅ Caching and connection pooling services initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize caching services: {e}")
            return False
    
    async def _initialize_cache_manager(self):
        """Initialize the cache manager with Redis connection"""
        try:
            # Initialize global cache manager
            await initialize_cache_manager(settings.REDIS_URL)
            
            # Get reference to initialized cache manager
            self.cache_manager = get_cache_manager()
            
            logger.info(f"✅ Cache manager initialized with Redis URL: {settings.REDIS_URL}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache manager: {e}")
            # Continue without Redis - local cache only
            logger.warning("Continuing with local cache only")
    
    async def _initialize_connection_manager(self):
        """Initialize the database connection manager"""
        try:
            # Initialize global connection manager
            await initialize_connection_manager(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_KEY,
                service_key=settings.SUPABASE_SERVICE_KEY
            )
            
            # Get reference to initialized connection manager
            self.connection_manager = get_connection_manager()
            
            logger.info("✅ Database connection manager initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize connection manager: {e}")
            raise
    
    async def _initialize_cache_utilities(self):
        """Initialize cache warming and invalidation utilities"""
        try:
            if self.cache_manager:
                self.cache_warmer = CacheWarmer(self.cache_manager)
                self.cache_invalidator = CacheInvalidator(self.cache_manager)
                logger.info("✅ Cache utilities initialized")
            else:
                logger.warning("Cache utilities not initialized - cache manager unavailable")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache utilities: {e}")
    
    async def _perform_initial_cache_warming(self):
        """Perform initial cache warming for critical data"""
        try:
            if not self.cache_warmer:
                logger.info("Skipping cache warming - cache warmer not available")
                return
            
            logger.info("🔥 Starting initial cache warming...")
            
            # Warm cache with frequently accessed data
            # This is a placeholder - implement based on your application's needs
            
            # Example: Warm user data cache
            # await self.cache_warmer.warm_user_data(["user1", "user2"])
            
            # Example: Warm subject data cache
            # await self.cache_warmer.warm_subject_data(["subject1", "subject2"])
            
            logger.info("✅ Initial cache warming completed")
            
        except Exception as e:
            logger.error(f"❌ Cache warming failed: {e}")
            # Don't fail initialization if cache warming fails
    
    async def shutdown(self):
        """Shutdown all caching and connection services"""
        try:
            logger.info("🛑 Shutting down caching and connection services...")
            
            # Close cache manager
            if self.cache_manager:
                await self.cache_manager.close()
                logger.info("Cache manager closed")
            
            # Close connection manager
            if self.connection_manager:
                await self.connection_manager.close()
                logger.info("Connection manager closed")
            
            self._initialized = False
            logger.info("✅ Caching and connection services shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {e}")
    
    def is_initialized(self) -> bool:
        """Check if services are initialized"""
        return self._initialized
    
    async def get_health_status(self) -> dict:
        """Get health status of all caching services"""
        try:
            status = {
                "initialized": self._initialized,
                "cache_manager": None,
                "connection_manager": None,
                "redis_connected": False
            }
            
            # Cache manager status
            if self.cache_manager:
                cache_stats = await self.cache_manager.get_stats()
                status["cache_manager"] = {
                    "available": True,
                    "redis_connected": cache_stats.get("redis_connected", False),
                    "local_cache_size": cache_stats.get("local_cache_size", 0),
                    "hit_rate": cache_stats.get("overall_hit_rate", 0)
                }
                status["redis_connected"] = cache_stats.get("redis_connected", False)
            else:
                status["cache_manager"] = {"available": False}
            
            # Connection manager status
            if self.connection_manager:
                conn_stats = await self.connection_manager.get_combined_stats()
                status["connection_manager"] = {
                    "available": True,
                    "total_connections": conn_stats.get("total_connections", 0),
                    "total_requests": conn_stats.get("total_requests", 0)
                }
            else:
                status["connection_manager"] = {"available": False}
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting health status: {e}")
            return {
                "initialized": self._initialized,
                "error": str(e)
            }

# Global cache initializer instance
_cache_initializer: Optional[CacheInitializer] = None

def get_cache_initializer() -> CacheInitializer:
    """Get the global cache initializer instance"""
    global _cache_initializer
    if _cache_initializer is None:
        _cache_initializer = CacheInitializer()
    return _cache_initializer

async def initialize_caching_services() -> bool:
    """Initialize all caching services"""
    initializer = get_cache_initializer()
    return await initializer.initialize()

async def shutdown_caching_services():
    """Shutdown all caching services"""
    initializer = get_cache_initializer()
    await initializer.shutdown()

async def get_caching_health_status() -> dict:
    """Get health status of caching services"""
    initializer = get_cache_initializer()
    return await initializer.get_health_status()