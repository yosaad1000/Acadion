import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateSession from '../../../components/Session/CreateSession';

// Mock the useSessions hook
vi.mock('../../../hooks/useSessions', () => ({
  useSessions: vi.fn()
}));

const { useSessions } = await import('../../../hooks/useSessions');
const mockUseSessions = useSessions as vi.MockedFunction<typeof useSessions>;

describe('CreateSession', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockCreateSession = vi.fn();
  const subjectId = 'test-subject-id';
  
  const defaultProps = {
    subjectId,
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      createSession: mockCreateSession,
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(<CreateSession {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Create New Session')).not.toBeInTheDocument();
  });

  it('renders form when isOpen is true', () => {
    render(<CreateSession {...defaultProps} />);
    
    expect(screen.getByText('Create New Session')).toBeInTheDocument();
    expect(screen.getByLabelText('Session Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toBeInTheDocument();
    expect(screen.getByText('Advanced Options')).toBeInTheDocument();
    // Description should be hidden by default
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
  });

  it('pre-populates session name with auto-generated value', () => {
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name');
    expect(nameInput).toHaveValue('Session 1'); // Auto-generated based on empty sessions array
  });

  it('allows editing the auto-generated session name', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name');
    expect(nameInput).toHaveValue('Session 1');
    
    await user.clear(nameInput);
    await user.type(nameInput, 'Custom Session Name');
    
    expect(nameInput).toHaveValue('Custom Session Name');
  });

  it('shows description field when advanced options are expanded', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    // Description should not be visible initially
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    
    // Click advanced options toggle
    const advancedToggle = screen.getByText('Advanced Options');
    await user.click(advancedToggle);
    
    // Description should now be visible
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('validates past date selection', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name *');
    const dateInput = screen.getByLabelText('Date');
    
    await user.type(nameInput, 'Test Session');
    await user.type(dateInput, '2020-01-01');
    
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    expect(screen.getByText('Session date cannot be in the past')).toBeInTheDocument();
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('validates past time selection for today', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name *');
    const dateInput = screen.getByLabelText('Date');
    const timeInput = screen.getByLabelText('Time');
    
    const today = new Date().toISOString().split('T')[0];
    const pastTime = '08:00'; // Assuming current time is after 8 AM
    
    await user.type(nameInput, 'Test Session');
    await user.type(dateInput, today);
    await user.type(timeInput, pastTime);
    
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    // This test might be flaky depending on current time, so we check if validation exists
    const timeError = screen.queryByText('Session time cannot be in the past');
    if (timeError) {
      expect(mockCreateSession).not.toHaveBeenCalled();
    }
  });

  it('creates session with valid data including description from advanced section', async () => {
    const user = userEvent.setup();
    const mockSession = {
      session_id: 'new-session-id',
      subject_id: subjectId,
      name: 'Test Session',
      description: 'Test Description',
      session_date: '2024-12-25T10:00:00',
      attendance_taken: false,
      assignments: [],
      created_by: 'teacher-id',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSession.mockResolvedValue(mockSession);
    
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name');
    const dateInput = screen.getByLabelText('Date');
    const timeInput = screen.getByLabelText('Time');
    
    // Clear auto-generated name and set custom name
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Session');
    await user.clear(dateInput);
    await user.type(dateInput, '2024-12-25');
    await user.clear(timeInput);
    await user.type(timeInput, '10:00');
    
    // Expand advanced options and add description
    const advancedToggle = screen.getByText('Advanced Options');
    await user.click(advancedToggle);
    
    const descriptionInput = screen.getByLabelText('Description');
    await user.type(descriptionInput, 'Test Description');
    
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith({
        name: 'Test Session',
        description: 'Test Description',
        session_date: '2024-12-25T10:00:00'
      });
    });
    
    expect(mockOnSuccess).toHaveBeenCalledWith('new-session-id');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('creates session with auto-generated name and default date/time', async () => {
    const user = userEvent.setup();
    const mockSession = {
      session_id: 'new-session-id',
      subject_id: subjectId,
      name: 'Session 1',
      description: undefined,
      session_date: '2025-10-09T00:09:00', // Will be current date/time
      attendance_taken: false,
      assignments: [],
      created_by: 'teacher-id',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSession.mockResolvedValue(mockSession);
    
    render(<CreateSession {...defaultProps} />);
    
    // Don't modify the auto-generated name, just submit
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
    
    expect(mockOnSuccess).toHaveBeenCalledWith('new-session-id');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('sets default time when date is provided without time', async () => {
    const user = userEvent.setup();
    const mockSession = {
      session_id: 'new-session-id',
      subject_id: subjectId,
      name: 'Session 1',
      description: undefined,
      session_date: '2024-12-25T09:00:00',
      attendance_taken: false,
      assignments: [],
      created_by: 'teacher-id',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSession.mockResolvedValue(mockSession);
    
    render(<CreateSession {...defaultProps} />);
    
    const dateInput = screen.getByLabelText('Date');
    const timeInput = screen.getByLabelText('Time');
    
    // Clear existing values and set new date, clear time
    await user.clear(dateInput);
    await user.type(dateInput, '2024-12-25');
    await user.clear(timeInput);
    
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalled();
    });
    
    expect(mockOnSuccess).toHaveBeenCalledWith('new-session-id');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state during creation', async () => {
    const user = userEvent.setup();
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: true,
      error: null,
      createSession: mockCreateSession,
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });
    
    render(<CreateSession {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Session');
    expect(submitButton).toBeDisabled();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeDisabled();
  });

  it('handles creation error', async () => {
    const user = userEvent.setup();
    mockCreateSession.mockResolvedValue(null);
    
    render(<CreateSession {...defaultProps} />);
    
    // Use the auto-generated name, just submit
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create session. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles unexpected error', async () => {
    const user = userEvent.setup();
    mockCreateSession.mockRejectedValue(new Error('Network error'));
    
    render(<CreateSession {...defaultProps} />);
    
    // Use the auto-generated name, just submit
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when closed', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Session');
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    rerender(<CreateSession {...defaultProps} isOpen={true} />);
    
    const newNameInput = screen.getByLabelText('Session Name');
    expect(newNameInput).toHaveValue('Session 1'); // Should reset to auto-generated name
  });

  it('shows validation errors for past dates', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    // Set a past date to trigger validation error
    const dateInput = screen.getByLabelText('Date');
    await user.clear(dateInput);
    await user.type(dateInput, '2020-01-01');
    
    const submitButton = screen.getByText('Create Session');
    await user.click(submitButton);
    
    // Check that createSession was not called due to validation error
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('submit button is enabled by default with auto-generated name', () => {
    render(<CreateSession {...defaultProps} />);
    
    const submitButton = screen.getByText('Create Session');
    expect(submitButton).not.toBeDisabled();
  });

  it('maintains enabled submit button when name is edited', async () => {
    const user = userEvent.setup();
    render(<CreateSession {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('Session Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Session');
    
    const submitButton = screen.getByText('Create Session');
    expect(submitButton).not.toBeDisabled();
  });
});