# Comprehensive Validation and Error Handling System

This document describes the comprehensive validation and error handling system implemented for the session management features.

## Overview

The system provides:
- **Input validation** for session names, dates, descriptions, and notes
- **Client-side validation** with helpful error messages
- **Fallback UI** for network errors and other failure scenarios
- **Proper TypeScript types** for all interfaces
- **Real-time validation** with debouncing
- **Comprehensive error handling** with retry mechanisms

## Components

### 1. Session Validation (`sessionValidation.ts`)

Provides comprehensive validation for session-related data:

```typescript
import { validateSessionCreate, validateSessionNotes } from '../utils/sessionValidation';

// Validate session creation data
const result = validateSessionCreate({
  name: 'Session 1',
  description: 'Test session',
  session_date: '2024-12-01T10:00:00'
});

if (!result.isValid) {
  console.log('Validation errors:', result.errors);
}

// Validate session notes
const notesErrors = validateSessionNotes('My session notes');
if (notesErrors.length > 0) {
  console.log('Notes validation failed:', notesErrors);
}
```

#### Validation Rules

- **Session Name**: 1-100 characters, alphanumeric + basic punctuation
- **Description**: Optional, max 500 characters
- **Session Date**: Cannot be in the past, max 365 days in future
- **Notes**: Optional, max 2000 characters

### 2. Session Error Handling (`sessionErrorHandling.ts`)

Provides structured error handling for session operations:

```typescript
import { handleSessionApiCall, parseSessionApiError } from '../utils/sessionErrorHandling';

// Handle API calls with comprehensive error handling
try {
  const result = await handleSessionApiCall(
    () => fetch('/api/sessions'),
    'session creation'
  );
} catch (error) {
  const apiError = parseSessionApiError(error);
  console.log('Structured error:', apiError);
}
```

#### Error Types

- **Network**: Connection issues, timeouts, offline
- **Permission**: Access denied, unauthorized
- **Not Found**: Session/subject not found
- **Server**: Internal server errors, service unavailable
- **Validation**: Invalid input data
- **Unknown**: Unexpected errors

### 3. Form Validation Hook (`useSessionFormValidation.ts`)

React hook for comprehensive form validation:

```typescript
import { useSessionFormValidation } from '../hooks/useSessionFormValidation';

const MyComponent = () => {
  const {
    validationState,
    validateField,
    validateCreateForm,
    getFieldError,
    hasError,
    resetValidation
  } = useSessionFormValidation({
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = () => {
    const isValid = validateCreateForm(formData);
    if (!isValid) {
      // Show validation errors
      return;
    }
    // Proceed with submission
  };
};
```

### 4. Network Fallback UI (`NetworkFallbackUI.tsx`)

Comprehensive fallback UI for error states:

```typescript
import { NetworkFallbackUI, SessionLoadErrorFallback } from '../components/ui/NetworkFallbackUI';

// Generic network error fallback
<NetworkFallbackUI
  errorState={{
    hasError: true,
    errorType: 'network',
    message: 'Unable to connect to server',
    retryable: true,
    retryAction: () => retry()
  }}
  showRetryButton={true}
  showGoBackButton={true}
/>

// Predefined session error fallback
<SessionLoadErrorFallback
  onRetry={() => refetch()}
  onGoBack={() => navigate(-1)}
/>
```

### 5. General Form Validation (`formValidation.ts`)

Reusable validation utilities for any form:

```typescript
import { validateForm, validateEmail, validateDate } from '../utils/formValidation';

// Validate entire form
const result = validateForm(formData, {
  email: { required: true, pattern: VALIDATION_PATTERNS.email },
  name: { required: true, minLength: 2, maxLength: 50 },
  date: { required: true, custom: (value) => validateDate(value, { allowPast: false }) }
});

// Individual field validation
const emailErrors = validateEmail('user@example.com');
const dateErrors = validateDate('2024-12-01', { allowPast: false });
```

## Usage Examples

### 1. Session Creation Form with Validation

```typescript
import React, { useState } from 'react';
import { useSessionFormValidation } from '../hooks/useSessionFormValidation';
import { SessionFormData } from '../types';

const CreateSessionForm = () => {
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    description: '',
    session_date: '',
    session_time: ''
  });

  const {
    validationState,
    validateField,
    validateCreateForm,
    getFieldError,
    hasError,
    isFieldTouched
  } = useSessionFormValidation();

  const handleInputChange = (field: keyof SessionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCreateForm(formData)) {
      return; // Show validation errors
    }

    try {
      await createSession(formData);
    } catch (error) {
      // Handle API errors
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={hasError('name') && isFieldTouched('name') ? 'error' : ''}
        />
        {hasError('name') && isFieldTouched('name') && (
          <p className="error">{getFieldError('name')}</p>
        )}
      </div>
      
      <button 
        type="submit" 
        disabled={!validationState.isValid || validationState.isValidating}
      >
        Create Session
      </button>
    </form>
  );
};
```

