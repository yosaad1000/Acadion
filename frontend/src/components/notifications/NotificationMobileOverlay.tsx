import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import NotificationDropdown from './NotificationDropdown';
import './notifications.css';

interface NotificationMobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationMobileOverlay: React.FC<NotificationMobileOverlayProps> = ({
  isOpen,
  onClose
}) => {
  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Overlay Content */}
      <div className="relative h-full flex flex-col bg-white dark:bg-gray-800 notification-dropdown-slide">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notifications
          </h2>
          <button
            onClick={onClose}
            className="
              p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors
            "
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <NotificationDropdown 
            onClose={onClose}
            position="center"
            maxHeight="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationMobileOverlay;