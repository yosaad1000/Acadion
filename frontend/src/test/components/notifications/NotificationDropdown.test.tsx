import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationDropdown from '../../../components/notifications/NotificationDropdown';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationType, type Notification } from '../../../types';

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    recipient_id: 'user1',
    sender_id: 'user2',
    type: NotificationType.STUDENT_JOINED,
    title: 'New Student Joined',
    message: 'John Doe joined your Math class',
    data: { student_name: 'John Doe', subject_name: 'Mathematics', subject_code: 'MATH101' },
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    recipient_id: 'user1',
    type: NotificationType.ATTENDANCE_MARKED,
    title: 'Attendance Marked',
    message: 'Attendance has been marked for Physics class',
    data: { subject_name: 'Physics', session_name: 'Session 1', total_students: 25, present_count: 23 },
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
];

// Mock the notification context
const mockNotificationContext = {
  notifications: mockNotifications,
  unreadCount: 1,
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
  user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'teacher' as const },
  isAuthenticated: true,
  currentRole: 'teacher' as const,
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
  CheckIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-icon" {...props} />,
  EyeIcon: ({ className, ...props }: any) => <svg className={className} data-testid="eye-icon" {...props} />,
  InboxIcon: ({ className, ...props }: any) => <svg className={className} data-testid="inbox-icon" {...props} />,
  UserPlusIcon: ({ className, ...props }: any) => <svg className={className} data-testid="user-plus-icon" {...props} />,
  CheckCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-circle-icon" {...props} />,
  XCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="x-circle-icon" {...props} />,
  AcademicCapIcon: ({ className, ...props }: any) => <svg className={className} data-testid="academic-cap-icon" {...props} />,
  ExclamationTriangleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="exclamation-triangle-icon" {...props} />,
}));

const renderNotificationDropdown = (props = {}) => {
  const defaultProps = {
    onClose: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationDropdown {...defaultProps} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default state
    Object.assign(mockNotificationContext, {
      notifications: mockNotifications,
      unreadCount: 1,
      loading: false,
      preferences: [],
    });
  });

  describe('Rendering', () => {
    it('renders the dropdown container', () => {
      renderNotificationDropdown();
      
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    it('renders the header with title', () => {
      renderNotificationDropdown();
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('shows unread count in header when there are unread notifications', () => {
      mockNotificationContext.unreadCount = 3;
      renderNotificationDropdown();
      
      expect(screen.getByText('3 unread notifications')).toBeInTheDocument();
    });

    it('shows mark all read button when there are unread notifications', () => {
      mockNotificationContext.unreadCount = 2;
      renderNotificationDropdown();
      
      expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('does not show mark all read button when no unread notifications', () => {
      mockNotificationContext.unreadCount = 0;
      renderNotificationDropdown();
      
      expect(screen.queryByTestId('mark-all-read-button')).not.toBeInTheDocument();
    });

    it('renders notifications list when notifications exist', () => {
      renderNotificationDropdown();
      
      expect(screen.getByTestId('notifications-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
    });

    it('renders view all notifications link when notifications exist', () => {
      renderNotificationDropdown();
      
      const viewAllLink = screen.getByTestId('view-all-link');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute('href', '/notifications');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockNotificationContext.loading = true;
      renderNotificationDropdown();
      
      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
      expect(screen.queryByTestId('notifications-list')).not.toBeInTheDocument();
    });

    it('does not show loading spinner when not loading', () => {
      mockNotificationContext.loading = false;
      renderNotificationDropdown();
      
      expect(screen.queryByText('Loading notifications...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications', () => {
      mockNotificationContext.notifications = [];
      mockNotificationContext.unreadCount = 0;
      renderNotificationDropdown();
      
      expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByTestId('inbox-icon')).toBeInTheDocument();
    });

    it('does not show view all link when no notifications', () => {
      mockNotificationContext.notifications = [];
      renderNotificationDropdown();
      
      expect(screen.queryByTestId('view-all-link')).not.toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('applies right position classes by default', () => {
      renderNotificationDropdown();
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveClass('right-0');
    });

    it('applies left position classes when specified', () => {
      renderNotificationDropdown({ position: 'left' });
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveClass('left-0');
    });

    it('applies center position classes when specified', () => {
      renderNotificationDropdown({ position: 'center' });
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveClass('left-1/2', 'transform', '-translate-x-1/2');
    });
  });

  describe('Mark All Read Functionality', () => {
    it('calls markAllAsRead when mark all read button is clicked', async () => {
      mockNotificationContext.unreadCount = 2;
      renderNotificationDropdown();
      
      const markAllButton = screen.getByTestId('mark-all-read-button');
      fireEvent.click(markAllButton);
      
      await waitFor(() => {
        expect(mockNotificationContext.markAllAsRead).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call markAllAsRead when no unread notifications', () => {
      mockNotificationContext.unreadCount = 0;
      renderNotificationDropdown();
      
      // Button should not be present
      expect(screen.queryByTestId('mark-all-read-button')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes dropdown when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderNotificationDropdown({ onClose });
      
      const dropdown = screen.getByTestId('notification-dropdown');
      fireEvent.keyDown(dropdown, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('focuses dropdown on mount', () => {
      renderNotificationDropdown();
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveFocus();
    });
  });

  describe('View All Link', () => {
    it('calls onClose when view all link is clicked', () => {
      const onClose = vi.fn();
      renderNotificationDropdown({ onClose });
      
      const viewAllLink = screen.getByTestId('view-all-link');
      fireEvent.click(viewAllLink);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Props', () => {
    it('applies custom maxHeight', () => {
      renderNotificationDropdown({ maxHeight: 'max-h-64' });
      
      // The maxHeight is applied to the scrollable content area
      const dropdown = screen.getByTestId('notification-dropdown');
      const contentArea = dropdown.querySelector('.max-h-64');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper focus management', () => {
      renderNotificationDropdown();
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveAttribute('tabIndex', '-1');
    });

    it('supports keyboard navigation', () => {
      renderNotificationDropdown();
      
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown).toHaveAttribute('tabIndex', '-1');
    });

    it('has proper button roles and labels', () => {
      mockNotificationContext.unreadCount = 1;
      renderNotificationDropdown();
      
      const markAllButton = screen.getByTestId('mark-all-read-button');
      expect(markAllButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Notification Limits', () => {
    it('limits notifications to 10 in dropdown', () => {
      // Create 15 mock notifications
      const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        recipient_id: 'user1',
        type: NotificationType.STUDENT_JOINED,
        title: `Notification ${i + 1}`,
        message: `Message ${i + 1}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      mockNotificationContext.notifications = manyNotifications;
      renderNotificationDropdown();
      
      // Should only show 10 notifications
      expect(screen.getAllByTestId('notification-item')).toHaveLength(10);
    });
  });
});