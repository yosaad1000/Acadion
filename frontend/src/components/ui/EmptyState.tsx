import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-6',
          icon: 'h-8 w-8',
          title: 'text-base',
          description: 'text-sm',
          spacing: 'space-y-2'
        };
      case 'md':
        return {
          container: 'py-12',
          icon: 'h-12 w-12',
          title: 'text-lg',
          description: 'text-base',
          spacing: 'space-y-4'
        };
      case 'lg':
        return {
          container: 'py-16',
          icon: 'h-16 w-16',
          title: 'text-xl',
          description: 'text-lg',
          spacing: 'space-y-6'
        };
      default:
        return {
          container: 'py-12',
          icon: 'h-12 w-12',
          title: 'text-lg',
          description: 'text-base',
          spacing: 'space-y-4'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`text-center ${sizeClasses.container} ${className}`}>
      <div className={sizeClasses.spacing}>
        {icon && (
          <div className="flex justify-center">
            <div className={`${sizeClasses.icon} text-gray-400 dark:text-gray-500`}>
              {icon}
            </div>
          </div>
        )}
        
        <div>
          <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${sizeClasses.title}`}>
            {title}
          </h3>
          
          {description && (
            <p className={`mt-2 text-gray-600 dark:text-gray-400 ${sizeClasses.description}`}>
              {description}
            </p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
            {action && (
              <button
                onClick={action.onClick}
                className={`
                  inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
                  ${action.variant === 'secondary' 
                    ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700' 
                    : 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  transition-colors duration-200
                `}
              >
                {action.label}
              </button>
            )}
            
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;