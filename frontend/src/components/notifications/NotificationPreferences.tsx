import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationType, type NotificationPreference } from '../../types';
import { 
  BellIcon,
  UserPlusIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import './notifications.css';

interface NotificationPreferencesProps {
  className?: string;
  showHeader?: boolean;
  onSave?: (preferences: NotificationPreference[]) => void;
}

interface NotificationTypeConfig {
  type: NotificationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'activity' | 'errors';
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ 
  className = '',
  showHeader = true,
  onSave
}) => {
  const { 
    preferences, 
    loading, 
    updatePreferences,
    refreshPreferences 
  } = useNotifications();

  const [localPreferences, setLocalPreferences] = useState<NotificationPreference[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notification type configurations
  const notificationTypes: NotificationTypeConfig[] = [
    {
      type: NotificationType.STUDENT_JOINED,
      label: 'Student Joined Class',
      description: 'Get notified when a student joins your class',
      icon: <UserPlusIcon className="h-5 w-5 text-green-500" />,
      category: 'activity'
    },
    {
      type: NotificationType.ATTENDANCE_MARKED,
      label: 'Attendance Marked',
      description: 'Get notified when attendance is successfully processed',
      icon: <CheckCircleIcon className="h-5 w-5 text-blue-500" />,
      category: 'activity'
    },
    {
      type: NotificationType.CLASS_JOINED,
      label: 'Class Joined Successfully',
      description: 'Get notified when you successfully join a class',
      icon: <AcademicCapIcon className="h-5 w-5 text-green-500" />,
      category: 'activity'
    },
    {
      type: NotificationType.ATTENDANCE_FAILED,
      label: 'Attendance Errors',
      description: 'Get notified when attendance processing fails',
      icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
      category: 'errors'
    },
    {
      type: NotificationType.JOIN_FAILED,
      label: 'Join Errors',
      description: 'Get notified when joining a class fails',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
      category: 'errors'
    }
  ];

  // Initialize local preferences from context
  useEffect(() => {
    if (preferences.length > 0) {
      setLocalPreferences([...preferences]);
      setHasChanges(false);
    } else {
      // Initialize with default preferences (all enabled)
      const defaultPreferences: NotificationPreference[] = notificationTypes.map(type => ({
        user_id: '', // Will be set by the backend
        notification_type: type.type,
        enabled: true
      }));
      setLocalPreferences(defaultPreferences);
    }
  }, [preferences]);

  // Check for changes
  useEffect(() => {
    const hasChangesNow = localPreferences.some((local, index) => {
      const original = preferences[index];
      return !original || local.enabled !== original.enabled;
    });
    setHasChanges(hasChangesNow);
  }, [localPreferences, preferences]);

  // Handle preference toggle
  const handleToggle = (notificationType: NotificationType) => {
    setLocalPreferences(prev => 
      prev.map(pref => 
        pref.notification_type === notificationType 
          ? { ...pref, enabled: !pref.enabled }
          : pref
      )
    );
    setError(null);
  };

  // Handle save preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updatePreferences(localPreferences);
      setHasChanges(false);
      
      if (onSave) {
        onSave(localPreferences);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset preferences
  const handleReset = () => {
    setLocalPreferences([...preferences]);
    setHasChanges(false);
    setError(null);
  };

  // Handle enable all
  const handleEnableAll = () => {
    setLocalPreferences(prev => 
      prev.map(pref => ({ ...pref, enabled: true }))
    );
    setError(null);
  };

  // Handle disable all
  const handleDisableAll = () => {
    setLocalPreferences(prev => 
      prev.map(pref => ({ ...pref, enabled: false }))
    );
    setError(null);
  };

  // Get preference for a notification type
  const getPreference = (notificationType: NotificationType): boolean => {
    const pref = localPreferences.find(p => p.notification_type === notificationType);
    return pref?.enabled ?? true;
  };

  // Group notification types by category
  const activityTypes = notificationTypes.filter(type => type.category === 'activity');
  const errorTypes = notificationTypes.filter(type => type.category === 'errors');

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BellIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Notification Preferences
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Choose which notifications you want to receive
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleEnableAll}
                className="
                  px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400
                  hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20
                  rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                "
                data-testid="enable-all-button"
              >
                Enable All
              </button>
              <button
                onClick={handleDisableAll}
                className="
                  px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400
                  hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20
                  rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                "
                data-testid="disable-all-button"
              >
                Disable All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {loading ? (
          /* Loading State */
          <div className="py-8 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <div className="notification-loading-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              <span>Loading preferences...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Activity Notifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Activity Notifications
              </h3>
              <div className="space-y-4">
                {activityTypes.map((typeConfig) => {
                  const isEnabled = getPreference(typeConfig.type);
                  return (
                    <div
                      key={typeConfig.type}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-sm"
                      data-testid={`preference-${typeConfig.type}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {typeConfig.label}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {typeConfig.description}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggle(typeConfig.type)}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                          ${isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
                        `}
                        data-testid={`toggle-${typeConfig.type}`}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                            transition duration-200 ease-in-out
                            ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Notifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Error Notifications
              </h3>
              <div className="space-y-4">
                {errorTypes.map((typeConfig) => {
                  const isEnabled = getPreference(typeConfig.type);
                  return (
                    <div
                      key={typeConfig.type}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-sm"
                      data-testid={`preference-${typeConfig.type}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {typeConfig.label}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {typeConfig.description}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggle(typeConfig.type)}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                          ${isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}
                        `}
                        data-testid={`toggle-${typeConfig.type}`}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                            transition duration-200 ease-in-out
                            ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className={`
                inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                transition-colors
                ${hasChanges && !saving
                  ? 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }
              `}
              data-testid="reset-button"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`
                inline-flex items-center px-6 py-2 text-sm font-medium rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                transition-colors
                ${hasChanges && !saving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
              data-testid="save-button"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferences;