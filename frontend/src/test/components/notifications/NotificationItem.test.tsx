import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationItem from '../../../components/notifications/NotificationItem';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationType, type Notification } from '../../../types';

// Mock notifications data
const mockStudentJoinedNotification: Notification = {
  id: '1',
  recipient_id: 'user1',
  sender_id: 'user2',
  type: NotificationType.STUDENT_JOINED,
  title: 'New Student Joined',
  message: 'John Doe joined your Math class',
  data: { 
    student_name: 'John Doe', 
    subject_name: 'Mathematics', 
    subject_code: 'MATH101',
    joined_at: new Date().toISOString()
  },
  is_read: false,
  created_at: new Date().toISOString(),
};

const mockAttendanceMarkedNotification: Notification = {
  id: '2',
  recipient_id: 'user1',
  type: NotificationType.ATTENDANCE_MARKED,
  title: 'Attendance Marked',
  message: 'Attendance has been marked for Physics class',
  data: { 
    subject_name: 'Physics', 
    session_name: 'Session 1', 
    total_students: 25, 
    present_count: 23,
    marked_at: new Date().toISOString()
  },
  is_read: true,
  created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
};

const mockClassJoinedNotification: Notification = {
  id: '3',
  recipient_id: 'user1',
  type: NotificationType.CLASS_JOINED,
  title: 'Successfully Joined Class',
  message: 'You have joined Chemistry class',
  data: {
    subject_name: 'Chemistry',
    teacher_name: 'Dr. Smith',
    invite_code: 'CHEM123'
  },
  is_read: false,
  created_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
};

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
  UserPlusIcon: ({ className, ...props }: any) => <svg className={className} data-testid="user-plus-icon" {...props} />,
  CheckCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-circle-icon" {...props} />,
  XCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="x-circle-icon" {...props} />,
  AcademicCapIcon: ({ className, ...props }: any) => <svg className={className} data-testid="academic-cap-icon" {...props} />,
  ExclamationTriangleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="exclamation-triangle-icon" {...props} />,
}));

