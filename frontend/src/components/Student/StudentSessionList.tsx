import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateForDisplay } from '../../utils/dateTimeUtils';
import { 
  CalendarIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon,
  BookOpenIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface StudentSession {
  session_id: string;
  name: string;
  description?: string;
  session_date?: string;
  subject_id: string;
  subject_name: string;
  subject_code?: string;
  teacher_name: string;
  attendance_status: 'present' | 'absent' | 'pending' | 'processing';
  attendance_taken: boolean;
  assignment_count: number;
  has_overdue_assignments: boolean;
  created_at: string;
  updated_at: string;
}

interface AttendanceStats {
  total_sessions: number;
  attended_sessions: number;
  attendance_rate: number;
  streak_days: number;
  missed_sessions: number;
}

interface StudentSessionsResponse {
  sessions: StudentSession[];
  attendance_stats: AttendanceStats;
  total_count: number;
  page: number;
  page_size: number;
}

interface StudentSessionListProps {
  className?: string;
}

const StudentSessionList: React.FC<StudentSessionListProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user?.user_id) {
      fetchStudentSessions();
    }
  }, [user?.user_id, filter, page]);

  const fetchStudentSessions = async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);
      setError(null);

      const { apiCall } = await import('../../lib/api');
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20'
      });

      if (filter !== 'all') {
        params.append('filter_status', filter);
      }

      const response = await apiCall(`/api/students/${user.user_id}/sessions?${params}`);
      
      if (response.ok) {
        const data: StudentSessionsResponse = await response.json();
        setSessions(data.sessions);
        setAttendanceStats(data.attendance_stats);
        setTotalCount(data.total_count);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch sessions' }));
        setError(errorData.detail || 'Failed to fetch sessions');
      }
    } catch (err) {
      console.error('Error fetching student sessions:', err);
      setError('Unable to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <PendingIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAttendanceStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'processing':
        return 'Processing';
      default:
        return 'Pending';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading Sessions</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchStudentSessions}
            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Attendance Stats */}
      {attendanceStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {attendanceStats.total_sessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {attendanceStats.attended_sessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Attended</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {attendanceStats.attendance_rate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {attendanceStats.streak_days}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { key: 'all', label: 'All Sessions' },
          { key: 'present', label: 'Present' },
          { key: 'absent', label: 'Absent' },
          { key: 'pending', label: 'Pending' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setFilter(tab.key as any);
              setPage(1);
            }}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            No sessions found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? "You don't have any sessions yet. Sessions will appear here once your teachers create them."
              : `No sessions with ${filter} status found.`
            }
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              View all sessions
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const dateInfo = formatDateForDisplay(session.session_date);
            
            return (
              <div
                key={session.session_id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.name}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center">
                        <BookOpenIcon className="h-4 w-4 mr-1" />
                        <span>{session.subject_name}</span>
                        {session.subject_code && (
                          <span className="ml-1 text-gray-500">({session.subject_code})</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        <span>{session.teacher_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Attendance Status */}
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(session.attendance_status)}`}>
                    {getAttendanceStatusIcon(session.attendance_status)}
                    <span>{getAttendanceStatusText(session.attendance_status)}</span>
                  </div>
                </div>

                {/* Session Details */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  {/* Date */}
                  {dateInfo && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span className={dateInfo.urgent ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
                        {dateInfo.text}
                      </span>
                    </div>
                  )}

                  {/* Time */}
                  {session.session_date && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      <span>
                        {new Date(session.session_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}

                  {/* Assignments */}
                  {session.assignment_count > 0 && (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      <span>
                        {session.assignment_count} assignment{session.assignment_count !== 1 ? 's' : ''}
                        {session.has_overdue_assignments && (
                          <span className="ml-1 text-red-500 font-medium">(overdue)</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Attendance Status */}
                  {session.attendance_taken && (
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                      <span>Attendance taken</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {session.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {session.description}
                  </p>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalCount > sessions.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPage(page + 1)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:opacity-50"
              >
                Load more sessions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSessionList;