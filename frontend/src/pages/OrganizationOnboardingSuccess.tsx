import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  EnvelopeIcon, 
  BuildingOfficeIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';

interface LocationState {
  organizationName?: string;
  adminEmail?: string;
}

const OrganizationOnboardingSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const organizationName = state?.organizationName || 'Your Organization';
  const adminEmail = state?.adminEmail || '';

  const handleContinue = () => {
    // Navigate to login page to complete the setup
    navigate('/login', { 
      state: { 
        message: 'Please sign in to complete your organization setup',
        email: adminEmail 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 safe-area-padding">
      {/* Header */}
      <header className="container-responsive py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">A</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Acadion</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-responsive py-8 sm:py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8 sm:mb-12">
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <CheckCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Organization Created Successfully!
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
              Congratulations! Your organization has been set up on Acadion. You're ready to start managing students with AI-powered attendance tracking.
            </p>
          </div>

          {/* Organization Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 mb-8">
            <div className="space-y-6">
              {/* Organization Name */}
              <div className="flex items-center justify-center space-x-3">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Organization</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{organizationName}</p>
                </div>
              </div>

              {/* Admin Email */}
              {adminEmail && (
                <div className="flex items-center justify-center space-x-3">
                  <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <EnvelopeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Administrator Email</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{adminEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              What's Next?
            </h3>
            <div className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Sign In to Your Account</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Complete your organization setup by signing in with your administrator credentials.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Invite Teachers & Students</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Start adding teachers and students to your organization.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Create Your First Class</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Set up classes and start using AI-powered attendance tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue to Sign In
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
            >
              Back to Home
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help getting started? Contact our support team at{' '}
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

export default OrganizationOnboardingSuccess;