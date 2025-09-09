import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { 
  CheckIcon,
  EyeIcon,
  InboxIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import './notifications.css';

interface NotificationDropdownProps {
  onClose: () => void;
  position?: 'left' | 'right' | 'center';
  maxHeight?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  onClose, 
  position = 'right',
  maxHeight = 'max-h-96'
}) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead,
    clearAllNotifications
  } = useNotifications();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Recent notifications (limit to 10 for dropdown)
  const recentNotifications = notifications.slice(0, 10);

  // Position classes
  const positionClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle clear all notifications
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllNotifications();
      setShowClearAllDialog(false);
      onClose(); // Close dropdown after clearing
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Focus management for accessibility
  useEffect(() => {
    const dropdown = dropdownRef.current;
    if (dropdown) {
      dropdown.focus();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`
        absolute mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
        border border-gray-200 dark:border-gray-700 z-50 
        ${positionClasses[position]}
        transition-colors notification-dropdown-slide
        sm:relative sm:w-full sm:max-w-md
        max-sm:notification-dropdown-mobile
      `}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      data-testid="notification-dropdown"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h3>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="
                  inline-flex items-center px-2 py-1 text-xs font-medium 
                  text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                  hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors touch-manipulation
                "
                data-testid="mark-all-read-button"
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Mark all</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => setShowClearAllDialog(true)}
                className="
                  inline-flex items-center px-2 py-1 text-xs font-medium 
                  text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                  hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors touch-manipulation
                "
                data-testid="clear-all-button"
              >
                <TrashIcon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Clear all</span>
                <span className="sm:hidden">Clear</span>
              </button>
            )}
            
            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="
                sm:hidden inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                transition-colors touch-manipulation
              "
              data-testid="close-dropdown-button"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Content */}
      <div className={`${maxHeight} overflow-y-auto`}>
        {loading ? (
          /* Loading State */
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              <span className="text-sm">Loading notifications...</span>
            </div>
          </div>
        ) : recentNotifications.length === 0 ? (
          /* Empty State */
          <div className="px-4 py-8 text-center" data-testid="empty-notifications">
            <InboxIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              No notifications yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              You'll see notifications here when something happens
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="py-2" data-testid="notifications-list">
            {recentNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={onClose}
                isLast={index === recentNotifications.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
          <Link
            to="/notifications"
            onClick={onClose}
            className="
              inline-flex items-center w-full justify-center px-3 py-2 text-sm font-medium
              text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
              hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors
            "
            data-testid="view-all-link"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View all notifications
          </Link>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearAllDialog}
        onClose={() => setShowClearAllDialog(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications"
        message={`Are you sure you want to clear all ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
        loading={isClearing}
      />
    </div>
  );
};

export default NotificationDropdown;