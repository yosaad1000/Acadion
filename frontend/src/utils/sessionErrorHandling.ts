/**
 * Enhanced error handling utilities specifically for session management
 */

import { ApiError, NetworkErrorState } from '../types';
import { withRetry, isRetryableError, createNetworkError } from './errorHandling';

/**
 * Session-specific error types
 */
export enum SessionErrorType {
  NETWORK = 'network',
  PERMISSION = 'permission',
  NOT_FOUND = 'notFound',
  SERVER = 'server',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * Session error codes for specific scenarios
 */
export enum SessionErrorCode {
  // Network errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',
  
  // Permission errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Not found errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SUBJECT_NOT_FOUND = 'SUBJECT_NOT_FOUND',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Validation errors
  INVALID_SESSION_DATA = 'INVALID_SESSION_DATA',
  INVALID_DATE_TIME = 'INVALID_DATE_TIME',
  DUPLICATE_SESSION = 'DUPLICATE_SESSION',
  
  // Unknown errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

/**
 * Creates a session-specific API error
 */
export const createSessionError = (
  message: string,
  type: SessionErrorType,
  code: SessionErrorCode,
  statusCode?: number,
  retryable: boolean = true,
  details?: string
): ApiError => {
  return {
    message,
    type,
    statusCode,
    retryable,
    details,
    field: code.includes('VALIDATION') ? extractFieldFromCode(code) : undefined
  };
};

/**
 * Extracts field name from error code for validation errors
 */
const extractFieldFromCode = (code: SessionErrorCode): string | undefined => {
  switch (code) {
    case SessionErrorCode.INVALID_DATE_TIME:
      return 'session_date';
    case SessionErrorCode.INVALID_SESSION_DATA:
      return 'general';
    default:
      return undefined;
  }
};

/**
 * Parses API response errors into structured session errors
 */
export const parseSessionApiError = (error: any, response?: Response): ApiError => {
  // Handle network errors (no response)
  if (!response) {
    if (!navigator.onLine) {
      return createSessionError(
        'You appear to be offline. Please check your internet connection and try again.',
        SessionErrorType.NETWORK,
        SessionErrorCode.OFFLINE,
        undefined,
        true
      );
    }
    
    return createSessionError(
      'Unable to connect to the server. Please check your internet connection and try again.',
      SessionErrorType.NETWORK,
      SessionErrorCode.CONNECTION_FAILED,
      undefined,
      true
    );
  }

  const statusCode = response.status;
  
  // Handle specific HTTP status codes
  switch (statusCode) {
    case 400:
      return createSessionError(
        'The session information provided is invalid. Please check your inputs and try again.',
        SessionErrorType.VALIDATION,
        SessionErrorCode.INVALID_SESSION_DATA,
        statusCode,
        false
      );
      
    case 401:
      return createSessionError(
        'Your session has expired. Please log in again.',
        SessionErrorType.PERMISSION,
        SessionErrorCode.UNAUTHORIZED,
        statusCode,
        false
      );
      
    case 403:
      return createSessionError(
        'You don\'t have permission to access this class. Please check that you\'re enrolled or contact your teacher.',
        SessionErrorType.PERMISSION,
        SessionErrorCode.ACCESS_DENIED,
        statusCode,
        false
      );
      
    case 404:
      return createSessionError(
        'The class or session you\'re looking for doesn\'t exist or has been removed.',
        SessionErrorType.NOT_FOUND,
        SessionErrorCode.SESSION_NOT_FOUND,
        statusCode,
        false
      );
      
    case 408:
      return createSessionError(
        'The request timed out. Please try again.',
        SessionErrorType.NETWORK,
        SessionErrorCode.TIMEOUT,
        statusCode,
        true
      );
      
    case 409:
      return createSessionError(
        'A session with this name already exists. Please choose a different name.',
        SessionErrorType.VALIDATION,
        SessionErrorCode.DUPLICATE_SESSION,
        statusCode,
        false
      );
      
    case 429:
      return createSessionError(
        'Too many requests. Please wait a moment and try again.',
        SessionErrorType.SERVER,
        SessionErrorCode.SERVICE_UNAVAILABLE,
        statusCode,
        true
      );
      
    case 500:
      return createSessionError(
        'An internal server error occurred. Please try again in a moment.',
        SessionErrorType.SERVER,
        SessionErrorCode.INTERNAL_SERVER_ERROR,
        statusCode,
        true
      );
      
    case 502:
    case 503:
    case 504:
      return createSessionError(
        'The server is temporarily unavailable. Please try again in a moment.',
        SessionErrorType.SERVER,
        SessionErrorCode.SERVICE_UNAVAILABLE,
        statusCode,
        true
      );
      
    default:
      return createSessionError(
        'An unexpected error occurred. Please try again.',
        SessionErrorType.UNKNOWN,
        SessionErrorCode.UNEXPECTED_ERROR,
        statusCode,
        true
      );
  }
};

/**
 * Converts an ApiError to a NetworkErrorState for UI components
 */
export const apiErrorToNetworkState = (
  error: ApiError,
  retryAction?: () => void,
  dismissAction?: () => void
): NetworkErrorState => {
  return {
    hasError: true,
    errorType: error.type,
    message: error.message,
    retryable: error.retryable,
    retryAction: error.retryable ? retryAction : undefined,
    dismissAction
  };
};

/**
 * Session-specific retry wrapper with intelligent backoff
 */
export const withSessionRetry = async <T>(
  operation: () => Promise<T>,
  context: string = 'session operation'
): Promise<T> => {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  });
};

/**
 * Handles session API calls with comprehensive error handling
 */
export const handleSessionApiCall = async <T>(
  apiCall: () => Promise<Response>,
  context: string = 'session operation'
): Promise<T> => {
  try {
    const response = await withSessionRetry(apiCall, context);
    
    if (response.ok) {
      return await response.json();
    } else {
      const apiError = parseSessionApiError(null, response);
      console.error(`Session API error in ${context}:`, apiError);
      throw apiError;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TypeError') {
      // Network error (fetch failed)
      const apiError = parseSessionApiError(error);
      console.error(`Network error in ${context}:`, apiError);
      throw apiError;
    }
    
    // Re-throw if it's already an ApiError
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    // Wrap unknown errors
    const unknownError = createSessionError(
      'An unexpected error occurred. Please try again.',
      SessionErrorType.UNKNOWN,
      SessionErrorCode.UNEXPECTED_ERROR,
      undefined,
      true,
      error instanceof Error ? error.message : String(error)
    );
    
    console.error(`Unknown error in ${context}:`, unknownError);
    throw unknownError;
  }
};

/**
 * Gets user-friendly error message for display
 */
export const getSessionErrorMessage = (error: any): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

/**
 * Determines if a session error is retryable
 */
export const isSessionErrorRetryable = (error: any): boolean => {
  if (error && typeof error === 'object' && 'retryable' in error) {
    return error.retryable;
  }
  return isRetryableError(error);
};

/**
 * Gets appropriate retry delay based on error type
 */
export const getSessionRetryDelay = (error: ApiError, attempt: number): number => {
  const baseDelay = 1000; // 1 second
  
  switch (error.type) {
    case SessionErrorType.NETWORK:
      return baseDelay * Math.pow(2, attempt); // Exponential backoff for network errors
    case SessionErrorType.SERVER:
      return baseDelay * (attempt + 1); // Linear backoff for server errors
    default:
      return baseDelay;
  }
};

/**
 * Creates a fallback error state for UI components
 */
export const createFallbackErrorState = (
  message: string = 'Something went wrong',
  retryAction?: () => void
): NetworkErrorState => {
  return {
    hasError: true,
    errorType: 'unknown',
    message,
    retryable: !!retryAction,
    retryAction,
    dismissAction: () => {} // Default no-op dismiss
  };
};

/**
 * Logs session errors with context for debugging
 */
export const logSessionError = (
  error: ApiError,
  context: string,
  additionalData?: Record<string, any>
): void => {
  const logData = {
    context,
    error: {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable
    },
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalData
  };
  
  console.error('Session Error:', logData);
  
  // In production, you might want to send this to an error tracking service
  // Example: errorTrackingService.captureError(logData);
};