import React, { useState } from 'react';
import { SessionCreate } from '../../types';
import { useSessions } from '../../hooks/useSessions';
import { 
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface CreateSessionProps {
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
}

interface FormData {
  name: string;
  description: string;
  session_date: string;
  session_time: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  session_date?: string;
  session_time?: string;
  general?: string;
}

const CreateSession: React.FC<CreateSessionProps> = ({ 
  subjectId, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { createSession, loading } = useSessions(subjectId);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    session_date: '',
    session_time: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate session name
    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Session name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Session name must be less than 100 characters';
    }

    // Validate date if provided
    if (formData.session_date) {
      const selectedDate = new Date(formData.session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.session_date = 'Session date cannot be in the past';
      }
    }

    // Validate time if date is provided
    if (formData.session_date && formData.session_time) {
      const sessionDateTime = new Date(`${formData.session_date}T${formData.session_time}`);
      const now = new Date();
      
      if (sessionDateTime < now) {
        newErrors.session_time = 'Session time cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Combine date and time if both are provided
      let sessionDateTime: string | undefined;
      if (formData.session_date) {
        if (formData.session_time) {
          sessionDateTime = `${formData.session_date}T${formData.session_time}:00`;
        } else {
          sessionDateTime = `${formData.session_date}T09:00:00`;
        }
      }

      const sessionData: SessionCreate = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        session_date: sessionDateTime,
        notes: formData.notes.trim() || undefined,
      };

      const newSession = await createSession(sessionData);
      
      if (newSession) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          session_date: '',
          session_time: '',
          notes: ''
        });
        setErrors({});
        
        // Call success callback and close modal
        if (onSuccess) {
          onSuccess(newSession.session_id);
        }
        onClose();
      } else {
        setErrors({ general: 'Failed to create session. Please try again.' });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        session_date: '',
        session_time: '',
        notes: ''
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Session</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              <span className="text-sm text-red-700">{errors.general}</span>
            </div>
          )}

          {/* Session Name */}
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-1">
              Session Name *
            </label>
            <input
              id="session-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Introduction to React Hooks"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="session-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="session-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of what will be covered in this session..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date
              </label>
              <input
                id="session-date"
                type="date"
                value={formData.session_date}
                onChange={(e) => handleInputChange('session_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.session_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.session_date && (
                <p className="text-sm text-red-600 mt-1">{errors.session_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="session-time" className="block text-sm font-medium text-gray-700 mb-1">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Time
              </label>
              <input
                id="session-time"
                type="time"
                value={formData.session_time}
                onChange={(e) => handleInputChange('session_time', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.session_time ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.session_time && (
                <p className="text-sm text-red-600 mt-1">{errors.session_time}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1">
              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
              Notes
            </label>
            <textarea
              id="session-notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes or preparation instructions..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSession;