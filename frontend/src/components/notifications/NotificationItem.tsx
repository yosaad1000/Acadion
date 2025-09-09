import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationType, type Notification } from '../../types';
import { 
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getNotificationTypeStyle, getNotificationStateClasses } from '../../utils/notificationStyles';
import './notifications.css';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
  isLast?: boolean;
  showFullContent?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClose,
  isLast = false,
  showFullContent = false
}) => {
  const { markAsRead } = useNotifications();

  // State for animations
  const [isNew, setIsNew] = useState(false);
  const [justMarkedRead, setJustMarkedRead] = useState(false);

  // Check if notification is new (created within last 30 seconds)
  useEffect(() => {
    const createdAt = new Date(notification.created_at);
    const now = new Date();
    const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
    
    if (diffInSeconds < 30 && !notification.is_read) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.created_at, notification.is_read]);

  // Get notification icon based on type with enhanced styling
  const getNotificationIcon = (type: NotificationType) => {
    const baseIconClasses = "h-5 w-5 flex-shrink-0 transition-all duration-300";
    const animationClass = isNew ? "notification-icon-bounce" : "";
    const style = getNotificationTypeStyle(type);
    const glowClass = isNew ? style.glowClass : '';
    
    const IconComponent = (() => {
      switch (type) {
        case NotificationType.STUDENT_JOINED:
          return UserPlusIcon;
        case NotificationType.ATTENDANCE_MARKED:
          return CheckCircleIcon;
        case NotificationType.CLASS_JOINED:
          return AcademicCapIcon;
        case NotificationType.ATTENDANCE_FAILED:
          return XCircleIcon;
        case NotificationType.JOIN_FAILED:
          return ExclamationTriangleIcon;
        default:
          return CheckCircleIcon;
      }
    })();
    
    return (
      <div className={`p-2 rounded-full ${style.bgColor} ${glowClass} transition-all duration-300`}>
        <IconComponent className={`${baseIconClasses} ${animationClass} ${style.iconColor}`} />
      </div>
    );
  };

  // Get notification action link based on type and data
  const getActionLink = (notification: Notification): string | null => {
    switch (notification.type) {
      case NotificationType.STUDENT_JOINED:
        if (notification.data?.subject_code) {
          return `/classroom/${notification.data.subject_code}`;
        }
        return '/dashboard';
      case NotificationType.ATTENDANCE_MARKED:
        return '/attendance-reports';
      case NotificationType.CLASS_JOINED:
        if (notification.data?.subject_code) {
          return `/classroom/${notification.data.subject_code}`;
        }
        return '/dashboard';
      case NotificationType.ATTENDANCE_FAILED:
      case NotificationType.JOIN_FAILED:
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle notification click
  const handleClick = async () => {
    if (!notification.is_read) {
      try {
        setJustMarkedRead(true);
        await markAsRead(notification.id);
        setTimeout(() => setJustMarkedRead(false), 300);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        setJustMarkedRead(false);
      }
    }
    
    if (onClose) {
      onClose();
    }
  };

  const actionLink = getActionLink(notification);
  const relativeTime = formatRelativeTime(notification.created_at);

  const stateClasses = getNotificationStateClasses(notification.is_read, isNew);
  
  const content = (
    <div
      className={`
        px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer
        ${stateClasses}
        ${!isLast ? 'border-b border-gray-100 dark:border-gray-700' : ''}
        ${justMarkedRead ? 'notification-item-read' : ''}
        hover:shadow-sm hover:scale-[1.01] transform
        active:scale-[0.99]
      `}
      onClick={handleClick}
      data-testid="notification-item"
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className={`
                text-sm font-medium truncate
                ${notification.is_read 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-gray-900 dark:text-gray-100 font-semibold'
                }
              `}>
                {notification.title}
              </p>

              {/* Message */}
              <p className={`
                text-sm mt-1
                ${notification.is_read 
                  ? 'text-gray-600 dark:text-gray-400' 
                  : 'text-gray-700 dark:text-gray-300'
                }
                ${showFullContent ? '' : 'truncate'}
              `}>
                {notification.message}
              </p>

              {/* Additional data display */}
              {notification.data && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {notification.type === NotificationType.STUDENT_JOINED && notification.data.subject_name && (
                    <span>Class: {notification.data.subject_name}</span>
                  )}
                  {notification.type === NotificationType.ATTENDANCE_MARKED && notification.data.present_count !== undefined && (
                    <span>Present: {notification.data.present_count}/{notification.data.total_students}</span>
                  )}
                  {notification.type === NotificationType.CLASS_JOINED && notification.data.teacher_name && (
                    <span>Teacher: {notification.data.teacher_name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Unread indicator and time */}
            <div className="flex flex-col items-end space-y-1 ml-2">
              {!notification.is_read && (
                <div 
                  className="h-2.5 w-2.5 bg-blue-500 rounded-full flex-shrink-0 notification-unread-pulse shadow-lg"
                  data-testid="unread-indicator"
                />
              )}
              <span className={`
                text-xs flex-shrink-0 transition-colors duration-300
                ${!notification.is_read 
                  ? 'text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-gray-400 dark:text-gray-500'
                }
              `}>
                {relativeTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with Link if there's an action link, otherwise return plain div
  if (actionLink) {
    return (
      <Link to={actionLink} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default NotificationItem;