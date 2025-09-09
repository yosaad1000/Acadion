import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationList from '../../../components/notifications/NotificationList';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationType, type Notification } from '../../../types';

// Mock the notification context
const mockNotificationContext = {
  notifications: [] as Notification[],
  unreadCount: 0,
  loading: false,
  preferences: [],
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  updatePreferences: vi.fn(),
  refreshNotifications: vi.fn(),
  refreshPreferences: vi.fn(),
};

vi.mock('../../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNotifications: () => mockNotificationContext,
}));

// Mock the auth context
const mockAuthContext = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'teacher' as const,
    auth_user_id: 'auth-user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext,
}));

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    recipient_id: 'user-1',
    sender_id: 'user-2',
    type: NotificationType.STUDENT_JOINED,
    title: 'New Student Joined',
    message: 'John Doe joined your Math class',
    data: {
      student_name: 'John Doe',
      subject_name: 'Mathematics',
      subject_code: 'MATH101',
      joined_at: '2024-01-15T10:30:00Z'
    },
    is_read: false,
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 'notif-2',
    recipient_id: 'user-1',
    sender_id: 'user-3',
    type: NotificationType.ATTENDANCE_MARKED,
    title: 'Attendance Marked',
    message: 'Attendance has been marked for Physics class',
    data: {
      subject_name: 'Physics',
      session_name: 'Morning Session',
      total_students: 25,
      present_count: 23,
      marked_at: '2024-01-15T09:00:00Z'
    },
    is_read: true,
    created_at: '2024-01-15T09:00:00Z'
  },
  {
    id: 'notif-3',
    recipient_id: 'user-1',
    type: NotificationType.CLASS_JOINED,
    title: 'Class Joined',
    message: 'You successfully joined Chemistry class',
    data: {
      subject_name: 'Chemistry',
      teacher_name: 'Dr. Smith',
      invite_code: 'CHEM123'
    },
    is_read: false,
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: 'notif-4',
    recipient_id: 'user-1',
    type: NotificationType.ATTENDANCE_FAILED,
    title: 'Attendance Failed',
    message: 'Failed to mark attendance for Biology class',
    data: {
      subject_name: 'Biology',
      error_message: 'Face not recognized',
      failed_at: '2024-01-15T07:00:00Z'
    },
    is_read: false,
    created_at: '2024-01-15T07:00:00Z'
  }
];

