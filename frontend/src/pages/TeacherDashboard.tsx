import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import { useSubjects } from '../hooks/useOptimizedAPI';
import { performanceMonitor } from '../utils/performance';
import { 
  PlusIcon, 
  BookOpenIcon, 
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface TeachingSubject {
  subject_id: string;
  subject_code: string;
  name: string;
  description: string;
  invite_code: string;
  student_count: number;
  created_at: string;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use optimized API hook with caching
  const { data: subjects = [], loading, error, refetch } = useSubjects();

  // Memoized calculations for better performance
  const dashboardStats = useMemo(() => {
    // Add null/undefined check before performing calculations
    if (!subjects || !Array.isArray(subjects)) {
      return {
        totalClasses: 0,
        totalStudents: 0,
        activeClasses: 0
      };
    }

    const endTimer = performanceMonitor.startTimer('teacher_dashboard_stats');
    
    const totalStudents = subjects.reduce((total, subject) => total + (subject.student_count ?? 0), 0);
    const activeClasses = subjects.filter(subject => subject.student_count > 0).length;
    
    const stats = {
      totalClasses: subjects.length,
      totalStudents,
      activeClasses
    };
    
    endTimer();
    return stats;
  }, [subjects]);

  const getSubjectColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your classes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Classes</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Teaching Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name}! Manage your classes and students.
              </p>
            </div>
            
            <Link
              to="/create-class"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Class
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.totalClasses}</div>
                <div className="text-sm text-gray-600">Classes Created</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.activeClasses}</div>
                <div className="text-sm text-gray-600">Active Classes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/create-class"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PlusIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Create New Class</div>
                <div className="text-sm text-gray-500">Start a new classroom</div>
              </div>
            </Link>
            
            <Link
              to="/students"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClipboardDocumentListIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <div className="font-medium text-gray-900">View Attendance Reports</div>
                <div className="text-sm text-gray-500">Check attendance history</div>
              </div>
            </Link>
            
            <Link
              to="/students"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserGroupIcon className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <div className="font-medium text-gray-900">View All Students</div>
                <div className="text-sm text-gray-500">Manage student roster</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Teaching Classes */}
        {subjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No classes created yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first classroom.
            </p>
            <div className="mt-6">
              <Link
                to="/create-class"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Class
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Your Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subjects.map((subject, index) => (
                <div
                  key={subject.subject_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 group"
                >
                  {/* Class Header with Color */}
                  <div className={`${getSubjectColor(index)} h-24 relative`}>
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                    <div className="relative p-4 text-white flex justify-between items-start">
                      <Link
                        to={`/class/${subject.subject_id}`}
                        className="flex-1 min-w-0"
                      >
                        <h3 className="font-semibold text-lg truncate hover:text-gray-100 transition-colors">
                          {subject.name}
                        </h3>
                        <p className="text-sm opacity-90">{subject.subject_code}</p>
                      </Link>
                      
                      {/* Settings Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/class/${subject.subject_id}/settings`);
                        }}
                        className="ml-2 p-1.5 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        title="Class Settings"
                      >
                        <CogIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Class Info */}
                  <Link
                    to={`/class/${subject.subject_id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Teacher</span>
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {subject.student_count ?? 0} student{subject.student_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    {subject.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {subject.description}
                      </p>
                    )}
                    
                    <div className="mb-2">
                      <InviteCodeDisplay code={subject.invite_code} size="sm" />
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Created {new Date(subject.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;