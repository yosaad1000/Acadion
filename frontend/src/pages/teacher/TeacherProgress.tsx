import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ChartBarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  class: string;
  overallScore: number;
  attendance: number;
  assignments: {
    completed: number;
    total: number;
  };
  lastActivity: string;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

const TeacherProgress: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attendance' | 'risk'>('score');

  const classes = ['all', 'MATH301', 'PHYS101', 'CHEM101'];

  // Mock data
  useEffect(() => {
    setStudents([
      {
        id: '1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        class: 'MATH301',
        overallScore: 92,
        attendance: 95,
        assignments: { completed: 8, total: 10 },
        lastActivity: '2024-01-15T14:30:00Z',
        trend: 'up',
        riskLevel: 'low'
      },
      {
        id: '2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        class: 'MATH301',
        overallScore: 78,
        attendance: 85,
        assignments: { completed: 6, total: 10 },
        lastActivity: '2024-01-14T10:20:00Z',
        trend: 'stable',
        riskLevel: 'medium'
      },
      {
        id: '3',
        name: 'Carol Davis',
        email: 'carol@example.com',
        class: 'PHYS101',
        overallScore: 65,
        attendance: 70,
        assignments: { completed: 4, total: 8 },
        lastActivity: '2024-01-12T16:45:00Z',
        trend: 'down',
        riskLevel: 'high'
      },
      {
        id: '4',
        name: 'David Wilson',
        email: 'david@example.com',
        class: 'PHYS101',
        overallScore: 88,
        attendance: 92,
        assignments: { completed: 7, total: 8 },
        lastActivity: '2024-01-15T11:15:00Z',
        trend: 'up',
        riskLevel: 'low'
      },
      {
        id: '5',
        name: 'Eva Brown',
        email: 'eva@example.com',
        class: 'CHEM101',
        overallScore: 94,
        attendance: 98,
        assignments: { completed: 9, total: 9 },
        lastActivity: '2024-01-15T13:20:00Z',
        trend: 'up',
        riskLevel: 'low'
      }
    ]);
  }, []);

  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students.filter(s => s.class === selectedClass);

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'score': return b.overallScore - a.overallScore;
      case 'attendance': return b.attendance - a.attendance;
      case 'risk': 
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      default: return 0;
    }
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full"></div>;
    }
  };

  const classStats = {
    totalStudents: filteredStudents.length,
    averageScore: Math.round(filteredStudents.reduce((sum, s) => sum + s.overallScore, 0) / filteredStudents.length) || 0,
    averageAttendance: Math.round(filteredStudents.reduce((sum, s) => sum + s.attendance, 0) / filteredStudents.length) || 0,
    atRiskStudents: filteredStudents.filter(s => s.riskLevel === 'high').length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      <div className="container-responsive py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Student Progress Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track student performance and identify those who need support
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {classes.map(cls => (
                <option key={cls} value={cls}>
                  {cls === 'all' ? 'All Classes' : cls}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="score">Sort by Score</option>
              <option value="name">Sort by Name</option>
              <option value="attendance">Sort by Attendance</option>
              <option value="risk">Sort by Risk Level</option>
            </select>
          </div>
        </div>

        {/* Class Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classStats.totalStudents}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classStats.averageScore}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Score</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classStats.averageAttendance}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Attendance</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {classStats.atRiskStudents}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">At Risk</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Student Progress Overview
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assignments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {student.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.class}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {student.overallScore}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${student.overallScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {student.attendance}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${student.attendance}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {student.assignments.completed}/{student.assignments.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTrendIcon(student.trend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(student.riskLevel)}`}>
                        {student.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(student.lastActivity).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedStudents.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Students will appear here once they join your classes
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProgress;