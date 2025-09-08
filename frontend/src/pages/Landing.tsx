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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Acadion</h1>
            </div>
            <div className="text-sm text-gray-600">
              AI-Powered Student Management
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Acadion
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Revolutionize your classroom with AI-powered attendance tracking, 
            comprehensive student management, and real-time analytics.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center p-6 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CameraIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Attendance</h3>
            <p className="text-sm text-gray-600">Automated facial recognition for effortless attendance tracking</p>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Class Management</h3>
            <p className="text-sm text-gray-600">Create and manage classes with unique invite codes</p>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Analytics</h3>
            <p className="text-sm text-gray-600">Comprehensive insights and performance tracking</p>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AcademicCapIcon className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Multi-Platform</h3>
            <p className="text-sm text-gray-600">Access from web, mobile, and tablet devices</p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Role</h3>
            <p className="text-lg text-gray-600">
              Select how you'll be using Acadion to get started with the right experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Teacher Card */}
            <div 
              onClick={() => handleRoleSelection('teacher')}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
            >
              <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-transparent group-hover:border-blue-200 group-hover:shadow-xl">
                <div className="text-center">
                  <div className="h-20 w-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300">
                    <AcademicCapIcon className="h-10 w-10 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">I'm a Teacher</h4>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Create and manage classes, track student attendance with AI, 
                    generate reports, and monitor student performance.
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
                      Create unlimited classes
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
                      AI-powered attendance tracking
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
                      Comprehensive analytics dashboard
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
                      Student performance insights
                    </div>
                  </div>
                  <button className="w-full mt-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    Continue as Teacher
                  </button>
                </div>
              </div>
            </div>

            {/* Student Card */}
            <div 
              onClick={() => handleRoleSelection('student')}
              className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
            >
              <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-transparent group-hover:border-green-200 group-hover:shadow-xl">
                <div className="text-center">
                  <div className="h-20 w-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300">
                    <UserGroupIcon className="h-10 w-10 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">I'm a Student</h4>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Join classes with invite codes, register your face for automatic 
                    attendance, and track your academic progress.
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                      Join classes instantly
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                      Automatic attendance marking
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                      View attendance history
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
                      Track academic progress
                    </div>
                  </div>
                  <button className="w-full mt-8 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    Continue as Student
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 pt-16 border-t border-gray-200">
          <p className="text-gray-600 mb-4">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign in here
            </button>
          </p>
          <p className="text-sm text-gray-500">
            Secure • Privacy-First • GDPR Compliant
          </p>
        </div>
      </main>
    </div>
  );
};

export default Landing;