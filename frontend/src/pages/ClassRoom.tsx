import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useView } from '../contexts/ViewContext';
import { useToast } from '../contexts/ToastContext';
import Breadcrumb from '../components/ui/Breadcrumb';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import SessionList from '../components/Session/SessionList';
import CreateSession from '../components/Session/CreateSession';
import { 
  ArrowLeftIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  CameraIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { NoStudentsEmptyState } from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { SessionNotFoundError, SessionNetworkError } from '../components/ui/SessionErrorState';
import SessionManagementErrorBoundary from '../components/ui/SessionManagementErrorBoundary';

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
  const { user, currentRole } = useAuth();
  const { getClassView, setClassView, setLastVisitedClass, getBreadcrumbsForClass } = useView();
  const { showSuccess, showError } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  // Use view context to maintain tab state
  const [activeTab, setActiveTab] = useState<'sessions' | 'students' | 'settings'>(() => 
    classId ? getClassView(classId) : 'sessions'
  );
  const [loading, setLoading] = useState(true);
  const [showCreateSession, setShowCreateSession] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      if (currentRole === 'teacher') {
        fetchStudents();
      }
      // Set this as the last visited class
      setLastVisitedClass(classId);
      // Restore the last active tab for this class
      setActiveTab(getClassView(classId));
    }
  }, [classId, currentRole, setLastVisitedClass, getClassView]);

  const fetchClassData = async () => {
    try {
      const { apiCall } = await import('../lib/api');
      const response = await apiCall(`/api/subjects/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassData(data);
      } else {
        console.error('Failed to fetch class data:', response.status);
        showError('Failed to load class information. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      showError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { apiCall } = await import('../lib/api');
      const response = await apiCall(`/api/subjects/${classId}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        console.error('Failed to fetch students:', response.status);
        showError('Failed to load student list.');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showError('Unable to load student information.');
    }
  };

  const handleTabChange = (newTab: 'sessions' | 'students' | 'settings') => {
    setActiveTab(newTab);
    if (classId) {
      setClassView(classId, newTab);
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading class..." />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SessionNotFoundError
          onGoBack={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  return (
    <SessionManagementErrorBoundary
      context="class-management"
      onRetry={() => window.location.reload()}
      onGoBack={() => navigate('/dashboard')}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb - Hidden on mobile */}
          <div className="py-3 border-b border-gray-100 dark:border-gray-700 hidden sm:block">
            <Breadcrumb 
              items={getBreadcrumbsForClass(classId!, classData?.name)}
              className="text-sm"
            />
          </div>
          
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-3 sm:mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{classData.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {classData.subject_code} • {classData.teacher_name}
                </p>
              </div>
            </div>
            
            {currentRole === 'teacher' && (
              <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <InviteCodeDisplay code={classData.invite_code} size="sm" />
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md touch-manipulation">
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => handleTabChange('sessions')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap touch-manipulation ${
                  activeTab === 'sessions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Sessions
              </button>
              <button
                onClick={() => handleTabChange('students')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap touch-manipulation ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => handleTabChange('settings')}
                className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap touch-manipulation ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'sessions' && (
          <div>
            <SessionList 
              subjectId={classId!} 
              onCreateSession={() => setShowCreateSession(true)}
            />
          </div>
        )}

        {activeTab === 'students' && (
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
                <NoStudentsEmptyState
                  inviteCode={classData.invite_code}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Class Information */}
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
            {currentRole === 'teacher' ? (
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
                    onClick={() => navigate(`/attendance-dashboard/${classData.subject_id}`)}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <ChartBarIcon className="h-8 w-8 text-green-500 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">View Reports</div>
                      <div className="text-sm text-gray-500">Attendance analytics</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Student Quick Actions */
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigate(`/student-attendance/${classData.subject_id}`)}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <CalendarIcon className="h-8 w-8 text-green-500 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">View My Attendance</div>
                      <div className="text-sm text-gray-500">Check attendance history</div>
                    </div>
                  </button>
                  {!user?.is_face_registered && (
                    <button 
                      onClick={() => navigate('/register-face')}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <CameraIcon className="h-8 w-8 text-blue-500 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Register Face</div>
                        <div className="text-sm text-gray-500">Enable auto attendance</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      <CreateSession
        subjectId={classId!}
        isOpen={showCreateSession}
        onClose={() => setShowCreateSession(false)}
        onSuccess={(sessionId) => {
          // Navigate to the new session detail page
          navigate(`/class/${classId}/session/${sessionId}`);
        }}
      />
    </div>
    </SessionManagementErrorBoundary>
  );
};

export default ClassRoom;