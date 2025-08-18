import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData, useClassStudents } from '../hooks/useOptimizedAPI';
import { performanceMonitor, debounce } from '../utils/performance';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CameraIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  method: 'manual' | 'face_recognition';
  confidence_score?: number;
  created_at: string;
  session_id?: string;
  session_timestamp?: string;
}

interface AttendanceSession {
  session_id: string;
  session_timestamp: string;
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
}

interface AttendanceStats {
  total_students: number;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
  sessions_by_date: { [date: string]: AttendanceSession[] };
}

interface Student {
  user_id: string;
  name: string;
  email: string;
  attendance_count: number;
  attendance_rate: number;
  last_attendance: string;
}

const AttendanceDashboard: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // Use optimized API hooks with caching
  const { data: dashboardData, loading, error, refetch } = useDashboardData(classId || '');
  const { data: studentsData = [] } = useClassStudents(classId || '');

  // Extract data from optimized response
  const attendanceRecords = dashboardData?.records || [];
  const stats = dashboardData?.stats || null;
  const students = useMemo(() => {
    const endTimer = performanceMonitor.startTimer('students_stats_calculation');
    
    const studentsWithStats = studentsData.map((student: any) => {
      const studentRecords = attendanceRecords.filter((r: any) => r.student_id === student.user_id);
      const presentCount = studentRecords.filter((r: any) => r.status === 'present').length;
      const totalSessions = stats?.total_sessions || 1;
      
      return {
        ...student,
        attendance_count: presentCount,
        attendance_rate: (presentCount / totalSessions) * 100,
        last_attendance: studentRecords.length > 0 ? 
          studentRecords.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
          'Never'
      };
    });
    
    endTimer();
    return studentsWithStats;
  }, [studentsData, attendanceRecords, stats]);

  // Fetch class data separately (less frequently changing)
  useEffect(() => {
    const fetchClassData = async () => {
      if (!classId) return;
      
      try {
        const response = await fetch(`/api/subjects/${classId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setClassData(data);
        }
      } catch (error) {
        console.error('Error fetching class data:', error);
      }
    };

    fetchClassData();
  }, [classId]);

  // Debounced date change handler to prevent excessive API calls
  const debouncedRefetch = useCallback(
    debounce(() => {
      refetch();
    }, 300),
    [refetch]
  );

  useEffect(() => {
    debouncedRefetch();
  }, [selectedDate, debouncedRefetch]);

  // Memoized filtering and sorting for better performance
  const { todayRecords, todaySessions } = useMemo(() => {
    const endTimer = performanceMonitor.startTimer('attendance_filtering_sorting');
    
    // Filter and sort attendance records for selected date
    const filtered = attendanceRecords
      .filter((record: any) => {
        const matchesDate = record.date === selectedDate;
        const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
        return matchesDate && matchesStatus;
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case 'name':
            return a.student_name.localeCompare(b.student_name);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'date':
          default:
            // Sort by session timestamp, then by created_at
            const aTime = a.session_timestamp || a.created_at;
            const bTime = b.session_timestamp || b.created_at;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
        }
      });

    // Group today's records by session
    const sessionsMap = new Map<string, any[]>();
    filtered.forEach((record: any) => {
      const sessionKey = record.session_id || `${record.date}_${record.session_timestamp || record.created_at}`;
      if (!sessionsMap.has(sessionKey)) {
        sessionsMap.set(sessionKey, []);
      }
      sessionsMap.get(sessionKey)!.push(record);
    });

    const sessions = Array.from(sessionsMap.entries()).map(([sessionKey, records]) => ({
      sessionKey,
      records: records.sort((a, b) => a.student_name.localeCompare(b.student_name)),
      timestamp: records[0]?.session_timestamp || records[0]?.created_at,
      sessionId: records[0]?.session_id
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    endTimer();
    return { todayRecords: filtered, todaySessions: sessions };
  }, [attendanceRecords, selectedDate, filterStatus, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/class/${classId}`)}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {classData?.name} • {classData?.subject_code}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={() => navigate(`/take-attendance/${classId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <CameraIcon className="h-4 w-4 mr-2" />
                Take Attendance
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.total_students || 0}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.total_sessions || 0}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.present_count || 0}</div>
                <div className="text-sm text-gray-600">Total Present</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.absent_count || 0}</div>
                <div className="text-sm text-gray-600">Total Absent</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.attendance_rate ? `${stats.attendance_rate}%` : '0%'}
                </div>
                <div className="text-sm text-gray-600">Overall Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Attendance Sessions */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance for {new Date(selectedDate).toLocaleDateString()}
              </h3>
              <div className="flex items-center space-x-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="date">Sort by Time</option>
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {todaySessions.length > 0 ? (
              todaySessions.map((session, sessionIndex) => (
                <div key={session.sessionKey} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium text-gray-900">
                        Session {sessionIndex + 1} - {new Date(session.timestamp).toLocaleTimeString()}
                      </h4>
                      {session.sessionId && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          ID: {session.sessionId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600">
                        {session.records.filter(r => r.status === 'present').length} Present
                      </span>
                      <span className="text-yellow-600">
                        {session.records.filter(r => r.status === 'late').length} Late
                      </span>
                      <span className="text-red-600">
                        {session.records.filter(r => r.status === 'absent').length} Absent
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    {session.records.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                            record.status === 'present' ? 'bg-green-100' : 
                            record.status === 'late' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            {record.status === 'present' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : record.status === 'late' ? (
                              <ClockIcon className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{record.student_name}</div>
                            <div className="text-sm text-gray-500">
                              {record.method === 'face_recognition' ? 'Face Recognition' : 'Manual'}
                              {record.confidence_score && (
                                <span className="ml-2">({(record.confidence_score * 100).toFixed(1)}% confidence)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No attendance records for this date
                {filterStatus !== 'all' && (
                  <div className="mt-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Show all records
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sessions Overview */}
        {stats?.sessions_by_date && Object.keys(stats.sessions_by_date).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">All Sessions Overview</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {Object.entries(stats.sessions_by_date)
                .slice(0, 10) // Show only recent 10 dates
                .map(([date, sessions]) => (
                <div key={date} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {new Date(date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid gap-2">
                    {sessions.map((session, index) => (
                      <div key={session.session_id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {session.session_timestamp ? 
                              new Date(session.session_timestamp).toLocaleTimeString() : 
                              `Session ${index + 1}`
                            }
                          </span>
                          {session.session_id && (
                            <span className="ml-2 px-2 py-1 bg-white text-gray-600 text-xs rounded border">
                              {session.session_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-green-600 font-medium">
                            {session.present_count} Present
                          </span>
                          {session.late_count > 0 && (
                            <span className="text-yellow-600 font-medium">
                              {session.late_count} Late
                            </span>
                          )}
                          {session.absent_count > 0 && (
                            <span className="text-red-600 font-medium">
                              {session.absent_count} Absent
                            </span>
                          )}
                          <span className="text-gray-500">
                            {session.total_records} total
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Overview */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Student Overview</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {students.map((student) => (
              <div key={student.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {student.attendance_count} sessions
                    </div>
                    <div className="text-sm text-gray-500">
                      {student.attendance_rate.toFixed(1)}% rate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Last seen</div>
                    <div className="text-sm font-medium text-gray-900">
                      {student.last_attendance !== 'Never' ? 
                        new Date(student.last_attendance).toLocaleDateString() : 
                        'Never'
                      }
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

export default AttendanceDashboard;