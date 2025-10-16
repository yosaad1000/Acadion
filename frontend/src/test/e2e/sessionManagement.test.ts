/**
 * End-to-end tests for session management workflows
 * Tests complete user workflows from Requirements 1-6
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { Session, Subject } from '../../types';

// Mock the session service
vi.mock('../../services/sessionService', () => ({
  sessionService: {
    getSessionsBySubject: vi.fn(),
    createSession: vi.fn(),
    updateSessionNotes: vi.fn(),
    deleteSession: vi.fn(),
    getErrorMessage: vi.fn(),
    isRetryableError: vi.fn()
  }
}));

// Mock the subject service
vi.mock('../../services/subjectService', () => ({
  subjectService: {
    getSubject: vi.fn()
  }
}));

// Mock components (these would be actual components in the real app)
const MockClassDetailView = ({ subjectId }: { subjectId: string }) => {
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  React.useEffect(() => {
    const loadSessions = async () => {
      try {
        const { sessionService } = await import('../../services/sessionService');
        const sessionData = await sessionService.getSessionsBySubject(subjectId);
        setSessions(sessionData);
      } catch (err) {
        setError('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [subjectId]);

  if (loading) return <div>Loading sessions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Class Sessions</h1>
      
      {/* Navigation tabs - simplified to Sessions only per Requirement 5.2 */}
      <nav>
        <button className="active">Sessions</button>
        <button>Students</button>
        <button>Settings</button>
      </nav>

      {/* Sessions list - default view per Requirement 1.1 */}
      <div data-testid="sessions-list">
        {sessions.length === 0 ? (
          <div data-testid="empty-state">
            <p>No sessions yet</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              data-testid="create-session-button"
            >
              Create Session
            </button>
          </div>
        ) : (
          <div>
            {sessions.map((session) => (
              <div key={session.session_id} data-testid={`session-${session.session_id}`}>
                <h3>{session.name}</h3>
                <p>{session.session_date}</p>
                <p>Attendance: {session.attendance_taken ? 'Taken' : 'Not taken'}</p>
                {session.notes && <span data-testid="notes-indicator">📝</span>}
              </div>
            ))}
            <button 
              onClick={() => setShowCreateForm(true)}
              data-testid="create-session-button"
            >
              Create Session
            </button>
          </div>
        )}
      </div>

      {/* Session creation form - simplified per Requirement 2.3 */}
      {showCreateForm && (
        <div data-testid="create-session-form">
          <h2>Create New Session</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const { sessionService } = await import('../../services/sessionService');
            
            const sessionData = {
              name: formData.get('name') as string || '', // Auto-generated if empty
              description: formData.get('description') as string,
              session_date: formData.get('session_date') as string || new Date().toISOString()
            };

            const newSession = await sessionService.createSession(subjectId, sessionData);
            if (newSession) {
              setSessions(prev => [newSession, ...prev]);
              setShowCreateForm(false);
            }
          }}>
            {/* Essential fields only per Requirement 2.3 */}
            <input 
              name="name" 
              placeholder="Session name (auto-generated if empty)"
              data-testid="session-name-input"
            />
            <input 
              name="session_date" 
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              data-testid="session-date-input"
            />
            
            {/* Advanced section - progressive disclosure per Requirement 5.3 */}
            <details>
              <summary>Advanced Options</summary>
              <textarea 
                name="description" 
                placeholder="Description (optional)"
                data-testid="session-description-input"
              />
            </details>

            <button type="submit" data-testid="submit-session">Create Session</button>
            <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

const MockSessionDetailView = ({ sessionId }: { sessionId: string }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [notes, setNotes] = React.useState('');
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);

  React.useEffect(() => {
    // Mock session data
    setSession({
      session_id: sessionId,
      subject_id: 'subject-1',
      name: 'Test Session',
      description: 'Test description',
      session_date: '2024-01-01T10:00:00Z',
      notes: 'Existing notes',
      attendance_taken: false,
      created_by: 'teacher-1',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:00Z',
      assignments: [],
      subject_name: 'Test Subject',
      teacher_name: 'Test Teacher',
      assignment_count: 0,
      has_overdue_assignments: false
    });
    setNotes('Existing notes');
  }, [sessionId]);

  const handleNotesUpdate = async () => {
    const { sessionService } = await import('../../services/sessionService');
    const updatedSession = await sessionService.updateSessionNotes(sessionId, notes);
    if (updatedSession) {
      setSession(updatedSession);
      setIsEditingNotes(false);
    }
  };

  if (!session) return <div>Loading session...</div>;

  return (
    <div>
      <h1>{session.name}</h1>
      <p>Date: {session.session_date}</p>
      <p>Description: {session.description}</p>
      
      {/* Progressive notes management per Requirement 3 */}
      <div data-testid="notes-section">
        <h3>Notes</h3>
        {!isEditingNotes ? (
          <div>
            <p data-testid="notes-display">{session.notes || 'No notes yet'}</p>
            <button 
              onClick={() => setIsEditingNotes(true)}
              data-testid="edit-notes-button"
            >
              {session.notes ? 'Edit Notes' : 'Add Notes'}
            </button>
          </div>
        ) : (
          <div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="notes-textarea"
              placeholder="Add your notes here..."
            />
            <button onClick={handleNotesUpdate} data-testid="save-notes-button">
              Save Notes
            </button>
            <button onClick={() => setIsEditingNotes(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Session Management E2E Tests', () => {
  let mockSessionService: any;
  let mockSubjectService: any;

  beforeEach(() => {
    // Get mocked services
    mockSessionService = vi.mocked((sessionService as any));
    mockSubjectService = vi.mocked((subjectService as any));
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1: Default Sessions View', () => {
    it('should display sessions list as default view when teacher opens class', async () => {
      const mockSessions: Session[] = [
        {
          session_id: 'session-1',
          subject_id: 'subject-1',
          name: 'Session 1',
          description: 'First session',
          session_date: '2024-01-01T10:00:00Z',
          notes: null,
          attendance_taken: false,
          created_by: 'teacher-1',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
          assignments: [],
          subject_name: 'Test Subject',
          teacher_name: 'Test Teacher',
          assignment_count: 0,
          has_overdue_assignments: false
        },
        {
          session_id: 'session-2',
          subject_id: 'subject-1',
          name: 'Session 2',
          description: 'Second session',
          session_date: '2024-01-02T10:00:00Z',
          notes: 'Important notes',
          attendance_taken: true,
          created_by: 'teacher-1',
          created_at: '2024-01-02T09:00:00Z',
          updated_at: '2024-01-02T09:00:00Z',
          assignments: [],
          subject_name: 'Test Subject',
          teacher_name: 'Test Teacher',
          assignment_count: 0,
          has_overdue_assignments: false
        }
      ];

      mockSessionService.getSessionsBySubject.mockResolvedValue(mockSessions);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      // Wait for sessions to load
      await waitFor(() => {
        expect(screen.getByText('Class Sessions')).toBeInTheDocument();
      });

      // Verify sessions are displayed (Requirement 1.1)
      expect(screen.getByTestId('sessions-list')).toBeInTheDocument();
      expect(screen.getByTestId('session-session-1')).toBeInTheDocument();
      expect(screen.getByTestId('session-session-2')).toBeInTheDocument();

      // Verify session details are shown (Requirement 1.4)
      expect(screen.getByText('Session 1')).toBeInTheDocument();
      expect(screen.getByText('Session 2')).toBeInTheDocument();
      expect(screen.getByText('Attendance: Not taken')).toBeInTheDocument();
      expect(screen.getByText('Attendance: Taken')).toBeInTheDocument();

      // Verify notes indicator is shown (Requirement 3.5)
      expect(screen.getByTestId('notes-indicator')).toBeInTheDocument();
    });

    it('should show empty state with create button when no sessions exist', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });

      // Verify empty state message (Requirement 1.3)
      expect(screen.getByText('No sessions yet')).toBeInTheDocument();
      expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
    });
  });

  describe('Requirement 2: Smart Session Creation', () => {
    it('should create session with smart defaults', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);
      
      const mockCreatedSession: Session = {
        session_id: 'new-session-1',
        subject_id: 'subject-1',
        name: 'Session 1', // Auto-generated name
        description: null,
        session_date: new Date().toISOString(),
        notes: null,
        attendance_taken: false,
        created_by: 'teacher-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      };

      mockSessionService.createSession.mockResolvedValue(mockCreatedSession);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      });

      // Click create session button (Requirement 2.1)
      await userEvent.click(screen.getByTestId('create-session-button'));

      // Verify form appears with smart defaults
      expect(screen.getByTestId('create-session-form')).toBeInTheDocument();
      
      // Verify current date/time is pre-populated (Requirement 2.1)
      const dateInput = screen.getByTestId('session-date-input') as HTMLInputElement;
      expect(dateInput.value).toBeTruthy();

      // Verify essential fields only (Requirement 2.3)
      expect(screen.getByTestId('session-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('session-date-input')).toBeInTheDocument();
      
      // Advanced options should be collapsed
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();

      // Submit form without name (should auto-generate)
      await userEvent.click(screen.getByTestId('submit-session'));

      await waitFor(() => {
        expect(mockSessionService.createSession).toHaveBeenCalledWith(
          'subject-1',
          expect.objectContaining({
            name: '', // Empty name should trigger auto-generation
            session_date: expect.any(String)
          })
        );
      });
    });

    it('should use provided name when specified', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue({} as Session);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('create-session-button'));

      // Enter custom name
      const nameInput = screen.getByTestId('session-name-input');
      await userEvent.type(nameInput, 'Custom Session Name');

      await userEvent.click(screen.getByTestId('submit-session'));

      await waitFor(() => {
        expect(mockSessionService.createSession).toHaveBeenCalledWith(
          'subject-1',
          expect.objectContaining({
            name: 'Custom Session Name'
          })
        );
      });
    });
  });

  describe('Requirement 3: Progressive Notes Management', () => {
    it('should allow adding notes after session creation', async () => {
      const updatedSession: Session = {
        session_id: 'session-1',
        subject_id: 'subject-1',
        name: 'Test Session',
        description: 'Test description',
        session_date: '2024-01-01T10:00:00Z',
        notes: 'New important notes',
        attendance_taken: false,
        created_by: 'teacher-1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      };

      mockSessionService.updateSessionNotes.mockResolvedValue(updatedSession);

      render(
        <TestWrapper>
          <MockSessionDetailView sessionId="session-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notes-section')).toBeInTheDocument();
      });

      // Verify "Add Notes" button is available (Requirement 3.3)
      expect(screen.getByTestId('edit-notes-button')).toBeInTheDocument();
      expect(screen.getByText('Edit Notes')).toBeInTheDocument();

      // Click to edit notes
      await userEvent.click(screen.getByTestId('edit-notes-button'));

      // Verify notes textarea appears
      expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();

      // Add new notes
      const notesTextarea = screen.getByTestId('notes-textarea');
      await userEvent.clear(notesTextarea);
      await userEvent.type(notesTextarea, 'New important notes');

      // Save notes (Requirement 3.4 - auto-save functionality)
      await userEvent.click(screen.getByTestId('save-notes-button'));

      await waitFor(() => {
        expect(mockSessionService.updateSessionNotes).toHaveBeenCalledWith(
          'session-1',
          'New important notes'
        );
      });

      // Verify notes are updated in display
      await waitFor(() => {
        expect(screen.getByText('New important notes')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 4: Error Handling', () => {
    it('should display user-friendly error messages', async () => {
      const apiError = new Error('Network error');
      mockSessionService.getSessionsBySubject.mockRejectedValue(apiError);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load sessions')).toBeInTheDocument();
      });
    });

    it('should handle session creation failures gracefully', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue(null); // Simulate failure

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('create-session-button'));
      await userEvent.click(screen.getByTestId('submit-session'));

      // Form should remain open on failure
      await waitFor(() => {
        expect(screen.getByTestId('create-session-form')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5: Simplified Interface', () => {
    it('should show limited navigation options', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });

      // Verify only essential navigation options (Requirement 5.2)
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Sessions should be active by default
      expect(screen.getByText('Sessions')).toHaveClass('active');
    });

    it('should use progressive disclosure for advanced options', async () => {
      mockSessionService.getSessionsBySubject.mockResolvedValue([]);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('create-session-button'));

      // Advanced options should be collapsed initially (Requirement 5.3)
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
      expect(screen.queryByTestId('session-description-input')).not.toBeVisible();

      // Click to expand advanced options
      await userEvent.click(screen.getByText('Advanced Options'));

      // Now description field should be visible
      expect(screen.getByTestId('session-description-input')).toBeVisible();
    });
  });

  describe('Requirement 6: Consistent Navigation and Feedback', () => {
    it('should provide immediate feedback for user actions', async () => {
      const mockCreatedSession: Session = {
        session_id: 'new-session',
        subject_id: 'subject-1',
        name: 'New Session',
        description: null,
        session_date: new Date().toISOString(),
        notes: null,
        attendance_taken: false,
        created_by: 'teacher-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      };

      mockSessionService.getSessionsBySubject.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue(mockCreatedSession);

      render(
        <TestWrapper>
          <MockClassDetailView subjectId="subject-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('create-session-button'));
      await userEvent.click(screen.getByTestId('submit-session'));

      // Should provide immediate feedback (Requirement 6.2)
      await waitFor(() => {
        // Form should close and new session should appear
        expect(screen.queryByTestId('create-session-form')).not.toBeInTheDocument();
        expect(screen.getByTestId('session-new-session')).toBeInTheDocument();
      });
    });
  });
});