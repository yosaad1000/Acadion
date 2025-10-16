/**
 * Custom hook for comprehensive session form validation
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  SessionFormData, 
  SessionFormErrors, 
  FormValidationState,
  ValidationError 
} from '../types';
import { 
  validateFieldRealTime,
  validateSessionCreate,
  validateSessionUpdate,
  validateSessionDateTime,
  getFieldErrors,
  hasFieldError,
  SessionValidationRules,
  DEFAULT_SESSION_VALIDATION_RULES
} from '../utils/sessionValidation';

interface UseSessionFormValidationOptions {
  validationRules?: SessionValidationRules;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

interface UseSessionFormValidationReturn {
  // Validation state
  validationState: FormValidationState;
  
  // Field-specific validation
  validateField: (field: keyof SessionFormData, value: string) => void;
  clearFieldError: (field: keyof SessionFormData) => void;
  markFieldTouched: (field: keyof SessionFormData) => void;
  
  // Form-level validation
  validateForm: (formData: Partial<SessionFormData>) => boolean;
  validateCreateForm: (formData: Partial<SessionFormData>) => boolean;
  validateUpdateForm: (formData: Partial<SessionFormData>) => boolean;
  
  // Error helpers
  getFieldError: (field: keyof SessionFormData) => string | undefined;
  hasError: (field: keyof SessionFormData) => boolean;
  isFieldTouched: (field: keyof SessionFormData) => boolean;
  
  // Reset and clear
  clearAllErrors: () => void;
  resetValidation: () => void;
}

export const useSessionFormValidation = (
  options: UseSessionFormValidationOptions = {}
): UseSessionFormValidationReturn => {
  const {
    validationRules = DEFAULT_SESSION_VALIDATION_RULES,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: true,
    isValidating: false,
    errors: {},
    touched: {}
  });

  // Debounce timer for validation
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  /**
   * Validates a single field
   */
  const validateField = useCallback((field: keyof SessionFormData, value: string) => {
    if (!validateOnChange) return;

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set validating state
    setValidationState(prev => ({
      ...prev,
      isValidating: true
    }));

    // Debounce validation
    const timer = setTimeout(() => {
      const fieldErrors = validateFieldRealTime(field, value, validationRules);
      const errorMessages = fieldErrors.map(error => error.message);

      setValidationState(prev => {
        const newErrors = { ...prev.errors };
        
        if (errorMessages.length > 0) {
          newErrors[field] = errorMessages;
        } else {
          delete newErrors[field];
        }

        const isValid = Object.keys(newErrors).length === 0;

        return {
          ...prev,
          isValid,
          isValidating: false,
          errors: newErrors
        };
      });
    }, debounceMs);

    setDebounceTimer(timer);
  }, [validateOnChange, debounceMs, validationRules, debounceTimer]);

  /**
   * Clears error for a specific field
   */
  const clearFieldError = useCallback((field: keyof SessionFormData) => {
    setValidationState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  /**
   * Marks a field as touched
   */
  const markFieldTouched = useCallback((field: keyof SessionFormData) => {
    setValidationState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: true
      }
    }));
  }, []);

  /**
   * Validates the entire form for general use
   */
  const validateForm = useCallback((formData: Partial<SessionFormData>): boolean => {
    const errors: Record<string, string[]> = {};

    // Validate each field that has a value
    Object.entries(formData).forEach(([field, value]) => {
      if (value !== undefined && value !== '') {
        const fieldErrors = validateFieldRealTime(field, value, validationRules);
        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors.map(error => error.message);
        }
      }
    });

    // Validate date/time combination if both are provided
    if (formData.session_date && formData.session_time) {
      const dateTimeErrors = validateSessionDateTime(
        formData.session_date, 
        formData.session_time, 
        validationRules.session_date?.gracePeriodMinutes
      );
      
      if (dateTimeErrors.length > 0) {
        errors.session_time = dateTimeErrors.map(error => error.message);
      }
    }

    const isValid = Object.keys(errors).length === 0;

    setValidationState(prev => ({
      ...prev,
      isValid,
      errors,
      isValidating: false
    }));

    return isValid;
  }, [validationRules]);

  /**
   * Validates form data for session creation
   */
  const validateCreateForm = useCallback((formData: Partial<SessionFormData>): boolean => {
    // Convert form data to SessionCreate format
    const sessionData = {
      name: formData.name?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      session_date: formData.session_date && formData.session_time 
        ? `${formData.session_date}T${formData.session_time}:00`
        : undefined
    };

    const result = validateSessionCreate(sessionData, validationRules);
    
    // Convert validation errors to form errors
    const formErrors: Record<string, string[]> = {};
    result.errors.forEach(error => {
      if (!formErrors[error.field]) {
        formErrors[error.field] = [];
      }
      formErrors[error.field].push(error.message);
    });

    setValidationState(prev => ({
      ...prev,
      isValid: result.isValid,
      errors: formErrors,
      isValidating: false
    }));

    return result.isValid;
  }, [validationRules]);

  /**
   * Validates form data for session update
   */
  const validateUpdateForm = useCallback((formData: Partial<SessionFormData>): boolean => {
    // Convert form data to SessionUpdate format
    const sessionData = {
      ...(formData.name !== undefined && { name: formData.name.trim() || undefined }),
      ...(formData.description !== undefined && { description: formData.description.trim() || undefined }),
      ...(formData.session_date && formData.session_time && {
        session_date: `${formData.session_date}T${formData.session_time}:00`
      })
    };

    const result = validateSessionUpdate(sessionData, validationRules);
    
    // Convert validation errors to form errors
    const formErrors: Record<string, string[]> = {};
    result.errors.forEach(error => {
      if (!formErrors[error.field]) {
        formErrors[error.field] = [];
      }
      formErrors[error.field].push(error.message);
    });

    setValidationState(prev => ({
      ...prev,
      isValid: result.isValid,
      errors: formErrors,
      isValidating: false
    }));

    return result.isValid;
  }, [validationRules]);

  /**
   * Gets the first error message for a field
   */
  const getFieldError = useCallback((field: keyof SessionFormData): string | undefined => {
    const fieldErrors = validationState.errors[field];
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
  }, [validationState.errors]);

  /**
   * Checks if a field has any errors
   */
  const hasError = useCallback((field: keyof SessionFormData): boolean => {
    return !!(validationState.errors[field] && validationState.errors[field].length > 0);
  }, [validationState.errors]);

  /**
   * Checks if a field has been touched
   */
  const isFieldTouched = useCallback((field: keyof SessionFormData): boolean => {
    return !!validationState.touched[field];
  }, [validationState.touched]);

  /**
   * Clears all validation errors
   */
  const clearAllErrors = useCallback(() => {
    setValidationState(prev => ({
      ...prev,
      isValid: true,
      errors: {}
    }));
  }, []);

  /**
   * Resets the entire validation state
   */
  const resetValidation = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }

    setValidationState({
      isValid: true,
      isValidating: false,
      errors: {},
      touched: {}
    });
  }, [debounceTimer]);

  return {
    validationState,
    validateField,
    clearFieldError,
    markFieldTouched,
    validateForm,
    validateCreateForm,
    validateUpdateForm,
    getFieldError,
    hasError,
    isFieldTouched,
    clearAllErrors,
    resetValidation
  };
};