import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  overview: {
    totalStudents: number;
    activeClasses: number;
    totalAssignments: number;
    avgEngagement: number;
  };
  engagement: {
    daily: { date: string; value: number }[];
    weekly: { week: string; value: number }[];
  };
  performance: {
    classAverages: { className: string; average: number }[];
    subjectPerformance: { subject: string; score: number }[];
  };
  usage: {
    featureUsage: { feature: string; usage: number }[];
    peakHours: { hour: number; activity: number }[];
  };
}

const TeacherAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'performance' | 'usage'>('engagement');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalyticsData({
        overview: {
          totalStudents: 156,
          activeClasses: 8,
          totalAssignments: 24,
          avgEngagement: 78
        },
        engagement: {
          daily: [
            { date: '2024-11-15', value: 85 },
            { date: '2024-11-16', value: 92 },
            { date: '2024-11-17', value: 78 },
            { date: '2024-11-18', value: 88 },
            { date: '2024-11-19', value: 95 },
            { date: '2024-11-20', value: 82 },
            { date: '2024-11-21', value: 90 }
          ],
          weekly: [
            { week: 'Week 1', value: 82 },
            { week: 'Week 2', value: 88 },
            { week: 'Week 3', value: 85 },
            { week: 'Week 4', value: 91 }
          ]
        },
        performance: {
          classAverages: [
            { className: 'Computer Science 101', average: 87 },
            { className: 'Data Structures', average: 82 },
            { className: 'Algorithms', average: 89 },
            { className: 'Web Development', average: 91 }
          ],
          subjectPerformance: [
            { subject: 'Quizzes', score: 85 },
            { subject: 'Assignments', score: 88 },
            { subject: 'Projects', score: 92 },
            { subject: 'Participation', score: 79 }
          ]
        },
        usage: {
          featureUsage: [
            { feature: 'Document Upload', usage: 95 },
            { feature: 'AI Chat', usage: 78 },
            { feature: 'Quizzes', usage: 82 },
            { feature: 'Voice Interviews', usage: 65 }
          ],
          peakHours: [
            { hour: 9, activity: 45 },
            { hour: 10, activity: 78 },
            { hour: 11, activity: 92 },
            { hour: 14, activity: 85 },
            { hour: 15, activity: 88 },
            { hour: 16, activity: 72 }
          ]
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Comprehensive insights into your teaching effectiveness
              </p>
            </div>
            
            <div className="flex space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="semester">This Semester</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.overview.totalStudents}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.overview.activeClasses}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Classes</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.overview.totalAssignments}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Assignments</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-orange-500 dark:text-orange-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {analyticsData.overview.avgEngagement}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Engagement</div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setSelectedMetric('engagement')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMetric === 'engagement'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Engagement
          </button>
          <button
            onClick={() => setSelectedMetric('performance')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMetric === 'performance'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setSelectedMetric('usage')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedMetric === 'usage'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Usage
          </button>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedMetric === 'engagement' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Daily Engagement
                </h3>
                <div className="space-y-3">
                  {analyticsData.engagement.daily.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Weekly Trends
                </h3>
                <div className="space-y-3">
                  {analyticsData.engagement.weekly.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.week}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedMetric === 'performance' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Class Averages
                </h3>
                <div className="space-y-3">
                  {analyticsData.performance.classAverages.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.className}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${item.average}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.average}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Subject Performance
                </h3>
                <div className="space-y-3">
                  {analyticsData.performance.subjectPerformance.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.subject}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${item.score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {selectedMetric === 'usage' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Feature Usage
                </h3>
                <div className="space-y-3">
                  {analyticsData.usage.featureUsage.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.feature}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full"
                            style={{ width: `${item.usage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.usage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Peak Activity Hours
                </h3>
                <div className="space-y-3">
                  {analyticsData.usage.peakHours.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.hour}:00 - {item.hour + 1}:00
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${item.activity}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.activity}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Insights and Recommendations */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            AI-Powered Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                📈 Engagement Insight
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Student engagement peaks at 11 AM. Consider scheduling important content during this time for maximum impact.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🎯 Performance Tip
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                Voice interviews show 15% lower completion rates. Consider shorter sessions or better instructions.
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                💡 Feature Suggestion
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                AI Chat usage is high but quiz completion is low. Try integrating more interactive quizzes in chat sessions.
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                📊 Trend Alert
              </h4>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Class averages have improved by 8% this month. Your teaching methods are showing positive results!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;