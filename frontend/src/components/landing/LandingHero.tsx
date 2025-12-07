import React from 'react';

interface LandingHeroProps {
    orgName: string;
    description: string;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ orgName, description }) => {
    return (
        <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                Welcome to
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    {orgName}
                </span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
                {description}
            </p>
        </div>
    );
};
