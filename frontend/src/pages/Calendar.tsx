import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ClassSchedule, ClassScheduleCreate } from '../types';
import {
  GoogleCalendarConnection,
  ClassSchedulingForm,
  CalendarView,
  ScheduleActions,
  StudentCalendarView
} from '../components/Calendar';
import { 
  PlusIcon, 
  CalendarIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

type ViewMode = 'calendar' | 'create' | 'edit' | 'actions';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      } else {
        setError('Failed to fetch schedules');
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setError('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (scheduleData: ClassScheduleCreate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        await fetchSchedules();
        setViewMode('calendar');
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create schedule');
      }
    } catch (err) {
      console.error('Failed to create schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
      throw err;
    }
  };

  const handleUpdateSchedule = async (scheduleData: ClassScheduleCreate) => {
    if (!selectedSchedule) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        await fetchSchedules();
        setViewMode('calendar');
        setSelectedSchedule(null);
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update schedule');
      }
    } catch (err) {
      console.error('Failed to update schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
      throw err;
    }
  };

  const handleDeleteSchedule = async (scheduleId: number, scope: 'single' | 'series') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scope })
      });

      if (response.ok) {
        await fetchSchedules();
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete schedule');
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
      throw err;
    }
  };

  const handleEditSchedule = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('edit');
  };

  const handleViewScheduleActions = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('actions');
  };

  const handleViewDetails = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    // Could open a modal or navigate to details page
    console.log('View details for schedule:', schedule);
  };

  const resetView = () => {
    setViewMode('calendar');
    setSelectedSchedule(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">
                {user?.user_type === 'teacher' 
                  ? 'Manage your class schedules and Google Calendar integration'
                  : 'View your class schedules and sync with Google Calendar'
                }
              </p>
            </div>
          </div>

          {user?.user_type === 'teacher' && viewMode === 'calendar' && (
            <button
              onClick={() => setViewMode('create')}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Create Schedule</span>
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'calendar' && (
          <div className="space-y-6">
            {user?.user_type === 'teacher' && (
              <GoogleCalendarConnection onConnectionChange={setCalendarConnected} />
            )}
            
            {user?.user_type === 'teacher' ? (
              <CalendarView
                schedules={schedules}
                onEditSchedule={handleEditSchedule}
                onDeleteSchedule={(id) => handleDeleteSchedule(id, 'single')}
                onViewDetails={handleViewScheduleActions}
                userRole="teacher"
              />
            ) : (
              <StudentCalendarView
                schedules={schedules}
                onViewDetails={handleViewDetails}
              />
            )}
          </div>
        )}

        {viewMode === 'create' && (
          <ClassSchedulingForm
            onSubmit={handleCreateSchedule}
            onCancel={resetView}
          />
        )}

        {viewMode === 'edit' && selectedSchedule && (
          <ClassSchedulingForm
            onSubmit={handleUpdateSchedule}
            onCancel={resetView}
            initialData={{
              subject_id: selectedSchedule.subject_id,
              title: selectedSchedule.title,
              description: selectedSchedule.description,
              start_datetime: selectedSchedule.start_datetime,
              duration_minutes: selectedSchedule.duration_minutes,
              recurrence_pattern: selectedSchedule.recurrence_pattern
            }}
          />
        )}

        {viewMode === 'actions' && selectedSchedule && (
          <ScheduleActions
            schedule={selectedSchedule}
            onEdit={handleEditSchedule}
            onDelete={handleDeleteSchedule}
            onCancel={resetView}
          />
        )}
      </div>
    </div>
  );
};

export default Calendar;