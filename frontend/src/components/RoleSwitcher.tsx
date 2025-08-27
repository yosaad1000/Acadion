import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon, UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const RoleSwitcher: React.FC = () => {
  const { currentRole, userRoles, switchRole, addRole } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      <AcademicCapIcon className="h-4 w-4" />
    ) : (
      <UserIcon className="h-4 w-4" />
    );
  };

  const getRoleColor = (role: string) => {
    return role === 'teacher' ? 'text-blue-600' : 'text-green-600';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${getRoleColor(currentRole)} bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        disabled={isLoading}
      >
        {getRoleIcon(currentRole)}
        <span className="capitalize">{currentRole}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
          <div className="px-3 py-2 text-xs text-gray-500 border-b">
            Switch Role
          </div>
          
          {['student', 'teacher'].map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role as 'teacher' | 'student')}
              className={`flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 ${
                role === currentRole ? 'bg-gray-50 font-medium' : ''
              }`}
              disabled={isLoading}
            >
              {getRoleIcon(role)}
              <span className="ml-2 capitalize">{role}</span>
              {userRoles.includes(role) ? (
                <span className="ml-auto text-xs text-gray-500">Active</span>
              ) : (
                <span className="ml-auto text-xs text-blue-500">Add Role</span>
              )}
              {role === currentRole && (
                <span className="ml-2 text-xs text-green-600">Current</span>
              )}
            </button>
          ))}
          
          <div className="px-3 py-2 text-xs text-gray-400 border-t">
            Available roles: {userRoles.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;