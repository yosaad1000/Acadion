import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GoogleCalendarWidget from '../../components/GoogleIntegration/GoogleCalendarWidget';
import GoogleDriveWidget from '../../components/GoogleIntegration/GoogleDriveWidget';
import GoogleAuthButton from '../../components/GoogleIntegration/GoogleAuthButton';

// Mock Google services
const mockGoogleCalendarService = {
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvents: vi.fn()
};

const mockGoogleDriveService = {
  createFolder: vi.fn(),
  uploadFile: vi.fn(),
  shareFile: vi.fn(),
  listFiles: vi.fn(),
  deleteFile: vi.fn()
};

const mockUseGoogleAuth = vi.fn();

vi.mock('../../services/googleCalendarService', () => ({
  googleCalendarService: mockGoogleCalendarService
}));

vi.mock('../../services/googleDriveService', () => ({
  googleDriveService: mockGoogleDriveService
}));

vi.mock('../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: mockUseGoogleAuth
}));

describe('Google Integration Flow Tests', () => {
  const mockSession = {
    session_id: 'session-123',
    subject_id: 'subject-123',
    name: 'Test Session',
    description: 'Test Description',
    session_date: '2024-01-15T10:00:00Z',
    notes: null,
    attendance_taken: false,
    assignments: [],
    created_by: 'teacher-123',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z'
  };

  const mockAssignment = {
    assignment_id: 'assignment-123',
    session_id: 'session-123',
    title: 'Test Assignment',
    description: 'Test Description',
    due_date: '2024-01-20T23:59:59Z',
    assignment_type: 'homework' as const,
    google_drive_link: null,
    created_at: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full Google authentication and calendar integration flow', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn();
    const mockOnEventCreated = vi.fn();

    // 1. Start with unauthenticated state
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    const { rerender } = render(
      <BrowserRouter>
        <GoogleAuthButton />
        <GoogleCalendarWidget 
          session={mockSession}
          onEventCreated={mockOnEventCreated}
          onEventUpdated={vi.fn()}
          onEventDeleted={vi.fn()}
        />
      </BrowserRouter>
    );

    // 2. Verify unauthenticated state
    expect(screen.getByText('Connect Google Account')).toBeInTheDocument();
    expect(screen.getByText('Connect your Google account to schedule sessions in Google Calendar')).toBeInTheDocument();

    // 3. Click authenticate button
    const authButton = screen.getByText('Connect Google Account');
    await user.click(authButton);

    expect(mockSignIn).toHaveBeenCalledTimes(1);

    // 4. Mock successful authentication
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'google-123',
        email: 'teacher@example.com',
        name: 'Test Teacher',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    // 5. Re-render with authenticated state
    rerender(
      <BrowserRouter>
        <GoogleAuthButton />
        <GoogleCalendarWidget 
          session={mockSession}
          onEventCreated={mockOnEventCreated}
          onEventUpdated={vi.fn()}
          onEventDeleted={vi.fn()}
        />
      </BrowserRouter>
    );

    // 6. Verify authenticated state
    await waitFor(() => {
      expect(screen.getByText('Google Account Connected')).toBeInTheDocument();
      expect(screen.getByText('teacher@example.com')).toBeInTheDocument();
    });

    // 7. Verify calendar widget is now available
    expect(screen.getByText('Create Calendar Event')).toBeInTheDocument();

    // 8. Create calendar event
    const mockCalendarEvent = {
      id: 'event-123',
      summary: 'Test Session',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' },
      htmlLink: 'https://calendar.google.com/event/123',
      hangoutLink: 'https://meet.google.com/abc-def-ghi'
    };

    mockGoogleCalendarService.createEvent.mockResolvedValue(mockCalendarEvent);

    const createEventButton = screen.getByText('Create Calendar Event');
    await user.click(createEventButton);

    // 9. Verify event creation
    await waitFor(() => {
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        summary: 'Test Session',
        description: 'Test Description',
        start: {
          dateTime: '2024-01-15T10:00:00Z',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: '2024-01-15T11:00:00Z',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        conferenceData: {
          createRequest: {
            requestId: expect.any(String),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      });
    });

    expect(mockOnEventCreated).toHaveBeenCalledWith(mockCalendarEvent);
  });

  it('completes full Google Drive integration flow', async () => {
    const user = userEvent.setup();
    const mockOnFolderCreated = vi.fn();
    const mockOnFileUploaded = vi.fn();

    // 1. Start with authenticated state
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'google-123',
        email: 'teacher@example.com',
        name: 'Test Teacher',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(
      <BrowserRouter>
        <GoogleDriveWidget 
          assignment={mockAssignment}
          onFolderCreated={mockOnFolderCreated}
          onFileUploaded={mockOnFileUploaded}
          onFileShared={vi.fn()}
        />
      </BrowserRouter>
    );

    // 2. Verify Drive widget is available
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Create Assignment Folder')).toBeInTheDocument();

    // 3. Create assignment folder
    const mockFolder = {
      id: 'folder-123',
      name: 'Test Assignment',
      webViewLink: 'https://drive.google.com/drive/folders/folder-123',
      parents: ['parent-folder-id']
    };

    mockGoogleDriveService.createFolder.mockResolvedValue(mockFolder);

    const createFolderButton = screen.getByText('Create Assignment Folder');
    await user.click(createFolderButton);

    // 4. Verify folder creation
    await waitFor(() => {
      expect(mockGoogleDriveService.createFolder).toHaveBeenCalledWith(
        'Test Assignment',
        expect.any(String)
      );
    });

    expect(mockOnFolderCreated).toHaveBeenCalledWith(mockFolder);

    // 5. Mock assignment with folder created
    const assignmentWithFolder = {
      ...mockAssignment,
      google_drive_link: 'https://drive.google.com/drive/folders/folder-123'
    };

    // Re-render with folder
    render(
      <BrowserRouter>
        <GoogleDriveWidget 
          assignment={assignmentWithFolder}
          onFolderCreated={mockOnFolderCreated}
          onFileUploaded={mockOnFileUploaded}
          onFileShared={vi.fn()}
        />
      </BrowserRouter>
    );

    // 6. Verify folder created state
    await waitFor(() => {
      expect(screen.getByText('Assignment Folder Created')).toBeInTheDocument();
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
    });

    // 7. Upload file
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const mockUploadedFile = {
      id: 'file-123',
      name: 'test.pdf',
      webViewLink: 'https://drive.google.com/file/d/file-123/view',
      parents: ['folder-123']
    };

    mockGoogleDriveService.uploadFile.mockResolvedValue(mockUploadedFile);

    const fileInput = screen.getByLabelText('Upload files');
    await user.upload(fileInput, mockFile);

    // 8. Verify file upload
    await waitFor(() => {
      expect(mockGoogleDriveService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'folder-123'
      );
    });

    expect(mockOnFileUploaded).toHaveBeenCalledWith(mockUploadedFile);
  });

  it('handles Google authentication errors gracefully', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn();
    const mockClearError = vi.fn();

    // 1. Start with authentication error
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: 'Authentication failed',
      signIn: mockSignIn,
      signOut: vi.fn(),
      clearError: mockClearError
    });

    render(
      <BrowserRouter>
        <GoogleAuthButton />
      </BrowserRouter>
    );

    // 2. Verify error state
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    // 3. Click try again
    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);

    // 4. Verify error clearing and retry
    expect(mockClearError).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('handles Google service API errors', async () => {
    const user = userEvent.setup();
    const mockOnEventCreated = vi.fn();

    // 1. Start with authenticated state
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'google-123',
        email: 'teacher@example.com',
        name: 'Test Teacher',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(
      <BrowserRouter>
        <GoogleCalendarWidget 
          session={mockSession}
          onEventCreated={mockOnEventCreated}
          onEventUpdated={vi.fn()}
          onEventDeleted={vi.fn()}
        />
      </BrowserRouter>
    );

    // 2. Mock calendar service error
    mockGoogleCalendarService.createEvent.mockRejectedValue(new Error('Calendar API error'));

    // 3. Try to create event
    const createEventButton = screen.getByText('Create Calendar Event');
    await user.click(createEventButton);

    // 4. Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to create calendar event')).toBeInTheDocument();
    });

    expect(mockOnEventCreated).not.toHaveBeenCalled();
  });

  it('handles offline/network error scenarios', async () => {
    const user = userEvent.setup();

    // 1. Mock network error during authentication
    const mockSignIn = vi.fn().mockRejectedValue(new Error('Network error'));
    
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(
      <BrowserRouter>
        <GoogleAuthButton />
      </BrowserRouter>
    );

    // 2. Try to authenticate
    const authButton = screen.getByText('Connect Google Account');
    await user.click(authButton);

    // 3. Verify network error handling
    await waitFor(() => {
      // The component should handle the error gracefully
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('maintains Google integration state across component re-renders', async () => {
    const user = userEvent.setup();
    
    // 1. Start authenticated
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'google-123',
        email: 'teacher@example.com',
        name: 'Test Teacher',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    const { rerender } = render(
      <BrowserRouter>
        <GoogleAuthButton />
      </BrowserRouter>
    );

    // 2. Verify authenticated state
    expect(screen.getByText('Google Account Connected')).toBeInTheDocument();

    // 3. Re-render component
    rerender(
      <BrowserRouter>
        <GoogleAuthButton />
      </BrowserRouter>
    );

    // 4. Verify state is maintained
    expect(screen.getByText('Google Account Connected')).toBeInTheDocument();
    expect(screen.getByText('teacher@example.com')).toBeInTheDocument();
  });

  it('handles Google service rate limiting', async () => {
    const user = userEvent.setup();
    
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'google-123',
        email: 'teacher@example.com',
        name: 'Test Teacher',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });

    render(
      <BrowserRouter>
        <GoogleCalendarWidget 
          session={mockSession}
          onEventCreated={vi.fn()}
          onEventUpdated={vi.fn()}
          onEventDeleted={vi.fn()}
        />
      </BrowserRouter>
    );

    // Mock rate limiting error
    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.status = 429;
    mockGoogleCalendarService.createEvent.mockRejectedValue(rateLimitError);

    // Try to create event
    const createEventButton = screen.getByText('Create Calendar Event');
    await user.click(createEventButton);

    // Verify appropriate error handling for rate limiting
    await waitFor(() => {
      expect(screen.getByText(/Failed to create calendar event/)).toBeInTheDocument();
    });
  });
});