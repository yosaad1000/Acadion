import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationBell from '../../../components/notifications/NotificationBell';
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
    data: { 
      student_name: 'John Doe', 
      subject_name: 'Mathematics', 
      subject_code: 'MATH101',
      joined_at: new Date().toISOString()
    },
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
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
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
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
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Mock the notification context
const mockNotificationContext = {
  notifications: mockNotifications,
  unreadCount: 2,
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
  BellIcon: ({ className, ...props }: any) => <svg className={className} data-testid="bell-outline" {...props} />,
  CheckIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-icon" {...props} />,
  EyeIcon: ({ className, ...props }: any) => <svg className={className} data-testid="eye-icon" {...props} />,
  InboxIcon: ({ className, ...props }: any) => <svg className={className} data-testid="inbox-icon" {...props} />,
  UserPlusIcon: ({ className, ...props }: any) => <svg className={className} data-testid="user-plus-icon" {...props} />,
  CheckCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="check-circle-icon" {...props} />,
  XCircleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="x-circle-icon" {...props} />,
  AcademicCapIcon: ({ className, ...props }: any) => <svg className={className} data-testid="academic-cap-icon" {...props} />,
  ExclamationTriangleIcon: ({ className, ...props }: any) => <svg className={className} data-testid="exclamation-triangle-icon" {...props} />,
}));

vi.mock('@heroicons/react/24/solid', () => ({
  BellIcon: ({ className, ...props }: any) => <svg className={className} data-testid="bell-solid" {...props} />,
}));

const renderNotificationBell = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Notification Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to default state
    Object.assign(mockNotificationContext, {
      notifications: mockNotifications,
      unreadCount: 2,
      loading: false,
      preferences: [],
    });
  });

  describe('Bell and Dropdown Integration', () => {
    it('shows correct unread count on bell and opens dropdown with notifications', async () => {
      renderNotificationBell();
      
      // Check bell shows correct unread count
      const bell = screen.getByTestId('notification-bell');
      const badge = screen.getByTestId('unread-count-badge');
      expect(badge).toHaveTextContent('2');
      
      // Click bell to open dropdown
      fireEvent.click(bell);
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Check dropdown shows notifications
      expect(screen.getAllByTestId('notification-item')).toHaveLength(3);
      expect(screen.getByText('2 unread notifications')).toBeInTheDocument();
    });

    it('updates bell when notifications are marked as read', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click on an unread notification
      const unreadNotification = screen.getAllByTestId('notification-item')[0];
      fireEvent.click(unreadNotification);
      
      // Verify markAsRead was called
      expect(mockNotificationContext.markAsRead).toHaveBeenCalledWith('1');
    });

    it('handles mark all as read from dropdown', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click mark all as read
      const markAllButton = screen.getByTestId('mark-all-read-button');
      fireEvent.click(markAllButton);
      
      // Verify markAllAsRead was called
      expect(mockNotificationContext.markAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown when clicking outside', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification Item Interactions', () => {
    it('shows different icons for different notification types', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Check different notification type icons
      expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument(); // Student joined
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument(); // Attendance marked
      expect(screen.getByTestId('academic-cap-icon')).toBeInTheDocument(); // Class joined
    });

    it('shows unread indicators correctly', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Check unread indicators (should be 2 unread notifications)
      const unreadIndicators = screen.getAllByTestId('unread-indicator');
      expect(unreadIndicators).toHaveLength(2);
    });

    it('displays notification data correctly', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Check notification content
      expect(screen.getByText('New Student Joined')).toBeInTheDocument();
      expect(screen.getByText('John Doe joined your Math class')).toBeInTheDocument();
      expect(screen.getByText('Class: Mathematics')).toBeInTheDocument();
      
      expect(screen.getByText('Attendance Marked')).toBeInTheDocument();
      expect(screen.getByText('Present: 23/25')).toBeInTheDocument();
      
      expect(screen.getByText('Successfully Joined Class')).toBeInTheDocument();
      expect(screen.getByText('Teacher: Dr. Smith')).toBeInTheDocument();
    });
  });

  describe('Loading and Empty States', () => {
    it('shows loading state in dropdown when loading', async () => {
      mockNotificationContext.loading = true;
      renderNotificationBell();
      
      // When loading, the bell should be disabled and not open dropdown
      const bell = screen.getByTestId('notification-bell');
      expect(bell).toBeDisabled();
      
      // Try to click (should not open dropdown)
      fireEvent.click(bell);
      
      // Dropdown should not appear when loading
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('shows empty state when no notifications', async () => {
      mockNotificationContext.notifications = [];
      mockNotificationContext.unreadCount = 0;
      renderNotificationBell();
      
      // Bell should show no badge
      expect(screen.queryByTestId('unread-count-badge')).not.toBeInTheDocument();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Check empty state
      expect(screen.getByTestId('empty-notifications')).toBeInTheDocument();
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains focus management between bell and dropdown', async () => {
      renderNotificationBell();
      
      const bell = screen.getByTestId('notification-bell');
      
      // Focus bell
      bell.focus();
      expect(bell).toHaveFocus();
      
      // Open dropdown
      fireEvent.click(bell);
      
      await waitFor(() => {
        const dropdown = screen.getByTestId('notification-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveFocus();
      });
    });

    it('supports keyboard navigation', async () => {
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Press Escape to close
      const dropdown = screen.getByTestId('notification-dropdown');
      fireEvent.keyDown(dropdown, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates Simulation', () => {
    it('updates bell when unread count changes', () => {
      const { rerender } = renderNotificationBell();
      
      // Initial state
      expect(screen.getByTestId('unread-count-badge')).toHaveTextContent('2');
      
      // Simulate unread count change
      mockNotificationContext.unreadCount = 5;
      
      // Re-render to simulate context update
      rerender(
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <NotificationBell />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('unread-count-badge')).toHaveTextContent('5');
    });

    it('switches bell icon when unread count changes to/from zero', () => {
      const { rerender } = renderNotificationBell();
      expect(screen.getByTestId('bell-solid')).toBeInTheDocument();
      
      // Simulate all notifications read
      mockNotificationContext.unreadCount = 0;
      
      rerender(
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <NotificationBell />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('bell-outline')).toBeInTheDocument();
      expect(screen.queryByTestId('bell-solid')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully', async () => {
      mockNotificationContext.markAsRead.mockRejectedValueOnce(new Error('API Error'));
      
      renderNotificationBell();
      
      // Open dropdown
      fireEvent.click(screen.getByTestId('notification-bell'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
      
      // Click on notification (should handle error gracefully)
      const notification = screen.getAllByTestId('notification-item')[0];
      fireEvent.click(notification);
      
      // Should not crash the component
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });
});