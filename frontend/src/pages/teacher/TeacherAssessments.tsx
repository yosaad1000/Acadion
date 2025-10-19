import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'exam' | 'assignment';
  class: string;
  questions: number;
  duration: number;
  status: 'draft' | 'published' | 'completed';
  submissions: number;
  totalStudents: number;
  averageScore: number;
  createdAt: string;
  dueDate: string;
}

const TeacherAssessments: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data
  useEffect(() => {
    setAssessments([
      {
        id: '1',
        title: 'Calculus Midterm Quiz',
        type: 'quiz',
        class: 'MATH301',
        questions: 15,
        duration: 45,
        status: 'published',
        submissions: 23,
        totalStudents: 28,
        averageScore: 87,
        createdAt: '2024-01-10T10:00:00Z',
        dueDate: '2024-01-20T23:59:00Z'
      },
      {
        id: '2',
        title: 'Physics Lab Report',
        type: 'assignment',
        class: 'PHYS101',
        questions: 5,
        duration: 120,
        status: 'completed',
        submissions: 35,
        totalStudents: 35,
        averageScore: 92,
        createdAt: '2024-01-05T09:00:00Z',
        dueDate: '2024-01-15T23:59:00Z'
      },
      {
        id: '3',
        title: 'Chemistry Final Exam',
        type: 'exam',
        class: 'CHEM101',
        questions: 50,
        duration: 180,
        status: 'draft',
        submissions: 0,
        totalStudents: 22,
        averageScore: 0,
        createdAt: '2024-01-15T14:00:00Z',
        dueDate: '2024-01-30T23:59:00Z'
      }
    ]);
  }, []);

  const filteredAssessments = activeTab === 'all' 
    ? assessments 
    : assessments.filter(a => a.status === activeTab);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
      case 'published': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz': return '📝';
      case 'exam': return '📋';
      case 'assignment': return '📄';
      default: return '📚';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Assessments & Quizzes
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Create and manage quizzes, exams, and assignments
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Assessment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assessments.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Assessments</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <PlayIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assessments.filter(a => a.status === 'published').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {assessments.reduce((sum, a) => sum + a.submissions, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Submissions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(assessments.filter(a => a.averageScore > 0).reduce((sum, a) => sum + a.averageScore, 0) / assessments.filter(a => a.averageScore > 0).length) || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'draft', 'published', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {tab} ({tab === 'all' ? assessments.length : assessments.filter(a => a.status === tab).length})
            </button>
          ))}
        </div>

        {/* Assessments List */}
        <div className="space-y-4">
          {filteredAssessments.map((assessment) => (
            <div key={assessment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getTypeIcon(assessment.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {assessment.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assessment.status)}`}>
                        {assessment.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        {assessment.class}
                      </span>
                      <span className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {assessment.duration} min
                      </span>
                      <span>{assessment.questions} questions</span>
                      <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                    </div>

                    {assessment.status !== 'draft' && (
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-gray-600 dark:text-gray-400">
                          Submissions: <span className="font-medium text-gray-900 dark:text-gray-100">
                            {assessment.submissions}/{assessment.totalStudents}
                          </span>
                        </div>
                        {assessment.averageScore > 0 && (
                          <div className="text-gray-600 dark:text-gray-400">
                            Average Score: <span className="font-medium text-gray-900 dark:text-gray-100">
                              {assessment.averageScore}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <ChartBarIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Cog6ToothIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAssessments.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No assessments found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create your first assessment to get started
            </p>
          </div>
        )}

        {/* Create Assessment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Create New Assessment
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assessment Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100">
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Enter assessment title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100">
                    <option value="MATH301">MATH301 - Advanced Mathematics</option>
                    <option value="PHYS101">PHYS101 - Physics Fundamentals</option>
                    <option value="CHEM101">CHEM101 - Chemistry Basics</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Questions
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration (min)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      placeholder="45"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Assessment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAssessments;