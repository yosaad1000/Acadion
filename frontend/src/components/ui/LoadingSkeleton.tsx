import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true
}) => {
  const baseClasses = `
    bg-gray-200 dark:bg-gray-700
    ${animate ? 'animate-pulse' : ''}
    ${className}
  `;

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded h-4';
      case 'rectangular':
        return 'rounded-md';
      case 'circular':
        return 'rounded-full';
      case 'card':
        return 'rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()}`}
      style={getStyle()}
    />
  );
};

// Predefined skeleton components for common use cases
export const SessionCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
      <div className="flex-1 min-w-0 space-y-3">
        {/* Title and status */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <LoadingSkeleton variant="text" width="60%" height={20} />
          <LoadingSkeleton variant="rectangular" width={80} height={24} />
        </div>
        
        {/* Description */}
        <LoadingSkeleton variant="text" lines={2} />
        
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LoadingSkeleton variant="text" width={100} height={16} />
          <LoadingSkeleton variant="text" width={120} height={16} />
          <LoadingSkeleton variant="text" width={90} height={16} />
        </div>
      </div>
      
      {/* Created/Updated info */}
      <div className="text-right space-y-1 flex-shrink-0 sm:ml-4">
        <LoadingSkeleton variant="text" width={80} height={12} />
        <LoadingSkeleton variant="text" width={90} height={12} />
      </div>
    </div>
  </div>
);

export const SessionListSkeleton: React.FC = () => (
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
        <SessionCardSkeleton key={index} />
      ))}
    </div>
  </div>
);

export const AIChatSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-start space-x-3">
      <LoadingSkeleton variant="circular" width={32} height={32} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="rectangular" width="80%" height={60} />
      </div>
    </div>
    <div className="flex items-start space-x-3 flex-row-reverse">
      <LoadingSkeleton variant="circular" width={32} height={32} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="rectangular" width="60%" height={40} />
      </div>
    </div>
  </div>
);

export default LoadingSkeleton;