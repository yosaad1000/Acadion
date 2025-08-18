import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StudentCalendarView from '../StudentCalendarView';
import { ClassSchedule } from '../../../types';

// Mock the child components
vi.mock('../CalendarView', () => ({
  default: ({ schedules, onViewDetails, userRole }: any) => (
    <div data-testid="calendar-view">
      <div>Calendar View - {userRole}</div>
      <div>Schedules: {schedules.length}</div>
      <button onClick={() => onViewDetails(schedules[0])}>View Details</button>
    </div>
  )
}));

vi.mock('../GoogleCalendarConnection', () => ({
  default: ({ onConnectionChange }: any) => (
    <div data-testid="google-calendar-connection">
      <button onClick={() => onConnectionChange(true)}>Connect</button>
      <button onClick={() => onConnectionChange(false)}>Disconnect</button>
    </div>
  )
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockSchedules: ClassSchedule[] = [
  {
    id: 1,
    teacher_id: 1,
    subject_id: 1,
    title: 'Mathematics Class',
    description: 'Algebra basics',
    start_datetime: '2024-01-15T10:00:00Z',
    duration_minutes: 60,
    google_event_id: 'event1',
    is_active: true,
    recurrence_pattern: {
      type: 'weekly',
      interval: 1,
      days_of_week: [0, 2, 4]
    }
  },
  {
    id: 2,
    teacher_id: 1,
    subject_id: 2,
    title: 'Physics Class',
    description: 'Mechanics',
    start_datetime: '2024-01-16T14:00:00Z',
    duration_minutes: 90,
    google_event_id: 'event2',
    is_active: true
  }
];

describe('StudentCalendarView', () => {
  const mockOnViewDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/schedules/sync-settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { schedule_id: 1, sync_to_personal_calendar: true },
            { schedule_id: 2, sync_to_personal_calendar: false }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it('renders Google Calendar connection component', () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByTestId('google-calendar-connection')).toBeInTheDocument();
  });

  it('renders calendar view with student role', () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.getByText('Calendar View - student')).toBeInTheDocument();
    expect(screen.getByText('Schedules: 2')).toBeInTheDocument();
  });

  it('displays class schedule list', () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('My Class Schedule')).toBeInTheDocument();
    expect(screen.getByText('Mathematics Class')).toBeInTheDocument();
    expect(screen.getByText('Physics Class')).toBeInTheDocument();
  });

  it('shows sync options when calendar is connected', async () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(screen.getByText('Calendar Sync')).toBeInTheDocument();
      expect(screen.getByText('Sync Options')).toBeInTheDocument();
    });
  });

  it('fetches sync settings on mount', async () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/schedules/sync-settings', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
    });
  });

  it('displays sync summary correctly', async () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar to show sync options
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(screen.getByText('1 of 2 classes synced')).toBeInTheDocument();
    });
  });

  it('shows sync options when button is clicked', async () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      expect(screen.getByText('Sync Options')).toBeInTheDocument();
    });

    // Click sync options button
    fireEvent.click(screen.getByText('Sync Options'));

    expect(screen.getByText('All Classes')).toBeInTheDocument();
    expect(screen.getByText('Sync All')).toBeInTheDocument();
    expect(screen.getByText('Unsync All')).toBeInTheDocument();
  });

  it('handles individual schedule sync toggle', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { schedule_id: 1, sync_to_personal_calendar: false },
          { schedule_id: 2, sync_to_personal_calendar: false }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar and show sync options
    fireEvent.click(screen.getByText('Connect'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Sync Options'));
    });

    await waitFor(() => {
      expect(screen.getByText('All Classes')).toBeInTheDocument();
    });

    // Find and click the sync checkbox for the first schedule
    const checkboxes = screen.getAllByRole('checkbox');
    const firstScheduleCheckbox = checkboxes.find(checkbox => 
      checkbox.closest('div')?.textContent?.includes('Mathematics Class')
    );
    
    if (firstScheduleCheckbox) {
      fireEvent.click(firstScheduleCheckbox);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/schedules/1/sync', {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sync_to_personal_calendar: true
          })
        });
      });
    }
  });

  it('handles bulk sync operations', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar and show sync options
    fireEvent.click(screen.getByText('Connect'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Sync Options'));
    });

    await waitFor(() => {
      expect(screen.getByText('Sync All')).toBeInTheDocument();
    });

    // Click sync all
    fireEvent.click(screen.getByText('Sync All'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/schedules/bulk-sync', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_to_personal_calendar: true,
          schedule_ids: [1, 2]
        })
      });
    });
  });

  it('displays error message on sync failure', async () => {
    (fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/schedules/sync-settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/api/schedules/bulk-sync') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Sync failed' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar and show sync options
    fireEvent.click(screen.getByText('Connect'));
    
    await waitFor(() => {
      expect(screen.getByText('Calendar Sync')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sync Options'));

    await waitFor(() => {
      expect(screen.getByText('Sync All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sync All'));

    await waitFor(() => {
      expect(screen.getByText('Sync failed')).toBeInTheDocument();
    });
  });

  it('shows empty state when no schedules', () => {
    render(
      <StudentCalendarView
        schedules={[]}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('No classes scheduled')).toBeInTheDocument();
    expect(screen.getByText('Contact your teacher to get enrolled in classes')).toBeInTheDocument();
  });

  it('calls onViewDetails when view details button is clicked', () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Click view details button in calendar view
    fireEvent.click(screen.getByText('View Details'));
    expect(mockOnViewDetails).toHaveBeenCalledWith(mockSchedules[0]);
  });

  it('shows synced indicator for synced schedules', async () => {
    render(
      <StudentCalendarView
        schedules={mockSchedules}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Connect calendar
    fireEvent.click(screen.getByText('Connect'));

    await waitFor(() => {
      // Should show synced indicator for the first schedule (which is synced according to mock)
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });
  });
});