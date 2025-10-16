/**
 * General form validation utilities for comprehensive input validation
 */

export interface FormValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormValidationRules {
  [fieldName: string]: FormValidationRule;
}

export interface FormValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
  fieldErrors: Record<string, string[]>;
}

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  sessionName: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

/**
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
  required: (fieldName: string) => `${fieldName} is required`,
  minLength: (fieldName: string, min: number) => 
    `${fieldName} must be at least ${min} character${min > 1 ? 's' : ''}`,
  maxLength: (fieldName: string, max: number) => 
    `${fieldName} cannot exceed ${max} characters`,
  pattern: (fieldName: string) => `${fieldName} contains invalid characters`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  strongPassword: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character'
};

/**
 * Validates a single field value against a rule
 */
export const validateField = (
  fieldName: string,
  value: any,
  rule: FormValidationRule
): FormValidationError[] => {
  const errors: FormValidationError[] = [];
  const stringValue = String(value || '').trim();

  // Required validation
  if (rule.required && (!value || stringValue === '')) {
    errors.push({
      field: fieldName,
      message: VALIDATION_MESSAGES.required(fieldName),
      code: 'REQUIRED'
    });
    return errors; // Don't validate further if required and empty
  }

  // Skip other validations if field is empty and not required
  if (!stringValue && !rule.required) {
    return errors;
  }

  // Minimum length validation
  if (rule.minLength && stringValue.length < rule.minLength) {
    errors.push({
      field: fieldName,
      message: VALIDATION_MESSAGES.minLength(fieldName, rule.minLength),
      code: 'MIN_LENGTH'
    });
  }

  // Maximum length validation
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    errors.push({
      field: fieldName,
      message: VALIDATION_MESSAGES.maxLength(fieldName, rule.maxLength),
      code: 'MAX_LENGTH'
    });
  }

  // Pattern validation
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    errors.push({
      field: fieldName,
      message: VALIDATION_MESSAGES.pattern(fieldName),
      code: 'PATTERN'
    });
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      errors.push({
        field: fieldName,
        message: customError,
        code: 'CUSTOM'
      });
    }
  }

  return errors;
};

/**
 * Validates an entire form object against validation rules
 */
