import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  roles?: string[];
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Students', href: '/students', icon: '👥', roles: ['admin', 'faculty'] },
    { name: 'Register Student', href: '/students/register', icon: '👤', roles: ['admin', 'faculty'] },
    { name: 'Mark Attendance', href: '/attendance/upload', icon: '📸', roles: ['admin', 'faculty'] },
    { name: 'Attendance Reports', href: '/attendance/reports', icon: '📋', roles: ['admin', 'faculty'] },
    { name: 'Teachers', href: '/teachers', icon: '👨‍🏫', roles: ['admin'] },
    { name: 'Subjects', href: '/subjects', icon: '📚', roles: ['admin', 'faculty'] },
    { name: 'Departments', href: '/departments', icon: '🏢', roles: ['admin'] },
    { name: 'Analytics', href: '/analytics', icon: '📈', roles: ['admin', 'faculty'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'student')
  );

  return (
    <div className="w-full lg:w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 px-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Today's Classes</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Attendance Rate</span>
                <span className="font-medium text-green-600">85%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Students</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 px-3">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💡</span>
              <div>
                <h3 className="text-sm font-medium text-blue-900">Need Help?</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Check our documentation or contact support
                </p>
              </div>
            </div>
            <div className="mt-3">
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View API Docs →
              </a>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;