import React, { useState, useEffect } from 'react';
import { ClassSchedule, StudentScheduleAccess, CalendarConnection } from '../../types';
import { 
  CalendarIcon, 
  EyeIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import CalendarView from './CalendarView';
import GoogleCalendarConnection from './GoogleCalendarConnection';

interface StudentCalendarViewProps {
  schedules: ClassSchedule[];
  onViewDetails: (schedule: ClassSchedule) => void;
  loading?: boolean;
}

interface SyncSettings {
  [scheduleId: number]: boolean;
}

const StudentCalendarView: React.FC<StudentCalendarViewProps> = ({
  schedules,
  onViewDetails,
  loading = false
}) => {
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({});
  const [syncLoading, setSyncLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSyncOptions, setShowSyncOptions] = useState(false);

  useEffect(() => {
    fetchSyncSettings();
  }, [schedules]);

  const fetchSyncSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/schedules/sync-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const settings: SyncSettings = {};
        if (Array.isArray(data)) {
          data.forEach((setting: StudentScheduleAccess) => {
            settings[setting.schedule_id] = setting.sync_to_personal_calendar;
          });
        }
        setSyncSettings(settings);
      }
    } catch (err) {
      console.error('Failed to fetch sync settings:', err);
    }
  };

  const handleSyncToggle = async (scheduleId: number, enabled: boolean) => {
    try {
      setSyncLoading(scheduleId);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/schedules/${scheduleId}/sync`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_to_personal_calendar: enabled
        })
      });

      if (response.ok) {
        setSyncSettings(prev => ({
          ...prev,
          [scheduleId]: enabled
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update sync settings');
      }
    } catch (err) {
      console.error('Failed to toggle sync:', err);
      setError('Failed to update sync settings');
    } finally {
      setSyncLoading(null);
    }
  };

  const handleBulkSync = async (enabled: boolean) => {
    try {
      setSyncLoading(-1); // Use -1 for bulk operations
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/schedules/bulk-sync', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_to_personal_calendar: enabled,
          schedule_ids: schedules.map(s => s.id)
        })
      });

      if (response.ok) {
        const newSettings: SyncSettings = {};
        schedules.forEach(schedule => {
          newSettings[schedule.id] = enabled;
        });
        setSyncSettings(newSettings);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update sync settings');
      }
    } catch (err) {
      console.error('Failed to bulk sync:', err);
      setError('Failed to update sync settings');
    } finally {
      setSyncLoading(null);
    }
  };

  const getSyncedCount = () => {
    return Object.values(syncSettings).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Google Calendar Connection */}
      <GoogleCalendarConnection onConnectionChange={setCalendarConnected} />

      {/* Sync Options */}
      {calendarConnected && schedules.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CloudArrowUpIcon className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Calendar Sync</h3>
                <p className="text-sm text-gray-600">
                  Choose which classes to sync to your personal Google Calendar
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSyncOptions(!showSyncOptions)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showSyncOptions ? 'Hide Options' : 'Sync Options'}
            </button>
          </div>

          {/* Sync Summary */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span>{getSyncedCount()} of {schedules.length} classes synced</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}

          {showSyncOptions && (
            <div className="space-y-4">
              {/* Bulk Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">All Classes</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkSync(true)}
                    disabled={syncLoading === -1}
                    className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {syncLoading === -1 ? 'Syncing...' : 'Sync All'}
                  </button>
                  <button
                    onClick={() => handleBulkSync(false)}
                    disabled={syncLoading === -1}
                    className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {syncLoading === -1 ? 'Updating...' : 'Unsync All'}
                  </button>
                </div>
              </div>

              {/* Individual Schedule Sync */}
              <div className="space-y-2">
                {schedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{schedule.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(schedule.start_datetime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                        {schedule.recurrence_pattern && (
                          <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {schedule.recurrence_pattern.type}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={syncSettings[schedule.id] || false}
                          onChange={(e) => handleSyncToggle(schedule.id, e.target.checked)}
                          disabled={syncLoading === schedule.id}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {syncLoading === schedule.id ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            'Sync'
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      <CalendarView
        schedules={schedules}
        onViewDetails={onViewDetails}
        userRole="student"
        loading={loading}
      />

      {/* Schedule List View */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">My Class Schedule</h3>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No classes scheduled</p>
            <p className="text-sm text-gray-400 mt-1">
              Contact your teacher to get enrolled in classes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-medium text-gray-900">{schedule.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(schedule.start_datetime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} • {schedule.duration_minutes} minutes
                      </div>
                      {schedule.description && (
                        <div className="text-sm text-gray-500 mt-1">{schedule.description}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {calendarConnected && syncSettings[schedule.id] && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="text-xs">Synced</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => onViewDetails(schedule)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCalendarView;