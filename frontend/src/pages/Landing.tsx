import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicCapIcon, UserGroupIcon, ChartBarIcon, CameraIcon } from '@heroicons/react/24/outline';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'teacher' | 'student') => {
    // Store the selected role for the login/signup process
    localStorage.setItem('selected_user_type', role);
    navigate('/login', { state: { userType: role } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 safe-area-padding transition-colors">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="container-responsive py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">A</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Acadion</h1>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden xs:block">
              AI-Powered Student Management
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container-responsive py-8 sm:py-12">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
            Welcome to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Acadion
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
            Revolutionize your classroom with AI-powered attendance tracking, 
            comprehensive student management, and real-time analytics.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid-responsive-4 mb-12 sm:mb-16">
          <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CameraIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">AI Attendance</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Automated facial recognition for effortless attendance tracking</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Class Management</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Create and manage classes with unique invite codes</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Real-time Analytics</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Comprehensive insights and performance tracking</p>
          </div>
          
          <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <AcademicCapIcon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Multi-Platform</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Access from web, mobile, and tablet devices</p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Choose Your Role</h3>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4 sm:px-0">
              Select how you'll be using Acadion to get started with the right experience
            </p>
          </div>

          <div className="grid-responsive-2 gap-6 sm:gap-8">
            {/* Teacher Card */}
            <div 
              onClick={() => handleRoleSelection('teacher')}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105 touch-manipulation"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-600 group-hover:shadow-xl transition-all">
                <div className="text-center">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300">
                    <AcademicCapIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">I'm a Teacher</h4>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                    Create and manage classes, track student attendance with AI, 
                    generate reports, and monitor student performance.
                  </p>
                  <div className="space-y-2 sm:space-y-3 text-left">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Create unlimited classes
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      AI-powered attendance tracking
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Comprehensive analytics dashboard
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Student performance insights
                    </div>
                  </div>
                  <button className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base btn-mobile">
                    Continue as Teacher
                  </button>
                </div>
              </div>
            </div>

            {/* Student Card */}
            <div 
              onClick={() => handleRoleSelection('student')}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105 touch-manipulation"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-transparent group-hover:border-green-200 dark:group-hover:border-green-600 group-hover:shadow-xl transition-all">
                <div className="text-center">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300">
                    <UserGroupIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">I'm a Student</h4>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                    Join classes with invite codes, register your face for automatic 
                    attendance, and track your academic progress.
                  </p>
                  <div className="space-y-2 sm:space-y-3 text-left">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Join classes instantly
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Automatic attendance marking
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      View attendance history
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-2 w-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 sm:mr-3 flex-shrink-0"></div>
                      Track academic progress
                    </div>
                  </div>
                  <button className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base btn-mobile">
                    Continue as Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 sm:mt-16 pt-8 sm:pt-16 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 px-4 sm:px-0">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold touch-manipulation transition-colors"
            >
              Sign in here
            </button>
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4 sm:px-0">
            Secure • Privacy-First • GDPR Compliant
          </p>
        </div>
      </main>
    </div>
  );
};

export default Landing;