export const validateForm = (
  formData: Record<string, any>,
  rules: FormValidationRules
): FormValidationResult => {
  const allErrors: FormValidationError[] = [];
  const fieldErrors: Record<string, string[]> = {};

  // Validate each field that has a rule
  Object.entries(rules).forEach(([fieldName, rule]) => {
    const fieldValue = formData[fieldName];
    const errors = validateField(fieldName, fieldValue, rule);
    
    if (errors.length > 0) {
      allErrors.push(...errors);
      fieldErrors[fieldName] = errors.map(error => error.message);
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    fieldErrors
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): FormValidationError[] => {
  return validateField('Email', email, {
    required: true,
    pattern: VALIDATION_PATTERNS.email
  });
};

/**
 * Password validation
 */
export const validatePassword = (password: string, requireStrong: boolean = false): FormValidationError[] => {
  const rule: FormValidationRule = {
    required: true,
    minLength: requireStrong ? 8 : 6
  };

  if (requireStrong) {
    rule.pattern = VALIDATION_PATTERNS.strongPassword;
  }

  return validateField('Password', password, rule);
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): FormValidationError[] => {
  const errors = validateField('Confirm Password', confirmPassword, { required: true });
  
  if (confirmPassword && password !== confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
      code: 'PASSWORD_MISMATCH'
    });
  }

  return errors;
};

/**
 * Date validation
 */
export const validateDate = (
  date: string,
  options: {
    required?: boolean;
    allowPast?: boolean;
    allowFuture?: boolean;
    maxFutureDays?: number;
    maxPastDays?: number;
  } = {}
): FormValidationError[] => {
  const {
    required = false,
    allowPast = true,
    allowFuture = true,
    maxFutureDays,
    maxPastDays
  } = options;

  const errors: FormValidationError[] = [];

  if (required && !date) {
    errors.push({
      field: 'date',
      message: 'Date is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  if (!date) return errors;

  const selectedDate = new Date(date);
  
  if (isNaN(selectedDate.getTime())) {
    errors.push({
      field: 'date',
      message: 'Please enter a valid date',
      code: 'INVALID_DATE'
    });
    return errors;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDay = new Date(selectedDate);
  selectedDay.setHours(0, 0, 0, 0);

  // Past date validation
  if (!allowPast && selectedDay < today) {
    errors.push({
      field: 'date',
      message: 'Date cannot be in the past',
      code: 'PAST_DATE'
    });
  }

  // Future date validation
  if (!allowFuture && selectedDay > today) {
    errors.push({
      field: 'date',
      message: 'Date cannot be in the future',
      code: 'FUTURE_DATE'
    });
  }

  // Max future days validation
  if (maxFutureDays && selectedDay > today) {
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxFutureDays);
    
    if (selectedDay > maxDate) {
      errors.push({
        field: 'date',
        message: `Date cannot be more than ${maxFutureDays} days in the future`,
        code: 'TOO_FAR_FUTURE'
      });
    }
  }

  // Max past days validation
  if (maxPastDays && selectedDay < today) {
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - maxPastDays);
    
    if (selectedDay < minDate) {
      errors.push({
        field: 'date',
        message: `Date cannot be more than ${maxPastDays} days in the past`,
        code: 'TOO_FAR_PAST'
      });
    }
  }

  return errors;
};

/**
 * Time validation
 */
export const validateTime = (time: string, required: boolean = false): FormValidationError[] => {
  const errors: FormValidationError[] = [];

  if (required && !time) {
    errors.push({
      field: 'time',
      message: 'Time is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  if (!time) return errors;

  // Basic time format validation (HH:MM)
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timePattern.test(time)) {
    errors.push({
      field: 'time',
      message: 'Please enter a valid time (HH:MM)',
      code: 'INVALID_TIME'
    });
  }

  return errors;
};

/**
 * URL validation
 */
export const validateUrl = (url: string, required: boolean = false): FormValidationError[] => {
  return validateField('URL', url, {
    required,
    pattern: VALIDATION_PATTERNS.url
  });
};

/**
 * Phone number validation
 */
export const validatePhone = (phone: string, required: boolean = false): FormValidationError[] => {
  return validateField('Phone', phone, {
    required,
    pattern: VALIDATION_PATTERNS.phone
  });
};

/**
 * Numeric validation
 */
export const validateNumber = (
  value: string | number,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): FormValidationError[] => {
  const { required = false, min, max, integer = false } = options;
  const errors: FormValidationError[] = [];

  const stringValue = String(value || '').trim();

  if (required && !stringValue) {
    errors.push({
      field: 'number',
      message: 'This field is required',
      code: 'REQUIRED'
    });
    return errors;
  }

  if (!stringValue) return errors;

  const numValue = Number(stringValue);

  if (isNaN(numValue)) {
    errors.push({
      field: 'number',
      message: 'Please enter a valid number',
      code: 'INVALID_NUMBER'
    });
    return errors;
  }

  if (integer && !Number.isInteger(numValue)) {
    errors.push({
      field: 'number',
      message: 'Please enter a whole number',
      code: 'NOT_INTEGER'
    });
  }

  if (min !== undefined && numValue < min) {
    errors.push({
      field: 'number',
      message: `Value must be at least ${min}`,
      code: 'MIN_VALUE'
    });
  }

  if (max !== undefined && numValue > max) {
    errors.push({
      field: 'number',
      message: `Value cannot exceed ${max}`,
      code: 'MAX_VALUE'
    });
  }

  return errors;
};

/**
 * Helper function to get the first error message for a field
 */
export const getFirstFieldError = (
  fieldErrors: Record<string, string[]>,
  fieldName: string
): string | undefined => {
  const errors = fieldErrors[fieldName];
  return errors && errors.length > 0 ? errors[0] : undefined;
};

/**
 * Helper function to check if a field has errors
 */
export const hasFieldErrors = (
  fieldErrors: Record<string, string[]>,
  fieldName: string
): boolean => {
  const errors = fieldErrors[fieldName];
  return !!(errors && errors.length > 0);
};

/**
 * Helper function to get all error messages as a flat array
 */
export const getAllErrorMessages = (fieldErrors: Record<string, string[]>): string[] => {
  return Object.values(fieldErrors).flat();
};