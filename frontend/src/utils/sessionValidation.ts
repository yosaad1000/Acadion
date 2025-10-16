/**
 * Session validation utilities for comprehensive input validation
 */

import { SessionCreate, SessionUpdate } from '../types';
import { getLocalDateComponents, validateDateTime } from './dateTimeUtils';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SessionValidationRules {
  name?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
  description?: {
    maxLength?: number;
  };
  session_date?: {
    required?: boolean;
    allowPastDates?: boolean;
    maxFutureDays?: number;
    gracePeriodMinutes?: number; // Grace period for current time sessions
  };
}

// Default validation rules for session creation
export const DEFAULT_SESSION_VALIDATION_RULES: SessionValidationRules = {
  name: {
    required: false, // Auto-generated if not provided
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/ // Alphanumeric, spaces, and basic punctuation
  },
  description: {
    maxLength: 500
  },
  session_date: {
    required: false, // Defaults to current date/time
    allowPastDates: false,
    maxFutureDays: 365, // 1 year in the future
    gracePeriodMinutes: 5 // Allow 5 minutes grace period for current time
  }
};

/**
 * Validates session name
 */
export const validateSessionName = (
  name: string | undefined, 
  rules: SessionValidationRules['name'] = DEFAULT_SESSION_VALIDATION_RULES.name
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!name || name.trim() === '') {
    if (rules?.required) {
      errors.push({
        field: 'name',
        message: 'Session name is required',
        code: 'REQUIRED'
      });
    }
    return errors;
  }

  const trimmedName = name.trim();

  // Check minimum length
  if (rules?.minLength && trimmedName.length < rules.minLength) {
    errors.push({
      field: 'name',
      message: `Session name must be at least ${rules.minLength} character${rules.minLength > 1 ? 's' : ''}`,
      code: 'MIN_LENGTH'
    });
  }

  // Check maximum length
  if (rules?.maxLength && trimmedName.length > rules.maxLength) {
    errors.push({
      field: 'name',
      message: `Session name cannot exceed ${rules.maxLength} characters`,
      code: 'MAX_LENGTH'
    });
  }

  // Check pattern
  if (rules?.pattern && !rules.pattern.test(trimmedName)) {
    errors.push({
      field: 'name',
      message: 'Session name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed',
      code: 'INVALID_PATTERN'
    });
  }

  return errors;
};

/**
 * Validates session description
 */
export const validateSessionDescription = (
  description: string | undefined,
  rules: SessionValidationRules['description'] = DEFAULT_SESSION_VALIDATION_RULES.description
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!description || description.trim() === '') {
    return errors; // Description is always optional
  }

  const trimmedDescription = description.trim();

  // Check maximum length
  if (rules?.maxLength && trimmedDescription.length > rules.maxLength) {
    errors.push({
      field: 'description',
      message: `Description cannot exceed ${rules.maxLength} characters`,
      code: 'MAX_LENGTH'
    });
  }

  return errors;
};

/**
 * Validates session date
 */
export const validateSessionDate = (
  sessionDate: string | undefined,
  rules: SessionValidationRules['session_date'] = DEFAULT_SESSION_VALIDATION_RULES.session_date
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!sessionDate || sessionDate.trim() === '') {
    if (rules?.required) {
      errors.push({
        field: 'session_date',
        message: 'Session date is required',
        code: 'REQUIRED'
      });
    }
    return errors;
  }

  // Parse the date
  const date = new Date(sessionDate);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    errors.push({
      field: 'session_date',
      message: 'Please enter a valid date',
      code: 'INVALID_DATE'
    });
    return errors;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Check if date is in the past
  if (!rules?.allowPastDates && sessionDay < today) {
    errors.push({
      field: 'session_date',
      message: 'Session date cannot be in the past',
      code: 'PAST_DATE'
    });
  }

  // Check if date is too far in the future
  if (rules?.maxFutureDays) {
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(maxFutureDate.getDate() + rules.maxFutureDays);
    
    if (sessionDay > maxFutureDate) {
      errors.push({
        field: 'session_date',
        message: `Session date cannot be more than ${rules.maxFutureDays} days in the future`,
        code: 'TOO_FAR_FUTURE'
      });
    }
  }

  return errors;
};

/**
 * Validates session time in combination with date
 */
export const validateSessionDateTime = (
  sessionDate: string | undefined,
  sessionTime: string | undefined,
  gracePeriodMinutes: number = 5
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!sessionDate || !sessionTime) {
    return errors; // Individual validation handles required checks
  }

  // Use the centralized validation utility
  const validation = validateDateTime(sessionDate, sessionTime, gracePeriodMinutes);
  
  if (!validation.isValid && validation.error) {
    errors.push({
      field: 'session_time',
      message: validation.error,
      code: 'INVALID_DATETIME'
    });
  }

  return errors;
};

/**
 * Validates complete session creation data
 */
export const validateSessionCreate = (
  sessionData: SessionCreate,
  rules: SessionValidationRules = DEFAULT_SESSION_VALIDATION_RULES
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate name
  errors.push(...validateSessionName(sessionData.name, rules.name));

  // Validate description
  errors.push(...validateSessionDescription(sessionData.description, rules.description));

  // Validate session date
  if (sessionData.session_date) {
    // Use utility function to extract date components without timezone issues
    const dateComponents = getLocalDateComponents(sessionData.session_date);
    if (dateComponents) {
      const year = dateComponents.year;
      const month = (dateComponents.month + 1).toString().padStart(2, '0');
      const day = dateComponents.day.toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const hours = dateComponents.hours.toString().padStart(2, '0');
      const minutes = dateComponents.minutes.toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      errors.push(...validateSessionDate(dateString, rules.session_date));
      errors.push(...validateSessionDateTime(dateString, timeString, rules.session_date?.gracePeriodMinutes));
    } else {
      errors.push({
        field: 'session_date',
        message: 'Please enter a valid date and time',
        code: 'INVALID_DATETIME'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates session update data
 */
export const validateSessionUpdate = (
  sessionData: SessionUpdate,
  rules: SessionValidationRules = DEFAULT_SESSION_VALIDATION_RULES
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate name if provided
  if (sessionData.name !== undefined) {
    errors.push(...validateSessionName(sessionData.name, { ...rules.name, required: true }));
  }

  // Validate description if provided
  if (sessionData.description !== undefined) {
    errors.push(...validateSessionDescription(sessionData.description, rules.description));
  }

  // Validate session date if provided
  if (sessionData.session_date !== undefined) {
    // Use utility function to extract date components without timezone issues
    const dateComponents = getLocalDateComponents(sessionData.session_date);
    if (dateComponents) {
      const year = dateComponents.year;
      const month = (dateComponents.month + 1).toString().padStart(2, '0');
      const day = dateComponents.day.toString().padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const hours = dateComponents.hours.toString().padStart(2, '0');
      const minutes = dateComponents.minutes.toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      errors.push(...validateSessionDate(dateString, rules.session_date));
      errors.push(...validateSessionDateTime(dateString, timeString, rules.session_date?.gracePeriodMinutes));
    } else {
      errors.push({
        field: 'session_date',
        message: 'Please enter a valid date and time',
        code: 'INVALID_DATETIME'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates session notes
 */
export const validateSessionNotes = (notes: string | undefined): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!notes) {
    return errors; // Notes are optional
  }

  const trimmedNotes = notes.trim();
  
  // Check maximum length (generous limit for notes)
  const maxLength = 2000;
  if (trimmedNotes.length > maxLength) {
    errors.push({
      field: 'notes',
      message: `Notes cannot exceed ${maxLength} characters`,
      code: 'MAX_LENGTH'
    });
  }

  return errors;
};

/**
 * Helper function to get user-friendly error messages
 */
export const getValidationErrorMessage = (error: ValidationError): string => {
  return error.message;
};

/**
 * Helper function to get all error messages for a specific field
 */
export const getFieldErrors = (errors: ValidationError[], field: string): string[] => {
  return errors
    .filter(error => error.field === field)
    .map(error => error.message);
};

/**
 * Helper function to check if a specific field has errors
 */
export const hasFieldError = (errors: ValidationError[], field: string): boolean => {
  return errors.some(error => error.field === field);
};

/**
 * Real-time validation for form inputs
 */
export const validateFieldRealTime = (
  field: string,
  value: string | undefined,
  rules: SessionValidationRules = DEFAULT_SESSION_VALIDATION_RULES
): ValidationError[] => {
  switch (field) {
    case 'name':
      return validateSessionName(value, rules.name);
    case 'description':
      return validateSessionDescription(value, rules.description);
    case 'session_date':
      return validateSessionDate(value, rules.session_date);
    case 'notes':
      return validateSessionNotes(value);
    default:
      return [];
  }
};