import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import { 
  ArrowLeftIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  CameraIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface ClassData {
  subject_id: string;
  subject_code: string;
  name: string;
  description: string;
  teacher_name: string;
  invite_code: string;
  student_count: number;
  created_at: string;
}

interface Student {
  user_id: string;
  name: string;
  email: string;
  is_face_registered: boolean;
}

const ClassRoom: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<'stream' | 'people' | 'attendance'>('stream');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      if (user?.user_type === 'teacher') {
        fetchStudents();
      }
    }
  }, [classId]);

  const fetchClassData = async () => {
    try {
      const response = await fetch(`/api/subjects/${classId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClassData(data);
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Class not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
                <p className="text-sm text-gray-600">
                  {classData.subject_code} • {classData.teacher_name}
                </p>
              </div>
            </div>
            
            {user?.user_type === 'teacher' && (
              <div className="flex items-center space-x-3">
                <InviteCodeDisplay code={classData.invite_code} size="md" />
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('stream')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stream'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Stream
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'people'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                People
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attendance
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'stream' && (
          <div className="space-y-6">
            {/* Class Info Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
              {classData.description && (
                <p className="text-gray-600 mb-4">{classData.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center">
                  <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span>{classData.student_count} students</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span>Created {new Date(classData.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <InviteCodeDisplay code={classData.invite_code} size="sm" showLabel={false} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {user?.user_type === 'teacher' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigate(`/take-attendance/${classData.subject_id}`)}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <CameraIcon className="h-8 w-8 text-blue-500 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Take Attendance</div>
                      <div className="text-sm text-gray-500">Use face recognition</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => navigate(`/take-attendance/${classData.subject_id}`)}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <ClipboardDocumentListIcon className="h-8 w-8 text-green-500 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Manual Attendance</div>
                      <div className="text-sm text-gray-500">Mark manually</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'people' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Class Members ({classData.student_count + 1})
              </h2>
            </div>
            
            {/* Teacher */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Teacher</h3>
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {classData.teacher_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{classData.teacher_name}</div>
                  <div className="text-sm text-gray-500">Teacher</div>
                </div>
              </div>
            </div>

            {/* Students */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Students ({classData.student_count})
              </h3>
              {students.length > 0 ? (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.user_id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {student.is_face_registered ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Face Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Face Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No students have joined yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Records</h2>
            <p className="text-gray-500 text-center py-8">Attendance tracking coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassRoom;