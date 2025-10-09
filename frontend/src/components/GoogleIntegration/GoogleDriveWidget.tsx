import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { 
  googleDriveService, 
  GoogleDriveFile, 
  GoogleDriveFolder,
  FolderStructure,
  AssignmentFolder 
} from '../../services/googleDriveService';

interface GoogleDriveWidgetProps {
  classData?: {
    name: string;
    id: string;
  };
  assignmentData?: {
    name: string;
    class_folder_id?: string;
  };
  folderId?: string;
  onFolderCreated?: (folderData: any) => void;
  onError?: (error: string) => void;
  className?: string;
  mode?: 'browse' | 'class-setup' | 'assignment-setup';
  showCreateFolder?: boolean;
}

export const GoogleDriveWidget: React.FC<GoogleDriveWidgetProps> = ({
  classData,
  assignmentData,
  folderId,
  onFolderCreated,
  onError,
  className = '',
  mode = 'browse',
  showCreateFolder = true,
}) => {
  const { isAuthenticated, isTokenValid } = useGoogleAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [folderContents, setFolderContents] = useState<GoogleDriveFile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const isIntegrationReady = isAuthenticated && isTokenValid;

  // Load folder contents when folderId changes
  useEffect(() => {
    if (isIntegrationReady && folderId && mode === 'browse') {
      loadFolderContents();
    }
  }, [isIntegrationReady, folderId, mode]);

  const loadFolderContents = async () => {
    if (!folderId) return;

    try {
      setIsLoading(true);
      const contents = await googleDriveService.getFolderContents(folderId);
      setFolderContents(contents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load folder contents';
      onError?.(errorMessage);
      console.error('Error loading folder contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClassFolder = async () => {
    if (!classData) return;

    try {
      setIsLoading(true);
      const folderStructure = await googleDriveService.createClassFolder(classData.name);
      onFolderCreated?.(folderStructure);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class folder';
      onError?.(errorMessage);
      console.error('Error creating class folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignmentFolder = async () => {
    if (!assignmentData || !assignmentData.class_folder_id) return;

    try {
      setIsLoading(true);
      const assignmentFolder = await googleDriveService.createAssignmentFolder(
        assignmentData.name,
        assignmentData.class_folder_id
      );
      onFolderCreated?.(assignmentFolder);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assignment folder';
      onError?.(errorMessage);
      console.error('Error creating assignment folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setIsLoading(true);
      const folder: GoogleDriveFolder = {
        name: newFolderName.trim(),
        parent_folder_id: folderId,
      };
      
      const createdFolder = await googleDriveService.createFolder(folder);
      setNewFolderName('');
      setShowCreateForm(false);
      onFolderCreated?.(createdFolder);
      
      // Refresh folder contents
      if (mode === 'browse') {
        await loadFolderContents();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      onError?.(errorMessage);
      console.error('Error creating custom folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      setIsLoading(true);
      await googleDriveService.deleteFile(fileId);
      
      // Refresh folder contents
      if (mode === 'browse') {
        await loadFolderContents();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      onError?.(errorMessage);
      console.error('Error deleting file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetShareableLink = async (fileId: string) => {
    try {
      const shareLink = await googleDriveService.getShareableLink(fileId);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink);
      alert('Shareable link copied to clipboard!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get shareable link';
      onError?.(errorMessage);
      console.error('Error getting shareable link:', error);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isIntegrationReady) {
    return (
      <div className={`google-drive-widget ${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Drive">
              💾
            </span>
            <div>
              <h3 className="font-semibold text-gray-900">Google Drive</h3>
              <p className="text-sm text-gray-600">
                Connect Google Workspace to use Drive features
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`google-drive-widget ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="Drive">
              💾
            </span>
            <h3 className="font-semibold text-gray-900">Google Drive</h3>
          </div>
          
          {isLoading && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
          )}
        </div>

        {/* Class Setup Mode */}
        {mode === 'class-setup' && classData && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Create Class Folder</h4>
                <p className="text-sm text-blue-700">
                  Set up organized folders for "{classData.name}" with subfolders for assignments, materials, and submissions
                </p>
              </div>
              <button
                onClick={handleCreateClassFolder}
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Folders
              </button>
            </div>
          </div>
        )}

        {/* Assignment Setup Mode */}
        {mode === 'assignment-setup' && assignmentData && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">Create Assignment Folder</h4>
                <p className="text-sm text-green-700">
                  Create a dedicated folder for "{assignmentData.name}" assignment
                </p>
              </div>
              <button
                onClick={handleCreateAssignmentFolder}
                disabled={isLoading || !assignmentData.class_folder_id}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </div>
        )}

        {/* Custom Folder Creation */}
        {showCreateFolder && mode === 'browse' && (
          <div className="mb-4">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                + Create New Folder
              </button>
            ) : (
              <form onSubmit={handleCreateCustomFolder} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Folder Contents */}
        {mode === 'browse' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {folderId ? 'Folder Contents' : 'Select a folder to browse'}
              </h4>
              {folderId && (
                <button
                  onClick={loadFolderContents}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Refresh
                </button>
              )}
            </div>
            
            {!folderId ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No folder selected
              </p>
            ) : folderContents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                This folder is empty
              </p>
            ) : (
              <div className="space-y-2">
                {folderContents.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 border border-gray-200 rounded-md hover:bg-gray-50 ${
                      selectedFiles.has(file.id) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="rounded"
                        />
                        <span className="text-lg" role="img" aria-label="File type">
                          {googleDriveService.getFileTypeIcon(file.mimeType)}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {file.name}
                          </h5>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>{formatDate(file.modifiedTime)}</span>
                            <span>{googleDriveService.formatFileSize(file.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 p-1"
                          title="Open in Google Drive"
                        >
                          👁️
                        </a>
                        <button
                          onClick={() => handleGetShareableLink(file.id)}
                          className="text-xs text-green-600 hover:text-green-800 p-1"
                          title="Get shareable link"
                        >
                          🔗
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-xs text-red-600 hover:text-red-800 p-1"
                          title="Delete file"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveWidget;