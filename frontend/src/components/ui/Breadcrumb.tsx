import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  className = '', 
  showHome = true 
}) => {
  const location = useLocation();

  // Filter out empty or invalid items
  const validItems = items.filter(item => item.label);

  if (validItems.length === 0) return null;

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link
            to="/dashboard"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Dashboard"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
          {validItems.length > 0 && (
            <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
        </>
      )}
      
      {validItems.map((item, index) => {
        const isLast = index === validItems.length - 1;
        const isCurrent = item.current || isLast;

        return (
          <React.Fragment key={index}>
            {item.href && !isCurrent ? (
              <Link
                to={item.href}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors truncate max-w-32 sm:max-w-48"
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={`truncate max-w-32 sm:max-w-48 ${
                  isCurrent 
                    ? 'text-gray-900 dark:text-gray-100 font-medium' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title={item.label}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;