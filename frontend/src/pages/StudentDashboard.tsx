import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  BookOpenIcon, 
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon
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
  const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledSubjects();
  }, []);

  const fetchEnrolledSubjects = async () => {
    try {
      const response = await fetch('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
                <div className="text-sm text-gray-600">Enrolled Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Today's Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {user?.is_face_registered ? 'Yes' : 'No'}
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
              {subjects.map((subject, index) => (
                <Link
                  key={subject.subject_id}
                  to={`/class/${subject.subject_id}`}
                  className="group"
                >
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Class Header with Color */}
                    <div className={`${getSubjectColor(index)} h-24 relative`}>
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="relative p-4 text-white">
                        <h3 className="font-semibold text-lg truncate">{subject.name}</h3>
                        <p className="text-sm opacity-90">{subject.subject_code}</p>
                      </div>
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;