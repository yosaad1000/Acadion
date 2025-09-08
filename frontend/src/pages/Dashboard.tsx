import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import { PlusIcon, UserGroupIcon, BookOpenIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Subject {
  subject_id: string;
  subject_code: string;
  name: string;
  description: string;
  teacher_name: string;
  invite_code: string;
  student_count: number;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Debug logging
  console.log('Dashboard - Current user:', user);
  console.log('Dashboard - Current role:', currentRole);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      // For MVP, just set empty subjects array since we don't have subjects table yet
      // TODO: Implement subjects/classes functionality with Supabase
      setSubjects([]);
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
                {currentRole === 'teacher' ? 'Teaching' : 'Enrolled Classes'}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentRole === 'teacher' 
                  ? 'Manage your classes and students' 
                  : 'Access your enrolled classes'
                }
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              {currentRole === 'teacher' ? (
                <Link
                  to="/create-class"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Class
                </Link>
              ) : (
                <Link
                  to="/join-class"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Join Class
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {subjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {currentRole === 'teacher' ? 'No classes created' : 'No classes joined'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {currentRole === 'teacher' 
                ? 'Get started by creating your first class.' 
                : 'Join a class using the class code provided by your teacher.'
              }
            </p>
            <div className="mt-6">
              {currentRole === 'teacher' ? (
                <Link
                  to="/create-class"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Class
                </Link>
              ) : (
                <Link
                  to="/join-class"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Join Class
                </Link>
              )}
            </div>
          </div>
        ) : (
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
                      <span className="text-sm text-gray-600">
                        {currentRole === 'teacher' ? 'You' : subject.teacher_name}
                      </span>
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
                    
                    {currentRole === 'teacher' && (
                      <InviteCodeDisplay code={subject.invite_code} size="sm" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;