import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationItem } from '../components/notifications';
import { 
  BellIcon,
  CheckIcon,
  InboxIcon
} from '@heroicons/react/24/outline';

const Notifications: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead 
  } = useNotifications();

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <div className="container-responsive py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BellIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="
                inline-flex items-center px-4 py-2 text-sm font-medium 
                text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                rounded-md border border-blue-200 dark:border-blue-800
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                transition-colors
              "
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          /* Loading State */
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-12 text-center">
            <InboxIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No notifications yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              You'll see notifications here when students join your classes, attendance is marked, and other important events occur.
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isLast={index === notifications.length - 1}
                showFullContent={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {notifications.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default Notifications;