import React from 'react';

interface LandingHeaderProps {
    orgName: string;
    logoText: string;
    tagline: string;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ orgName, logoText, tagline }) => {
    return (
        <header className="relative overflow-hidden">
            <div className="container-responsive py-4 sm:py-6 lg:py-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg sm:text-xl">{logoText.charAt(0)}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{orgName}</h1>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden xs:block">
                        {tagline}
                    </div>
                </div>
            </div>
        </header>
    );
};
