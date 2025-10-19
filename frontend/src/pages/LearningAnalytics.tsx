import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  LightBulbIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  studyTime: {
    daily: number[];
    weekly: number;
    monthly: number;
    total: number;
  };
  performance: {
    quizAverage: number;
    interviewScore: number;
    improvement: number;
    streak: number;
  };
  subjects: {
    name: string;
    progress: number;
    timeSpent: number;
    lastActivity: string;
    strength: 'weak' | 'average' | 'strong';
  }[];
  goals: {
    id: string;
    title: string;
    target: number;
    current: number;
    deadline: string;
    type: 'study-time' | 'quiz-score' | 'completion';
  }[];
  recommendations: string[];
}

const LearningAnalytics: React.FC = () => {
  const { user, currentRole } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockData: AnalyticsData = {
      studyTime: {
        daily: [45, 60, 30, 75, 90, 40, 55], // Last 7 days in minutes
        weekly: 395, // Total minutes this week
        monthly: 1680, // Total minutes this month
        total: 12450 // Total minutes all time
      },
      performance: {
        quizAverage: 82,
        interviewScore: 78,
        improvement: 12, // Percentage improvement
        streak: 5 // Days of consecutive activity
      },
      subjects: [
        {
          name: 'Machine Learning',
          progress: 75,
          timeSpent: 480, // minutes
          lastActivity: '2024-01-15',
          strength: 'strong'
        },
        {
          name: 'Data Structures',
          progress: 60,
          timeSpent: 360,
          lastActivity: '2024-01-14',
          strength: 'average'
        },
        {
          name: 'Algorithms',
          progress: 45,
          timeSpent: 240,
          lastActivity: '2024-01-13',
          strength: 'weak'
        },
        {
          name: 'Database Systems',
          progress: 85,
          timeSpent: 420,
          lastActivity: '2024-01-15',
          strength: 'strong'
        }
      ],
      goals: [
        {
          id: '1',
          title: 'Study 10 hours this week',
          target: 600, // minutes
          current: 395,
          deadline: '2024-01-21',
          type: 'study-time'
        },
        {
          id: '2',
          title: 'Achieve 85% quiz average',
          target: 85,
          current: 82,
          deadline: '2024-01-31',
          type: 'quiz-score'
        },
        {
          id: '3',
          title: 'Complete ML course',
          target: 100,
          current: 75,
          deadline: '2024-02-15',
          type: 'completion'
        }
      ],
      recommendations: [
        'Focus more time on Algorithms - your weakest subject',
        'Great progress in Machine Learning! Keep it up',
        'Try taking more practice quizzes to improve your average',
        'Consider scheduling regular study sessions for consistency',
        'Your interview skills are improving - practice more technical questions'
      ]
    };

    setTimeout(() => {
      setAnalyticsData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'average': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'weak': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getGoalProgress = (goal: any) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Learning Analytics
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Track your progress and identify areas for improvement
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'year')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6 sm:py-8">
        {/* Key Metrics */}
        <div className="grid-responsive-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatTime(analyticsData.studyTime.weekly)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Study Time (Week)</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <TrophyIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.performance.quizAverage}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Quiz Average</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  +{analyticsData.performance.improvement}%
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Improvement</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div className="ml-3 sm:ml-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.performance.streak}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Time Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Daily Study Time (Minutes)
              </h2>
              
              <div className="flex items-end space-x-2 h-48">
                {analyticsData.studyTime.daily.map((minutes, index) => {
                  const maxMinutes = Math.max(...analyticsData.studyTime.daily);
                  const height = (minutes / maxMinutes) * 100;
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative">
                        <div 
                          className="bg-blue-500 rounded-t transition-all duration-500"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {days[index]}
                      </div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {minutes}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Subject Progress
              </h2>
              
              <div className="space-y-4">
                {analyticsData.subjects.map((subject, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {subject.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrengthColor(subject.strength)}`}>
                          {subject.strength}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {subject.progress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatTime(subject.timeSpent)} studied</span>
                      <span>Last: {new Date(subject.lastActivity).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <PresentationChartLineIcon className="h-5 w-5 mr-2" />
                Goals
              </h2>
              
              <div className="space-y-4">
                {analyticsData.goals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  const isCompleted = progress >= 100;
                  
                  return (
                    <div key={goal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {goal.title}
                        </h4>
                        {isCompleted && (
                          <TrophyIcon className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {goal.type === 'study-time' ? formatTime(goal.current) : `${goal.current}${goal.type === 'quiz-score' ? '%' : ''}`} / 
                          {goal.type === 'study-time' ? formatTime(goal.target) : `${goal.target}${goal.type === 'quiz-score' ? '%' : ''}`}
                        </span>
                        <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <LightBulbIcon className="h-5 w-5 mr-2" />
                AI Recommendations
              </h2>
              
              <div className="space-y-3">
                {analyticsData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Actions
              </h2>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  Set New Goal
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  Export Report
                </button>
                <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                  Schedule Study
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningAnalytics;