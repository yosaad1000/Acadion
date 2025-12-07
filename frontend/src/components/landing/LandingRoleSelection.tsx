import React from 'react';
import { AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface LandingRoleSelectionProps {
    onRoleSelect: (role: 'teacher' | 'student') => void;
}

export const LandingRoleSelection: React.FC<LandingRoleSelectionProps> = ({ onRoleSelect }) => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Select Your Portal</h3>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4 sm:px-0">
                    Choose your role to access the appropriate dashboard
                </p>
            </div>

            <div className="grid-responsive-2 gap-6 sm:gap-8">
                {/* Teacher Card */}
                <div
                    onClick={() => onRoleSelect('teacher')}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105 touch-manipulation"
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-600 group-hover:shadow-xl transition-all">
                        <div className="text-center">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300">
                                <AcademicCapIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                            </div>
                            <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Teacher Portal</h4>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                                Manage classes, track attendance, and monitor student performance.
                            </p>
                            <button className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base btn-mobile">
                                Teacher Login
                            </button>
                        </div>
                    </div>
                </div>

                {/* Student Card */}
                <div
                    onClick={() => onRoleSelect('student')}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105 touch-manipulation"
                >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg border-2 border-transparent group-hover:border-green-200 dark:group-hover:border-green-600 group-hover:shadow-xl transition-all">
                        <div className="text-center">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:from-green-600 group-hover:to-green-700 transition-all duration-300">
                                <UserGroupIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                            </div>
                            <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Student Portal</h4>
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                                Access your classes, view attendance, and track your progress.
                            </p>
                            <button className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base btn-mobile">
                                Student Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
