import React from 'react';
import { AcademicCapIcon, UserGroupIcon, ChartBarIcon, CameraIcon } from '@heroicons/react/24/outline';

export const LandingFeatures: React.FC = () => {
    return (
        <div className="grid-responsive-4 mb-12 sm:mb-16">
            <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <CameraIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Smart Attendance</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Automated tracking for effortless record keeping</p>
            </div>

            <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Class Management</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Seamlessly manage classes and schedules</p>
            </div>

            <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Performance Insights</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Track progress with detailed analytics</p>
            </div>

            <div className="text-center p-4 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <AcademicCapIcon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Anywhere Access</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Connect from any device, anywhere</p>
            </div>
        </div>
    );
};
