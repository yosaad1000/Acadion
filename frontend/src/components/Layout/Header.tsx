import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RoleSwitcher from '../RoleSwitcher';
import ThemeToggle from '../ThemeToggle';
import { NotificationBell } from '../notifications';
import { 
  Bars3Icon, 
  PlusIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  const { user, signOut, currentRole } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 safe-area-padding transition-colors">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left side */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile menu button */}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden touch-manipulation transition-colors"
                aria-label="Toggle mobile menu"
              >
                {showMobileMenu ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
              
              <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm sm:text-lg">A</span>
                </div>
                <span className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 hidden xs:block transition-colors">
                  Acadion
                </span>
              </Link>
            </div>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              {/* Theme Toggle */}
              <ThemeToggle size="md" />
              
              {/* Role Switcher */}
              <RoleSwitcher />
              
              {/* Notification Bell */}
              <NotificationBell size="md" />
              
              {/* Create/Join Button */}
              {currentRole === 'teacher' ? (
                <Link
                  to="/create-class"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  <span className="hidden lg:inline">Create</span>
                </Link>
              ) : (
                <Link
                  to="/join-class"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  <span className="hidden lg:inline">Join</span>
                </Link>
              )}

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation"
                  aria-label="User menu"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 capitalize mt-1 font-medium">
                        {currentRole}
                      </div>
                    </div>
                    
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Mobile */}
            <div className="flex md:hidden items-center space-x-2">
              {/* Mobile Theme Toggle */}
              <ThemeToggle size="sm" />
              
              {/* Mobile Notification Bell */}
              <NotificationBell size="sm" />
              
              {/* Mobile Create/Join Button */}
              {currentRole === 'teacher' ? (
                <Link
                  to="/create-class"
                  className="p-2 rounded-md text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation"
                  aria-label="Create class"
                >
                  <PlusIcon className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/join-class"
                  className="p-2 rounded-md text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation"
                  aria-label="Join class"
                >
                  <PlusIcon className="h-5 w-5" />
                </Link>
              )}

              {/* Mobile User Avatar */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors touch-manipulation"
                aria-label="User menu"
              >
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-black dark:bg-opacity-50" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-0 left-0 w-64 h-full bg-white dark:bg-gray-900 shadow-xl z-50 safe-area-padding transition-colors">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Acadion</span>
                </div>
                <ThemeToggle size="sm" showLabel />
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Role Switcher */}
              <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <RoleSwitcher />
              </div>
              
              {/* Mobile Notification Bell */}
              <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</span>
                  <NotificationBell size="sm" />
                </div>
              </div>
              
              {/* Navigation Links */}
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Dashboard
                </Link>
                
                {currentRole === 'teacher' ? (
                  <Link
                    to="/create-class"
                    className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Create Class
                  </Link>
                ) : (
                  <Link
                    to="/join-class"
                    className="block px-3 py-2 rounded-md text-base font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Join Class
                  </Link>
                )}
                
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Profile
                </Link>
              </div>
              
              {/* User Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 capitalize mt-1 font-medium">
                    {currentRole}
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile User Menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-black dark:bg-opacity-50" onClick={() => setShowUserMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-lg shadow-xl z-50 safe-area-padding transition-colors">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-lg">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 capitalize font-medium">
                    {currentRole}
                  </div>
                </div>
                <ThemeToggle size="sm" />
              </div>
              
              <div className="space-y-2">
                <Link
                  to="/profile"
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <UserCircleIcon className="h-5 w-5 mr-3" />
                  Profile
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;