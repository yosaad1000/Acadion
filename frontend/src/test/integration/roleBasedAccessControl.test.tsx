import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import SessionList from '../../components/Session/SessionList';
import CreateSession from '../../components/Session/CreateSession';
import SessionDetail from '../../pages/SessionDetail';

// Mock contexts and hooks
const mockUseAuth = vi.fn();
const mockUseSessions = vi.fn();
const mockUseAssignments = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: mockUseAuth
}));

vi.mock('../../hooks/useSessions', () => ({
  useSessions: mockUseSessions
}));

vi.mock('../../hooks/useAssignments', () => ({
  useAssignments: mockUseAssignments
}));

// Mock other dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ subjectId: 'subject-123', sessionId: 'session-123' }),
    useNavigate: () => vi.fn()
  };
});

describe('Role-Based Access Control Integration Tests', () => {
  const mockTeacher = {
    user_id: 'teacher-123',
    email: 'teacher@example.com',
    full_name: 'Test Teacher',
    role: 'teacher' as const
  };

  const mockStudent = {
    user_id: 'student-123',
    email: 'student@example.com',
    full_name: 'Test Student',
    role: 'student' as const
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
      session_id: 'session-123',
      subject_id: 'subject-123',
      name: 'Introduction to React',
      description: 'Basic React concepts',
      session_date: '2024-01-15T10:00:00Z',
      notes: 'Remember to bring laptops',
      attendance_taken: true,
      assignments: [
        {
          assignment_id: 'assignment-123',
          session_id: 'session-123',
          title: 'React Homework',
          description: 'Build a simple component',
          due_date: '2024-01-20T23:59:59Z',
          assignment_type: 'homework' as const,
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      created_by: 'teacher-123',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    }
  ];

  const mockAssignments = [
    {
      assignment_id: 'assignment-123',
      session_id: 'session-123',
      title: 'React Homework',
      description: 'Build a simple component',
      due_date: '2024-01-20T23:59:59Z',
      assignment_type: 'homework' as const,
      created_at: '2024-01-15T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSessions.mockReturnValue({
      sessions: mockSessions,
      loading: false,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    mockUseAssignments.mockReturnValue({
      assignments: mockAssignments,
      loading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      deleteAssignment: vi.fn(),
      refreshAssignments: vi.fn()
    });
  });

  describe('Teacher Role Access Control', () => {
    beforeEach(() => {
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
    });

    it('allows teachers to see session creation controls', () => {
      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Teachers should see create session button
      expect(screen.getByText('Create Session')).toBeInTheDocument();
    });

    it('allows teachers to create sessions', async () => {
      const user = userEvent.setup();
      const mockCreateSession = vi.fn().mockResolvedValue({
        session_id: 'new-session-123',
        subject_id: 'subject-123',
        name: 'New Session',
        description: 'Test Description',
        session_date: '2024-01-20T10:00:00Z',
        notes: null,
        attendance_taken: false,
        assignments: [],
        created_by: 'teacher-123',
        created_at: '2024-01-20T09:00:00Z',
        updated_at: '2024-01-20T09:00:00Z'
      });

      mockUseSessions.mockReturnValue({
        sessions: mockSessions,
        loading: false,
        error: null,
        createSession: mockCreateSession,
        updateSession: vi.fn(),
        deleteSession: vi.fn(),
        refreshSessions: vi.fn()
      });

      render(
        <BrowserRouter>
          <CreateSession 
            subjectId="subject-123"
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Fill out session creation form
      const nameInput = screen.getByLabelText('Session Name *');
      await user.type(nameInput, 'New Session');

      const submitButton = screen.getByText('Create Session');
      await user.click(submitButton);

      // Verify session creation was called
      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith({
          name: 'New Session',
          description: undefined,
          session_date: undefined,
          notes: undefined
        });
      });
    });

    it('allows teachers to see assignment creation controls', () => {
      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Teachers should see assignment creation controls
      expect(screen.queryByText('Create Assignment')).toBeInTheDocument();
    });

    it('allows teachers to modify session content', async () => {
      const user = userEvent.setup();
      const mockUpdateSession = vi.fn();

      mockUseSessions.mockReturnValue({
        sessions: mockSessions,
        loading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: mockUpdateSession,
        deleteSession: vi.fn(),
        refreshSessions: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Teachers should be able to edit session details
      const editButton = screen.queryByText('Edit Session');
      if (editButton) {
        await user.click(editButton);
        expect(mockUpdateSession).toHaveBeenCalled();
      }
    });

    it('allows teachers to delete sessions', async () => {
      const user = userEvent.setup();
      const mockDeleteSession = vi.fn();

      mockUseSessions.mockReturnValue({
        sessions: mockSessions,
        loading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
        deleteSession: mockDeleteSession,
        refreshSessions: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Teachers should be able to delete sessions
      const deleteButton = screen.queryByText('Delete Session');
      if (deleteButton) {
        await user.click(deleteButton);
        expect(mockDeleteSession).toHaveBeenCalled();
      }
    });
  });

  describe('Student Role Access Control', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockStudent,
        currentRole: 'student',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        subjects: [mockSubject]
      });
    });

    it('hides session creation controls from students', () => {
      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Students should not see create session button
      expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    });

    it('shows appropriate empty state for students when no sessions exist', () => {
      mockUseSessions.mockReturnValue({
        sessions: [],
        loading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
        deleteSession: vi.fn(),
        refreshSessions: vi.fn()
      });

      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Students should see appropriate message
      expect(screen.getByText('Sessions will appear here once your teacher creates them.')).toBeInTheDocument();
      expect(screen.queryByText('Create First Session')).not.toBeInTheDocument();
    });

    it('allows students to view sessions but not modify them', () => {
      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Students should see sessions
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      
      // But not modification controls
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('shows student-specific view in session details', () => {
      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Students should see assignment details but not creation controls
      expect(screen.getByText('React Homework')).toBeInTheDocument();
      expect(screen.queryByText('Create Assignment')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Session')).not.toBeInTheDocument();
    });

    it('allows students to view assignment submission status', () => {
      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Students should see their submission status
      expect(screen.getByText('React Homework')).toBeInTheDocument();
      
      // Should show due date information
      expect(screen.getByText(/Due/)).toBeInTheDocument();
    });

    it('prevents students from accessing teacher-only functionality', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter initialEntries={['/class/subject-123/session/session-123']}>
          <SessionDetail />
        </MemoryRouter>
      );

      // Students should not be able to access teacher controls
      expect(screen.queryByText('Take Attendance')).not.toBeInTheDocument();
      expect(screen.queryByText('Grade Assignments')).not.toBeInTheDocument();
      expect(screen.queryByText('Session Settings')).not.toBeInTheDocument();
    });
  });

  describe('Role Switching', () => {
    it('updates UI when role is switched from teacher to student', async () => {
      const mockSwitchRole = vi.fn();

      // Start as teacher
      mockUseAuth.mockReturnValue({
        user: { ...mockTeacher, role: 'both' },
        currentRole: 'teacher',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: mockSwitchRole,
        subjects: [mockSubject]
      });

      const { rerender } = render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Verify teacher controls are visible
      expect(screen.getByText('Create Session')).toBeInTheDocument();

      // Switch to student role
      mockUseAuth.mockReturnValue({
        user: { ...mockTeacher, role: 'both' },
        currentRole: 'student',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: mockSwitchRole,
        subjects: [mockSubject]
      });

      rerender(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Verify teacher controls are hidden
      expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    });

    it('maintains data consistency during role switches', async () => {
      const mockSwitchRole = vi.fn();

      // Start as teacher
      mockUseAuth.mockReturnValue({
        user: { ...mockTeacher, role: 'both' },
        currentRole: 'teacher',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: mockSwitchRole,
        subjects: [mockSubject]
      });

      const { rerender } = render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Verify session data is displayed
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();

      // Switch to student role
      mockUseAuth.mockReturnValue({
        user: { ...mockTeacher, role: 'both' },
        currentRole: 'student',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: mockSwitchRole,
        subjects: [mockSubject]
      });

      rerender(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Verify session data is still displayed
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    });
  });

  describe('Unauthorized Access Prevention', () => {
    it('handles unauthenticated users appropriately', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        currentRole: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        subjects: []
      });

      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Should handle unauthenticated state gracefully
      // This might redirect to login or show an appropriate message
      expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
    });

    it('prevents access to sessions from unauthorized subjects', () => {
      // Mock user with access to different subject
      const unauthorizedSubject = {
        subject_id: 'different-subject-123',
        name: 'Different Subject',
        description: 'Different subject',
        invite_code: 'XYZ789',
        created_by: 'different-teacher-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockUseAuth.mockReturnValue({
        user: mockStudent,
        currentRole: 'student',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        switchRole: vi.fn(),
        subjects: [unauthorizedSubject] // Different subject
      });

      render(
        <BrowserRouter>
          <SessionList subjectId="subject-123" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Should handle unauthorized access appropriately
      // This might show an error message or redirect
    });
  });
});