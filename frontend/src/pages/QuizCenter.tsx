import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  duration: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  createdDate: string;
  attempts: number;
  bestScore?: number;
  status: 'available' | 'completed' | 'in-progress';
}

interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number; // in minutes
}

const QuizCenter: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockQuizzes: Quiz[] = [
      {
        id: '1',
        title: 'Machine Learning Fundamentals',
        description: 'Test your understanding of basic ML concepts, algorithms, and applications',
        questionCount: 15,
        duration: 30,
        difficulty: 'medium',
        subject: 'Machine Learning',
        createdDate: '2024-01-15',
        attempts: 2,
        bestScore: 85,
        status: 'completed'
      },
      {
        id: '2',
        title: 'Data Structures Quiz',
        description: 'Arrays, linked lists, stacks, queues, and trees',
        questionCount: 20,
        duration: 45,
        difficulty: 'hard',
        subject: 'Computer Science',
        createdDate: '2024-01-14',
        attempts: 1,
        bestScore: 72,
        status: 'completed'
      },
      {
        id: '3',
        title: 'Algorithm Complexity',
        description: 'Big O notation, time and space complexity analysis',
        questionCount: 12,
        duration: 25,
        difficulty: 'medium',
        subject: 'Algorithms',
        createdDate: '2024-01-13',
        attempts: 0,
        status: 'available'
      },
      {
        id: '4',
        title: 'Python Basics',
        description: 'Variables, functions, loops, and basic data types',
        questionCount: 10,
        duration: 20,
        difficulty: 'easy',
        subject: 'Programming',
        createdDate: '2024-01-12',
        attempts: 3,
        bestScore: 95,
        status: 'completed'
      }
    ];

    const mockAttempts: QuizAttempt[] = [
      {
        id: '1',
        quizId: '1',
        score: 85,
        totalQuestions: 15,
        completedAt: '2024-01-15T14:30:00',
        timeSpent: 28
      },
      {
        id: '2',
        quizId: '2',
        score: 72,
        totalQuestions: 20,
        completedAt: '2024-01-14T16:45:00',
        timeSpent: 42
      },
      {
        id: '3',
        quizId: '4',
        score: 95,
        totalQuestions: 10,
        completedAt: '2024-01-12T10:15:00',
        timeSpent: 18
      }
    ];

    setQuizzes(mockQuizzes);
    setRecentAttempts(mockAttempts);
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'hard': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const generateQuiz = async () => {
    setLoading(true);
    // Simulate quiz generation
    setTimeout(() => {
      const newQuiz: Quiz = {
        id: Date.now().toString(),
        title: 'AI-Generated Quiz',
        description: 'Automatically generated based on your study materials',
        questionCount: 15,
        duration: 30,
        difficulty: 'medium',
        subject: 'Generated Content',
        createdDate: new Date().toISOString().split('T')[0],
        attempts: 0,
        status: 'available'
      };
      setQuizzes(prev => [newQuiz, ...prev]);
      setLoading(false);
    }, 2000);
  };

  const subjects = Array.from(new Set(quizzes.map(q => q.subject)));
  
  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesDifficulty = selectedDifficulty === 'all' || quiz.difficulty === selectedDifficulty;
    const matchesSubject = selectedSubject === 'all' || quiz.subject === selectedSubject;
    return matchesDifficulty && matchesSubject;
  });

  const averageScore = recentAttempts.length > 0 
    ? Math.round(recentAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.totalQuestions * 100), 0) / recentAttempts.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Quiz Center
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Test your knowledge with AI-generated quizzes
              </p>
            </div>
            
            <button
              onClick={generateQuiz}
              disabled={loading}
              className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm inline-flex items-center justify-center sm:justify-start"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              )}
              <span className="text-sm sm:text-base">
                {loading ? 'Generating...' : 'Generate Quiz'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6 sm:py-8">
        {/* Stats Overview */}
        <div className="grid-responsive-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {quizzes.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Available Quizzes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <TrophyIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {averageScore}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Average Score</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {quizzes.filter(q => q.status === 'completed').length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {recentAttempts.length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Attempts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quizzes List */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Available Quizzes ({filteredQuizzes.length})
            </h2>
            
            <div className="space-y-4">
              {filteredQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {quiz.title}
                        </h3>
                        {getStatusIcon(quiz.status)}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-3">
                        {quiz.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          {quiz.questionCount} questions
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {quiz.duration} minutes
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                          {quiz.difficulty}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {quiz.subject}
                        </span>
                      </div>
                      
                      {quiz.bestScore && (
                        <div className="flex items-center text-sm text-green-600 dark:text-green-400 mb-3">
                          <StarIcon className="h-4 w-4 mr-1" />
                          Best Score: {quiz.bestScore}% ({quiz.attempts} attempts)
                        </div>
                      )}
                    </div>
                    
                    <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center">
                      <PlayIcon className="h-4 w-4 mr-2" />
                      {quiz.status === 'completed' ? 'Retake' : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredQuizzes.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No quizzes found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your filters or generate a new quiz
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Attempts Sidebar */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Attempts
            </h2>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {recentAttempts.length === 0 ? (
                <div className="p-6 text-center">
                  <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No attempts yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentAttempts.map((attempt) => {
                    const quiz = quizzes.find(q => q.id === attempt.quizId);
                    const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
                    
                    return (
                      <div key={attempt.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                            {quiz?.title}
                          </h4>
                          <span className={`text-sm font-semibold ${
                            percentage >= 80 ? 'text-green-600' : 
                            percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <div>{attempt.score}/{attempt.totalQuestions} correct</div>
                          <div>{attempt.timeSpent} minutes</div>
                          <div>{new Date(attempt.completedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-6 space-y-3">
              <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center">
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Analytics
              </button>
              
              <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Study Materials
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizCenter;