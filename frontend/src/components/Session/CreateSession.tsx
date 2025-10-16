import React, { useState, useEffect } from 'react';
import { SessionCreate, SessionFormData, ApiError } from '../../types';
import { useSessions } from '../../hooks/useSessions';
import { useToast } from '../../contexts/ToastContext';
import { useSessionFormValidation } from '../../hooks/useSessionFormValidation';
import { getCurrentLocalDate, getCurrentLocalTime, createLocalDateTime } from '../../utils/dateTimeUtils';
import { 
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { SessionCreateErrorMessage } from '../ui/ErrorMessage';
import SessionManagementErrorBoundary from '../ui/SessionManagementErrorBoundary';
import { parseSessionApiError, getSessionErrorMessage } from '../../utils/sessionErrorHandling';

interface CreateSessionProps {
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
}

interface FormErrors {
  general?: string;
  errorType?: 'network' | 'permission' | 'validation' | 'server' | 'unknown';
}

const CreateSession: React.FC<CreateSessionProps> = ({ 
  subjectId, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { createSession, loading, sessions } = useSessions(subjectId);
  const { showSuccess, showError } = useToast();
  
  // Initialize form validation
  const {
    validationState,
    validateField,
    clearFieldError,
    markFieldTouched,
    validateCreateForm,
    getFieldError,
    hasError,
    isFieldTouched,
    resetValidation
  } = useSessionFormValidation({
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  });
  
  // Use utility functions for consistent date/time handling
  const currentDate = getCurrentLocalDate();
  const currentTime = getCurrentLocalTime();
  
  // Generate auto session name based on existing sessions
  const generateSessionName = () => {
    const sessionCount = sessions?.length || 0;
    return `Session ${sessionCount + 1}`;
  };

  const [formData, setFormData] = useState<SessionFormData>({
    name: generateSessionName(),
    description: '',
    session_date: currentDate,
    session_time: currentTime,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Update session name when sessions change or modal opens
  useEffect(() => {
    if (isOpen) {
      const newName = generateSessionName();
      setFormData(prev => ({ ...prev, name: newName }));
      resetValidation();
    }
  }, [isOpen, sessions, resetValidation]);

  const handleInputChange = (field: keyof SessionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear general error when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
    
    // Validate field in real-time
    validateField(field, value);
  };

  const handleInputBlur = (field: keyof SessionFormData) => {
    markFieldTouched(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the entire form
    const isFormValid = validateCreateForm(formData);
    
    if (!isFormValid) {
      // Mark all fields as touched to show validation errors
      Object.keys(formData).forEach(field => {
        markFieldTouched(field as keyof SessionFormData);
      });
      return;
    }

    try {
      // Combine date and time using utility function
      let sessionDateTime: string | undefined;
      if (formData.session_date) {
        if (formData.session_time) {
          sessionDateTime = createLocalDateTime(formData.session_date, formData.session_time);
        } else {
          // Default to 9 AM if no time specified
          sessionDateTime = createLocalDateTime(formData.session_date, '09:00');
        }
      }

      const sessionData: SessionCreate = {
        name: formData.name.trim() || undefined, // Optional - will be auto-generated if empty
        description: formData.description.trim() || undefined,
        session_date: sessionDateTime,
      };

      const newSession = await createSession(sessionData);
      
      if (newSession) {
        // Show success toast
        showSuccess(
          `Session "${newSession.name}" created successfully!`,
          { 
            title: 'Session Created',
            duration: 4000 
          }
        );
        
        // Reset form with current date/time defaults
        setFormData({
          name: generateSessionName(),
          description: '',
          session_date: getCurrentLocalDate(),
          session_time: getCurrentLocalTime(),
        });
        setErrors({});
        setShowAdvanced(false);
        resetValidation();
        
        // Call success callback and close modal
        if (onSuccess) {
          onSuccess(newSession.session_id);
        }
        onClose();
      } else {
        setErrors({ 
          general: 'Failed to create session. Please try again.',
          errorType: 'server'
        });
        showError('Failed to create session. Please try again.');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      
      // Parse the error using our enhanced error handling
      const apiError: ApiError = parseSessionApiError(error);
      
      setErrors({ 
        general: apiError.message,
        errorType: apiError.type
      });
      
      // Show error toast for user feedback
      showError(getSessionErrorMessage(apiError));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: generateSessionName(),
        description: '',
        session_date: getCurrentLocalDate(),
        session_time: getCurrentLocalTime(),
      });
      setErrors({});
      setShowAdvanced(false);
      resetValidation();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <SessionManagementErrorBoundary
      context="session-creation"
      onRetry={() => window.location.reload()}
      onGoBack={onClose}
    >
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Session</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">Set up a new session with smart defaults</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50 touch-manipulation"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* General Error */}
          {errors.general && (
            <SessionCreateErrorMessage
              errorType={errors.errorType}
              onRetry={() => {
                setErrors({});
                handleSubmit(new Event('submit') as any);
              }}
              onDismiss={() => setErrors({})}
            />
          )}

          {/* Session Name - Essential Field */}
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Name
            </label>
            <input
              id="session-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleInputBlur('name')}
              placeholder="Session name"
              className={`input-mobile ${
                hasError('name') && isFieldTouched('name') 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={loading}
              aria-invalid={hasError('name') && isFieldTouched('name')}
              aria-describedby={hasError('name') && isFieldTouched('name') ? 'session-name-error' : 'session-name-help'}
            />
            {hasError('name') && isFieldTouched('name') ? (
              <p id="session-name-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                {getFieldError('name')}
              </p>
            ) : (
              <p id="session-name-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Auto-generated based on session count, but you can edit it
              </p>
            )}
          </div>

          {/* Date and Time - Essential Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Date
              </label>
              <input
                id="session-date"
                type="date"
                value={formData.session_date}
                onChange={(e) => handleInputChange('session_date', e.target.value)}
                onBlur={() => handleInputBlur('session_date')}
                min={getCurrentLocalDate()}
                className={`input-mobile ${
                  hasError('session_date') && isFieldTouched('session_date') 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={loading}
                aria-invalid={hasError('session_date') && isFieldTouched('session_date')}
                aria-describedby={hasError('session_date') && isFieldTouched('session_date') ? 'session-date-error' : undefined}
              />
              {hasError('session_date') && isFieldTouched('session_date') && (
                <p id="session-date-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getFieldError('session_date')}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="session-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Time
              </label>
              <input
                id="session-time"
                type="time"
                value={formData.session_time}
                onChange={(e) => handleInputChange('session_time', e.target.value)}
                onBlur={() => handleInputBlur('session_time')}
                className={`input-mobile ${
                  hasError('session_time') && isFieldTouched('session_time') 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={loading}
                aria-invalid={hasError('session_time') && isFieldTouched('session_time')}
                aria-describedby={hasError('session_time') && isFieldTouched('session_time') ? 'session-time-error' : undefined}
              />
              {hasError('session_time') && isFieldTouched('session_time') && (
                <p id="session-time-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getFieldError('session_time')}
                </p>
              )}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-2 -m-2 touch-manipulation"
              disabled={loading}
            >
              <span>Advanced Options</span>
              {showAdvanced ? (
                <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
            
            {/* Advanced Section - Description */}
            {showAdvanced && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label htmlFor="session-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="session-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    onBlur={() => handleInputBlur('description')}
                    placeholder="Brief description of what will be covered in this session..."
                    rows={3}
                    className={`input-mobile resize-none ${
                      hasError('description') && isFieldTouched('description') 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={loading}
                    aria-invalid={hasError('description') && isFieldTouched('description')}
                    aria-describedby={hasError('description') && isFieldTouched('description') ? 'session-description-error' : 'session-description-help'}
                  />
                  {hasError('description') && isFieldTouched('description') ? (
                    <p id="session-description-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {getFieldError('description')}
                    </p>
                  ) : (
                    <p id="session-description-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Optional - you can add this later if needed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>



          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 sm:border-t-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-mobile px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || validationState.isValidating}
              className="btn-mobile px-4 py-3 sm:py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center order-1 sm:order-2"
            >
              {(loading || validationState.isValidating) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {validationState.isValidating ? 'Validating...' : loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </SessionManagementErrorBoundary>
  );
};

export default CreateSession;