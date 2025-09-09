import { NotificationType } from '../types';

export interface NotificationTypeStyle {
  iconColor: string;
  bgColor: string;
  borderColor: string;
  glowClass: string;
  category: 'success' | 'info' | 'warning' | 'error';
}

export const getNotificationTypeStyle = (type: NotificationType): NotificationTypeStyle => {
  switch (type) {
    case NotificationType.STUDENT_JOINED:
      return {
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        glowClass: 'notification-success-glow',
        category: 'success'
      };
    
    case NotificationType.CLASS_JOINED:
      return {
        iconColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        glowClass: 'notification-success-glow',
        category: 'success'
      };
    
    case NotificationType.ATTENDANCE_MARKED:
      return {
        iconColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        glowClass: 'notification-success-glow',
        category: 'info'
      };
    
    case NotificationType.ATTENDANCE_FAILED:
      return {
        iconColor: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800',
        glowClass: 'notification-error-glow',
        category: 'error'
      };
    
    case NotificationType.JOIN_FAILED:
      return {
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        glowClass: 'notification-warning-glow',
        category: 'warning'
      };
    
    default:
      return {
        iconColor: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        borderColor: 'border-gray-200 dark:border-gray-600',
        glowClass: '',
        category: 'info'
      };
  }
};

export const getNotificationPriorityClass = (type: NotificationType): string => {
  const style = getNotificationTypeStyle(type);
  
  switch (style.category) {
    case 'error':
      return 'notification-priority-high';
    case 'warning':
      return 'notification-priority-medium';
    case 'success':
    case 'info':
    default:
      return 'notification-priority-normal';
  }
};

export const getNotificationAnimationDelay = (index: number): string => {
  return `${index * 0.1}s`;
};

// Utility for responsive notification sizing
export const getResponsiveNotificationClasses = (isMobile: boolean): string => {
  return isMobile 
    ? 'px-3 py-2 text-sm' 
    : 'px-4 py-3 text-base';
};

// Utility for notification state classes
export const getNotificationStateClasses = (isRead: boolean, isNew: boolean): string => {
  let classes = 'transition-all duration-300';
  
  if (!isRead) {
    classes += ' bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500';
  }
  
  if (isNew) {
    classes += ' notification-item-slide-in';
  }
  
  return classes;
};

// Utility for notification badge styling
export const getNotificationBadgeClasses = (count: number): string => {
  let classes = 'absolute flex items-center justify-center bg-red-500 text-white font-medium rounded-full shadow-lg transition-all duration-300';
  
  if (count > 0) {
    classes += ' animate-bounce notification-badge-pulse';
  }
  
  return classes;
};