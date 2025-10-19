import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  overview: {
    totalStudyTime: number;
    documentsProcessed: number;
    quizzesCompleted: number;
    averageScore: number;
  };
  subjects: {
    name: string;
    progress: number;
    timeSpent: number;
    lastActivity: string;
    strengths: string[];
    weaknesses: string[];
  }[];
  weeklyActivity: {
    day: string;
    hours: number;
  }[];
  recommendations: string[];
}

const StudentAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester'>('week');

  // Mock data
  useEffect(() => {
    setAnalytics({
      overview: {
        totalStudyTime: 45.5,
        documentsProcessed: 12,
        quizzesCompleted: 8,
        averageScore: 87
      },
      subjects: [
        {
          name: 'Mathematics',
          progress: 78,
          timeSpent: 18.5,
          lastActivity: '2024-01-15T10:30:00Z',
          strengths: ['Algebra', 'Basic Calculus'],
          weaknesses: ['Geometry', 'Statistics']
        },
        {
          name: 'Physics',
          progress: 65,
          timeSpent: 15.2,
          lastActivity: '2024-01-14T14:20:00Z',
          strengths: ['Mechanics', 'Thermodynamics'],
          weaknesses: ['Electromagnetism', 'Optics']
        },
        {
          name: 'Chemistry',
          progress: 82,
          timeSpent: 11.8,
          lastActivity: '2024-01-13T16:45:00Z',
          strengths: ['Organic Chemistry', 'Stoichiometry'],
          weaknesses: ['Physical Chemistry']
        }
      ],
      weeklyActivity: [
        { day: 'Mon', hours: 2.5 },
        { day: 'Tue', hours: 3.2 },
        { day: 'Wed', hours: 1.8 },
        { day: 'Thu', hours: 4.1 },
        { day: 'Fri', hours: 2.9 },
        { day: 'Sat', hours: 3.5 },
        { day: 'Sun', hours: 1.2 }
      ],
      recommendations: [
        'Focus more on Geometry concepts in Mathematics',
        'Practice Electromagnetism problems in Physics',
        'Review Physical Chemistry fundamentals',
        'Increase daily study time to 3 hours for better retention'
      ]
    });
  }, []);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...analytics.weeklyActivity.map(d => d.hours));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Learning Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Track your progress and identify areas for improvement
            </p>
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="semester">This Semester</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.overview.totalStudyTime}h
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Study Time</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.overview.documentsProcessed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.overview.quizzesCompleted}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Quizzes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analytics.overview.averageScore}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Activity Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Weekly Study Activity
            </h3>
            <div className="space-y-3">
              {analytics.weeklyActivity.map((day) => (
                <div key={day.day} className="flex items-center">
                  <div className="w-8 text-sm text-gray-600 dark:text-gray-400">
                    {day.day}
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(day.hours / maxHours) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-gray-900 dark:text-gray-100 text-right">
                    {day.hours}h
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-500" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              {analytics.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
            Subject Progress
          </h3>
          <div className="space-y-6">
            {analytics.subjects.map((subject, index) => (
              <div key={subject.name} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {subject.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{subject.timeSpent}h studied</span>
                    <span>Last: {new Date(subject.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{subject.progress}%</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${subject.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Strengths and Weaknesses */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                      Strengths
                    </h5>
                    <div className="space-y-1">
                      {subject.strengths.map((strength, idx) => (
                        <span key={idx} className="inline-block bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded mr-2 mb-1">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                      Areas to Improve
                    </h5>
                    <div className="space-y-1">
                      {subject.weaknesses.map((weakness, idx) => (
                        <span key={idx} className="inline-block bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-xs px-2 py-1 rounded mr-2 mb-1">
                          {weakness}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;