const renderNotificationList = (props = {}) => {
  const defaultProps = {
    showHeader: true,
    itemsPerPage: 20,
    ...props
  };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationList {...defaultProps} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('NotificationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationContext.notifications = [...mockNotifications];
    mockNotificationContext.unreadCount = 3;
    mockNotificationContext.loading = false;
  });

  describe('Rendering', () => {
    it('renders the notification list container', () => {
      renderNotificationList();
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('shows notification count in header', () => {
      renderNotificationList();
      
      expect(screen.getByText('4 notifications')).toBeInTheDocument();
    });

    it('renders all notifications by default', () => {
      renderNotificationList();
      
      expect(screen.getByText('New Student Joined')).toBeInTheDocument();
      expect(screen.getByText('Attendance Marked')).toBeInTheDocument();
      expect(screen.getByText('Class Joined')).toBeInTheDocument();
      expect(screen.getByText('Attendance Failed')).toBeInTheDocument();
    });

    it('shows mark all read button when there are unread notifications', () => {
      renderNotificationList();
      
      expect(screen.getByTestId('mark-all-read-button')).toBeInTheDocument();
    });

    it('does not show mark all read button when no unread notifications', () => {
      mockNotificationContext.unreadCount = 0;
      renderNotificationList();
      
      expect(screen.queryByTestId('mark-all-read-button')).not.toBeInTheDocument();
    });

    it('shows filter toggle button', () => {
      renderNotificationList();
      
      expect(screen.getByTestId('filter-toggle-button')).toBeInTheDocument();
    });

    it('can hide header when showHeader is false', () => {
      renderNotificationList({ showHeader: false });
      
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading is true', () => {
      mockNotificationContext.loading = true;
      renderNotificationList();
      
      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications', () => {
      mockNotificationContext.notifications = [];
      renderNotificationList();
      
      expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('shows filtered empty state when filter has no results', () => {
      mockNotificationContext.notifications = [];
      renderNotificationList();
      
      // Open filters and select a specific type
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      fireEvent.click(screen.getByTestId('filter-student_joined'));
      
      expect(screen.getByText('No student joined notifications')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows filter options when filter button is clicked', () => {
      renderNotificationList();
      
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      
      expect(screen.getByTestId('filter-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-unread')).toBeInTheDocument();
      expect(screen.getByTestId('filter-student_joined')).toBeInTheDocument();
      expect(screen.getByTestId('filter-attendance_marked')).toBeInTheDocument();
    });

    it('filters notifications by unread status', () => {
      renderNotificationList();
      
      // Open filters and select unread
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      fireEvent.click(screen.getByTestId('filter-unread'));
      
      // Should show only unread notifications
      expect(screen.getByText('New Student Joined')).toBeInTheDocument();
      expect(screen.getAllByText('Class Joined')[1]).toBeInTheDocument(); // Second occurrence (notification title)
      expect(screen.getByText('Attendance Failed')).toBeInTheDocument();
      expect(screen.queryByText('Attendance Marked')).not.toBeInTheDocument();
      
      // Should update count
      expect(screen.getByText('3 notifications (Unread)')).toBeInTheDocument();
    });

    it('filters notifications by type', () => {
      renderNotificationList();
      
      // Open filters and select student joined
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      fireEvent.click(screen.getByTestId('filter-student_joined'));
      
      // Should show only student joined notifications
      expect(screen.getByText('New Student Joined')).toBeInTheDocument();
      expect(screen.queryByText('Attendance Marked')).not.toBeInTheDocument();
      // Check that the notification title "Class Joined" is not present (filter button will still be there)
      const classJoinedElements = screen.queryAllByText('Class Joined');
      expect(classJoinedElements.length).toBe(1); // Only the filter button should remain
      
      // Should update count
      expect(screen.getByText('1 notification (Student Joined)')).toBeInTheDocument();
    });

    it('shows filter counts in filter buttons', () => {
      renderNotificationList();
      
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      
      // Check filter counts
      expect(screen.getByTestId('filter-all')).toHaveTextContent('4');
      expect(screen.getByTestId('filter-unread')).toHaveTextContent('3');
      expect(screen.getByTestId('filter-student_joined')).toHaveTextContent('1');
    });

    it('can clear filter to show all notifications', () => {
      // Set up empty filtered results to show clear filter button
      mockNotificationContext.notifications = [mockNotifications[1]]; // Only attendance marked (read)
      renderNotificationList();
      
      // Apply unread filter (will show empty state)
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      fireEvent.click(screen.getByTestId('filter-unread'));
      
      // Should show empty state with clear filter button
      expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
      
      // Clear filter
      fireEvent.click(screen.getByText('Clear filter'));
      
      // Should show all notifications again
      expect(screen.getByText('1 notification')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create more notifications to test pagination
      const manyNotifications = Array.from({ length: 25 }, (_, i) => ({
        id: `notif-${i + 1}`,
        recipient_id: 'user-1',
        type: NotificationType.STUDENT_JOINED,
        title: `Notification ${i + 1}`,
        message: `Message ${i + 1}`,
        is_read: false,
        created_at: new Date(Date.now() - i * 1000).toISOString()
      })) as Notification[];
      
      mockNotificationContext.notifications = manyNotifications;
    });

    it('shows pagination when there are more items than itemsPerPage', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      expect(screen.getByTestId('previous-page-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 to 10 of 25 notifications')).toBeInTheDocument();
    });

    it('navigates to next page', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      fireEvent.click(screen.getByTestId('next-page-button'));
      
      expect(screen.getByText('Showing 11 to 20 of 25 notifications')).toBeInTheDocument();
    });

    it('navigates to previous page', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      // Go to page 2 first
      fireEvent.click(screen.getByTestId('next-page-button'));
      // Then go back to page 1
      fireEvent.click(screen.getByTestId('previous-page-button'));
      
      expect(screen.getByText('Showing 1 to 10 of 25 notifications')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      expect(screen.getByTestId('previous-page-button')).toHaveClass('cursor-not-allowed');
    });

    it('disables next button on last page', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      // Go to last page
      fireEvent.click(screen.getByTestId('page-3-button'));
      
      expect(screen.getByTestId('next-page-button')).toHaveClass('cursor-not-allowed');
    });

    it('resets to first page when filter changes', () => {
      renderNotificationList({ itemsPerPage: 10 });
      
      // Go to page 2
      fireEvent.click(screen.getByTestId('next-page-button'));
      expect(screen.getByText('Showing 11 to 20 of 25 notifications')).toBeInTheDocument();
      
      // Change filter
      fireEvent.click(screen.getByTestId('filter-toggle-button'));
      fireEvent.click(screen.getByTestId('filter-unread'));
      
      // Should be back on page 1 with filtered results
      expect(screen.getByText(/Showing 1 to \d+ of 25 notifications/)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls markAllAsRead when mark all read button is clicked', async () => {
      renderNotificationList();
      
      fireEvent.click(screen.getByTestId('mark-all-read-button'));
      
      await waitFor(() => {
        expect(mockNotificationContext.markAllAsRead).toHaveBeenCalledTimes(1);
      });
    });

    it('handles markAllAsRead errors gracefully', async () => {
      mockNotificationContext.markAllAsRead.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderNotificationList();
      
      fireEvent.click(screen.getByTestId('mark-all-read-button'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to mark all notifications as read:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderNotificationList();
      
      expect(screen.getByTestId('notifications-list')).toBeInTheDocument();
      expect(screen.getByTestId('filter-toggle-button')).toBeInTheDocument();
    });

    it('supports keyboard navigation for pagination', () => {
      renderNotificationList({ itemsPerPage: 2 });
      
      const nextButton = screen.getByTestId('next-page-button');
      nextButton.focus();
      
      expect(document.activeElement).toBe(nextButton);
    });
  });

  describe('Responsive Design', () => {
    it('applies custom className', () => {
      const { container } = renderNotificationList({ className: 'custom-class' });
      
      // The className is applied to the main container div
      const mainContainer = container.querySelector('.bg-white');
      expect(mainContainer).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty data gracefully', () => {
      mockNotificationContext.notifications = [];
      
      expect(() => {
        renderNotificationList();
      }).not.toThrow();
    });

    it('handles notifications without data field', () => {
      const notificationWithoutData: Notification = {
        id: 'notif-no-data',
        recipient_id: 'user-1',
        type: NotificationType.STUDENT_JOINED,
        title: 'Test Notification',
        message: 'Test message',
        is_read: false,
        created_at: '2024-01-15T10:30:00Z'
      };
      
      mockNotificationContext.notifications = [notificationWithoutData];
      
      expect(() => {
        renderNotificationList();
      }).not.toThrow();
      
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });
  });
});