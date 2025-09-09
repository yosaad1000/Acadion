import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface TestNotification {
  id: string;
  title: string;
  message: string;
}

const NotificationDeleteTest: React.FC = () => {
  const [notifications, setNotifications] = useState<TestNotification[]>([
    { id: '1', title: 'Test Notification 1', message: 'This is a test message' },
    { id: '2', title: 'Test Notification 2', message: 'Another test message' },
    { id: '3', title: 'Test Notification 3', message: 'Yet another test message' },
  ]);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    console.log('🗑️ Delete button clicked for notification:', id);
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Event prevented and stopped');
    }

    setIsDeleting(id);
    
    // Simulate API call
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setIsDeleting(null);
      console.log('✅ Notification deleted from state');
    }, 1000);
  };

  const handleNotificationClick = (id: string) => {
    console.log('📱 Notification clicked:', id);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-4">
      <h2 className="text-xl font-bold mb-4">Notification Delete Test</h2>
      <p className="text-sm text-gray-600 mb-4">
        Test if delete buttons cause page reloads. Check browser console for logs.
      </p>
      
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            onClick={() => handleNotificationClick(notification.id)}
          >
            <div>
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm text-gray-600">{notification.message}</div>
            </div>
            
            <button
              onClick={(e) => handleDelete(notification.id, e)}
              disabled={isDeleting === notification.id}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
              type="button"
            >
              {isDeleting === notification.id ? (
                <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            All notifications deleted! Refresh page to reset.
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
        <strong>Debug Info:</strong><br />
        - Total notifications: {notifications.length}<br />
        - Currently deleting: {isDeleting || 'none'}<br />
        - Page loaded at: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default NotificationDeleteTest;