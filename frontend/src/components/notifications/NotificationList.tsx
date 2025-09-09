import React, { useState, useEffect, useMemo } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import { NotificationType, type Notification } from '../../types';
import { 
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import './notifications.css';

interface NotificationListProps {
  className?: string;
  showHeader?: boolean;
  itemsPerPage?: number;
}

type FilterType = 'all' | 'unread' | NotificationType;

const NotificationList: React.FC<NotificationListProps> = ({ 
  className = '',
  showHeader = true,
  itemsPerPage = 20
}) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead 
  } = useNotifications();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'all':
        return notifications;
      case 'unread':
        return notifications.filter(n => !n.is_read);
      default:
        return notifications.filter(n => n.type === filter);
    }
  }, [notifications, filter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Filter options
  const filterOptions = [
    { value: 'all' as FilterType, label: 'All', count: notifications.length },
    { value: 'unread' as FilterType, label: 'Unread', count: unreadCount },
    { value: NotificationType.STUDENT_JOINED, label: 'Student Joined', count: notifications.filter(n => n.type === NotificationType.STUDENT_JOINED).length },
    { value: NotificationType.ATTENDANCE_MARKED, label: 'Attendance', count: notifications.filter(n => n.type === NotificationType.ATTENDANCE_MARKED).length },
    { value: NotificationType.CLASS_JOINED, label: 'Class Joined', count: notifications.filter(n => n.type === NotificationType.CLASS_JOINED).length },
    { value: NotificationType.ATTENDANCE_FAILED, label: 'Errors', count: notifications.filter(n => n.type === NotificationType.ATTENDANCE_FAILED || n.type === NotificationType.JOIN_FAILED).length },
  ];

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Get filter label
  const getFilterLabel = (filterValue: FilterType): string => {
    const option = filterOptions.find(opt => opt.value === filterValue);
    return option?.label || 'All';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {filter !== 'all' && ` (${getFilterLabel(filter)})`}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Mark all as read button */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="
                    inline-flex items-center px-3 py-2 text-sm font-medium 
                    text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                    transition-colors
                  "
                  data-testid="mark-all-read-button"
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Mark all read
                </button>
              )}

              {/* Filter toggle button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                  ${showFilters 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                data-testid="filter-toggle-button"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>
          </div>

          {/* Filter options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 notification-dropdown-slide">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`
                      inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                      transition-colors
                      ${filter === option.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                    data-testid={`filter-${option.value}`}
                  >
                    {option.label}
                    {option.count > 0 && (
                      <span className={`
                        ml-2 px-2 py-0.5 text-xs rounded-full
                        ${filter === option.value
                          ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        {option.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          /* Loading State */
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="notification-loading-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              <span>Loading notifications...</span>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-12 text-center" data-testid="empty-notifications">
            <InboxIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {filter === 'all' ? 'No notifications yet' : `No ${getFilterLabel(filter).toLowerCase()} notifications`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {filter === 'all' 
                ? "You'll see notifications here when something happens in your classes."
                : `Try changing the filter to see other notifications.`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="
                  mt-4 inline-flex items-center px-4 py-2 text-sm font-medium
                  text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300
                  hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                "
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Clear filter
              </button>
            )}
          </div>
        ) : (
          /* Notifications List */
          <div data-testid="notifications-list">
            {paginatedNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isLast={index === paginatedNotifications.length - 1 && currentPage === totalPages}
                showFullContent={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
            </div>

            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`
                  inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                  ${currentPage === 1
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                data-testid="previous-page-button"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`
                        px-3 py-2 text-sm font-medium rounded-md
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                        transition-colors
                        ${currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                      data-testid={`page-${pageNumber}-button`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`
                  inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                  ${currentPage === totalPages
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                data-testid="next-page-button"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationList;