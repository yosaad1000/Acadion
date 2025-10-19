import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ContentLibrary: React.FC = () => {
  const { user, currentRole } = useAuth();

  return (
    <div className="container-responsive py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-responsive-2xl font-bold text-gray-900 dark:text-white mb-6">
          Content Library
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Content Library
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Manage and share educational resources, documents, and materials.
              This feature is coming soon!
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="mb-2">Planned features:</p>
              <ul className="list-disc list-inside space-y-1 text-left max-w-xs mx-auto">
                <li>Upload and organize documents</li>
                <li>Share materials with students</li>
                <li>Version control and history</li>
                <li>Collaborative annotations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentLibrary;
