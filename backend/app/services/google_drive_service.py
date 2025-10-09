import httpx
import logging
from typing import Dict, Any, Optional, List
from uuid import UUID
from app.config import settings
from app.models.google_integration import GoogleDriveFolder, GoogleDriveFile
from app.services.google_oauth import google_integration_service

logger = logging.getLogger(__name__)

class GoogleDriveService:
    """Google Drive integration service"""
    
    def __init__(self):
        try:
            self.base_url = "https://www.googleapis.com/drive/v3"
            self.upload_url = "https://www.googleapis.com/upload/drive/v3"
            self._connection_healthy = True
            logger.info("✅ Google Drive Service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing Google Drive Service: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize Google Drive Service: {e}")
    
    async def _get_auth_headers(self, user_id: UUID) -> Optional[Dict[str, str]]:
        """Get authenticated headers for Google Drive API"""
        try:
            access_token = await google_integration_service.get_valid_access_token(user_id)
            if not access_token:
                logger.error(f"❌ No valid access token for user: {user_id}")
                return None
            
            return {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
        except Exception as e:
            logger.error(f"❌ Error getting auth headers: {e}")
            return None
    
    async def create_folder(self, user_id: UUID, folder: GoogleDriveFolder) -> Optional[Dict[str, Any]]:
        """Create a folder in Google Drive"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            folder_metadata = {
                "name": folder.name,
                "mimeType": "application/vnd.google-apps.folder"
            }
            
            # Set parent folder if specified
            if folder.parent_folder_id:
                folder_metadata["parents"] = [folder.parent_folder_id]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/files",
                    headers=headers,
                    json=folder_metadata
                )
                
                if response.status_code == 200:
                    created_folder = response.json()
                    logger.info(f"✅ Created Drive folder: {created_folder.get('id')} for user: {user_id}")
                    return created_folder
                else:
                    logger.error(f"❌ Failed to create Drive folder: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error creating Drive folder: {e}")
            return None
    
    async def get_folder_contents(self, user_id: UUID, folder_id: str) -> List[Dict[str, Any]]:
        """Get contents of a Google Drive folder"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return []
            
            params = {
                "q": f"'{folder_id}' in parents and trashed=false",
                "fields": "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)",
                "orderBy": "name"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/files",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    files_data = response.json()
                    files = files_data.get("files", [])
                    logger.info(f"✅ Retrieved {len(files)} files from folder: {folder_id} for user: {user_id}")
                    return files
                else:
                    logger.error(f"❌ Failed to get folder contents: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error getting folder contents: {e}")
            return []
    
    async def share_folder(self, user_id: UUID, folder_id: str, email_addresses: List[str], role: str = "reader") -> bool:
        """Share a Google Drive folder with specified users"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return False
            
            success_count = 0
            
            for email in email_addresses:
                permission_data = {
                    "type": "user",
                    "role": role,  # "reader", "writer", "commenter"
                    "emailAddress": email
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/files/{folder_id}/permissions",
                        headers=headers,
                        json=permission_data
                    )
                    
                    if response.status_code == 200:
                        success_count += 1
                        logger.info(f"✅ Shared folder {folder_id} with {email}")
                    else:
                        logger.error(f"❌ Failed to share folder with {email}: {response.status_code} - {response.text}")
            
            return success_count == len(email_addresses)
            
        except Exception as e:
            logger.error(f"❌ Error sharing folder: {e}")
            return False
    
    async def create_class_folder(self, user_id: UUID, class_name: str) -> Optional[Dict[str, Any]]:
        """Create a folder structure for a class"""
        try:
            # Create main class folder
            class_folder = GoogleDriveFolder(name=f"📚 {class_name}")
            main_folder = await self.create_folder(user_id, class_folder)
            
            if not main_folder:
                return None
            
            main_folder_id = main_folder["id"]
            
            # Create subfolders
            subfolders = [
                "📝 Assignments",
                "📋 Materials", 
                "📊 Submissions",
                "📹 Recordings"
            ]
            
            created_subfolders = {}
            
            for subfolder_name in subfolders:
                subfolder = GoogleDriveFolder(
                    name=subfolder_name,
                    parent_folder_id=main_folder_id
                )
                created_subfolder = await self.create_folder(user_id, subfolder)
                if created_subfolder:
                    created_subfolders[subfolder_name] = created_subfolder["id"]
            
            logger.info(f"✅ Created class folder structure for: {class_name}")
            
            return {
                "main_folder": main_folder,
                "subfolders": created_subfolders,
                "folder_structure": {
                    "class_folder_id": main_folder_id,
                    "assignments_folder_id": created_subfolders.get("📝 Assignments"),
                    "materials_folder_id": created_subfolders.get("📋 Materials"),
                    "submissions_folder_id": created_subfolders.get("📊 Submissions"),
                    "recordings_folder_id": created_subfolders.get("📹 Recordings")
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating class folder: {e}")
            return None
    
    async def create_assignment_folder(self, user_id: UUID, assignment_name: str, class_folder_id: str) -> Optional[Dict[str, Any]]:
        """Create a folder for an assignment within a class"""
        try:
            # Find the assignments subfolder
            folder_contents = await self.get_folder_contents(user_id, class_folder_id)
            assignments_folder_id = None
            
            for item in folder_contents:
                if item.get("name") == "📝 Assignments" and item.get("mimeType") == "application/vnd.google-apps.folder":
                    assignments_folder_id = item["id"]
                    break
            
            if not assignments_folder_id:
                # Create assignments folder if it doesn't exist
                assignments_folder = GoogleDriveFolder(
                    name="📝 Assignments",
                    parent_folder_id=class_folder_id
                )
                created_assignments_folder = await self.create_folder(user_id, assignments_folder)
                if created_assignments_folder:
                    assignments_folder_id = created_assignments_folder["id"]
                else:
                    return None
            
            # Create assignment folder
            assignment_folder = GoogleDriveFolder(
                name=f"📄 {assignment_name}",
                parent_folder_id=assignments_folder_id
            )
            
            created_folder = await self.create_folder(user_id, assignment_folder)
            
            if created_folder:
                logger.info(f"✅ Created assignment folder: {assignment_name}")
                return {
                    "folder": created_folder,
                    "folder_id": created_folder["id"],
                    "web_view_link": created_folder.get("webViewLink")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error creating assignment folder: {e}")
            return None
    
    async def get_file_info(self, user_id: UUID, file_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific file"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            params = {
                "fields": "id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/files/{file_id}",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    file_info = response.json()
                    logger.info(f"✅ Retrieved file info: {file_id} for user: {user_id}")
                    return file_info
                else:
                    logger.error(f"❌ Failed to get file info: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting file info: {e}")
            return None
    
    async def delete_file(self, user_id: UUID, file_id: str) -> bool:
        """Delete a file from Google Drive"""
        try:
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return False
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/files/{file_id}",
                    headers=headers
                )
                
                if response.status_code == 204:
                    logger.info(f"✅ Deleted file: {file_id} for user: {user_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to delete file: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error deleting file: {e}")
            return False
    
    async def get_shared_drive_link(self, user_id: UUID, file_id: str) -> Optional[str]:
        """Get a shareable link for a file"""
        try:
            # First, make the file publicly viewable
            headers = await self._get_auth_headers(user_id)
            if not headers:
                return None
            
            permission_data = {
                "type": "anyone",
                "role": "reader"
            }
            
            async with httpx.AsyncClient() as client:
                # Add public permission
                response = await client.post(
                    f"{self.base_url}/files/{file_id}/permissions",
                    headers=headers,
                    json=permission_data
                )
                
                if response.status_code == 200:
                    # Get the file info with web view link
                    file_info = await self.get_file_info(user_id, file_id)
                    if file_info:
                        return file_info.get("webViewLink")
                
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting shared drive link: {e}")
            return None

# Create service instance
google_drive_service = GoogleDriveService()