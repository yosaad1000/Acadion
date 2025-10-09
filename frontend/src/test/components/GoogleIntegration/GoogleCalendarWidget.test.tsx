import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleCalendarWidget from '../../../components/GoogleIntegration/GoogleCalendarWidget';

// Mock the Google Calendar service
vi.mock('../../../services/googleCalendarService', () => ({
  googleCalendarService: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getEvents: vi.fn(),
    createMeetLink: vi.fn()
  }
}));

// Mock the useGoogleAuth hook
vi.mock('../../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: vi.fn()
}));

const { googleCalendarService } = await import('../../../services/googleCalendarService');
const { useGoogleAuth } = await import('../../../hooks/useGoogleAuth');

const mockGoogleCalendarService = googleCalendarService as vi.Mocked<typeof googleCalendarService>;
const mockUseGoogleAuth = useGoogleAuth as vi.MockedFunction<typeof useGoogleAuth>;

describe('GoogleCalendarWidget', () => {
  const mockSession = {
    session_id: '1',
    subject_id: 'subject-1',
    name: 'Test Session',
    description: 'Test Description',
    session_date: '2024-01-15T10:00:00Z',
    notes: null,
    attendance_taken: false,
    assignments: [],
    created_by: 'teacher-id',
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z'
  };

  const defaultProps = {
    session: mockSession,
    onEventCreated: vi.fn(),
    onEventUpdated: vi.fn(),
    onEventDeleted: vi.fn()
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

  it('renders calendar widget when authenticated', () => {
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Schedule this session in Google Calendar')).toBeInTheDocument();
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

    render(<GoogleCalendarWidget {...defaultProps} />);
    
    expect(screen.getByText('Connect Google Account')).toBeInTheDocument();
    expect(screen.getByText('Connect your Google account to schedule sessions in Google Calendar')).toBeInTheDocument();
  });

  it('creates calendar event when create button is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = {
      id: 'event-123',
      summary: 'Test Session',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' },
      htmlLink: 'https://calendar.google.com/event/123',
      hangoutLink: 'https://meet.google.com/abc-def-ghi'
    };

    mockGoogleCalendarService.createEvent.mockResolvedValue(mockEvent);
    
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    const createButton = screen.getByText('Create Calendar Event');
    await user.click(createButton);
    
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

    expect(defaultProps.onEventCreated).toHaveBeenCalledWith(mockEvent);
  });

  it('shows loading state during event creation', async () => {
    const user = userEvent.setup();
    mockGoogleCalendarService.createEvent.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    const createButton = screen.getByText('Create Calendar Event');
    await user.click(createButton);
    
    expect(screen.getByText('Creating Event...')).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  it('handles event creation error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to create event';
    mockGoogleCalendarService.createEvent.mockRejectedValue(new Error(errorMessage));
    
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    const createButton = screen.getByText('Create Calendar Event');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to create calendar event')).toBeInTheDocument();
    });
  });

  it('displays existing event information', () => {
    const sessionWithEvent = {
      ...mockSession,
      google_calendar_event_id: 'event-123',
      google_meet_link: 'https://meet.google.com/abc-def-ghi'
    };

    render(<GoogleCalendarWidget {...defaultProps} session={sessionWithEvent} />);
    
    expect(screen.getByText('Calendar Event Created')).toBeInTheDocument();
    expect(screen.getByText('Join Google Meet')).toBeInTheDocument();
    expect(screen.getByText('View in Calendar')).toBeInTheDocument();
  });

  it('updates existing calendar event', async () => {
    const user = userEvent.setup();
    const sessionWithEvent = {
      ...mockSession,
      google_calendar_event_id: 'event-123',
      session_date: '2024-01-16T14:00:00Z' // Changed date
    };

    const mockUpdatedEvent = {
      id: 'event-123',
      summary: 'Test Session',
      start: { dateTime: '2024-01-16T14:00:00Z' },
      end: { dateTime: '2024-01-16T15:00:00Z' },
      htmlLink: 'https://calendar.google.com/event/123',
      hangoutLink: 'https://meet.google.com/abc-def-ghi'
    };

    mockGoogleCalendarService.updateEvent.mockResolvedValue(mockUpdatedEvent);
    
    render(<GoogleCalendarWidget {...defaultProps} session={sessionWithEvent} />);
    
    const updateButton = screen.getByText('Update Event');
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(mockGoogleCalendarService.updateEvent).toHaveBeenCalledWith('event-123', {
        summary: 'Test Session',
        description: 'Test Description',
        start: {
          dateTime: '2024-01-16T14:00:00Z',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: '2024-01-16T15:00:00Z',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });
    });

    expect(defaultProps.onEventUpdated).toHaveBeenCalledWith(mockUpdatedEvent);
  });

  it('deletes calendar event', async () => {
    const user = userEvent.setup();
    const sessionWithEvent = {
      ...mockSession,
      google_calendar_event_id: 'event-123'
    };

    mockGoogleCalendarService.deleteEvent.mockResolvedValue(undefined);
    
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete Event');
    await user.click(deleteButton);
    
    await waitFor(() => {
      expect(mockGoogleCalendarService.deleteEvent).toHaveBeenCalledWith('event-123');
    });

    expect(defaultProps.onEventDeleted).toHaveBeenCalledWith('event-123');
  });

  it('handles session without date gracefully', () => {
    const sessionWithoutDate = {
      ...mockSession,
      session_date: undefined
    };

    render(<GoogleCalendarWidget {...defaultProps} session={sessionWithoutDate} />);
    
    expect(screen.getByText('Set session date to create calendar event')).toBeInTheDocument();
    expect(screen.queryByText('Create Calendar Event')).not.toBeInTheDocument();
  });

  it('opens Google Meet link in new tab', async () => {
    const user = userEvent.setup();
    const sessionWithEvent = {
      ...mockSession,
      google_calendar_event_id: 'event-123',
      google_meet_link: 'https://meet.google.com/abc-def-ghi'
    };

    // Mock window.open
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);
    
    render(<GoogleCalendarWidget {...defaultProps} session={sessionWithEvent} />);
    
    const meetButton = screen.getByText('Join Google Meet');
    await user.click(meetButton);
    
    expect(mockOpen).toHaveBeenCalledWith('https://meet.google.com/abc-def-ghi', '_blank');
  });

  it('opens calendar event in new tab', async () => {
    const user = userEvent.setup();
    const sessionWithEvent = {
      ...mockSession,
      google_calendar_event_id: 'event-123',
      google_calendar_link: 'https://calendar.google.com/event/123'
    };

    // Mock window.open
    const mockOpen = vi.fn();
    vi.stubGlobal('open', mockOpen);
    
    render(<GoogleCalendarWidget {...defaultProps} session={sessionWithEvent} />);
    
    const calendarButton = screen.getByText('View in Calendar');
    await user.click(calendarButton);
    
    expect(mockOpen).toHaveBeenCalledWith('https://calendar.google.com/event/123', '_blank');
  });

  it('shows appropriate icons for different states', () => {
    render(<GoogleCalendarWidget {...defaultProps} />);
    
    // Should show calendar icon
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
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

    render(<GoogleCalendarWidget {...defaultProps} />);
    
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

    render(<GoogleCalendarWidget {...defaultProps} />);
    
    expect(screen.getByText('Google authentication failed')).toBeInTheDocument();
  });
});