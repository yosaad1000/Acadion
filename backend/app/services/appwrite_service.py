"""
Appwrite Service Layer

This service provides a centralized interface for all Appwrite database operations.
It handles client initialization, connection management, and basic CRUD operations
with proper error handling and logging.
"""

import logging
from typing import Dict, List, Optional, Any, Union
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.users import Users
from appwrite.services.storage import Storage
from appwrite.exception import AppwriteException
from appwrite.query import Query

from app.config import settings

logger = logging.getLogger(__name__)


class AppwriteServiceError(Exception):
    """Custom exception for Appwrite service errors"""
    pass


class AppwriteService:
    """
    Core Appwrite service for database operations.
    
    This service provides a singleton pattern for Appwrite client management
    and implements basic CRUD operations with comprehensive error handling.
    """
    
    _instance = None
    _client = None
    _databases = None
    _users = None
    _storage = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AppwriteService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize Appwrite client and services if not already initialized"""
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Appwrite client and service instances"""
        try:
            # Validate required configuration
            if not settings.APPWRITE_ENDPOINT:
                raise AppwriteServiceError("APPWRITE_ENDPOINT is required")
            if not settings.APPWRITE_PROJECT_ID:
                raise AppwriteServiceError("APPWRITE_PROJECT_ID is required")
            if not settings.APPWRITE_API_KEY:
                raise AppwriteServiceError("APPWRITE_API_KEY is required")
            
            # Initialize client
            self._client = Client()
            self._client.set_endpoint(settings.APPWRITE_ENDPOINT)
            self._client.set_project(settings.APPWRITE_PROJECT_ID)
            self._client.set_key(settings.APPWRITE_API_KEY)
            
            # Initialize services
            self._databases = Databases(self._client)
            self._users = Users(self._client)
            self._storage = Storage(self._client)
            
            logger.info("Appwrite client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Appwrite client: {e}")
            raise AppwriteServiceError(f"Appwrite initialization failed: {e}")
    
    @property
    def client(self) -> Client:
        """Get the Appwrite client instance"""
        return self._client
    
    @property
    def databases(self) -> Databases:
        """Get the Databases service instance"""
        return self._databases
    
    @property
    def users(self) -> Users:
        """Get the Users service instance"""
        return self._users
    
    @property
    def storage(self) -> Storage:
        """Get the Storage service instance"""
        return self._storage
    
    async def create_document(
        self,
        collection_id: str,
        data: Dict[str, Any],
        document_id: Optional[str] = None,
        database_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new document in the specified collection.
        
        Args:
            collection_id: The collection ID to create the document in
            data: The document data as a dictionary
            document_id: Optional document ID (uses 'unique()' if not provided)
            database_id: Optional database ID (uses default if not provided)
            
        Returns:
            Dict containing the created document data
            
        Raises:
            AppwriteServiceError: If the operation fails
        """
        try:
            db_id = database_id or settings.APPWRITE_DATABASE_ID
            doc_id = document_id or "unique()"
            
            logger.debug(f"Creating document in collection {collection_id}")
            
            result = self._databases.create_document(
                database_id=db_id,
                collection_id=collection_id,
                document_id=doc_id,
                data=data
            )
            
            logger.info(f"Document created successfully in {collection_id} with ID: {result['$id']}")
            return result
            
        except AppwriteException as e:
            logger.error(f"Appwrite error creating document: {e.message}")
            raise AppwriteServiceError(f"Failed to create document: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error creating document: {e}")
            raise AppwriteServiceError(f"Unexpected error creating document: {e}")
    
    async def get_document(
        self,
        collection_id: str,
        document_id: str,
        database_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve a document by ID from the specified collection.
        
        Args:
            collection_id: The collection ID to retrieve from
            document_id: The document ID to retrieve
            database_id: Optional database ID (uses default if not provided)
            
        Returns:
            Dict containing the document data
            
        Raises:
            AppwriteServiceError: If the operation fails or document not found
        """
        try:
            db_id = database_id or settings.APPWRITE_DATABASE_ID
            
            logger.debug(f"Retrieving document {document_id} from collection {collection_id}")
            
            result = self._databases.get_document(
                database_id=db_id,
                collection_id=collection_id,
                document_id=document_id
            )
            
            logger.debug(f"Document retrieved successfully: {document_id}")
            return result
            
        except AppwriteException as e:
            if e.code == 404:
                logger.warning(f"Document not found: {document_id} in {collection_id}")
                raise AppwriteServiceError(f"Document not found: {document_id}")
            logger.error(f"Appwrite error retrieving document: {e.message}")
            raise AppwriteServiceError(f"Failed to retrieve document: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error retrieving document: {e}")
            raise AppwriteServiceError(f"Unexpected error retrieving document: {e}")
    
    async def list_documents(
        self,
        collection_id: str,
        queries: Optional[List[str]] = None,
        database_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List documents from the specified collection with optional queries.
        
        Args:
            collection_id: The collection ID to list from
            queries: Optional list of query strings for filtering/sorting
            database_id: Optional database ID (uses default if not provided)
            
        Returns:
            List of dictionaries containing document data
            
        Raises:
            AppwriteServiceError: If the operation fails
        """
        try:
            db_id = database_id or settings.APPWRITE_DATABASE_ID
            queries = queries or []
            
            logger.debug(f"Listing documents from collection {collection_id} with {len(queries)} queries")
            
            result = self._databases.list_documents(
                database_id=db_id,
                collection_id=collection_id,
                queries=queries
            )
            
            documents = result.get('documents', [])
            logger.debug(f"Retrieved {len(documents)} documents from {collection_id}")
            return documents
            
        except AppwriteException as e:
            logger.error(f"Appwrite error listing documents: {e.message}")
            raise AppwriteServiceError(f"Failed to list documents: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error listing documents: {e}")
            raise AppwriteServiceError(f"Unexpected error listing documents: {e}")
    
    async def update_document(
        self,
        collection_id: str,
        document_id: str,
        data: Dict[str, Any],
        database_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing document in the specified collection.
        
        Args:
            collection_id: The collection ID containing the document
            document_id: The document ID to update
            data: The updated document data as a dictionary
            database_id: Optional database ID (uses default if not provided)
            
        Returns:
            Dict containing the updated document data
            
        Raises:
            AppwriteServiceError: If the operation fails or document not found
        """
        try:
            db_id = database_id or settings.APPWRITE_DATABASE_ID
            
            logger.debug(f"Updating document {document_id} in collection {collection_id}")
            
            result = self._databases.update_document(
                database_id=db_id,
                collection_id=collection_id,
                document_id=document_id,
                data=data
            )
            
            logger.info(f"Document updated successfully: {document_id}")
            return result
            
        except AppwriteException as e:
            if e.code == 404:
                logger.warning(f"Document not found for update: {document_id} in {collection_id}")
                raise AppwriteServiceError(f"Document not found for update: {document_id}")
            logger.error(f"Appwrite error updating document: {e.message}")
            raise AppwriteServiceError(f"Failed to update document: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error updating document: {e}")
            raise AppwriteServiceError(f"Unexpected error updating document: {e}")
    
    async def delete_document(
        self,
        collection_id: str,
        document_id: str,
        database_id: Optional[str] = None
    ) -> bool:
        """
        Delete a document from the specified collection.
        
        Args:
            collection_id: The collection ID containing the document
            document_id: The document ID to delete
            database_id: Optional database ID (uses default if not provided)
            
        Returns:
            True if deletion was successful
            
        Raises:
            AppwriteServiceError: If the operation fails or document not found
        """
        try:
            db_id = database_id or settings.APPWRITE_DATABASE_ID
            
            logger.debug(f"Deleting document {document_id} from collection {collection_id}")
            
            self._databases.delete_document(
                database_id=db_id,
                collection_id=collection_id,
                document_id=document_id
            )
            
            logger.info(f"Document deleted successfully: {document_id}")
            return True
            
        except AppwriteException as e:
            if e.code == 404:
                logger.warning(f"Document not found for deletion: {document_id} in {collection_id}")
                raise AppwriteServiceError(f"Document not found for deletion: {document_id}")
            logger.error(f"Appwrite error deleting document: {e.message}")
            raise AppwriteServiceError(f"Failed to delete document: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error deleting document: {e}")
            raise AppwriteServiceError(f"Unexpected error deleting document: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the Appwrite connection.
        
        Returns:
            Dict containing health status information
            
        Raises:
            AppwriteServiceError: If the health check fails
        """
        try:
            # Try to list databases to test connection
            result = self._databases.list()
            
            return {
                "status": "healthy",
                "endpoint": settings.APPWRITE_ENDPOINT,
                "project_id": settings.APPWRITE_PROJECT_ID,
                "databases_count": len(result.get('databases', [])),
                "timestamp": logger.handlers[0].formatter.formatTime(logger.makeRecord(
                    name="health_check", level=logging.INFO, fn="", lno=0,
                    msg="", args=(), exc_info=None
                )) if logger.handlers else "unknown"
            }
            
        except AppwriteException as e:
            logger.error(f"Appwrite health check failed: {e.message}")
            raise AppwriteServiceError(f"Health check failed: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error during health check: {e}")
            raise AppwriteServiceError(f"Unexpected health check error: {e}")


# Global instance - initialized lazily
appwrite_service = None

def get_appwrite_service() -> AppwriteService:
    """Get the global AppwriteService instance, initializing if necessary"""
    global appwrite_service
    if appwrite_service is None:
        appwrite_service = AppwriteService()
    return appwrite_service