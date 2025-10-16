import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateSession from '../../../components/Session/CreateSession';
import SessionCard from '../../../components/Session/SessionCard';
import SessionList from '../../../components/Session/SessionList';
import { AuthContext } from '../../../contexts/AuthContext';
import { ToastContext } from '../../../contexts/ToastContext';
import { Session } from '../../../types';

// Mock hooks and services
vi.mock('../../../hooks/useSessions', () => ({
  useSessions: vi.fn(() => ({
    sessions: [],
    loading: false,
    error: null,
    networkError: null,
    isRetrying: false,
    retryNetwork: vi.fn(),
    clearNetworkError: vi.fn(),
    refetch: vi.fn(),
    createSession: vi.fn()
  }))
}));

vi.mock('../../../hooks/useSessionFormValidation', () => ({
  useSessionFormValidation: vi.fn(() => ({
    validationState: { isValidating: false },
    validateField: vi.fn(),
    clearFieldError: vi.fn(),
    markFieldTouched: vi.fn(),
    validateCreateForm: vi.fn(() => true),
    getFieldError: vi.fn(),
    hasError: vi.fn(() => false),
    isFieldTouched: vi.fn(() => false),
    resetValidation: vi.fn()
  }))
}));

const mockAuthContext = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  currentRole: 'teacher' as const,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
  loading: false
};

const mockToastContext = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn()
};

const mockSession: Session = {
  session_id: '1',
  subject_id: 'subject-1',
  name: 'Test Session',
  description: 'Test description',
  session_date: '2024-01-15T10:00:00Z',
  notes: 'Test notes',
  attendance_taken: false,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  assignments: []
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <ToastContext.Provider value={mockToastContext}>
          {component}
        </ToastContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Session Mobile Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateSession Mobile Experience', () => {
    it('should render mobile-optimized create session modal', () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check for mobile-friendly elements
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Session Name')).toHaveClass('input-mobile');
      expect(screen.getByLabelText('Date')).toHaveClass('input-mobile');
      expect(screen.getByLabelText('Time')).toHaveClass('input-mobile');
    });

    it('should have touch-friendly buttons', () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const createButton = screen.getByRole('button', { name: /create session/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(createButton).toHaveClass('btn-mobile');
      expect(cancelButton).toHaveClass('btn-mobile');
    });

    it('should show progressive disclosure for advanced options', async () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const advancedToggle = screen.getByRole('button', { name: /advanced options/i });
      expect(advancedToggle).toBeInTheDocument();

      // Description should not be visible initially
      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();

      // Click to expand advanced options
      fireEvent.click(advancedToggle);

      // Description should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
      });
    });

    it('should handle mobile form layout correctly', () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check that date and time inputs are in a responsive grid
      const dateInput = screen.getByLabelText('Date');
      const timeInput = screen.getByLabelText('Time');
      
      expect(dateInput.closest('.grid')).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
      expect(timeInput.closest('.grid')).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    });
  });

  describe('SessionCard Mobile Experience', () => {
    it('should render mobile-optimized session card', () => {
      renderWithProviders(
        <SessionCard
          session={mockSession}
          subjectId="test-subject"
        />
      );

      const card = screen.getByRole('button');
      expect(card).toHaveClass('touch-manipulation', 'active:scale-[0.98]');
    });

    it('should handle keyboard navigation', () => {
      const mockOnClick = vi.fn();
      renderWithProviders(
        <SessionCard
          session={mockSession}
          subjectId="test-subject"
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnClick).toHaveBeenCalledWith(mockSession);

      // Test Space key
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    it('should display responsive text sizes', () => {
      renderWithProviders(
        <SessionCard
          session={mockSession}
          subjectId="test-subject"
        />
      );

      const sessionName = screen.getByText('Test Session');
      expect(sessionName).toHaveClass('text-base', 'sm:text-lg');
    });
  });

  describe('SessionList Mobile Experience', () => {
    it('should render mobile-optimized session list', () => {
      renderWithProviders(
        <SessionList
          subjectId="test-subject"
          onCreateSession={vi.fn()}
        />
      );

      // Check for mobile-friendly header
      const heading = screen.getByText('Sessions');
      expect(heading).toHaveClass('text-xl', 'sm:text-2xl');
    });

    it('should have mobile-friendly create button', () => {
      const mockOnCreate = vi.fn();
      renderWithProviders(
        <SessionList
          subjectId="test-subject"
          onCreateSession={mockOnCreate}
        />
      );

      const createButton = screen.getByRole('button', { name: /create session/i });
      expect(createButton).toHaveClass('btn-mobile');
      
      fireEvent.click(createButton);
      expect(mockOnCreate).toHaveBeenCalled();
    });
  });

  describe('Mobile Viewport Detection', () => {
    it('should adapt layout based on screen size', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check that mobile-specific classes are applied
      const modal = screen.getByRole('dialog');
      expect(modal.closest('.fixed')).toHaveClass('p-2', 'sm:p-4');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events on session cards', () => {
      const mockOnClick = vi.fn();
      renderWithProviders(
        <SessionCard
          session={mockSession}
          subjectId="test-subject"
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('button');
      
      // Simulate touch interaction
      fireEvent.touchStart(card);
      fireEvent.touchEnd(card);
      fireEvent.click(card);
      
      expect(mockOnClick).toHaveBeenCalledWith(mockSession);
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility features on mobile', () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Check for proper ARIA labels
      expect(screen.getByLabelText('Session Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Time')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();

      // Check for proper form associations
      const nameInput = screen.getByLabelText('Session Name');
      expect(nameInput).toHaveAttribute('aria-describedby');
    });

    it('should have proper focus management', () => {
      renderWithProviders(
        <CreateSession
          subjectId="test-subject"
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const nameInput = screen.getByLabelText('Session Name');
      nameInput.focus();
      expect(nameInput).toHaveFocus();
    });
  });
});