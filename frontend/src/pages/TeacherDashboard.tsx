import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAIChat } from '../hooks/useAIChat';
import ClassCard from '../components/ClassCard';
import AIChatToggle from '../components/AIChat/AIChatToggle';
import AIChatInterface from '../components/AIChat/AIChatInterface';
import { api } from '../lib/api';
import { 
  PlusIcon, 
  BookOpenIcon, 
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MicrophoneIcon,
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
  console.log('🏫 TeacherDashboard component rendered');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<TeachingSubject[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    fetchTeachingSubjects();
  }, []);

  const fetchTeachingSubjects = async () => {
    try {
      const response = await api.getSubjects();
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
                Teaching Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Welcome back, {user?.name}! Manage your classes and students.
              </p>
            </div>
            
            <Link
              to="/create-class"
              className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm inline-flex items-center justify-center sm:justify-start"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="text-sm sm:text-base">Create Class</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-6 sm:py-8">
        {/* Quick Stats */}
        <div className="grid-responsive-3 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <BookOpenIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{subjects.length}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Classes Created</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{subjects.length}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Active Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
            <div className="flex items-center">
              <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 dark:text-orange-400 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {subjects.length > 0 ? 'Ready' : 'None'}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Classes Status</div>
              </div>
            </div>
          </div>
        </div>

        {/* LMS Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 sm:mb-8 transition-colors">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Teaching Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link
              to="/teacher/classes"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Classes</div>
            </Link>
            
            <Link
              to="/teacher/content"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Content</div>
            </Link>
            
            <Link
              to="/teacher/assessments"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ClipboardDocumentListIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Assessments</div>
            </Link>
            
            <Link
              to="/teacher/progress"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 dark:text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Progress</div>
            </Link>
            
            <Link
              to="/teacher/interviews"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <MicrophoneIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 dark:text-red-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Interviews</div>
            </Link>
            
            <Link
              to="/teacher/analytics"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500 dark:text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">Analytics</div>
            </Link>
            
            <Link
              to="/teacher/ai-config"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <CogIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">AI Config</div>
            </Link>
            
            <Link
              to="/create-class"
              className="flex flex-col items-center p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation group"
            >
              <PlusIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 dark:text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 text-center">New Class</div>
            </Link>
          </div>
        </div>

        {/* Teaching Classes */}
        {subjects.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <BookOpenIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
              No classes created yet
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4 sm:px-0">
              Get started by creating your first classroom.
            </p>
            <div className="mt-4 sm:mt-6">
              <Link
                to="/create-class"
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 shadow-sm inline-flex items-center justify-center"
              >
                <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Create Your First Class</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">Your Classes</h2>
            <div className="grid-responsive-4">
              {subjects.map((subject, index) => (
                <ClassCard
                  key={subject.subject_id}
                  subject={subject}
                  index={index}
                  showInviteCode={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;