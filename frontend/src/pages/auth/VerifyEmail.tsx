import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const VerifyEmail: React.FC = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <EnvelopeIcon className="h-8 w-8 text-blue-600" />
                </div>

                <div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Check your email
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        We sent a verification link to <span className="font-medium text-gray-900">{email}</span>
                    </p>
                </div>

                <div className="mt-4 bg-white p-4 rounded-md shadow-sm border border-gray-200 text-left">
                    <p className="text-sm text-gray-500">
                        Click the link in the email to verify your account. If you don't see it, check your spam folder.
                    </p>
                </div>

                <div className="flex flex-col space-y-4">
                    <Link
                        to="/login"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Return to Login
                    </Link>

                    <Link
                        to="/"
                        className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
