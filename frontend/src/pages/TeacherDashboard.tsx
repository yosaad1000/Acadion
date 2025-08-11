import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import { 
  PlusIcon, 
  BookOpenIcon, 
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon
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
  const [subjects, setSubjects] = useState<TeachingSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachingSubjects();
  }, []);

  const fetchTeachingSubjects = async () => {
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

  const totalStudents = subjects.reduce((sum, subject) => sum + subject.student_count, 0);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{subjects.length}</div>
                <div className="text-sm text-gray-600">Classes Created</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Today's Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Attendance Today</div>
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
                        <span className="text-sm text-gray-600">You</span>
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
                      
                      <div className="mb-2">
                        <InviteCodeDisplay code={subject.invite_code} size="sm" />
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Created {new Date(subject.created_at).toLocaleDateString()}
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

export default TeacherDashboard;