import React, { useState } from 'react';
import { ClassSchedule } from '../../types';
import { 
  PencilIcon, 
  TrashIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface ScheduleActionsProps {
  schedule: ClassSchedule;
  onEdit: (schedule: ClassSchedule) => void;
  onDelete: (scheduleId: number, scope: 'single' | 'series') => Promise<void>;
  onCancel: () => void;
}

interface DeleteConfirmationProps {
  schedule: ClassSchedule;
  onConfirm: (scope: 'single' | 'series') => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  schedule,
  onConfirm,
  onCancel,
  loading
}) => {
  const [deleteScope, setDeleteScope] = useState<'single' | 'series'>('single');
  const isRecurring = !!schedule.recurrence_pattern;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-medium text-gray-900">Delete Class Schedule</h3>
        </div>

        <p className="text-gray-600 mb-4">
          Are you sure you want to delete "{schedule.title}"?
        </p>

        {isRecurring && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              This is a recurring class. What would you like to delete?
            </p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={deleteScope === 'single'}
                  onChange={(e) => setDeleteScope(e.target.value as 'single' | 'series')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">This instance only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="series"
                  checked={deleteScope === 'series'}
                  onChange={(e) => setDeleteScope(e.target.value as 'single' | 'series')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">This and all future instances</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(deleteScope)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </div>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ScheduleActions: React.FC<ScheduleActionsProps> = ({
  schedule,
  onEdit,
  onDelete,
  onCancel
}) => {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (scope: 'single' | 'series') => {
    try {
      setLoading(true);
      await onDelete(schedule.id, scope);
      setShowDeleteConfirmation(false);
      onCancel();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Actions</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">{schedule.title}</h4>
          <p className="text-sm text-gray-600 mb-1">
            {formatDateTime(schedule.start_datetime)}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Duration: {schedule.duration_minutes} minutes
          </p>
          {schedule.description && (
            <p className="text-sm text-gray-600">{schedule.description}</p>
          )}
          {schedule.recurrence_pattern && (
            <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Recurring: {schedule.recurrence_pattern.type}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          
          <button
            onClick={() => onEdit(schedule)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit Schedule</span>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete Schedule</span>
          </button>
        </div>
      </div>

      {showDeleteConfirmation && (
        <DeleteConfirmation
          schedule={schedule}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirmation(false)}
          loading={loading}
        />
      )}
    </>
  );
};

export default ScheduleActions;