"""
Unit tests for AppwriteService

Tests cover initialization, CRUD operations, error handling, and connection management.
Uses mocking to avoid actual Appwrite API calls during testing.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.appwrite_service import AppwriteService, AppwriteServiceError
from appwrite.exception import AppwriteException


class TestAppwriteServiceInitialization:
    """Test AppwriteService initialization and configuration"""
    
    @patch('app.services.appwrite_service.settings')
    @patch('app.services.appwrite_service.Client')
    def test_successful_initialization(self, mock_client_class, mock_settings):
        """Test successful service initialization with valid configuration"""
        # Setup
        mock_settings.APPWRITE_ENDPOINT = "http://localhost"
        mock_settings.APPWRITE_PROJECT_ID = "test-project"
        mock_settings.APPWRITE_API_KEY = "test-api-key"
        mock_settings.APPWRITE_DATABASE_ID = "main"
        
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Reset singleton instance for testing
        AppwriteService._instance = None
        AppwriteService._client = None
        
        # Execute
        service = AppwriteService()
        
        # Verify
        assert service._client is not None
        mock_client.set_endpoint.assert_called_once_with("http://localhost")
        mock_client.set_project.assert_called_once_with("test-project")
        mock_client.set_key.assert_called_once_with("test-api-key")
    
    @patch('app.services.appwrite_service.settings')
    def test_missing_endpoint_configuration(self, mock_settings):
        """Test initialization failure when APPWRITE_ENDPOINT is missing"""
        # Setup
        mock_settings.APPWRITE_ENDPOINT = ""
        mock_settings.APPWRITE_PROJECT_ID = "test-project"
        mock_settings.APPWRITE_API_KEY = "test-api-key"
        
        # Reset singleton instance for testing
        AppwriteService._instance = None
        AppwriteService._client = None
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="APPWRITE_ENDPOINT is required"):
            AppwriteService()
    
    @patch('app.services.appwrite_service.settings')
    def test_missing_project_id_configuration(self, mock_settings):
        """Test initialization failure when APPWRITE_PROJECT_ID is missing"""
        # Setup
        mock_settings.APPWRITE_ENDPOINT = "http://localhost"
        mock_settings.APPWRITE_PROJECT_ID = ""
        mock_settings.APPWRITE_API_KEY = "test-api-key"
        
        # Reset singleton instance for testing
        AppwriteService._instance = None
        AppwriteService._client = None
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="APPWRITE_PROJECT_ID is required"):
            AppwriteService()
    
    @patch('app.services.appwrite_service.settings')
    def test_missing_api_key_configuration(self, mock_settings):
        """Test initialization failure when APPWRITE_API_KEY is missing"""
        # Setup
        mock_settings.APPWRITE_ENDPOINT = "http://localhost"
        mock_settings.APPWRITE_PROJECT_ID = "test-project"
        mock_settings.APPWRITE_API_KEY = ""
        
        # Reset singleton instance for testing
        AppwriteService._instance = None
        AppwriteService._client = None
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="APPWRITE_API_KEY is required"):
            AppwriteService()
    
    @patch('app.services.appwrite_service.settings')
    @patch('app.services.appwrite_service.Client')
    def test_singleton_pattern(self, mock_client_class, mock_settings):
        """Test that AppwriteService follows singleton pattern"""
        # Setup
        mock_settings.APPWRITE_ENDPOINT = "http://localhost"
        mock_settings.APPWRITE_PROJECT_ID = "test-project"
        mock_settings.APPWRITE_API_KEY = "test-api-key"
        
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Reset singleton instance for testing
        AppwriteService._instance = None
        AppwriteService._client = None
        
        # Execute
        service1 = AppwriteService()
        service2 = AppwriteService()
        
        # Verify
        assert service1 is service2
        assert mock_client_class.call_count == 1  # Client should only be initialized once


class TestAppwriteServiceCRUDOperations:
    """Test CRUD operations of AppwriteService"""
    
    def setup_method(self):
        """Setup method to create a properly mocked service instance"""
        with patch('app.services.appwrite_service.settings') as mock_settings:
            mock_settings.APPWRITE_ENDPOINT = "http://localhost"
            mock_settings.APPWRITE_PROJECT_ID = "test-project"
            mock_settings.APPWRITE_API_KEY = "test-api-key"
            mock_settings.APPWRITE_DATABASE_ID = "main"
            
            # Reset singleton for each test
            AppwriteService._instance = None
            AppwriteService._client = None
            
            with patch('app.services.appwrite_service.Client'):
                self.service = AppwriteService()
                
                # Mock the databases service
                self.mock_databases = Mock()
                self.service._databases = self.mock_databases
    
    @pytest.mark.asyncio
    async def test_create_document_success(self):
        """Test successful document creation"""
        # Setup
        test_data = {"name": "Test User", "email": "test@example.com"}
        expected_result = {"$id": "doc123", **test_data}
        self.mock_databases.create_document.return_value = expected_result
        
        # Execute
        result = await self.service.create_document("users", test_data)
        
        # Verify
        assert result == expected_result
        self.mock_databases.create_document.assert_called_once_with(
            database_id="main",
            collection_id="users",
            document_id="unique()",
            data=test_data
        )
    
    @pytest.mark.asyncio
    async def test_create_document_with_custom_id(self):
        """Test document creation with custom document ID"""
        # Setup
        test_data = {"name": "Test User"}
        custom_id = "custom123"
        expected_result = {"$id": custom_id, **test_data}
        self.mock_databases.create_document.return_value = expected_result
        
        # Execute
        result = await self.service.create_document("users", test_data, document_id=custom_id)
        
        # Verify
        assert result == expected_result
        self.mock_databases.create_document.assert_called_once_with(
            database_id="main",
            collection_id="users",
            document_id=custom_id,
            data=test_data
        )
    
    @pytest.mark.asyncio
    async def test_create_document_appwrite_exception(self):
        """Test document creation with Appwrite exception"""
        # Setup
        test_data = {"name": "Test User"}
        self.mock_databases.create_document.side_effect = AppwriteException("Database error", 500)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Failed to create document: Database error"):
            await self.service.create_document("users", test_data)
    
    @pytest.mark.asyncio
    async def test_get_document_success(self):
        """Test successful document retrieval"""
        # Setup
        document_id = "doc123"
        expected_result = {"$id": document_id, "name": "Test User"}
        self.mock_databases.get_document.return_value = expected_result
        
        # Execute
        result = await self.service.get_document("users", document_id)
        
        # Verify
        assert result == expected_result
        self.mock_databases.get_document.assert_called_once_with(
            database_id="main",
            collection_id="users",
            document_id=document_id
        )
    
    @pytest.mark.asyncio
    async def test_get_document_not_found(self):
        """Test document retrieval when document doesn't exist"""
        # Setup
        document_id = "nonexistent"
        self.mock_databases.get_document.side_effect = AppwriteException("Not found", 404)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Document not found: nonexistent"):
            await self.service.get_document("users", document_id)
    
    @pytest.mark.asyncio
    async def test_list_documents_success(self):
        """Test successful document listing"""
        # Setup
        expected_documents = [
            {"$id": "doc1", "name": "User 1"},
            {"$id": "doc2", "name": "User 2"}
        ]
        expected_result = {"documents": expected_documents}
        self.mock_databases.list_documents.return_value = expected_result
        
        # Execute
        result = await self.service.list_documents("users")
        
        # Verify
        assert result == expected_documents
        self.mock_databases.list_documents.assert_called_once_with(
            database_id="main",
            collection_id="users",
            queries=[]
        )
    
    @pytest.mark.asyncio
    async def test_list_documents_with_queries(self):
        """Test document listing with query filters"""
        # Setup
        queries = ["equal('status', 'active')", "limit(10)"]
        expected_documents = [{"$id": "doc1", "name": "Active User"}]
        expected_result = {"documents": expected_documents}
        self.mock_databases.list_documents.return_value = expected_result
        
        # Execute
        result = await self.service.list_documents("users", queries=queries)
        
        # Verify
        assert result == expected_documents
        self.mock_databases.list_documents.assert_called_once_with(
            database_id="main",
            collection_id="users",
            queries=queries
        )
    
    @pytest.mark.asyncio
    async def test_update_document_success(self):
        """Test successful document update"""
        # Setup
        document_id = "doc123"
        update_data = {"name": "Updated User"}
        expected_result = {"$id": document_id, **update_data}
        self.mock_databases.update_document.return_value = expected_result
        
        # Execute
        result = await self.service.update_document("users", document_id, update_data)
        
        # Verify
        assert result == expected_result
        self.mock_databases.update_document.assert_called_once_with(
            database_id="main",
            collection_id="users",
            document_id=document_id,
            data=update_data
        )
    
    @pytest.mark.asyncio
    async def test_update_document_not_found(self):
        """Test document update when document doesn't exist"""
        # Setup
        document_id = "nonexistent"
        update_data = {"name": "Updated User"}
        self.mock_databases.update_document.side_effect = AppwriteException("Not found", 404)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Document not found for update: nonexistent"):
            await self.service.update_document("users", document_id, update_data)
    
    @pytest.mark.asyncio
    async def test_delete_document_success(self):
        """Test successful document deletion"""
        # Setup
        document_id = "doc123"
        self.mock_databases.delete_document.return_value = None
        
        # Execute
        result = await self.service.delete_document("users", document_id)
        
        # Verify
        assert result is True
        self.mock_databases.delete_document.assert_called_once_with(
            database_id="main",
            collection_id="users",
            document_id=document_id
        )
    
    @pytest.mark.asyncio
    async def test_delete_document_not_found(self):
        """Test document deletion when document doesn't exist"""
        # Setup
        document_id = "nonexistent"
        self.mock_databases.delete_document.side_effect = AppwriteException("Not found", 404)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Document not found for deletion: nonexistent"):
            await self.service.delete_document("users", document_id)


class TestAppwriteServiceHealthCheck:
    """Test health check functionality"""
    
    def setup_method(self):
        """Setup method to create a properly mocked service instance"""
        with patch('app.services.appwrite_service.settings') as mock_settings:
            mock_settings.APPWRITE_ENDPOINT = "http://localhost"
            mock_settings.APPWRITE_PROJECT_ID = "test-project"
            mock_settings.APPWRITE_API_KEY = "test-api-key"
            mock_settings.APPWRITE_DATABASE_ID = "main"
            
            # Reset singleton for each test
            AppwriteService._instance = None
            AppwriteService._client = None
            
            with patch('app.services.appwrite_service.Client'):
                self.service = AppwriteService()
                
                # Mock the databases service
                self.mock_databases = Mock()
                self.service._databases = self.mock_databases
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check"""
        # Setup
        mock_databases_list = {"databases": [{"$id": "main"}, {"$id": "test"}]}
        self.mock_databases.list.return_value = mock_databases_list
        
        # Execute
        result = await self.service.health_check()
        
        # Verify
        assert result["status"] == "healthy"
        assert result["endpoint"] == "http://localhost"
        # Note: project_id will be from actual environment, so we just check it exists
        assert "project_id" in result
        assert result["databases_count"] == 2
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test health check failure"""
        # Setup
        self.mock_databases.list.side_effect = AppwriteException("Connection failed", 500)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Health check failed: Connection failed"):
            await self.service.health_check()


