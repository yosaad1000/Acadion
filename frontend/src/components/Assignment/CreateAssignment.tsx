import React, { useState } from 'react';
import { AssignmentCreate } from '../../types';
import { useAssignments } from '../../hooks/useAssignments';
import { 
  XMarkIcon,
  CalendarIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  LinkIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

interface CreateAssignmentProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (assignmentId: string) => void;
}

interface FormData {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  assignment_type: 'homework' | 'test' | 'project';
  google_drive_link: string;
}

interface FormErrors {
  title?: string;
  due_date?: string;
  due_time?: string;
  google_drive_link?: string;
  general?: string;
}

const CreateAssignment: React.FC<CreateAssignmentProps> = ({ 
  sessionId, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { createAssignment, loading } = useAssignments(sessionId);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    assignment_type: 'homework',
    google_drive_link: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const assignmentTypes = [
    {
      value: 'homework' as const,
      label: 'Homework',
      icon: BookOpenIcon,
      description: 'Regular homework assignment',
      color: 'text-blue-600'
    },
    {
      value: 'test' as const,
      label: 'Test',
      icon: AcademicCapIcon,
      description: 'Exam or quiz',
      color: 'text-red-600'
    },
    {
      value: 'project' as const,
      label: 'Project',
      icon: BeakerIcon,
      description: 'Long-term project',
      color: 'text-purple-600'
    }
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Assignment title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Assignment title must be at least 3 characters';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Assignment title must be less than 200 characters';
    }

    // Validate due date if provided
    if (formData.due_date) {
      const selectedDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.due_date = 'Due date cannot be in the past';
      }
    }

    // Validate time if date is provided
    if (formData.due_date && formData.due_time) {
      const dueDateTime = new Date(`${formData.due_date}T${formData.due_time}`);
      const now = new Date();
      
      if (dueDateTime < now) {
        newErrors.due_time = 'Due time cannot be in the past';
      }
    }

    // Validate Google Drive link if provided
    if (formData.google_drive_link.trim()) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(formData.google_drive_link.trim())) {
        newErrors.google_drive_link = 'Please enter a valid URL starting with http:// or https://';
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
      let dueDateTime: string | undefined;
      if (formData.due_date) {
        if (formData.due_time) {
          dueDateTime = `${formData.due_date}T${formData.due_time}:00`;
        } else {
          dueDateTime = `${formData.due_date}T23:59:00`;
        }
      }

      const assignmentData: AssignmentCreate = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        due_date: dueDateTime,
        assignment_type: formData.assignment_type,
        google_drive_link: formData.google_drive_link.trim() || undefined,
      };

      const newAssignment = await createAssignment(assignmentData);
      
      if (newAssignment) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          due_date: '',
          due_time: '',
          assignment_type: 'homework',
          google_drive_link: ''
        });
        setErrors({});
        
        // Call success callback and close modal
        if (onSuccess) {
          onSuccess(newAssignment.assignment_id);
        }
        onClose();
      } else {
        setErrors({ general: 'Failed to create assignment. Please try again.' });
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        assignment_type: 'homework',
        google_drive_link: ''
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Create New Assignment</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 touch-manipulation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* General Error */}
          {errors.general && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <ExclamationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">{errors.general}</span>
            </div>
          )}

          {/* Assignment Title */}
          <div>
            <label htmlFor="assignment-title" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assignment Title *
            </label>
            <input
              id="assignment-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Chapter 5 Exercises, Midterm Exam, Final Project"
              className={`input-mobile text-xs sm:text-sm ${
                errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            />
            {errors.title && (
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Type *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {assignmentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.value}
                    className={`flex items-center p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors touch-manipulation ${
                      formData.assignment_type === type.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignment_type"
                      value={type.value}
                      checked={formData.assignment_type === type.value}
                      onChange={(e) => handleInputChange('assignment_type', e.target.value)}
                      className="sr-only"
                      disabled={loading}
                    />
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 ${type.color} dark:${type.color.replace('600', '400')} flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="assignment-description" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <DocumentTextIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              Description
            </label>
            <textarea
              id="assignment-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed instructions, requirements, and expectations for this assignment..."
              rows={3}
              className="input-mobile text-xs sm:text-sm resize-none"
              disabled={loading}
            />
          </div>

          {/* Due Date and Time */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              Due Date & Time
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <input
                  id="due-date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`input-mobile text-xs sm:text-sm ${
                    errors.due_date ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={loading}
                />
                {errors.due_date && (
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">{errors.due_date}</p>
                )}
              </div>

              <div>
                <input
                  id="due-time"
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => handleInputChange('due_time', e.target.value)}
                  className={`input-mobile text-xs sm:text-sm ${
                    errors.due_time ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={loading}
                />
                {errors.due_time && (
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">{errors.due_time}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty if no specific due date is required
            </p>
          </div>

          {/* Google Drive Link */}
          <div>
            <label htmlFor="google-drive-link" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              Google Drive Link
            </label>
            <input
              id="google-drive-link"
              type="url"
              value={formData.google_drive_link}
              onChange={(e) => handleInputChange('google_drive_link', e.target.value)}
              placeholder="https://drive.google.com/..."
              className={`input-mobile text-xs sm:text-sm ${
                errors.google_drive_link ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
            />
            {errors.google_drive_link && (
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-1">{errors.google_drive_link}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optional: Link to assignment materials or submission folder
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-mobile text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 text-xs sm:text-sm order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="btn-mobile text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm order-1 sm:order-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
              )}
              Create Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignment;