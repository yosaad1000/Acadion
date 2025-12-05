import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { OrganizationService } from '../services/organizationService';
import { withRetry, DEFAULT_RETRY_OPTIONS, createNetworkError } from '../utils/errorHandling';
import {
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Enhanced Zod validation schema with comprehensive validation rules
const organizationSchema = z.object({
  organizationName: z.string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, "Organization name contains invalid characters")
    .refine(val => val.trim().length >= 2, "Organization name cannot be only whitespace")
    .refine(val => !/^\s|\s$/.test(val), "Organization name cannot start or end with spaces")
    .refine(val => !/\s{2,}/.test(val), "Organization name cannot contain multiple consecutive spaces"),
  organizationDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/, "Invalid domain format (e.g., example.edu)")
    .refine(val => !val || val.length <= 253, "Domain name is too long")
    .refine(val => !val || !val.includes('..'), "Domain cannot contain consecutive dots")
    .refine(val => !val || !/^-|-$/.test(val), "Domain cannot start or end with hyphens")
    .optional()
    .or(z.literal("")),
  adminName: z.string()
    .min(2, "Administrator name must be at least 2 characters")
    .max(50, "Administrator name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-'.,]+$/, "Administrator name contains invalid characters")
    .refine(val => val.trim().length >= 2, "Administrator name cannot be only whitespace")
    .refine(val => !/^\s|\s$/.test(val), "Administrator name cannot start or end with spaces"),
  adminEmail: z.string()
    .min(1, "Email address is required")
    .max(254, "Email address is too long")
    .email("Please enter a valid email address")
    .refine(val => !val.includes('..'), "Email cannot contain consecutive dots")
    .refine(val => !/^\.|\.$/.test(val), "Email cannot start or end with dots")
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface FormErrors {
  organizationName?: string;
  organizationDomain?: string;
  adminName?: string;
  adminEmail?: string;
  general?: string;
}

interface ValidationState {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
  retryCount: number;
  lastError?: string;
}

// Enhanced retry configuration for validation calls
const VALIDATION_RETRY_OPTIONS = {
  ...DEFAULT_RETRY_OPTIONS,
  maxAttempts: 3,
  baseDelay: 500,
  maxDelay: 2000
};

// Timeout configuration
const VALIDATION_TIMEOUT = 10000; // 10 seconds
const DEBOUNCE_DELAY = 800; // Increased for better UX

const OrganizationOnboarding: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<OrganizationFormData>({
    organizationName: '',
    organizationDomain: '',
    adminName: '',
    adminEmail: ''
  });

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [nameAvailability, setNameAvailability] = useState<ValidationState>({
    isChecking: false,
    isAvailable: null,
    message: '',
    retryCount: 0
  });

  const [domainAvailability, setDomainAvailability] = useState<ValidationState>({
    isChecking: false,
    isAvailable: null,
    message: '',
    retryCount: 0
  });

  // Enhanced refs for validation with timeout handling
  const nameValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const domainValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nameValidationAbortRef = useRef<AbortController | null>(null);
  const domainValidationAbortRef = useRef<AbortController | null>(null);
  const formSubmissionAbortRef = useRef<AbortController | null>(null);

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }
      if (domainValidationTimeoutRef.current) {
        clearTimeout(domainValidationTimeoutRef.current);
      }
      
      // Abort ongoing requests
      if (nameValidationAbortRef.current) {
        nameValidationAbortRef.current.abort();
      }
      if (domainValidationAbortRef.current) {
        domainValidationAbortRef.current.abort();
      }
      if (formSubmissionAbortRef.current) {
        formSubmissionAbortRef.current.abort();
      }
    };
  }, []);

  // Handle input changes
  const handleInputChange = (field: keyof OrganizationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Trigger organization name uniqueness check with improved logic
    if (field === 'organizationName') {
      // Clear any existing timeout
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }

      const trimmedValue = value.trim();
      
      if (trimmedValue.length >= 2) {
        checkOrganizationNameAvailability(trimmedValue);
      } else if (trimmedValue.length === 0) {
        // Reset state when field is empty
        setNameAvailability({
          isChecking: false,
          isAvailable: null,
          message: '',
          retryCount: 0
        });
      } else {
        // Show message for names that are too short
        setNameAvailability({
          isChecking: false,
          isAvailable: false,
          message: 'Organization name must be at least 2 characters',
          retryCount: 0
        });
      }
    }

    // Trigger organization domain uniqueness check
    if (field === 'organizationDomain') {
      // Clear any existing timeout
      if (domainValidationTimeoutRef.current) {
        clearTimeout(domainValidationTimeoutRef.current);
      }

      const trimmedValue = value.trim();
      
      if (trimmedValue.length > 0) {
        checkOrganizationDomainAvailability(trimmedValue);
      } else {
        // Reset state when field is empty (domain is optional)
        setDomainAvailability({
          isChecking: false,
          isAvailable: true,
          message: 'Domain is optional',
          retryCount: 0
        });
      }
    }
  };

  // Enhanced organization name availability check with retry and timeout
  const checkOrganizationNameAvailability = useCallback(async (name: string) => {
    // Clear any existing timeout and abort ongoing requests
    if (nameValidationTimeoutRef.current) {
      clearTimeout(nameValidationTimeoutRef.current);
    }
    if (nameValidationAbortRef.current) {
      nameValidationAbortRef.current.abort();
    }

    // Set checking state immediately
    setNameAvailability(prev => ({ 
      ...prev, 
      isChecking: true, 
      message: 'Checking availability...',
      lastError: undefined
    }));

    // Debounce the actual API call
    nameValidationTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      nameValidationAbortRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        nameValidationAbortRef.current?.abort();
      }, VALIDATION_TIMEOUT);

      try {
        const result = await withRetry(
          () => OrganizationService.checkOrganizationNameAvailability(name),
          VALIDATION_RETRY_OPTIONS
        );

        clearTimeout(timeoutId);
        
        setNameAvailability({
          isChecking: false,
          isAvailable: result.isAvailable,
          message: result.message,
          retryCount: 0
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error checking organization name availability:', error);
        
        const isTimeoutError = error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('timeout'));
        
        setNameAvailability(prev => ({
          isChecking: false,
          isAvailable: null,
          message: isTimeoutError 
            ? 'Request timed out. Please try again.' 
            : 'Unable to check availability. Please try again.',
          retryCount: prev.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Enhanced organization domain availability check with retry and timeout
  const checkOrganizationDomainAvailability = useCallback(async (domain: string) => {
    // Clear any existing timeout and abort ongoing requests
    if (domainValidationTimeoutRef.current) {
      clearTimeout(domainValidationTimeoutRef.current);
    }
    if (domainValidationAbortRef.current) {
      domainValidationAbortRef.current.abort();
    }

    // Set checking state immediately
    setDomainAvailability(prev => ({ 
      ...prev, 
      isChecking: true, 
      message: 'Checking domain availability...',
      lastError: undefined
    }));

    // Debounce the actual API call
    domainValidationTimeoutRef.current = setTimeout(async () => {
      // Create new abort controller for this request
      domainValidationAbortRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        domainValidationAbortRef.current?.abort();
      }, VALIDATION_TIMEOUT);

      try {
        const result = await withRetry(
          () => OrganizationService.checkOrganizationDomainAvailability(domain),
          VALIDATION_RETRY_OPTIONS
        );

        clearTimeout(timeoutId);
        
        setDomainAvailability({
          isChecking: false,
          isAvailable: result.isAvailable,
          message: result.message,
          retryCount: 0
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error checking organization domain availability:', error);
        
        const isTimeoutError = error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('timeout'));
        
        setDomainAvailability(prev => ({
          isChecking: false,
          isAvailable: null,
          message: isTimeoutError 
            ? 'Request timed out. Please try again.' 
            : 'Unable to check domain availability. Please try again.',
          retryCount: prev.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Validate form using Zod
  const validateForm = (): boolean => {
    try {
      organizationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.issues.forEach(err => {
          const field = err.path[0] as keyof FormErrors;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Enhanced form submission with comprehensive error handling and retry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Pre-submission validation checks
    const validationErrors: FormErrors = {};

    // Check if organization name is available
    if (nameAvailability.isAvailable === false) {
      validationErrors.organizationName = nameAvailability.message || 'Please choose a different organization name';
    }

    // Check if name availability is still being checked
    if (nameAvailability.isChecking) {
      validationErrors.organizationName = 'Please wait while we check name availability';
    }

    // Check if name availability check hasn't been performed yet
    if (nameAvailability.isAvailable === null && formData.organizationName.trim().length >= 2) {
      validationErrors.organizationName = 'Please wait for name availability check to complete';
    }

    // Check if domain is available (if provided)
    if (formData.organizationDomain && domainAvailability.isAvailable === false) {
      validationErrors.organizationDomain = domainAvailability.message || 'Please choose a different domain';
    }

    // Check if domain availability is still being checked
    if (formData.organizationDomain && domainAvailability.isChecking) {
      validationErrors.organizationDomain = 'Please wait while we check domain availability';
    }

    // If there are validation errors, show them and return
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Abort any previous submission
    if (formSubmissionAbortRef.current) {
      formSubmissionAbortRef.current.abort();
    }
    formSubmissionAbortRef.current = new AbortController();

    try {
      const result = await withRetry(
        () => OrganizationService.createOrganizationWithAdmin({
          organizationName: formData.organizationName.trim(),
          organizationDomain: formData.organizationDomain?.trim() || undefined,
          adminName: formData.adminName.trim(),
          adminEmail: formData.adminEmail.trim()
        }),
        {
          ...DEFAULT_RETRY_OPTIONS,
          maxAttempts: 2, // Fewer retries for form submission
          baseDelay: 1000
        }
      );

      if (result.success) {
        // Navigate to success page
        navigate('/onboard/success', {
          state: {
            organizationName: formData.organizationName.trim(),
            adminEmail: formData.adminEmail.trim(),
            organizationId: result.organizationId
          }
        });
      } else {
        // Handle specific error cases
        const errorMessage = result.message || 'Failed to create organization. Please try again.';
        
        if (errorMessage.toLowerCase().includes('name') && errorMessage.toLowerCase().includes('taken')) {
          setErrors({
            organizationName: errorMessage
          });
          // Refresh name availability check
          await checkOrganizationNameAvailability(formData.organizationName);
        } else if (errorMessage.toLowerCase().includes('domain')) {
          setErrors({
            organizationDomain: errorMessage
          });
          // Refresh domain availability check if domain was provided
          if (formData.organizationDomain) {
            await checkOrganizationDomainAvailability(formData.organizationDomain);
          }
        } else {
          setErrors({
            general: errorMessage
          });
        }
      }

    } catch (error) {
      console.error('Error creating organization:', error);
      
      const isTimeoutError = error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('timeout'));
      
      const isNetworkError = error instanceof Error && 
        (error.message.includes('fetch') || error.message.includes('network'));
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (isTimeoutError) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setErrors({
        general: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Retry validation functions
  const retryNameValidation = useCallback(() => {
    if (formData.organizationName.trim().length >= 2) {
      checkOrganizationNameAvailability(formData.organizationName.trim());
    }
  }, [formData.organizationName, checkOrganizationNameAvailability]);

  const retryDomainValidation = useCallback(() => {
    if (formData.organizationDomain?.trim()) {
      checkOrganizationDomainAvailability(formData.organizationDomain.trim());
    }
  }, [formData.organizationDomain, checkOrganizationDomainAvailability]);

  // Enhanced form validation check
  const isFormValid = () => {
    // Basic field validation
    const hasRequiredFields = (
      formData.organizationName.trim().length >= 2 &&
      formData.adminName.trim().length >= 2 &&
      formData.adminEmail.trim().length > 0
    );

    // Organization name availability validation
    const nameIsAvailable = nameAvailability.isAvailable === true;
    const nameNotBeingChecked = !nameAvailability.isChecking;

    // No validation errors
    const noErrors = Object.keys(errors).filter(key => key !== 'general').length === 0;

    // Domain validation (if provided)
    const domainIsValid = !formData.organizationDomain?.trim() || domainAvailability.isAvailable !== false;
    const domainNotBeingChecked = !domainAvailability.isChecking;

    return hasRequiredFields && nameIsAvailable && nameNotBeingChecked && noErrors && domainIsValid && domainNotBeingChecked;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 safe-area-padding">
      {/* Header */}
      <header className="container-responsive py-4 sm:py-6" role="banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center" aria-hidden="true">
              <span className="text-white font-bold text-lg sm:text-xl">A</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Acadion</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
            aria-label="Navigate back to home page"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-responsive py-8 sm:py-12" role="main">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6" aria-hidden="true">
              <BuildingOfficeIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              Create Your Organization
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              Set up your educational institution on Acadion and start managing students with AI-powered attendance tracking.
            </p>
          </div>

          {/* Organization Registration Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="Organization registration form">
              {/* General Error */}
              {errors.general && (
                <div 
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-center">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" aria-hidden="true" />
                    <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
                  </div>
                </div>
              )}

              {/* Organization Name */}
              <div>
                <label htmlFor="organizationName" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Organization Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${errors.organizationName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : nameAvailability.isAvailable === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : nameAvailability.isAvailable === false
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="Enter your organization name"
                    disabled={isLoading}
                    required
                    aria-required="true"
                    aria-invalid={errors.organizationName ? 'true' : 'false'}
                    aria-describedby={`${errors.organizationName ? 'organizationName-error' : ''} ${nameAvailability.message ? 'organizationName-status' : ''}`.trim() || undefined}
                  />
                  {nameAvailability.isChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" role="status" aria-label="Checking availability"></div>
                    </div>
                  )}
                  {nameAvailability.isAvailable === true && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Available" />
                    </div>
                  )}
                  {nameAvailability.isAvailable === false && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-label="Not available" />
                    </div>
                  )}
                </div>
                {errors.organizationName && (
                  <p id="organizationName-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.organizationName}
                  </p>
                )}
                {nameAvailability.message && !errors.organizationName && (
                  <div className="mt-2 flex items-center justify-between">
                    <p 
                      id="organizationName-status"
                      className={`text-sm ${nameAvailability.isAvailable === true
                        ? 'text-green-600 dark:text-green-400'
                        : nameAvailability.isAvailable === false
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                        }`}
                      role="status"
                      aria-live="polite"
                    >
                      {nameAvailability.message}
                    </p>
                    {nameAvailability.isAvailable === null && nameAvailability.retryCount > 0 && (
                      <button
                        type="button"
                        onClick={retryNameValidation}
                        disabled={nameAvailability.isChecking}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5"
                        aria-label="Retry organization name availability check"
                      >
                        <ArrowPathIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Organization Domain */}
              <div>
                <label htmlFor="organizationDomain" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Organization Domain <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    id="organizationDomain"
                    value={formData.organizationDomain}
                    onChange={(e) => handleInputChange('organizationDomain', e.target.value)}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${errors.organizationDomain
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : domainAvailability.isAvailable === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : domainAvailability.isAvailable === false
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="example.edu"
                    disabled={isLoading}
                    aria-invalid={errors.organizationDomain ? 'true' : 'false'}
                    aria-describedby={`organizationDomain-help ${errors.organizationDomain ? 'organizationDomain-error' : ''} ${domainAvailability.message ? 'organizationDomain-status' : ''}`.trim() || undefined}
                  />
                  {domainAvailability.isChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" role="status" aria-label="Checking domain availability"></div>
                    </div>
                  )}
                  {domainAvailability.isAvailable === true && formData.organizationDomain && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Domain available" />
                    </div>
                  )}
                  {domainAvailability.isAvailable === false && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-hidden="true">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-label="Domain not available" />
                    </div>
                  )}
                </div>
                {errors.organizationDomain && (
                  <p id="organizationDomain-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.organizationDomain}
                  </p>
                )}
                {domainAvailability.message && !errors.organizationDomain && (
                  <div className="mt-2 flex items-center justify-between">
                    <p 
                      id="organizationDomain-status"
                      className={`text-sm ${domainAvailability.isAvailable === true
                        ? 'text-green-600 dark:text-green-400'
                        : domainAvailability.isAvailable === false
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                        }`}
                      role="status"
                      aria-live="polite"
                    >
                      {domainAvailability.message}
                    </p>
                    {domainAvailability.isAvailable === null && domainAvailability.retryCount > 0 && formData.organizationDomain && (
                      <button
                        type="button"
                        onClick={retryDomainValidation}
                        disabled={domainAvailability.isChecking}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1 py-0.5"
                        aria-label="Retry domain availability check"
                      >
                        <ArrowPathIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
                <p id="organizationDomain-help" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Your organization's website domain. This will be used for future integrations.
                </p>
              </div>

              {/* Administrator Name */}
              <div>
                <label htmlFor="adminName" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Administrator Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                    <UserIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => handleInputChange('adminName', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${errors.adminName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    required
                    aria-required="true"
                    aria-invalid={errors.adminName ? 'true' : 'false'}
                    aria-describedby={errors.adminName ? 'adminName-error' : undefined}
                    autoComplete="name"
                  />
                </div>
                {errors.adminName && (
                  <p id="adminName-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.adminName}
                  </p>
                )}
              </div>

              {/* Administrator Email */}
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Administrator Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="email"
                    id="adminEmail"
                    value={formData.adminEmail}
                    onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${errors.adminEmail
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="admin@example.edu"
                    disabled={isLoading}
                    required
                    aria-required="true"
                    aria-invalid={errors.adminEmail ? 'true' : 'false'}
                    aria-describedby={`adminEmail-help ${errors.adminEmail ? 'adminEmail-error' : ''}`.trim() || undefined}
                    autoComplete="email"
                  />
                </div>
                {errors.adminEmail && (
                  <p id="adminEmail-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors.adminEmail}
                  </p>
                )}
                <p id="adminEmail-help" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This email will be used for your administrator account and future communications.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!isFormValid() || isLoading}
                  className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isFormValid() && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  aria-disabled={!isFormValid() || isLoading}
                  aria-describedby={!isFormValid() ? 'submit-help' : undefined}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" role="status" aria-hidden="true"></div>
                      <span>Creating Organization...</span>
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </button>
                {!isFormValid() && (
                  <p id="submit-help" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Please fill in all required fields and ensure organization name is available to continue.
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help? Contact our support team at{' '}
              <a 
                href="mailto:support@acadion.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label="Send email to support team"
              >
                support@acadion.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrganizationOnboarding;