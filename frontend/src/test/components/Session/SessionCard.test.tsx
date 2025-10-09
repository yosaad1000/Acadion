import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SessionCard from '../../../components/Session/SessionCard';
import { Session } from '../../../types';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe('SessionCard', () => {
  const mockOnClick = vi.fn();
  const subjectId = 'test-subject-id';
  
  const baseSession: Session = {
    session_id: '1',
    subject_id: subjectId,
    name: 'Introduction to React',
    description: 'Basic React concepts and components',
    session_date: '2024-01-15T10:00:00Z',
    notes: 'Remember to bring laptops',
    attendance_taken: false,
    assignments: [],
    created_by: 'teacher-id',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z'
  };

  const sessionWithAssignments: Session = {
    ...baseSession,
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
      },
      {
        assignment_id: 'a2',
        session_id: '1',
        title: 'React Test',
        description: 'Test on React basics',
        due_date: '2024-01-25T23:59:59Z',
        assignment_type: 'test',
        created_at: '2024-01-15T10:00:00Z'
      }
    ]
  };

  const defaultProps = {
    session: baseSession,
    subjectId,
    onClick: mockOnClick
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('renders session information correctly', () => {
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Basic React concepts and components')).toBeInTheDocument();
  });

  it('displays pending status for session without attendance or assignments', () => {
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays complete status for session with attendance and assignments', () => {
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithAssignments} />);
    
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('displays in progress status for session with partial completion', () => {
    const partialSession = { ...baseSession, attendance_taken: true };
    renderWithRouter(<SessionCard {...defaultProps} session={partialSession} />);
    
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows session date when available', () => {
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    expect(screen.getByText(/Jan \d+/)).toBeInTheDocument();
  });

  it('shows today indicator for today\'s sessions', () => {
    const todaySession = { 
      ...baseSession, 
      session_date: new Date().toISOString() 
    };
    renderWithRouter(<SessionCard {...defaultProps} session={todaySession} />);
    
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('displays assignment count when assignments exist', () => {
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithAssignments} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows attendance taken indicator', () => {
    const attendedSession = { ...baseSession, attendance_taken: true };
    renderWithRouter(<SessionCard {...defaultProps} session={attendedSession} />);
    
    expect(screen.getByText('Attended')).toBeInTheDocument();
  });

  it('shows notes indicator when session has notes', () => {
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('displays assignment preview when assignments exist', () => {
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithAssignments} />);
    
    expect(screen.getByText('React Homework')).toBeInTheDocument();
    expect(screen.getByText('React Test')).toBeInTheDocument();
  });

  it('shows due dates for assignments', () => {
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithAssignments} />);
    
    expect(screen.getByText(/Due Jan \d+/)).toBeInTheDocument();
  });

  it('highlights overdue assignments', () => {
    const overdueSession: Session = {
      ...baseSession,
      assignments: [
        {
          assignment_id: 'a1',
          session_id: '1',
          title: 'Overdue Assignment',
          description: 'This is overdue',
          due_date: '2020-01-01T23:59:59Z', // Past date
          assignment_type: 'homework',
          created_at: '2024-01-15T10:00:00Z'
        }
      ]
    };

    renderWithRouter(<SessionCard {...defaultProps} session={overdueSession} />);
    
    const dueDateElement = screen.getByText(/Due Jan \d+/);
    expect(dueDateElement).toHaveClass('text-red-600');
  });

  it('shows assignment type indicators with correct colors', () => {
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithAssignments} />);
    
    // Check for homework (blue) and test (red) indicators
    const assignmentElements = screen.getAllByRole('generic');
    const homeworkIndicator = assignmentElements.find(el => 
      el.className.includes('bg-blue-400')
    );
    const testIndicator = assignmentElements.find(el => 
      el.className.includes('bg-red-400')
    );
    
    expect(homeworkIndicator).toBeInTheDocument();
    expect(testIndicator).toBeInTheDocument();
  });

  it('shows "more assignments" indicator when there are more than 2 assignments', () => {
    const manyAssignmentsSession: Session = {
      ...sessionWithAssignments,
      assignments: [
        ...sessionWithAssignments.assignments,
        {
          assignment_id: 'a3',
          session_id: '1',
          title: 'Third Assignment',
          description: 'Another assignment',
          due_date: '2024-01-30T23:59:59Z',
          assignment_type: 'project',
          created_at: '2024-01-15T10:00:00Z'
        }
      ]
    };

    renderWithRouter(<SessionCard {...defaultProps} session={manyAssignmentsSession} />);
    
    expect(screen.getByText('+1 more assignment')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    const card = screen.getByText('Introduction to React').closest('div');
    await user.click(card!);
    
    expect(mockOnClick).toHaveBeenCalledWith(baseSession);
  });

  it('navigates to session detail when no onClick is provided', async () => {
    const mockNavigate = vi.fn();
    vi.mocked(vi.importActual('react-router-dom')).useNavigate = () => mockNavigate;

    const user = userEvent.setup();
    const propsWithoutOnClick = { session: baseSession, subjectId };
    renderWithRouter(<SessionCard {...propsWithoutOnClick} />);
    
    const card = screen.getByText('Introduction to React').closest('div');
    await user.click(card!);
    
    expect(mockNavigate).toHaveBeenCalledWith(`/class/${subjectId}/session/1`);
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    renderWithRouter(<SessionCard {...defaultProps} className={customClass} />);
    
    const card = screen.getByText('Introduction to React').closest('div');
    expect(card).toHaveClass(customClass);
  });

  it('displays created date correctly', () => {
    renderWithRouter(<SessionCard {...defaultProps} />);
    
    expect(screen.getByText('Jan 15')).toBeInTheDocument();
  });

  it('handles session without description', () => {
    const sessionWithoutDescription = { ...baseSession, description: undefined };
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithoutDescription} />);
    
    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.queryByText('Basic React concepts and components')).not.toBeInTheDocument();
  });

  it('handles session without notes', () => {
    const sessionWithoutNotes = { ...baseSession, notes: null };
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithoutNotes} />);
    
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('handles session without date', () => {
    const sessionWithoutDate = { ...baseSession, session_date: undefined };
    renderWithRouter(<SessionCard {...defaultProps} session={sessionWithoutDate} />);
    
    // Should not show any date-related text
    expect(screen.queryByText(/Jan \d+/)).not.toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});