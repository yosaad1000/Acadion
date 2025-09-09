import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon, UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const RoleSwitcher: React.FC = () => {
  const { currentRole, userRoles, switchRole, addRole } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSwitch = async (role: 'teacher' | 'student') => {
    if (role === currentRole) return;
    
    setIsLoading(true);
    try {
      if (userRoles.includes(role)) {
        // Switch to existing role
        await switchRole(role);
      } else {
        // Add new role and switch to it
        await addRole(role);
        await switchRole(role);
      }
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to switch role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    return role === 'teacher' ? (
      <AcademicCapIcon className="h-3 w-3 sm:h-4 sm:w-4" />
    ) : (
      <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
    );
  };

  const getRoleColor = (role: string) => {
    return role === 'teacher' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium ${getRoleColor(currentRole)} bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation`}
        disabled={isLoading}
        aria-label="Switch role"
      >
        {getRoleIcon(currentRole)}
        <span className="capitalize hidden xs:inline">{currentRole}</span>
        <ChevronDownIcon className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            Switch Role
          </div>
          
          {['student', 'teacher'].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role as 'teacher' | 'student')}
              className={`flex items-center w-full px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation ${
                role === currentRole ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
              } text-gray-700 dark:text-gray-300`}
              disabled={isLoading}
            >
              {getRoleIcon(role)}
              <span className="ml-2 capitalize flex-1 text-left">{role}</span>
              {userRoles.includes(role) ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
              ) : (
                <span className="text-xs text-blue-500 dark:text-blue-400">Add Role</span>
              )}
              {role === currentRole && (
                <span className="ml-2 text-xs text-green-600 dark:text-green-400">Current</span>
              )}
            </button>
          ))}
          
          <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
            Available: {userRoles.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;