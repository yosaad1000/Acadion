import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import GoogleCalendarConnection from '../GoogleCalendarConnection';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('GoogleCalendarConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_connected: false })
    });

    render(<GoogleCalendarConnection />);
    expect(screen.getByText('Checking calendar connection...')).toBeInTheDocument();
  });

  it('renders connect button when not connected', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ is_connected: false })
    });

    render(<GoogleCalendarConnection />);

    await waitFor(() => {
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
    });
  });

  it('renders connected state when calendar is connected', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        is_connected: true,
        calendar_id: 'test@gmail.com'
      })
    });

    render(<GoogleCalendarConnection />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });
  });

  it('handles connect button click', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ is_connected: false })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ auth_url: 'https://accounts.google.com/oauth' })
      });

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(<GoogleCalendarConnection />);

    await waitFor(() => {
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connect Google Calendar'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/calendar/connect', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          redirect_uri: 'http://localhost:3000/calendar/callback'
        })
      });
    });
  });

  it('handles disconnect button click', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          is_connected: true,
          calendar_id: 'test@gmail.com'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

    const mockOnConnectionChange = vi.fn();
    render(<GoogleCalendarConnection onConnectionChange={mockOnConnectionChange} />);

    await waitFor(() => {
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disconnect'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/calendar/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      expect(mockOnConnectionChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error message on connection failure', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ is_connected: false })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Connection failed' })
      });

    render(<GoogleCalendarConnection />);

    await waitFor(() => {
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connect Google Calendar'));

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  it('calls onConnectionChange callback', async () => {
    const mockOnConnectionChange = vi.fn();
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        is_connected: true,
        calendar_id: 'test@gmail.com'
      })
    });

    render(<GoogleCalendarConnection onConnectionChange={mockOnConnectionChange} />);

    await waitFor(() => {
      expect(mockOnConnectionChange).toHaveBeenCalledWith(true);
    });
  });
});