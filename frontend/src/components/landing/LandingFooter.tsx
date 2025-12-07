import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingFooter: React.FC = () => {
    const navigate = useNavigate();

    return (
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
                Powered by Acadion • Secure • Privacy-First
            </p>
        </div>
    );
};
