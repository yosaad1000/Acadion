import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleDriveWidget from '../../../components/GoogleIntegration/GoogleDriveWidget';

// Mock the Google Drive service
vi.mock('../../../services/googleDriveService', () => ({
  googleDriveService: {
    createFolder: vi.fn(),
    uploadFile: vi.fn(),
    shareFile: vi.fn(),
    listFiles: vi.fn(),
    deleteFile: vi.fn()
  }
}));

// Mock the useGoogleAuth hook
vi.mock('../../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: vi.fn()
}));

const { googleDriveService } = await import('../../../services/googleDriveService');
const { useGoogleAuth } = await import('../../../hooks/useGoogleAuth');

const mockGoogleDriveService = googleDriveService as vi.Mocked<typeof googleDriveService>;
const mockUseGoogleAuth = useGoogleAuth as vi.MockedFunction<typeof useGoogleAuth>;

describe('GoogleDriveWidget', () => {
  const mockAssignment = {
    assignment_id: '1',
    session_id: 'session-1',
    title: 'Test Assignment',
    description: 'Test Description',
    due_date: '2024-01-20T23:59:59Z',
    assignment_type: 'homework' as const,
    google_drive_link: null,
    created_at: '2024-01-15T10:00:00Z'
  };

  const defaultProps = {
    assignment: mockAssignment,
    onFolderCreated: vi.fn(),
    onFileUploaded: vi.fn(),
    onFileShared: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });
  });

  it('renders drive widget when authenticated', () => {
    render(<GoogleDriveWidget {...defaultProps} />);
    
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Share files and materials for this assignment')).toBeInTheDocument();
  });

  it('shows authentication prompt when not authenticated', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(<GoogleDriveWidget {...defaultProps} />);
    
    expect(screen.getByText('Connect Google Account')).toBeInTheDocument();
    expect(screen.getByText('Connect your Google account to share files via Google Drive')).toBeInTheDocument();
  });

  it('creates assignment folder when create folder button is clicked', async () => {
    const user = userEvent.setup();
    const mockFolder = {
      id: 'folder-123',
      name: 'Test Assignment',
      webViewLink: 'https://drive.google.com/drive/folders/folder-123',
      parents: ['parent-folder-id']
    };

    mockGoogleDriveService.createFolder.mockResolvedValue(mockFolder);
    
    render(<GoogleDriveWidget {...defaultProps} />);
    
    const createFolderButton = screen.getByText('Create Assignment Folder');
    await user.click(createFolderButton);
    
    await waitFor(() => {
      expect(mockGoogleDriveService.createFolder).toHaveBeenCalledWith(
        'Test Assignment',
        expect.any(String) // parent folder ID
      );
    });

    expect(defaultProps.onFolderCreated).toHaveBeenCalledWith(mockFolder);
  });

  it('shows loading state during folder creation', async () => {
    const user = userEvent.setup();
    mockGoogleDriveService.createFolder.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<GoogleDriveWidget {...defaultProps} />);
    
    const createFolderButton = screen.getByText('Create Assignment Folder');
    await user.click(createFolderButton);
    
    expect(screen.getByText('Creating Folder...')).toBeInTheDocument();
    expect(createFolderButton).toBeDisabled();
  });

  it('handles folder creation error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to create folder';
    mockGoogleDriveService.createFolder.mockRejectedValue(new Error(errorMessage));
    
    render(<GoogleDriveWidget {...defaultProps} />);
    
    const createFolderButton = screen.getByText('Create Assignment Folder');
    await user.click(createFolderButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create Drive folder')).toBeInTheDocument();
    });
  });

  it('displays existing folder information', () => {
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    expect(screen.getByText('Assignment Folder Created')).toBeInTheDocument();
    expect(screen.getByText('Open Drive Folder')).toBeInTheDocument();
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const mockUploadedFile = {
      id: 'file-123',
      name: 'test.pdf',
      webViewLink: 'https://drive.google.com/file/d/file-123/view',
      parents: ['folder-123']
    };

    mockGoogleDriveService.uploadFile.mockResolvedValue(mockUploadedFile);
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    const fileInput = screen.getByLabelText('Upload files');
    await user.upload(fileInput, mockFile);
    
    await waitFor(() => {
      expect(mockGoogleDriveService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'folder-123'
      );
    });

    expect(defaultProps.onFileUploaded).toHaveBeenCalledWith(mockUploadedFile);
  });

  it('shows upload progress during file upload', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    mockGoogleDriveService.uploadFile.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    const fileInput = screen.getByLabelText('Upload files');
    await user.upload(fileInput, mockFile);
    
    expect(screen.getByText('Uploading test.pdf...')).toBeInTheDocument();
  });

  it('handles file upload error', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    mockGoogleDriveService.uploadFile.mockRejectedValue(new Error('Upload failed'));
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    const fileInput = screen.getByLabelText('Upload files');
    await user.upload(fileInput, mockFile);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to upload test.pdf')).toBeInTheDocument();
    });
  });

  it('lists existing files in folder', async () => {
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFiles = [
      {
        id: 'file-1',
        name: 'assignment-instructions.pdf',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        mimeType: 'application/pdf',
        size: '1024'
      },
      {
        id: 'file-2',
        name: 'example-solution.docx',
        webViewLink: 'https://drive.google.com/file/d/file-2/view',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: '2048'
      }
    ];

    mockGoogleDriveService.listFiles.mockResolvedValue(mockFiles);
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    await waitFor(() => {
      expect(screen.getByText('assignment-instructions.pdf')).toBeInTheDocument();
      expect(screen.getByText('example-solution.docx')).toBeInTheDocument();
    });
  });

  it('opens drive folder in new tab', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    // Mock window.open
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    const openFolderButton = screen.getByText('Open Drive Folder');
    await user.click(openFolderButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      'https://drive.google.com/drive/folders/folder-123',
      '_blank'
    );
  });

  it('opens individual files in new tab', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFiles = [
      {
        id: 'file-1',
        name: 'test-file.pdf',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        mimeType: 'application/pdf',
        size: '1024'
      }
    ];

    mockGoogleDriveService.listFiles.mockResolvedValue(mockFiles);
    
    // Mock window.open
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    await waitFor(() => {
      const fileLink = screen.getByText('test-file.pdf');
      return user.click(fileLink);
    });
    
    expect(mockOpen).toHaveBeenCalledWith(
      'https://drive.google.com/file/d/file-1/view',
      '_blank'
    );
  });

  it('shows file type icons correctly', async () => {
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFiles = [
      {
        id: 'file-1',
        name: 'document.pdf',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        mimeType: 'application/pdf',
        size: '1024'
      },
      {
        id: 'file-2',
        name: 'image.jpg',
        webViewLink: 'https://drive.google.com/file/d/file-2/view',
        mimeType: 'image/jpeg',
        size: '2048'
      }
    ];

    mockGoogleDriveService.listFiles.mockResolvedValue(mockFiles);
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    await waitFor(() => {
      // Should show appropriate file type indicators
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('JPG')).toBeInTheDocument();
    });
  });

  it('handles authentication loading state', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(<GoogleDriveWidget {...defaultProps} />);
    
    expect(screen.getByText('Loading Google integration...')).toBeInTheDocument();
  });

  it('displays authentication error', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: 'Authentication failed',
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(<GoogleDriveWidget {...defaultProps} />);
    
    expect(screen.getByText('Google authentication failed')).toBeInTheDocument();
  });

  it('handles multiple file uploads', async () => {
    const user = userEvent.setup();
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    const mockFiles = [
      new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
      new File(['content 2'], 'file2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    ];

    mockGoogleDriveService.uploadFile
      .mockResolvedValueOnce({
        id: 'file-1',
        name: 'file1.pdf',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
        parents: ['folder-123']
      })
      .mockResolvedValueOnce({
        id: 'file-2',
        name: 'file2.docx',
        webViewLink: 'https://drive.google.com/file/d/file-2/view',
        parents: ['folder-123']
      });
    
    render(<GoogleDriveWidget {...defaultProps} assignment={assignmentWithFolder} />);
    
    const fileInput = screen.getByLabelText('Upload files');
    await user.upload(fileInput, mockFiles);
    
    await waitFor(() => {
      expect(mockGoogleDriveService.uploadFile).toHaveBeenCalledTimes(2);
    });

    expect(defaultProps.onFileUploaded).toHaveBeenCalledTimes(2);
  });
});