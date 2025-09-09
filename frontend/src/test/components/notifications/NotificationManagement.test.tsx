import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationDropdown from '../../../components/notifications/NotificationDropdown';
import NotificationItem from '../../../components/notifications/NotificationItem';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationType } from '../../../types';

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    title: 'Student Joined Class',
    message: 'John Doe joined your Math 101 class',
    type: NotificationType.STUDENT_JOINED,
    is_read: false,
    created_at: new Date().toISOString(),
    data: { subject_name: 'Math 101', student_name: 'John Doe' }
  },
  {
    id: '2',
    title: 'Attendance Marked',
    message: 'Attendance has been marked for Math 101',
    type: NotificationType.ATTENDANCE_MARKED,
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    data: { subject_name: 'Math 101', present_count: 25, total_students: 30 }
  }
];

// Mock the notification context
const mockNotificationContext = {
  notifications: mockNotifications,
  unreadCount: 1,
  loading: false,
  preferences: [],
  connectionStatus: { state: 'connected', reconnectAttempts: 0, fallbackActive: false },
  error: null,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  clearAllNotifications: vi.fn(),
  deleteNotification: vi.fn(),
  updatePreferences: vi.fn(),
  refreshNotifications: vi.fn(),
  refreshPreferences: vi.fn(),
  retryConnection: vi.fn(),
  clearError: vi.fn(),
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

const renderNotificationDropdown = (props = {}) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationDropdown onClose={vi.fn()} {...props} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const renderNotificationItem = (props = {}) => {
  const defaultProps = {
    notification: mockNotifications[0],
    onClose: vi.fn(),
    ...props
  };
  
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationItem {...defaultProps} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Notification Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default state
    Object.assign(mockNotificationContext, {
      notifications: mockNotifications,
      unreadCount: 1,
      loading: false,
      error: null,
    });
  });

  describe('NotificationDropdown - Clear All Functionality', () => {
    it('shows clear all button when there are notifications', () => {
      renderNotificationDropdown();
      
      expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('does not show clear all button when there are no notifications', () => {
      mockNotificationContext.notifications = [];
      renderNotificationDropdown();
      
      expect(screen.queryByTestId('clear-all-button')).not.toBeInTheDocument();
    });

    it('opens confirmation dialog when clear all is clicked', async () => {
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      fireEvent.click(clearAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Clear All Notifications')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to clear all 2 notifications/)).toBeInTheDocument();
      });
    });

    it('calls clearAllNotifications when confirmed', async () => {
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      fireEvent.click(clearAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Clear All Notifications')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Clear All');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockNotificationContext.clearAllNotifications).toHaveBeenCalledTimes(1);
      });
    });

    it('closes dialog when cancel is clicked', async () => {
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      fireEvent.click(clearAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Clear All Notifications')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Clear All Notifications')).not.toBeInTheDocument();
      });
    });

    it('shows mark all read button when there are unread notifications', () => {
      mockNotificationContext.unreadCount = 1;
      renderNotificationDropdown();
      
      expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('does not show mark all read button when all notifications are read', () => {
      mockNotificationContext.unreadCount = 0;
      renderNotificationDropdown();
      
      expect(screen.queryByTestId('mark-all-read-button')).not.toBeInTheDocument();
    });
  });

  describe('NotificationItem - Delete Functionality', () => {
    it('shows delete button on hover for desktop', () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('opacity-0', 'group-hover:opacity-100');
    });

    it('shows delete button always visible on mobile', () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      expect(deleteButton).toHaveClass('sm:opacity-100');
    });

    it('opens confirmation dialog when delete button is clicked', async () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Notification')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete this notification/)).toBeInTheDocument();
      });
    });

    it('calls deleteNotification when confirmed', async () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Notification')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockNotificationContext.deleteNotification).toHaveBeenCalledWith('1');
      });
    });

    it('does not trigger notification click when delete button is clicked', () => {
      const onClose = vi.fn();
      renderNotificationItem({ onClose });
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      fireEvent.click(deleteButton);
      
      // onClose should not be called when delete button is clicked
      expect(onClose).not.toHaveBeenCalled();
    });

    it('can hide delete button when showDeleteButton is false', () => {
      renderNotificationItem({ showDeleteButton: false });
      
      expect(screen.queryByTestId('delete-notification-button')).not.toBeInTheDocument();
    });
  });

  describe('Mobile-Friendly Design', () => {
    it('has touch-friendly button sizes', () => {
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      expect(clearAllButton).toHaveClass('touch-manipulation');
      
      const markAllReadButton = screen.getByTestId('mark-all-read-button');
      expect(markAllReadButton).toHaveClass('touch-manipulation');
    });

    it('shows appropriate text for mobile screens', () => {
      renderNotificationDropdown();
      
      // Clear all button should show "Clear" on mobile, "Clear all" on desktop
      const clearAllButton = screen.getByTestId('clear-all-button');
      expect(clearAllButton.querySelector('.sm\\:hidden')).toHaveTextContent('Clear');
      expect(clearAllButton.querySelector('.hidden.sm\\:inline')).toHaveTextContent('Clear all');
    });

    it('has proper touch targets for delete buttons', () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      expect(deleteButton).toHaveClass('touch-manipulation');
    });
  });

  describe('Loading States', () => {
    it('shows loading state in clear all dialog', async () => {
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      fireEvent.click(clearAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Clear All Notifications')).toBeInTheDocument();
      });
      
      // Mock the clearAllNotifications to be pending
      mockNotificationContext.clearAllNotifications.mockImplementation(() => new Promise(() => {}));
      
      const confirmButton = screen.getByText('Clear All');
      fireEvent.click(confirmButton);
      
      // The button should show loading state
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });

    it('shows loading state in delete dialog', async () => {
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Notification')).toBeInTheDocument();
      });
      
      // Mock the deleteNotification to be pending
      mockNotificationContext.deleteNotification.mockImplementation(() => new Promise(() => {}));
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      // The button should show loading state
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles clear all errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockNotificationContext.clearAllNotifications.mockRejectedValue(new Error('Network error'));
      
      renderNotificationDropdown();
      
      const clearAllButton = screen.getByTestId('clear-all-button');
      fireEvent.click(clearAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('Clear All Notifications')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Clear All');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to clear all notifications:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('handles delete errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockNotificationContext.deleteNotification.mockRejectedValue(new Error('Network error'));
      
      renderNotificationItem();
      
      const deleteButton = screen.getByTestId('delete-notification-button');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Notification')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete notification:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});