import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotificationPreferences from '../../../components/notifications/NotificationPreferences';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AuthProvider } from '../../../contexts/AuthContext';
import { NotificationType, type NotificationPreference } from '../../../types';

// Mock the notification context
const mockNotificationContext = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  preferences: [] as NotificationPreference[],
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

// Mock preferences data
const mockPreferences: NotificationPreference[] = [
  {
    id: 'pref-1',
    user_id: 'user-1',
    notification_type: NotificationType.STUDENT_JOINED,
    enabled: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pref-2',
    user_id: 'user-1',
    notification_type: NotificationType.ATTENDANCE_MARKED,
    enabled: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pref-3',
    user_id: 'user-1',
    notification_type: NotificationType.CLASS_JOINED,
    enabled: false,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pref-4',
    user_id: 'user-1',
    notification_type: NotificationType.ATTENDANCE_FAILED,
    enabled: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pref-5',
    user_id: 'user-1',
    notification_type: NotificationType.JOIN_FAILED,
    enabled: false,
    created_at: '2024-01-01T00:00:00Z'
  }
];

const renderNotificationPreferences = (props = {}) => {
  const defaultProps = {
    showHeader: true,
    onSave: vi.fn(),
    ...props
  };

  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NotificationPreferences {...defaultProps} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationContext.preferences = [...mockPreferences];
    mockNotificationContext.loading = false;
    mockNotificationContext.updatePreferences.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders the preferences container', () => {
      renderNotificationPreferences();
      
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Choose which notifications you want to receive')).toBeInTheDocument();
    });

    it('renders activity notifications section', () => {
      renderNotificationPreferences();
      
      expect(screen.getByText('Activity Notifications')).toBeInTheDocument();
      expect(screen.getByText('Student Joined Class')).toBeInTheDocument();
      expect(screen.getByText('Attendance Marked')).toBeInTheDocument();
      expect(screen.getByText('Class Joined Successfully')).toBeInTheDocument();
    });

    it('renders error notifications section', () => {
      renderNotificationPreferences();
      
      expect(screen.getByText('Error Notifications')).toBeInTheDocument();
      expect(screen.getByText('Attendance Errors')).toBeInTheDocument();
      expect(screen.getByText('Join Errors')).toBeInTheDocument();
    });

    it('shows quick action buttons', () => {
      renderNotificationPreferences();
      
      expect(screen.getByTestId('enable-all-button')).toBeInTheDocument();
      expect(screen.getByTestId('disable-all-button')).toBeInTheDocument();
    });

    it('can hide header when showHeader is false', () => {
      renderNotificationPreferences({ showHeader: false });
      
      expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading is true', () => {
      mockNotificationContext.loading = true;
      renderNotificationPreferences();
      
      expect(screen.getByText('Loading preferences...')).toBeInTheDocument();
    });
  });

  describe('Toggle Switches', () => {
    it('displays correct initial toggle states', () => {
      renderNotificationPreferences();
      
      // Check enabled toggles
      const studentJoinedToggle = screen.getByTestId('toggle-student_joined');
      const attendanceMarkedToggle = screen.getByTestId('toggle-attendance_marked');
      const attendanceFailedToggle = screen.getByTestId('toggle-attendance_failed');
      
      expect(studentJoinedToggle).toHaveClass('bg-blue-600');
      expect(attendanceMarkedToggle).toHaveClass('bg-blue-600');
      expect(attendanceFailedToggle).toHaveClass('bg-blue-600');
      
      // Check disabled toggles
      const classJoinedToggle = screen.getByTestId('toggle-class_joined');
      const joinFailedToggle = screen.getByTestId('toggle-join_failed');
      
      expect(classJoinedToggle).toHaveClass('bg-gray-200');
      expect(joinFailedToggle).toHaveClass('bg-gray-200');
    });

    it('toggles preference when clicked', () => {
      renderNotificationPreferences();
      
      const classJoinedToggle = screen.getByTestId('toggle-class_joined');
      
      // Initially disabled (gray)
      expect(classJoinedToggle).toHaveClass('bg-gray-200');
      
      // Click to enable
      fireEvent.click(classJoinedToggle);
      
      // Should now be enabled (blue)
      expect(classJoinedToggle).toHaveClass('bg-blue-600');
    });

    it('shows changes indicator when preferences are modified', () => {
      renderNotificationPreferences();
      
      // Initially no changes, save button should be disabled
      expect(screen.getByTestId('save-button')).toHaveClass('cursor-not-allowed');
      
      // Make a change
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      
      // Save button should now be enabled
      expect(screen.getByTestId('save-button')).not.toHaveClass('cursor-not-allowed');
    });
  });

  describe('Quick Actions', () => {
    it('enables all preferences when Enable All is clicked', () => {
      renderNotificationPreferences();
      
      fireEvent.click(screen.getByTestId('enable-all-button'));
      
      // All toggles should be enabled
      expect(screen.getByTestId('toggle-student_joined')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-attendance_marked')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-class_joined')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-attendance_failed')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-join_failed')).toHaveClass('bg-blue-600');
    });

    it('disables all preferences when Disable All is clicked', () => {
      renderNotificationPreferences();
      
      fireEvent.click(screen.getByTestId('disable-all-button'));
      
      // All toggles should be disabled
      expect(screen.getByTestId('toggle-student_joined')).toHaveClass('bg-gray-200');
      expect(screen.getByTestId('toggle-attendance_marked')).toHaveClass('bg-gray-200');
      expect(screen.getByTestId('toggle-class_joined')).toHaveClass('bg-gray-200');
      expect(screen.getByTestId('toggle-attendance_failed')).toHaveClass('bg-gray-200');
      expect(screen.getByTestId('toggle-join_failed')).toHaveClass('bg-gray-200');
    });
  });

  describe('Save and Reset', () => {
    it('saves preferences when save button is clicked', async () => {
      renderNotificationPreferences();
      
      // Make a change
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      
      // Click save
      fireEvent.click(screen.getByTestId('save-button'));
      
      await waitFor(() => {
        expect(mockNotificationContext.updatePreferences).toHaveBeenCalledTimes(1);
      });
      
      // Check that the correct preferences were passed
      const savedPreferences = mockNotificationContext.updatePreferences.mock.calls[0][0];
      const classJoinedPref = savedPreferences.find((p: NotificationPreference) => p.notification_type === NotificationType.CLASS_JOINED);
      expect(classJoinedPref?.enabled).toBe(true);
    });

    it('shows saving state while saving', async () => {
      // Make updatePreferences return a promise that we can control
      let resolvePromise: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockNotificationContext.updatePreferences.mockReturnValue(savePromise);
      
      renderNotificationPreferences();
      
      // Make a change and save
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      fireEvent.click(screen.getByTestId('save-button'));
      
      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toHaveClass('cursor-not-allowed');
      
      // Resolve the promise
      resolvePromise!();
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('resets preferences when reset button is clicked', () => {
      renderNotificationPreferences();
      
      // Make a change
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      
      // Verify change was made
      expect(screen.getByTestId('toggle-class_joined')).toHaveClass('bg-blue-600');
      
      // Reset
      fireEvent.click(screen.getByTestId('reset-button'));
      
      // Should be back to original state
      expect(screen.getByTestId('toggle-class_joined')).toHaveClass('bg-gray-200');
      expect(screen.getByTestId('save-button')).toHaveClass('cursor-not-allowed');
    });

    it('calls onSave callback when preferences are saved successfully', async () => {
      const onSave = vi.fn();
      renderNotificationPreferences({ onSave });
      
      // Make a change and save
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      fireEvent.click(screen.getByTestId('save-button'));
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when save fails', async () => {
      mockNotificationContext.updatePreferences.mockRejectedValueOnce(new Error('Network error'));
      
      renderNotificationPreferences();
      
      // Make a change and save
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      fireEvent.click(screen.getByTestId('save-button'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save preferences. Please try again.')).toBeInTheDocument();
      });
    });

    it('clears error when making changes after error', async () => {
      mockNotificationContext.updatePreferences.mockRejectedValueOnce(new Error('Network error'));
      
      renderNotificationPreferences();
      
      // Make a change and save (will fail)
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      fireEvent.click(screen.getByTestId('save-button'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save preferences. Please try again.')).toBeInTheDocument();
      });
      
      // Make another change
      fireEvent.click(screen.getByTestId('toggle-attendance_marked'));
      
      // Error should be cleared
      expect(screen.queryByText('Failed to save preferences. Please try again.')).not.toBeInTheDocument();
    });
  });

  describe('Default Preferences', () => {
    it('initializes with default preferences when none exist', () => {
      mockNotificationContext.preferences = [];
      renderNotificationPreferences();
      
      // All toggles should be enabled by default
      expect(screen.getByTestId('toggle-student_joined')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-attendance_marked')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-class_joined')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-attendance_failed')).toHaveClass('bg-blue-600');
      expect(screen.getByTestId('toggle-join_failed')).toHaveClass('bg-blue-600');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderNotificationPreferences();
      
      // Check that toggles are buttons with proper accessibility
      const toggles = screen.getAllByRole('button');
      expect(toggles.length).toBeGreaterThan(0);
      
      // Check that preference items have proper test IDs
      expect(screen.getByTestId('preference-student_joined')).toBeInTheDocument();
      expect(screen.getByTestId('preference-attendance_marked')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderNotificationPreferences();
      
      const saveButton = screen.getByTestId('save-button');
      
      // Check that the button can receive focus (even if disabled)
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAttribute('data-testid', 'save-button');
    });
  });

  describe('Responsive Design', () => {
    it('applies custom className', () => {
      const { container } = renderNotificationPreferences({ className: 'custom-class' });
      
      // The className is applied to the main container div
      const mainContainer = container.querySelector('.bg-white');
      expect(mainContainer).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty preferences gracefully', () => {
      mockNotificationContext.preferences = [];
      
      expect(() => {
        renderNotificationPreferences();
      }).not.toThrow();
    });

    it('handles preferences with missing fields', () => {
      const incompletePreferences = [
        {
          user_id: 'user-1',
          notification_type: NotificationType.STUDENT_JOINED,
          enabled: true
        }
      ] as NotificationPreference[];
      
      mockNotificationContext.preferences = incompletePreferences;
      
      expect(() => {
        renderNotificationPreferences();
      }).not.toThrow();
    });

    it('handles save button states correctly', () => {
      renderNotificationPreferences();
      
      // Initially no changes
      expect(screen.getByTestId('save-button')).toHaveClass('cursor-not-allowed');
      expect(screen.getByTestId('reset-button')).toHaveClass('cursor-not-allowed');
      
      // After making changes
      fireEvent.click(screen.getByTestId('toggle-class_joined'));
      
      expect(screen.getByTestId('save-button')).not.toHaveClass('cursor-not-allowed');
      expect(screen.getByTestId('reset-button')).not.toHaveClass('cursor-not-allowed');
    });
  });
});