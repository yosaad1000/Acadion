import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Calendar from '../../pages/Calendar';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the auth context
const mockUser = {
  user_id: '1',
  email: 'teacher@test.com',
  name: 'Test Teacher',
  user_type: 'teacher' as const,
  is_face_registered: false,
  created_at: '2024-01-01T00:00:00Z'
};

vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn()
  })
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockSchedules = [
  {
    id: 1,
    teacher_id: 1,
    subject_id: 1,
    title: 'Mathematics Class',
    description: 'Algebra basics',
    start_datetime: '2024-01-15T10:00:00Z',
    duration_minutes: 60,
    google_event_id: 'event1',
    is_active: true
  }
];

const mockSubjects = [
  { id: 1, name: 'Mathematics', code: 'MATH101' },
  { id: 2, name: 'Physics', code: 'PHYS101' }
];

describe('Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default fetch responses
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/schedules')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSchedules)
        });
      }
      if (url.includes('/api/subjects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubjects)
        });
      }
      if (url.includes('/api/calendar/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ is_connected: false })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  const renderCalendar = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Calendar />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders calendar page for teacher', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Manage your class schedules and Google Calendar integration')).toBeInTheDocument();
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });
  });

  it('fetches schedules on mount', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/schedules', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
    });
  });

  it('shows create schedule form when create button is clicked', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Schedule'));

    await waitFor(() => {
      expect(screen.getByText('Create Class Schedule')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
      expect(screen.getByLabelText('Class Title')).toBeInTheDocument();
    });
  });

  it('creates a new schedule successfully', async () => {
    (fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/schedules') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 2 })
        });
      }
      if (url.includes('/api/subjects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubjects)
        });
      }
      if (url.includes('/api/schedules') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSchedules)
        });
      }
      if (url.includes('/api/calendar/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ is_connected: false })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    renderCalendar();

    // Click create schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Schedule'));
    });

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Class Title'), { target: { value: 'New Math Class' } });
    fireEvent.change(screen.getByLabelText('Start Date & Time'), { target: { value: '2024-01-20T10:00' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create Schedule'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/schedules', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: 1,
          title: 'New Math Class',
          description: '',
          start_datetime: '2024-01-20T10:00',
          duration_minutes: 60,
          recurrence_pattern: undefined
        })
      });
    });

    // Should return to calendar view
    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });
  });

  it('handles schedule creation error', async () => {
    (fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/schedules') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to create schedule' })
        });
      }
      if (url.includes('/api/subjects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSubjects)
        });
      }
      if (url.includes('/api/schedules') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSchedules)
        });
      }
      if (url.includes('/api/calendar/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ is_connected: false })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    renderCalendar();

    // Click create schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Schedule'));
    });

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    });

    // Fill out and submit the form
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Class Title'), { target: { value: 'New Math Class' } });
    fireEvent.change(screen.getByLabelText('Start Date & Time'), { target: { value: '2024-01-20T10:00' } });
    fireEvent.click(screen.getByText('Create Schedule'));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to create schedule')).toBeInTheDocument();
    });
  });

  it('cancels schedule creation and returns to calendar', async () => {
    renderCalendar();

    // Click create schedule
    await waitFor(() => {
      fireEvent.click(screen.getByText('Create Schedule'));
    });

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText('Create Class Schedule')).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should return to calendar view
    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });
  });

  it('displays Google Calendar connection component', async () => {
    renderCalendar();

    await waitFor(() => {
      expect(screen.getByText('Google Calendar Integration')).toBeInTheDocument();
      expect(screen.getByText('Connect your Google Calendar to automatically sync class schedules')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    // Mock fetch to never resolve to test loading state
    (fetch as any).mockImplementation(() => new Promise(() => {}));

    renderCalendar();

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('handles fetch schedules error', async () => {
    (fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/schedules')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to fetch schedules' })
        });
      }
      if (url.includes('/api/calendar/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ is_connected: false })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    renderCalendar();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch schedules')).toBeInTheDocument();
    });
  });
});