import React, { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import NotificationMobileOverlay from './NotificationMobileOverlay';
import './notifications.css';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { unreadCount, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'p-1.5',
      icon: 'h-5 w-5',
      badge: 'h-4 w-4 text-xs min-w-[16px]',
      badgeOffset: '-top-1 -right-1'
    },
    md: {
      button: 'p-2',
      icon: 'h-6 w-6',
      badge: 'h-5 w-5 text-xs min-w-[20px]',
      badgeOffset: '-top-2 -right-2'
    },
    lg: {
      button: 'p-2.5',
      icon: 'h-7 w-7',
      badge: 'h-6 w-6 text-sm min-w-[24px]',
      badgeOffset: '-top-2 -right-2'
    }
  };

  const config = sizeConfig[size];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={bellRef}>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          ${config.button}
          relative rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900
          transition-colors touch-manipulation
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        data-testid="notification-bell"
      >
        {/* Bell Icon */}
        {unreadCount > 0 ? (
          <BellSolidIcon 
            className={`${config.icon} text-blue-600 dark:text-blue-400 transition-all duration-300`}
            style={{
              animation: unreadCount > 0 ? 'notification-bell-ring 0.8s ease-in-out' : undefined
            }}
          />
        ) : (
          <BellIcon className={`${config.icon} transition-all duration-300 hover:scale-110`} />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            className={`
              ${config.badge} ${config.badgeOffset}
              absolute flex items-center justify-center
              bg-red-500 text-white font-medium rounded-full
              animate-bounce shadow-lg
              transition-all duration-300 ease-in-out
              transform scale-110
            `}
            data-testid="unread-count-badge"
            style={{
              animation: 'notification-badge-pulse 2s infinite, notification-badge-bounce 0.6s ease-out'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className={`${config.badgeOffset} absolute`}>
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Notification Dropdown - Desktop */}
      {isOpen && !isMobile && (
        <NotificationDropdown 
          onClose={handleClose}
          position="right"
        />
      )}

      {/* Notification Mobile Overlay */}
      <NotificationMobileOverlay
        isOpen={isOpen && isMobile}
        onClose={handleClose}
      />
    </div>
  );
};

export default NotificationBell;