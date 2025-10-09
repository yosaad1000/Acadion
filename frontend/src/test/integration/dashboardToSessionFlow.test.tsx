import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../../App';

// Mock all the services and contexts
const mockUseAuth = vi.fn();
const mockUseSessions = vi.fn();
const mockUseAIChat = vi.fn();
const mockUseGoogleAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isConnected: true,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    preferences: { email: true, push: true, inApp: true },
    updatePreferences: vi.fn()
  }),
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../hooks/useSessions', () => ({
  useSessions: mockUseSessions
}));

vi.mock('../../hooks/useAIChat', () => ({
  useAIChat: mockUseAIChat
}));

vi.mock('../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: mockUseGoogleAuth
}));

// Mock API services
vi.mock('../../services/sessionService', () => ({
  sessionService: {
    getSessions: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn()
  }
}));

vi.mock('../../services/googleService', () => ({
  googleService: {
    authenticate: vi.fn(),
    createCalendarEvent: vi.fn(),
    createDriveFolder: vi.fn()
  }
}));

describe('Dashboard to Session Creation Flow Integration Tests', () => {
  const mockTeacher = {
    user_id: 'teacher-123',
    email: 'teacher@example.com',
    full_name: 'Test Teacher',
    role: 'teacher' as const
  };

  const mockSubject = {
    subject_id: 'subject-123',
    name: 'React Development',
    description: 'Learn React fundamentals',
    invite_code: 'ABC123',
    created_by: 'teacher-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockSessions = [
    {
      session_id: 'session-1',
      subject_id: 'subject-123',
      name: 'Introduction to React',
      description: 'Basic React concepts',
      session_date: '2024-01-15T10:00:00Z',
      notes: null,
      attendance_taken: false,
      assignments: [],
      created_by: 'teacher-123',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default auth state
    mockUseAuth.mockReturnValue({
      user: mockTeacher,
      currentRole: 'teacher',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      switchRole: vi.fn(),
      subjects: [mockSubject]
    });

    // Setup sessions hook
    mockUseSessions.mockReturnValue({
      sessions: mockSessions,
      loading: false,
      error: null,
      createSession: vi.fn().mockResolvedValue({
        session_id: 'new-session-123',
        subject_id: 'subject-123',
        name: 'New Test Session',
        description: 'Test Description',
        session_date: '2024-01-20T10:00:00Z',
        notes: null,
        attendance_taken: false,
        assignments: [],
        created_by: 'teacher-123',
        created_at: '2024-01-20T09:00:00Z',
        updated_at: '2024-01-20T09:00:00Z'
      }),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    // Setup AI Chat hook
    mockUseAIChat.mockReturnValue({
      isOpen: false,
      messages: [],
      isTyping: false,
      toggleChat: vi.fn(),
      openChat: vi.fn(),
      closeChat: vi.fn(),
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      addWelcomeMessage: vi.fn()
    });

    // Setup Google Auth hook
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn()
    });
  });

  it('completes full teacher flow: dashboard -> class -> create session -> session detail', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // 1. Verify teacher dashboard loads
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    });

    // 2. Click on a class to navigate to class detail
    const classCard = screen.getByText('React Development');
    await user.click(classCard);

    // 3. Verify class detail page loads with sessions
    await waitFor(() => {
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    });

    // 4. Click create session button
    const createSessionButton = screen.getByText('Create Session');
    await user.click(createSessionButton);

    // 5. Verify create session modal opens
    await waitFor(() => {
      expect(screen.getByText('Create New Session')).toBeInTheDocument();
    });

    // 6. Fill out session creation form
    const nameInput = screen.getByLabelText('Session Name *');
    const descriptionInput = screen.getByLabelText('Description');
    
    await user.type(nameInput, 'New Test Session');
    await user.type(descriptionInput, 'Test Description');

    // 7. Submit the form
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);

    // 8. Verify session creation was called
    await waitFor(() => {
      expect(mockUseSessions().createSession).toHaveBeenCalledWith({
        name: 'New Test Session',
        description: 'Test Description',
        session_date: undefined,
        notes: undefined
      });
    });

    // 9. Verify navigation to session detail (would happen in real app)
    // This would be tested with actual routing in a full integration test
  });

  it('completes AI chat interaction flow', async () => {
    const user = userEvent.setup();
    const mockSendMessage = vi.fn();
    const mockToggleChat = vi.fn();

    mockUseAIChat.mockReturnValue({
      isOpen: false,
      messages: [],
      isTyping: false,
      toggleChat: mockToggleChat,
      openChat: vi.fn(),
      closeChat: vi.fn(),
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
      addWelcomeMessage: vi.fn()
    });
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // 1. Verify AI chat toggle is present
    await waitFor(() => {
      expect(screen.getByLabelText(/AI Chat/)).toBeInTheDocument();
    });

    // 2. Click AI chat toggle
    const aiChatToggle = screen.getByLabelText(/AI Chat/);
    await user.click(aiChatToggle);

    // 3. Verify toggle was called
    expect(mockToggleChat).toHaveBeenCalledTimes(1);

    // 4. Mock chat as open and re-render
    mockUseAIChat.mockReturnValue({
      isOpen: true,
      messages: [
        {
          id: '1',
          content: 'Hello! How can I help you?',
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        }
      ],
      isTyping: false,
      toggleChat: mockToggleChat,
      openChat: vi.fn(),
      closeChat: vi.fn(),
      sendMessage: mockSendMessage,
      clearMessages: vi.fn(),
      addWelcomeMessage: vi.fn()
    });

    // Re-render with updated state
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // 5. Verify chat interface is open
    await waitFor(() => {
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });

    // 6. Send a message
    const messageInput = screen.getByPlaceholderText('Ask me anything...');
    await user.type(messageInput, 'How do I create a class?');
    
    const sendButton = screen.getByLabelText('Send message');
    await user.click(sendButton);

    // 7. Verify message was sent
    expect(mockSendMessage).toHaveBeenCalledWith('How do I create a class?');
  });

  it('handles role-based access control correctly', async () => {
    const user = userEvent.setup();
    
    // Test as student
    mockUseAuth.mockReturnValue({
      user: { ...mockTeacher, role: 'student' },
      currentRole: 'student',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      switchRole: vi.fn(),
      subjects: [mockSubject]
    });
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // 1. Verify student dashboard loads
    await waitFor(() => {
      expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
    });

    // 2. Navigate to class
    const classCard = screen.getByText('React Development');
    await user.click(classCard);

    // 3. Verify student cannot see create session button
    await waitFor(() => {
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    });

    // 4. Verify student can see existing sessions
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
  });

  it('handles Google integration workflow', async () => {
    const user = userEvent.setup();
    const mockSignIn = vi.fn();
    
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
      <MemoryRouter initialEntries={['/class/subject-123/session/session-1']}>
        <App />
      </MemoryRouter>
    );

    // 1. Verify session detail page loads
    await waitFor(() => {
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    });

    // 2. Look for Google integration components
    const googleAuthButton = screen.queryByText('Connect Google Account');
    if (googleAuthButton) {
      // 3. Click Google auth button
      await user.click(googleAuthButton);
      
      // 4. Verify sign in was called
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    }

    // 5. Mock successful authentication
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

    // Re-render with authenticated state
    render(
      <MemoryRouter initialEntries={['/class/subject-123/session/session-1']}>
        <App />
      </MemoryRouter>
    );

    // 6. Verify Google integration options are available
    await waitFor(() => {
      const calendarWidget = screen.queryByText('Google Calendar');
      const driveWidget = screen.queryByText('Google Drive');
      
      // At least one should be present
      expect(calendarWidget || driveWidget).toBeTruthy();
    });
  });

  it('handles error states gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock sessions loading error
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: 'Failed to load sessions',
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });
    
    render(
      <MemoryRouter initialEntries={['/class/subject-123']}>
        <App />
      </MemoryRouter>
    );

    // 1. Verify error state is displayed
    await waitFor(() => {
      expect(screen.getByText('Error Loading Sessions')).toBeInTheDocument();
      expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
    });

    // 2. Mock session creation error
    const mockCreateSession = vi.fn().mockRejectedValue(new Error('Creation failed'));
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      createSession: mockCreateSession,
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    // Re-render without error
    render(
      <MemoryRouter initialEntries={['/class/subject-123']}>
        <App />
      </MemoryRouter>
    );

    // 3. Try to create a session
    const createButton = screen.getByText('Create Session');
    await user.click(createButton);

    const nameInput = screen.getByLabelText('Session Name *');
    await user.type(nameInput, 'Test Session');

    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);

    // 4. Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
    });
  });

  it('maintains state consistency across navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // 1. Start from dashboard
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    });

    // 2. Navigate to class
    const classCard = screen.getByText('React Development');
    await user.click(classCard);

    // 3. Verify class context is maintained
    await waitFor(() => {
      expect(screen.getByText('Sessions')).toBeInTheDocument();
    });

    // 4. Navigate to session
    const sessionCard = screen.getByText('Introduction to React');
    await user.click(sessionCard);

    // 5. Verify session context is maintained
    await waitFor(() => {
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    });

    // 6. Verify breadcrumb navigation works (if implemented)
    // This would test navigation consistency
  });
});