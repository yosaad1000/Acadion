import { supabase } from '../lib/supabase';

export interface GoogleDriveFolder {
  name: string;
  parent_folder_id?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
  parents?: string[];
}

export interface FolderStructure {
  main_folder: GoogleDriveFile;
  subfolders: Record<string, string>;
  folder_structure: {
    class_folder_id: string;
    assignments_folder_id?: string;
    materials_folder_id?: string;
    submissions_folder_id?: string;
    recordings_folder_id?: string;
  };
}

export interface AssignmentFolder {
  folder: GoogleDriveFile;
  folder_id: string;
  web_view_link: string;
}

class GoogleDriveService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  /**
   * Create a Google Drive folder
   */
  async createFolder(folder: GoogleDriveFolder): Promise<GoogleDriveFile> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/folders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(folder),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.folder;
    } catch (error) {
      console.error('Error creating Drive folder:', error);
      throw error;
    }
  }

  /**
   * Get contents of a Google Drive folder
   */
  async getFolderContents(folderId: string): Promise<GoogleDriveFile[]> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/folders/${folderId}/contents`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.contents;
    } catch (error) {
      console.error('Error getting folder contents:', error);
      throw error;
    }
  }

  /**
   * Share a Google Drive folder with users
   */
  async shareFolder(folderId: string, emailAddresses: string[], role: string = 'reader'): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/folders/${folderId}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email_addresses: emailAddresses,
          role: role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error sharing folder:', error);
      throw error;
    }
  }

  /**
   * Create a class folder structure
   */
  async createClassFolder(className: string): Promise<FolderStructure> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/class-folder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          class_name: className,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.folder_structure;
    } catch (error) {
      console.error('Error creating class folder:', error);
      throw error;
    }
  }

  /**
   * Create an assignment folder
   */
  async createAssignmentFolder(assignmentName: string, classFolderId: string): Promise<AssignmentFolder> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/assignment-folder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          assignment_name: assignmentName,
          class_folder_id: classFolderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.assignment_folder;
    } catch (error) {
      console.error('Error creating assignment folder:', error);
      throw error;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(fileId: string): Promise<GoogleDriveFile> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/files/${fileId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.file;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/files/${fileId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get a shareable link for a file
   */
  async getShareableLink(fileId: string): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/api/google/drive/files/${fileId}/share-link`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.share_link;
    } catch (error) {
      console.error('Error getting shareable link:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(sizeString?: string): string {
    if (!sizeString) return 'Unknown size';
    
    const size = parseInt(sizeString);
    if (isNaN(size)) return 'Unknown size';

    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get file type icon based on MIME type
   */
  getFileTypeIcon(mimeType: string): string {
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('document')) return '📄';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📄';
  }

  /**
   * Check if file is a Google Workspace file
   */
  isGoogleWorkspaceFile(mimeType: string): boolean {
    return mimeType.startsWith('application/vnd.google-apps.');
  }
}

export const googleDriveService = new GoogleDriveService();