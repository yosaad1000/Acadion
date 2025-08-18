import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UnenrollConfirmation from '../components/UnenrollConfirmation';
import { useSubjects, useOptimizedMutation } from '../hooks/useOptimizedAPI';
import { performanceMonitor } from '../utils/performance';
import { 
  PlusIcon, 
  BookOpenIcon, 
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface EnrolledSubject {
  subject_id: string;
  subject_code: string;
  name: string;
  description: string;
  teacher_name: string;
  student_count: number;
  created_at: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [unenrollingSubject, setUnenrollingSubject] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Use optimized API hook with caching
  const { data: subjects = [], loading, error, refetch, invalidateCache } = useSubjects();
  
  // Optimized unenrollment mutation
  const { mutate: unenrollMutation, loading: isUnenrolling } = useOptimizedMutation(
    async (subjectId: string) => {
      const response = await fetch(`/api/subjects/${subjectId}/enrollment`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to unenroll from class');
      }
      
      return response.json();
    },
    {
      onSuccess: () => {
        setNotification({
          type: 'success',
          message: 'Successfully unenrolled from class'
        });
        // Invalidate subjects cache to refresh the list
        invalidateCache();
        refetch();
      },
      onError: (error) => {
        setNotification({
          type: 'error',
          message: error.message || 'Failed to unenroll from class'
        });
      },
      invalidatePatterns: ['user_subjects', 'dashboard_']
    }
  );

  // Memoized calculations for better performance
  const dashboardStats = useMemo(() => {
    const endTimer = performanceMonitor.startTimer('dashboard_stats_calculation');
    
    const stats = {
      totalClasses: subjects.length,
      todayClasses: 0, // This would need actual schedule data
      faceRegistered: user?.is_face_registered || false
    };
    
    endTimer();
    return stats;
  }, [subjects.length, user?.is_face_registered]);

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

  const handleUnenrollClick = (e: React.MouseEvent, subjectId: string) => {
    e.preventDefault(); // Prevent navigation to class page
    e.stopPropagation();
    setUnenrollingSubject(subjectId);
  };

  const handleUnenrollConfirm = async () => {
    if (!unenrollingSubject) return;

    try {
      await unenrollMutation(unenrollingSubject);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Unenrollment failed:', error);
    } finally {
      setUnenrollingSubject(null);
    }
  };

  const handleCloseConfirmation = () => {
    setUnenrollingSubject(null);
  };

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  const selectedSubject = subjects.find(s => s.subject_id === unenrollingSubject);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${
          notification.type === 'success' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'
        } border-l-4 p-4 rounded shadow-lg`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XMarkIcon className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setNotification(null)}
                className="inline-flex text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Classes
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name}! Here are your enrolled classes.
              </p>
            </div>
            
            <Link
              to="/join-class"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Join Class
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
                <div className="text-sm text-gray-600">Enrolled Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.todayClasses}</div>
                <div className="text-sm text-gray-600">Today's Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {dashboardStats.faceRegistered ? 'Yes' : 'No'}
                </div>
                <div className="text-sm text-gray-600">Face Registered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Face Registration Alert */}
        {!user?.is_face_registered && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Face Registration Required
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Register your face for automatic attendance tracking.
                </p>
              </div>
              <Link
                to="/profile"
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                Register Now →
              </Link>
            </div>
          </div>
        )}

        {/* Enrolled Classes */}
        {subjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No classes joined yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Join a class using the class code provided by your teacher.
            </p>
            <div className="mt-6">
              <Link
                to="/join-class"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Join Your First Class
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Your Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subjects.map((subject, index) => {
                const isCurrentlyUnenrolling = isUnenrolling && unenrollingSubject === subject.subject_id;
                
                return (
                  <div key={subject.subject_id} className="relative group">
                    <Link
                      to={`/class/${subject.subject_id}`}
                      className={`block ${isCurrentlyUnenrolling ? 'pointer-events-none' : ''}`}
                    >
                      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 ${
                        isCurrentlyUnenrolling ? 'opacity-50 scale-95' : ''
                      }`}>
                        {/* Class Header with Color */}
                        <div className={`${getSubjectColor(index)} h-24 relative`}>
                          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                          <div className="relative p-4 text-white">
                            <h3 className="font-semibold text-lg truncate pr-8">{subject.name}</h3>
                            <p className="text-sm opacity-90">{subject.subject_code}</p>
                          </div>
                          {/* Unenroll Button or Loading Spinner */}
                          {isCurrentlyUnenrolling ? (
                            <div className="absolute top-2 right-2 p-1.5">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleUnenrollClick(e, subject.subject_id)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 transition-all duration-200 opacity-0 group-hover:opacity-100"
                              title="Unenroll from class"
                              disabled={isUnenrolling}
                            >
                              <XMarkIcon className="h-4 w-4 text-white" />
                            </button>
                          )}
                        </div>
                        
                        {/* Class Info */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">{subject.teacher_name}</span>
                            <div className="flex items-center text-sm text-gray-500">
                              <UserGroupIcon className="h-4 w-4 mr-1" />
                              {subject.student_count}
                            </div>
                          </div>
                          
                          {subject.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {subject.description}
                            </p>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            Joined {new Date(subject.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {/* Loading overlay */}
                        {isCurrentlyUnenrolling && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-2"></div>
                              <p className="text-sm text-gray-600">Unenrolling...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unenroll Confirmation Dialog */}
      <UnenrollConfirmation
        isOpen={!!unenrollingSubject}
        onClose={handleCloseConfirmation}
        onConfirm={handleUnenrollConfirm}
        subjectName={selectedSubject?.name || ''}
        subjectCode={selectedSubject?.subject_code || ''}
      />
    </div>
  );
};

export default StudentDashboard;