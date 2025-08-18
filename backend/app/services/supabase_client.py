"""
Supabase Client Service
Provides a centralized Supabase client instance for the application
"""

import logging
from typing import Optional
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger(__name__)

class SupabaseClientService:
    """Singleton service for Supabase client management"""
    
    _instance: Optional['SupabaseClientService'] = None
    _client: Optional[Client] = None
    
    def __new__(cls) -> 'SupabaseClientService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the Supabase client"""
        try:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
            
            self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance"""
        if self._client is None:
            self._initialize_client()
        return self._client
    
    def get_client(self) -> Client:
        """Get the Supabase client instance (alternative method)"""
        return self.client
    
    async def health_check(self) -> bool:
        """Check if the Supabase connection is healthy"""
        try:
            # Simple query to test connection
            result = self.client.table('departments').select('dept_id').limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Supabase health check failed: {e}")
            return False

# Global instance
supabase_service = SupabaseClientService()

def get_supabase_client() -> Client:
    """Get the global Supabase client instance"""
    return supabase_service.client