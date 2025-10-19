import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusIcon,
  UserGroupIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface ClassData {
  id: string;
  name: string;
  subject: string;
  code: string;
  description: string;
  studentCount: number;
  createdAt: string;
  lastActivity: string;
  status: 'active' | 'archived';
}

const TeacherClasses: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    setClasses([
      {
        id: '1',
        name: 'Advanced Mathematics',
        subject: 'Mathematics',
        code: 'MATH301',
        description: 'Calculus and advanced mathematical concepts',
        studentCount: 28,
        createdAt: '2024-01-10T10:00:00Z',
        lastActivity: '2024-01-15T14:30:00Z',
        status: 'active'
      },
      {
        id: '2',
        name: 'Physics Fundamentals',
        subject: 'Physics',
        code: 'PHYS101',
        description: 'Introduction to physics principles and laws',
        studentCount: 35,
        createdAt: '2024-01-08T09:00:00Z',
        lastActivity: '2024-01-15T11:20:00Z',
        status: 'active'
      },
      {
        id: '3',
        name: 'Chemistry Basics',
        subject: 'Chemistry',
        code: 'CHEM101',
        description: 'Basic chemistry concepts and laboratory work',
        studentCount: 22,
        createdAt: '2024-01-05T08:30:00Z',
        lastActivity: '2024-01-14T16:45:00Z',
        status: 'active'
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              My Classes
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your classes, students, and assignments
            </p>
          </div>
          
          <Link
            to="/create-class"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Class
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classes.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classes.reduce((sum, c) => sum + c.studentCount, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classes.length * 3}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Assignments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <div key={classItem.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Class Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <h3 className="text-lg font-semibold mb-1">{classItem.name}</h3>
                <p className="text-blue-100 text-sm">{classItem.code}</p>
              </div>
              
              {/* Class Content */}
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {classItem.description}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    {classItem.studentCount} students
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    classItem.status === 'active' 
                      ? 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                      : 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {classItem.status}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Last activity: {new Date(classItem.lastActivity).toLocaleDateString()}
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Link
                    to={`/class/${classItem.id}`}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </Link>
                  <button className="flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {classes.length === 0 && (
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No classes created yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first class
            </p>
            <div className="mt-6">
              <Link
                to="/create-class"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Class
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherClasses;