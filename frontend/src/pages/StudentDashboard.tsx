import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAIChat } from '../hooks/useAIChat';
import AIChatToggle from '../components/AIChat/AIChatToggle';
import AIChatInterface from '../components/AIChat/AIChatInterface';
import { StudentSessionList } from '../components/Student';
import { 
  PlusIcon, 
  BookOpenIcon, 
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  CameraIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
  ChartBarIcon
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
  console.log('🎓 StudentDashboard component rendered');
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<EnrolledSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'classes'>('sessions');
  
  // AI Chat integration
  const {
    isOpen: isChatOpen,
    messages: chatMessages,
    isTyping: isChatTyping,
    toggleChat,
    closeChat,
    sendMessage: sendChatMessage
  } = useAIChat();

  useEffect(() => {
    fetchEnrolledSubjects();
  }, []);

  const fetchEnrolledSubjects = async () => {
    try {
      const { getSubjects } = await import('../lib/api');
      const data = await getSubjects();
      setSubjects(data);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* AI Chat Components */}
      <AIChatToggle 
        isOpen={isChatOpen} 
        onClick={toggleChat}
      />
      <AIChatInterface
        isOpen={isChatOpen}
        onClose={closeChat}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        isTyping={isChatTyping}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Student Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Welcome back, {user?.name}! Track your sessions and manage your classes.
              </p>
            </div>
            
            <Link
              to="/join-class"
              className="btn-mobile bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm inline-flex items-center justify-center sm:justify-start"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="text-sm sm:text-base">Join Class</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-6 sm:py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <BookOpenIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{subjects.length}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Enrolled Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 dark:text-green-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">5</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Documents</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">3</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Quizzes Taken</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 dark:text-orange-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">87%</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* LMS Features Quick Access */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 sm:mb-8 transition-colors">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Learning Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Link
              to="/student/documents"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Documents</div>
            </Link>
            
            <Link
              to="/student/chat"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">AI Chat</div>
            </Link>
            
            <Link
              to="/student/quizzes"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ClipboardDocumentListIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Quizzes</div>
            </Link>
            
            <Link
              to="/student/interview"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <MicrophoneIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 dark:text-red-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Interview</div>
            </Link>
            
            <Link
              to="/student/analytics"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 dark:text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Analytics</div>
            </Link>
            
            <Link
              to="/student/schedule"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500 dark:text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Schedule</div>
            </Link>
          </div>
        </div>

        {/* Face Registration Alert */}
        {!user?.is_face_registered && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                  <CameraIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-blue-900 dark:text-blue-100">
                    Complete Your Setup
                  </h3>
                  <p className="text-sm sm:text-base text-blue-700 dark:text-blue-200 mt-1">
                    Register your face for automatic attendance tracking in all your classes.
                  </p>
                </div>
              </div>
              <Link
                to="/register-face"
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm inline-flex items-center justify-center sm:justify-start flex-shrink-0"
              >
                <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Register Face</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sessions'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            My Sessions
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'classes'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            My Classes
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'sessions' ? (
          <div>
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Your Sessions</h2>
            <StudentSessionList />
          </div>
        ) : (
          /* Enrolled Classes */
          subjects.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
              <BookOpenIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                No classes joined yet
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4 sm:px-0">
                Join a class using the class code provided by your teacher.
              </p>
              <div className="mt-4 sm:mt-6">
                <Link
                  to="/join-class"
                  className="btn-mobile bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 shadow-sm inline-flex items-center justify-center"
                >
                  <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="text-sm sm:text-base">Join Your First Class</span>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Your Classes</h2>
              <div className="grid-responsive-4">
                {subjects.map((subject, index) => (
                  <Link
                    key={subject.subject_id}
                    to={`/class/${subject.subject_id}`}
                    className="group touch-manipulation"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-200 group-hover:scale-[1.02] group-active:scale-[0.98]">
                      {/* Class Header with Color */}
                      <div className={`${getSubjectColor(index)} h-20 sm:h-24 relative`}>
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        <div className="relative p-3 sm:p-4 text-white">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{subject.name}</h3>
                          <p className="text-xs sm:text-sm opacity-90">{subject.subject_code}</p>
                        </div>
                      </div>
                      
                      {/* Class Info */}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate mr-2">{subject.teacher_name}</span>
                          <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                            <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {subject.student_count}
                          </div>
                        </div>
                        
                        {subject.description && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2 sm:mb-3">
                            {subject.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Joined {new Date(subject.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;