### 2. Error Boundary with Fallback UI

```typescript
import React from 'react';
import { SessionManagementErrorBoundary } from '../components/ui/SessionManagementErrorBoundary';
import { NetworkFallbackUI } from '../components/ui/NetworkFallbackUI';

const SessionPage = () => {
  return (
    <SessionManagementErrorBoundary
      context="session-management"
      onRetry={() => window.location.reload()}
      onGoBack={() => navigate(-1)}
    >
      <SessionContent />
    </SessionManagementErrorBoundary>
  );
};
```

### 3. API Call with Error Handling

```typescript
import { handleSessionApiCall } from '../utils/sessionErrorHandling';

const sessionService = {
  async createSession(data: SessionCreate) {
    return handleSessionApiCall(
      () => fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
      'session creation'
    );
  }
};
```

## TypeScript Types

### Core Types

```typescript
// Validation types
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Error handling types
interface ApiError {
  message: string;
  type: 'network' | 'permission' | 'notFound' | 'server' | 'validation' | 'unknown';
  statusCode?: number;
  retryable: boolean;
  details?: string;
  field?: string;
}

// Form types
interface SessionFormData {
  name: string;
  description: string;
  session_date: string;
  session_time: string;
}

interface FormValidationState {
  isValid: boolean;
  isValidating: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
}
```

## Testing

The validation system includes comprehensive tests:

```bash
# Run validation tests
npm test -- sessionValidation.test.ts

# Run all tests
npm test
```

### Test Coverage

- ✅ Session name validation (length, pattern, required)
- ✅ Session description validation (length)
- ✅ Session date validation (past dates, future limits)
- ✅ Session datetime validation (time combinations)
- ✅ Session notes validation (length limits)
- ✅ Form validation integration
- ✅ Error handling scenarios
- ✅ Helper function utilities

## Best Practices

### 1. Validation

- **Always validate on both client and server side**
- **Use real-time validation with debouncing** (300ms recommended)
- **Provide clear, actionable error messages**
- **Mark fields as touched only after user interaction**
- **Show validation state in UI** (loading, error, success)

### 2. Error Handling

- **Parse errors into structured format** using `parseSessionApiError`
- **Provide retry mechanisms** for retryable errors
- **Show user-friendly messages** instead of technical details
- **Log errors with context** for debugging
- **Implement fallback UI** for critical failures

### 3. User Experience

- **Show validation errors only after field is touched**
- **Provide immediate feedback** for user actions
- **Use progressive disclosure** for advanced options
- **Implement auto-save** with validation
- **Show character counts** for text fields with limits

### 4. Accessibility

- **Use proper ARIA attributes** (`aria-invalid`, `aria-describedby`)
- **Associate error messages with form fields**
- **Provide keyboard navigation** for all interactive elements
- **Use semantic HTML** for screen readers
- **Ensure sufficient color contrast** for error states

## Migration Guide

### From Old Validation

```typescript
// Old approach
const [errors, setErrors] = useState({});
const validateForm = () => {
  const newErrors = {};
  if (!name) newErrors.name = 'Required';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// New approach
const {
  validationState,
  validateCreateForm,
  getFieldError,
  hasError
} = useSessionFormValidation();

const isValid = validateCreateForm(formData);
```

### From Basic Error Handling

```typescript
// Old approach
try {
  const result = await api.call();
} catch (error) {
  setError('Something went wrong');
}

// New approach
try {
  const result = await handleSessionApiCall(
    () => api.call(),
    'operation context'
  );
} catch (error) {
  const apiError = parseSessionApiError(error);
  setError(apiError.message);
  // Handle specific error types
}
```

## Performance Considerations

- **Debounced validation** prevents excessive API calls
- **Memoized validation functions** reduce re-computations
- **Lazy loading** of validation rules
- **Efficient error state management** with minimal re-renders
- **Optimized bundle size** with tree-shaking

## Future Enhancements

- **Schema-based validation** with libraries like Yup or Zod
- **Internationalization** for error messages
- **Custom validation rules** per organization
- **Advanced retry strategies** with exponential backoff
- **Offline support** with local validation
- **Analytics integration** for error tracking