import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  SunIcon, 
  MoonIcon, 
  ComputerDesktopIcon 
} from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabel = false, 
  size = 'md' 
}) => {
  const { theme, actualTheme, setTheme } = useTheme();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className={sizeClasses[size]} />;
      case 'dark':
        return <MoonIcon className={sizeClasses[size]} />;
      case 'system':
        return <ComputerDesktopIcon className={sizeClasses[size]} />;
      default:
        return <SunIcon className={sizeClasses[size]} />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={`${buttonSizeClasses[size]} rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation ${showLabel ? 'flex items-center space-x-2' : ''}`}
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
      aria-label={`Switch theme. Current: ${getThemeLabel()}`}
    >
      {getThemeIcon()}
      {showLabel && (
        <span className="text-sm font-medium hidden sm:inline">
          {getThemeLabel()}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;