class TestAppwriteServiceErrorHandling:
    """Test error handling scenarios"""
    
    def setup_method(self):
        """Setup method to create a properly mocked service instance"""
        with patch('app.services.appwrite_service.settings') as mock_settings:
            mock_settings.APPWRITE_ENDPOINT = "http://localhost"
            mock_settings.APPWRITE_PROJECT_ID = "test-project"
            mock_settings.APPWRITE_API_KEY = "test-api-key"
            mock_settings.APPWRITE_DATABASE_ID = "main"
            
            # Reset singleton for each test
            AppwriteService._instance = None
            AppwriteService._client = None
            
            with patch('app.services.appwrite_service.Client'):
                self.service = AppwriteService()
                
                # Mock the databases service
                self.mock_databases = Mock()
                self.service._databases = self.mock_databases
    
    @pytest.mark.asyncio
    async def test_generic_exception_handling(self):
        """Test handling of generic (non-Appwrite) exceptions"""
        # Setup
        self.mock_databases.create_document.side_effect = ValueError("Invalid data")
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Unexpected error creating document: Invalid data"):
            await self.service.create_document("users", {"name": "Test"})
    
    @pytest.mark.asyncio
    async def test_appwrite_exception_with_different_codes(self):
        """Test handling of different Appwrite exception codes"""
        # Setup - Test 400 error
        self.mock_databases.get_document.side_effect = AppwriteException("Bad request", 400)
        
        # Execute & Verify
        with pytest.raises(AppwriteServiceError, match="Failed to retrieve document: Bad request"):
            await self.service.get_document("users", "doc123")
    
    @pytest.mark.asyncio
    async def test_custom_database_id(self):
        """Test operations with custom database ID"""
        # Setup
        custom_db_id = "custom_db"
        test_data = {"name": "Test User"}
        expected_result = {"$id": "doc123", **test_data}
        self.mock_databases.create_document.return_value = expected_result
        
        # Execute
        result = await self.service.create_document("users", test_data, database_id=custom_db_id)
        
        # Verify
        assert result == expected_result
        self.mock_databases.create_document.assert_called_once_with(
            database_id=custom_db_id,
            collection_id="users",
            document_id="unique()",
            data=test_data
        )


# Integration test fixtures and utilities
@pytest.fixture
def mock_appwrite_service():
    """Fixture to provide a mocked AppwriteService instance"""
    with patch('app.services.appwrite_service.settings') as mock_settings:
        mock_settings.APPWRITE_ENDPOINT = "http://localhost"
        mock_settings.APPWRITE_PROJECT_ID = "test-project"
        mock_settings.APPWRITE_API_KEY = "test-api-key"
        mock_settings.APPWRITE_DATABASE_ID = "main"
        
        # Reset singleton
        AppwriteService._instance = None
        AppwriteService._client = None
        
        with patch('app.services.appwrite_service.Client'):
            service = AppwriteService()
            service._databases = Mock()
            service._users = Mock()
            service._storage = Mock()
            yield service


@pytest.fixture
def sample_user_data():
    """Fixture providing sample user data for tests"""
    return {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "user_type": "student",
        "is_active": True
    }


@pytest.fixture
def sample_class_data():
    """Fixture providing sample class data for tests"""
    return {
        "name": "Mathematics 101",
        "description": "Introduction to Mathematics",
        "teacher_id": "teacher123",
        "class_code": "MATH101",
        "is_active": True
    }