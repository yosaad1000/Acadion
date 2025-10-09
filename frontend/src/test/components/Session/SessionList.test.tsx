import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SessionList from '../../../components/Session/SessionList';
import { Session } from '../../../types';

// Mock the hooks and contexts
const mockUseAuth = vi.fn();
const mockUseSessions = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: mockUseAuth
}));

vi.mock('../../../hooks/useSessions', () => ({
  useSessions: mockUseSessions
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('SessionList', () => {
  const mockOnCreateSession = vi.fn();
  const subjectId = 'test-subject-id';
  
  const sampleSessions: Session[] = [
    {
      session_id: '1',
      subject_id: subjectId,
      name: 'Introduction to React',
      description: 'Basic React concepts',
      session_date: '2024-01-15T10:00:00Z',
      notes: 'Remember to bring laptops',
      attendance_taken: true,
      assignments: [
        {
          assignment_id: 'a1',
          session_id: '1',
          title: 'React Homework',
          description: 'Build a simple component',
          due_date: '2024-01-20T23:59:59Z',
          assignment_type: 'homework',
          created_at: '2024-01-15T10:00:00Z'
        }
      ],
      created_by: 'teacher-id',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2024-01-15T09:00:00Z'
    },
    {
      session_id: '2',
      subject_id: subjectId,
      name: 'Advanced React Patterns',
      description: 'Hooks and Context',
      session_date: '2024-01-22T10:00:00Z',
      notes: null,
      attendance_taken: false,
      assignments: [],
      created_by: 'teacher-id',
      created_at: '2024-01-22T09:00:00Z',
      updated_at: '2024-01-22T09:00:00Z'
    }
  ];

  const defaultProps = {
    subjectId,
    onCreateSession: mockOnCreateSession
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      currentRole: 'teacher'
    });
    mockUseSessions.mockReturnValue({
      sessions: sampleSessions,
      loading: false,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders loading state correctly', () => {
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: true,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load sessions';
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: errorMessage,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Error Loading Sessions')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders sessions list correctly', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('2 sessions in this class')).toBeInTheDocument();
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
  });

  it('shows create session button for teachers', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Create Session')).toBeInTheDocument();
  });

  it('hides create session button for students', () => {
    mockUseAuth.mockReturnValue({
      currentRole: 'student'
    });

    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.queryByText('Create Session')).not.toBeInTheDocument();
  });

  it('calls onCreateSession when create button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SessionList {...defaultProps} />);
    
    const createButton = screen.getByText('Create Session');
    await user.click(createButton);
    
    expect(mockOnCreateSession).toHaveBeenCalledTimes(1);
  });

  it('displays empty state when no sessions exist', () => {
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('No Sessions Yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first session to start organizing class content and activities.')).toBeInTheDocument();
  });

  it('sorts sessions by date by default (most recent first)', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    const sessionTitles = screen.getAllByText(/React/);
    expect(sessionTitles[0]).toHaveTextContent('Advanced React Patterns');
    expect(sessionTitles[1]).toHaveTextContent('Introduction to React');
  });

  it('allows sorting by name', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SessionList {...defaultProps} />);
    
    const sortSelect = screen.getByDisplayValue('Sort by Date');
    await user.selectOptions(sortSelect, 'name');
    
    await waitFor(() => {
      const sessionTitles = screen.getAllByText(/React/);
      expect(sessionTitles[0]).toHaveTextContent('Advanced React Patterns');
      expect(sessionTitles[1]).toHaveTextContent('Introduction to React');
    });
  });

  it('displays session status indicators correctly', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    // First session has attendance and assignments - should be complete
    expect(screen.getByText('complete')).toBeInTheDocument();
    
    // Second session has neither - should be pending
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows assignment count for sessions with assignments', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('1 assignment')).toBeInTheDocument();
  });

  it('shows attendance taken indicator', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Attendance taken')).toBeInTheDocument();
  });

  it('shows notes indicator when session has notes', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('Has notes')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    // Should show relative dates
    expect(screen.getAllByText(/Jan \d+/)).toHaveLength(2);
  });

  it('navigates to session detail when session is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SessionList {...defaultProps} />);
    
    const sessionCard = screen.getByText('Introduction to React').closest('div');
    await user.click(sessionCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith(`/class/${subjectId}/session/1`);
  });

  it('displays correct session count in header', () => {
    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('2 sessions in this class')).toBeInTheDocument();
  });

  it('handles singular session count correctly', () => {
    mockUseSessions.mockReturnValue({
      sessions: [sampleSessions[0]],
      loading: false,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });

    renderWithRouter(<SessionList {...defaultProps} />);
    
    expect(screen.getByText('1 session in this class')).toBeInTheDocument();
  });
});