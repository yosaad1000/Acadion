import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationBell from '../../../components/notifications/NotificationBell';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the notification context
const mockNotificationContext = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  preferences: [],
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  updatePreferences: vi.fn(),
  refreshNotifications: vi.fn(),
  refreshPreferences: vi.fn(),
};

// Mock the auth context
const mockAuthContext = {
  user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'student' as const },
  isAuthenticated: true,
  currentRole: 'student' as const,
  signIn: vi.fn(),
  signOut: vi.fn(),
  switchRole: vi.fn(),
  loading: false,
};

// Mock the contexts
vi.mock('../../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNotifications: () => mockNotificationContext,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext,
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  BellIcon: ({ className, ...props }: any) => <svg className={className} data-testid="bell-outline" {...props} />,
  CheckIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-icon" {...props} />,
  EyeIcon: ({ className, ...props }: any) => <svg className={className} data-testid="eye-icon" {...props} />,
  InboxIcon: ({ className, ...props }: any) => <svg className={className} data-testid="inbox-icon" {...props} />,
  XMarkIcon: ({ className, ...props }: any) => <svg className={className} data-testid="x-mark-icon" {...props} />,
  TrashIcon: ({ className, ...props }: any) => <svg className={className} data-testid="trash-icon" {...props} />,
  UserPlusIcon: ({ className, ...props }: any) => <svg className={className} data-testid="user-plus-icon" {...props} />,
  CheckCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-circle-icon" {...props} />,
  XCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="x-circle-icon" {...props} />,
  AcademicCapIcon: ({ className, ...props }: any) => <svg className={className} data-testid="academic-cap-icon" {...props} />,
  ExclamationTriangleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="exclamation-triangle-icon" {...props} />,
}));

vi.mock('@heroicons/react/24/solid', () => ({
  BellIcon: ({ className, ...props }: any) => <svg className={className} data-testid="bell-solid" {...props} />,
}));

const renderNotificationBell = (props = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationBell {...props} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default state
    Object.assign(mockNotificationContext, {
      notifications: [],
      unreadCount: 0,
      loading: false,
      preferences: [],
    });
  });

  describe('Rendering', () => {
    it('renders the notification bell button', () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Notifications');
    });

    it('renders outline bell icon when no unread notifications', () => {
      renderNotificationBell();
      
      expect(screen.getByTestId('bell-outline')).toBeInTheDocument();
      expect(screen.queryByTestId('bell-solid')).not.toBeInTheDocument();
    });

    it('renders solid bell icon when there are unread notifications', () => {
      mockNotificationContext.unreadCount = 3;
      renderNotificationBell();
      
      expect(screen.getByTestId('bell-solid')).toBeInTheDocument();
      expect(screen.queryByTestId('bell-outline')).not.toBeInTheDocument();
    });

    it('displays unread count badge when there are unread notifications', () => {
      mockNotificationContext.unreadCount = 5;
      renderNotificationBell();
      
      const badge = screen.getByTestId('unread-count-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('displays "99+" when unread count exceeds 99', () => {
      mockNotificationContext.unreadCount = 150;
      renderNotificationBell();
      
      const badge = screen.getByTestId('unread-count-badge');
      expect(badge).toHaveTextContent('99+');
    });

    it('does not display badge when unread count is 0', () => {
      mockNotificationContext.unreadCount = 0;
      renderNotificationBell();
      
      expect(screen.queryByTestId('unread-count-badge')).not.toBeInTheDocument();
    });

    it('updates aria-label with unread count', () => {
      mockNotificationContext.unreadCount = 3;
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveAttribute('aria-label', 'Notifications (3 unread)');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      mockNotificationContext.loading = true;
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).toBeDisabled();
    });

    it('does not show loading indicator when not loading', () => {
      mockNotificationContext.loading = false;
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).not.toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes correctly', () => {
      renderNotificationBell({ size: 'sm' });
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('p-1.5');
    });

    it('applies medium size classes correctly (default)', () => {
      renderNotificationBell({ size: 'md' });
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('p-2');
    });

    it('applies large size classes correctly', () => {
      renderNotificationBell({ size: 'lg' });
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('p-2.5');
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when bell is clicked', async () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
    });

    it('closes dropdown when bell is clicked again', async () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      
      // Open dropdown
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Close dropdown
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when clicking outside', async () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('does not open dropdown when loading', () => {
      mockNotificationContext.loading = true;
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      fireEvent.click(button);
      
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      renderNotificationBell({ className: 'custom-class' });
      
      const bellContainer = screen.getByTestId('notification-bell').parentElement;
      expect(bellContainer).toHaveClass('custom-class');
    });

    it('uses default size when not specified', () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('p-2'); // medium size default
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveAttribute('aria-label');
      // Button elements have implicit role="button", so we don't need to check for explicit role
      expect(button.tagName).toBe('BUTTON');
    });

    it('is keyboard accessible', () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });

    it('has touch-friendly interaction', () => {
      renderNotificationBell();
      
      const button = screen.getByTestId('notification-bell');
      expect(button).toHaveClass('touch-manipulation');
    });
  });
});