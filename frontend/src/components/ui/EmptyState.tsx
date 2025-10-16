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

// Session-specific empty state components
export const NoSessionsEmptyState: React.FC<{
  onCreateSession?: () => void;
  isTeacher?: boolean;
  className?: string;
}> = ({ onCreateSession, isTeacher = false, className }) => (
  <EmptyState
    icon={
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
      </svg>
    }
    title="No Sessions Yet"
    description={
      isTeacher 
        ? "Create your first session to start organizing class content and activities. Sessions help you manage attendance, assignments, and class notes."
        : "Sessions will appear here once your teacher creates them. Sessions contain class materials, assignments, and attendance records."
    }
    action={
      isTeacher && onCreateSession ? {
        label: "Create First Session",
        onClick: onCreateSession,
        variant: "primary"
      } : undefined
    }
    secondaryAction={
      isTeacher ? {
        label: "Learn about sessions",
        onClick: () => {
          // Open help documentation or tutorial
          window.open('/docs/sessions', '_blank');
        }
      } : undefined
    }
    className={className}
    size="lg"
  />
);

export const NoStudentsEmptyState: React.FC<{
  inviteCode?: string;
  className?: string;
}> = ({ inviteCode, className }) => (
  <EmptyState
    icon={
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    }
    title="No Students Yet"
    description={
      inviteCode 
        ? `Share the invite code "${inviteCode}" with your students so they can join this class.`
        : "Students will appear here once they join your class using the invite code."
    }
    className={className}
  />
);

export const NoAssignmentsEmptyState: React.FC<{
  onCreateAssignment?: () => void;
  isTeacher?: boolean;
  className?: string;
}> = ({ onCreateAssignment, isTeacher = false, className }) => (
  <EmptyState
    icon={
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
    title="No Assignments Yet"
    description={
      isTeacher 
        ? "Create assignments to give students tasks, homework, or projects related to this session."
        : "Assignments will appear here when your teacher adds them to this session."
    }
    action={
      isTeacher && onCreateAssignment ? {
        label: "Create Assignment",
        onClick: onCreateAssignment,
        variant: "primary"
      } : undefined
    }
    className={className}
  />
);

export default EmptyState;