const renderNotificationItem = (notification: Notification, props = {}) => {
  const defaultProps = {
    notification,
    onClose: vi.fn(),
    ...props,
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

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification item container', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByTestId('notification-item')).toBeInTheDocument();
    });

    it('displays notification title', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByText('New Student Joined')).toBeInTheDocument();
    });

    it('displays notification message', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByText('John Doe joined your Math class')).toBeInTheDocument();
    });

    it('shows unread indicator for unread notifications', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByTestId('unread-indicator')).toBeInTheDocument();
    });

    it('does not show unread indicator for read notifications', () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument();
    });

    it('applies different styling for unread notifications', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      const item = screen.getByTestId('notification-item');
      expect(item).toHaveClass('bg-blue-50', 'dark:bg-blue-900/10');
    });

    it('applies normal styling for read notifications', () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      const item = screen.getByTestId('notification-item');
      expect(item).not.toHaveClass('bg-blue-50', 'dark:bg-blue-900/10');
    });
  });

  describe('Notification Icons', () => {
    it('shows user plus icon for student joined notifications', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
    });

    it('shows check circle icon for attendance marked notifications', () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('shows academic cap icon for class joined notifications', () => {
      renderNotificationItem(mockClassJoinedNotification);
      
      expect(screen.getByTestId('academic-cap-icon')).toBeInTheDocument();
    });

    it('shows x circle icon for attendance failed notifications', () => {
      const failedNotification: Notification = {
        ...mockAttendanceMarkedNotification,
        type: NotificationType.ATTENDANCE_FAILED,
        title: 'Attendance Failed',
        message: 'Failed to mark attendance',
      };
      
      renderNotificationItem(failedNotification);
      
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('shows exclamation triangle icon for join failed notifications', () => {
      const failedNotification: Notification = {
        ...mockClassJoinedNotification,
        type: NotificationType.JOIN_FAILED,
        title: 'Join Failed',
        message: 'Failed to join class',
      };
      
      renderNotificationItem(failedNotification);
      
      expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
    });
  });

  describe('Additional Data Display', () => {
    it('shows class name for student joined notifications', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      expect(screen.getByText('Class: Mathematics')).toBeInTheDocument();
    });

    it('shows attendance count for attendance marked notifications', () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      expect(screen.getByText('Present: 23/25')).toBeInTheDocument();
    });

    it('shows teacher name for class joined notifications', () => {
      renderNotificationItem(mockClassJoinedNotification);
      
      expect(screen.getByText('Teacher: Dr. Smith')).toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('shows "Just now" for very recent notifications', () => {
      const recentNotification = {
        ...mockStudentJoinedNotification,
        created_at: new Date().toISOString(),
      };
      
      renderNotificationItem(recentNotification);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for notifications within an hour', () => {
      const notification = {
        ...mockStudentJoinedNotification,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      };
      
      renderNotificationItem(notification);
      
      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });

    it('shows hours ago for notifications within a day', () => {
      renderNotificationItem(mockAttendanceMarkedNotification); // 1 hour ago
      
      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });

    it('shows days ago for notifications within a week', () => {
      const notification = {
        ...mockStudentJoinedNotification,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      };
      
      renderNotificationItem(notification);
      
      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('marks unread notification as read when clicked', async () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      const item = screen.getByTestId('notification-item');
      fireEvent.click(item);
      
      await waitFor(() => {
        expect(mockNotificationContext.markAsRead).toHaveBeenCalledWith('1');
      });
    });

    it('does not mark read notification as read when clicked', async () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      const item = screen.getByTestId('notification-item');
      fireEvent.click(item);
      
      // Should not call markAsRead for already read notifications
      expect(mockNotificationContext.markAsRead).not.toHaveBeenCalled();
    });

    it('calls onClose when clicked', async () => {
      const onClose = vi.fn();
      renderNotificationItem(mockStudentJoinedNotification, { onClose });
      
      const item = screen.getByTestId('notification-item');
      fireEvent.click(item);
      
      // Wait for async operations to complete
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Action Links', () => {
    it('wraps student joined notification with classroom link', () => {
      renderNotificationItem(mockStudentJoinedNotification);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/classroom/MATH101');
    });

    it('wraps attendance marked notification with reports link', () => {
      renderNotificationItem(mockAttendanceMarkedNotification);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/attendance-reports');
    });

    it('wraps class joined notification with classroom link', () => {
      renderNotificationItem(mockClassJoinedNotification);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/dashboard'); // No subject_code in data
    });

    it('falls back to dashboard link when no specific action available', () => {
      const genericNotification: Notification = {
        ...mockStudentJoinedNotification,
        data: {}, // No subject_code
      };
      
      renderNotificationItem(genericNotification);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Border Styling', () => {
    it('shows border when not last item', () => {
      renderNotificationItem(mockStudentJoinedNotification, { isLast: false });
      
      const item = screen.getByTestId('notification-item');
      expect(item).toHaveClass('border-b', 'border-gray-100', 'dark:border-gray-700');
    });

    it('does not show border when last item', () => {
      renderNotificationItem(mockStudentJoinedNotification, { isLast: true });
      
      const item = screen.getByTestId('notification-item');
      expect(item).not.toHaveClass('border-b');
    });
  });

  describe('Full Content Display', () => {
    it('truncates message by default', () => {
      const longMessageNotification: Notification = {
        ...mockStudentJoinedNotification,
        message: 'This is a very long message that should be truncated when displayed in the notification item component to prevent layout issues',
      };
      
      renderNotificationItem(longMessageNotification);
      
      const messageElement = screen.getByText(/This is a very long message/);
      expect(messageElement).toHaveClass('truncate');
    });

    it('shows full content when showFullContent is true', () => {
      const longMessageNotification: Notification = {
        ...mockStudentJoinedNotification,
        message: 'This is a very long message that should be shown in full when showFullContent is enabled',
      };
      
      renderNotificationItem(longMessageNotification, { showFullContent: true });
      
      const messageElement = screen.getByText(/This is a very long message/);
      expect(messageElement).not.toHaveClass('truncate');
    });
  });

  describe('Error Handling', () => {
    it('handles missing notification data gracefully', () => {
      const notificationWithoutData: Notification = {
        ...mockStudentJoinedNotification,
        data: undefined,
      };
      
      expect(() => {
        renderNotificationItem(notificationWithoutData);
      }).not.toThrow();
    });

    it('handles markAsRead errors gracefully', async () => {
      mockNotificationContext.markAsRead.mockRejectedValueOnce(new Error('Network error'));
      
      renderNotificationItem(mockStudentJoinedNotification);
      
      const item = screen.getByTestId('notification-item');
      fireEvent.click(item);
      
      // Should not throw error
      await waitFor(() => {
        expect(mockNotificationContext.markAsRead).toHaveBeenCalled();
      });
    });
  });
});