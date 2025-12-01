import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { OrganizationService } from '../services/organizationService';
import {
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Zod validation schema
const organizationSchema = z.object({
  organizationName: z.string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, "Organization name contains invalid characters"),
  organizationDomain: z.string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, "Invalid domain format")
    .optional()
    .or(z.literal("")),
  adminName: z.string()
    .min(2, "Administrator name must be at least 2 characters")
    .max(50, "Administrator name must be less than 50 characters"),
  adminEmail: z.string()
    .email("Invalid email format")
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface FormErrors {
  organizationName?: string;
  organizationDomain?: string;
  adminName?: string;
  adminEmail?: string;
  general?: string;
}

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
  const [nameAvailability, setNameAvailability] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });

  const [domainAvailability, setDomainAvailability] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });

  // Debouncing refs for validation
  const nameValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const domainValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nameValidationTimeoutRef.current) {
        clearTimeout(nameValidationTimeoutRef.current);
      }
      if (domainValidationTimeoutRef.current) {
        clearTimeout(domainValidationTimeoutRef.current);
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
          message: ''
        });
      } else {
        // Show message for names that are too short
        setNameAvailability({
          isChecking: false,
          isAvailable: false,
          message: 'Organization name must be at least 2 characters'
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
          message: 'Domain is optional'
        });
      }
    }
  };

  // Check organization name uniqueness with debouncing
  const checkOrganizationNameAvailability = useCallback(async (name: string) => {
    // Clear any existing timeout
    if (nameValidationTimeoutRef.current) {
      clearTimeout(nameValidationTimeoutRef.current);
    }

    // Set checking state immediately
    setNameAvailability(prev => ({ ...prev, isChecking: true, message: 'Checking availability...' }));

    // Debounce the actual API call
    nameValidationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await OrganizationService.checkOrganizationNameAvailability(name);

        setNameAvailability({
          isChecking: false,
          isAvailable: result.isAvailable,
          message: result.message
        });
      } catch (error) {
        console.error('Error checking organization name availability:', error);
        setNameAvailability({
          isChecking: false,
          isAvailable: null,
          message: 'Unable to check availability. Please try again.'
        });
      }
    }, 500); // 500ms debounce delay
  }, []);

  // Check organization domain uniqueness with debouncing
  const checkOrganizationDomainAvailability = useCallback(async (domain: string) => {
    // Clear any existing timeout
    if (domainValidationTimeoutRef.current) {
      clearTimeout(domainValidationTimeoutRef.current);
    }

    // Set checking state immediately
    setDomainAvailability(prev => ({ ...prev, isChecking: true, message: 'Checking domain availability...' }));

    // Debounce the actual API call
    domainValidationTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await OrganizationService.checkOrganizationDomainAvailability(domain);

        setDomainAvailability({
          isChecking: false,
          isAvailable: result.isAvailable,
          message: result.message
        });
      } catch (error) {
        console.error('Error checking organization domain availability:', error);
        setDomainAvailability({
          isChecking: false,
          isAvailable: null,
          message: 'Unable to check domain availability. Please try again.'
        });
      }
    }, 500); // 500ms debounce delay
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if organization name is available
    if (nameAvailability.isAvailable === false) {
      setErrors(prev => ({
        ...prev,
        organizationName: nameAvailability.message || 'Please choose a different organization name'
      }));
      return;
    }

    // Check if name availability is still being checked
    if (nameAvailability.isChecking) {
      setErrors(prev => ({
        ...prev,
        organizationName: 'Please wait while we check name availability'
      }));
      return;
    }

    // Check if name availability check hasn't been performed yet
    if (nameAvailability.isAvailable === null && formData.organizationName.trim().length >= 2) {
      setErrors(prev => ({
        ...prev,
        organizationName: 'Please wait for name availability check to complete'
      }));
      return;
    }

    // Check if domain is available (if provided)
    if (formData.organizationDomain && domainAvailability.isAvailable === false) {
      setErrors(prev => ({
        ...prev,
        organizationDomain: domainAvailability.message || 'Please choose a different domain'
      }));
      return;
    }

    // Check if domain availability is still being checked
    if (formData.organizationDomain && domainAvailability.isChecking) {
      setErrors(prev => ({
        ...prev,
        organizationDomain: 'Please wait while we check domain availability'
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await OrganizationService.createOrganizationWithAdmin({
        organizationName: formData.organizationName,
        organizationDomain: formData.organizationDomain || undefined,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail
      });

      if (result.success) {
        // Navigate to success page
        navigate('/onboard/success', {
          state: {
            organizationName: formData.organizationName,
            adminEmail: formData.adminEmail,
            organizationId: result.organizationId
          }
        });
      } else {
        setErrors({
          general: result.message || 'Failed to create organization. Please try again.'
        });
      }

    } catch (error) {
      console.error('Error creating organization:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if form is valid for submission
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
    const noErrors = Object.keys(errors).length === 0;

    // Domain validation (if provided)
    const domainIsValid = !formData.organizationDomain || domainAvailability.isAvailable !== false;
    const domainNotBeingChecked = !domainAvailability.isChecking;

    return hasRequiredFields && nameIsAvailable && nameNotBeingChecked && noErrors && domainIsValid && domainNotBeingChecked;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 safe-area-padding">
      {/* Header */}
      <header className="container-responsive py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">A</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Acadion</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-responsive py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BuildingOfficeIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${errors.organizationName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : nameAvailability.isAvailable === true
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : nameAvailability.isAvailable === false
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                      } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="Enter your organization name"
                    disabled={isLoading}
                  />
                  {nameAvailability.isChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {nameAvailability.isAvailable === true && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  {nameAvailability.isAvailable === false && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.organizationName && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.organizationName}</p>
                )}
                {nameAvailability.message && !errors.organizationName && (
                  <p className={`mt-2 text-sm ${nameAvailability.isAvailable === true
                    ? 'text-green-600 dark:text-green-400'
                    : nameAvailability.isAvailable === false
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    {nameAvailability.message}
                  </p>
                )}
              </div>

              {/* Organization Domain */}
              <div>
                <label htmlFor="organizationDomain" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Organization Domain <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400" />
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
                  />
                  {domainAvailability.isChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {domainAvailability.isAvailable === true && formData.organizationDomain && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  {domainAvailability.isAvailable === false && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.organizationDomain && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.organizationDomain}</p>
                )}
                {domainAvailability.message && !errors.organizationDomain && (
                  <p className={`mt-2 text-sm ${domainAvailability.isAvailable === true
                    ? 'text-green-600 dark:text-green-400'
                    : domainAvailability.isAvailable === false
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}>
                    {domainAvailability.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Your organization's website domain. This will be used for future integrations.
                </p>
              </div>

              {/* Administrator Name */}
              <div>
                <label htmlFor="adminName" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Administrator Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
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
                  />
                </div>
                {errors.adminName && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.adminName}</p>
                )}
              </div>

              {/* Administrator Email */}
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Administrator Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
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
                  />
                </div>
                {errors.adminEmail && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.adminEmail}</p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This email will be used for your administrator account and future communications.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!isFormValid() || isLoading}
                  className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold transition-all duration-300 ${isFormValid() && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating Organization...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@acadion.com" className="text-blue-600 dark:text-blue-400 hover:underline">
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