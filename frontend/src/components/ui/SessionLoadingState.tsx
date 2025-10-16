import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

interface SessionLoadingStateProps {
  type?: 'list' | 'card' | 'form' | 'detail';
  message?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

const SessionLoadingState: React.FC<SessionLoadingStateProps> = ({
  type = 'list',
  message,
  showProgress = false,
  progress = 0,
  className = ''
}) => {
  const renderLoadingContent = () => {
    switch (type) {
      case 'list':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="space-y-2">
                <LoadingSkeleton variant="text" width={120} height={24} />
                <LoadingSkeleton variant="text" width={180} height={16} />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <LoadingSkeleton variant="rectangular" width={120} height={40} />
                <LoadingSkeleton variant="rectangular" width={140} height={40} />
              </div>
            </div>
            
            {/* Session cards skeleton */}
            <div className="space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <LoadingSkeleton variant="text" width="60%" height={20} />
                        <LoadingSkeleton variant="rectangular" width={80} height={24} />
                      </div>
                      <LoadingSkeleton variant="text" lines={2} />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <LoadingSkeleton variant="text" width={100} height={16} />
                        <LoadingSkeleton variant="text" width={120} height={16} />
                        <LoadingSkeleton variant="text" width={90} height={16} />
                      </div>
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0 sm:ml-4">
                      <LoadingSkeleton variant="text" width={80} height={12} />
                      <LoadingSkeleton variant="text" width={90} height={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <LoadingSkeleton variant="text" width="60%" height={20} />
                  <LoadingSkeleton variant="rectangular" width={80} height={24} />
                </div>
                <LoadingSkeleton variant="text" lines={2} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <LoadingSkeleton variant="text" width={100} height={16} />
                  <LoadingSkeleton variant="text" width={120} height={16} />
                  <LoadingSkeleton variant="text" width={90} height={16} />
                </div>
              </div>
              <div className="text-right space-y-1 flex-shrink-0 sm:ml-4">
                <LoadingSkeleton variant="text" width={80} height={12} />
                <LoadingSkeleton variant="text" width={90} height={12} />
              </div>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <LoadingSkeleton variant="text" width={180} height={20} />
                <LoadingSkeleton variant="text" width={240} height={16} />
              </div>
              <LoadingSkeleton variant="rectangular" width={24} height={24} />
            </div>

            {/* Form fields */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <LoadingSkeleton variant="text" width={100} height={16} />
                <LoadingSkeleton variant="rectangular" width="100%" height={40} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <LoadingSkeleton variant="text" width={60} height={16} />
                  <LoadingSkeleton variant="rectangular" width="100%" height={40} />
                </div>
                <div className="space-y-2">
                  <LoadingSkeleton variant="text" width={60} height={16} />
                  <LoadingSkeleton variant="rectangular" width="100%" height={40} />
                </div>
              </div>

              <div className="space-y-2">
                <LoadingSkeleton variant="text" width={120} height={16} />
                <LoadingSkeleton variant="rectangular" width="100%" height={80} />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <LoadingSkeleton variant="rectangular" width={80} height={36} />
                <LoadingSkeleton variant="rectangular" width={120} height={36} />
              </div>
            </div>
          </div>
        );

      case 'detail':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <LoadingSkeleton variant="text" width={200} height={24} />
                    <LoadingSkeleton variant="text" width={150} height={16} />
                  </div>
                  <LoadingSkeleton variant="rectangular" width={80} height={24} />
                </div>
                <LoadingSkeleton variant="text" lines={3} />
              </div>
            </div>

            {/* Content sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <LoadingSkeleton variant="text" width={120} height={20} className="mb-4" />
                  <LoadingSkeleton variant="text" lines={4} />
                </div>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <LoadingSkeleton variant="text" width={100} height={20} className="mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <LoadingSkeleton variant="text" width="80%" height={16} className="mb-2" />
                        <LoadingSkeleton variant="text" lines={2} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <LoadingSkeleton variant="text" width={100} height={20} className="mb-4" />
                  <div className="space-y-3">
                    <LoadingSkeleton variant="text" width="100%" height={16} />
                    <LoadingSkeleton variant="text" width="80%" height={16} />
                    <LoadingSkeleton variant="text" width="90%" height={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
    }
  };

  return (
    <div className={`${className}`}>
      {message && (
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
          {showProgress && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      )}
      
      {renderLoadingContent()}
    </div>
  );
};

export default SessionLoadingState;