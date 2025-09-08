import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  session_id?: string;
  session_name?: string;
  session_time?: string;
  created_at: string;
}

interface SessionData {
  session_id: string;
  session_name: string;
  session_time: string;
  date: string;
  student_count: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

interface AttendanceStats {
  total_students: number;
  total_sessions: number;
  sessions_today: number;
  present_today: number;
  absent_today: number;
  attendance_rate: number;
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'sessions' | 'students'>('overview');

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchAttendanceData();
      fetchStudents();
      fetchSessions();
    }
  }, [classId, selectedDate]);

  const fetchClassData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/subjects/${classId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
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

  const fetchAttendanceData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/attendance/${classId}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const todayRecords = data.attendance_records.filter((r: any) => r.date === selectedDate);
        const uniqueSessionsToday = new Set(todayRecords.map((r: any) => r.session_id || 'default')).size;
        
        setStats({
          total_students: data.total_students,
          total_sessions: data.total_sessions,
          sessions_today: uniqueSessionsToday,
          present_today: todayRecords.filter((r: any) => r.status === 'present').length,
          absent_today: data.total_students - todayRecords.filter((r: any) => r.status === 'present').length,
          attendance_rate: data.total_students > 0 ? 
            (data.attendance_records.filter((r: any) => r.status === 'present').length / 
             (data.total_students * data.total_sessions)) * 100 : 0
        });
        setAttendanceRecords(data.attendance_records);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/attendance/${classId}/sessions?attendance_date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const sessionData = await response.json();
        
        // Enhance session data with attendance statistics
        const enhancedSessions = await Promise.all(
          sessionData.map(async (session: any) => {
            const sessionResponse = await fetch(
              `http://localhost:8000/api/attendance/${classId}/sessions/${session.session_id}?attendance_date=${selectedDate}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
                }
              }
            );
            
            if (sessionResponse.ok) {
              const sessionRecords = await sessionResponse.json();
              const presentCount = sessionRecords.filter((r: any) => r.status === 'present').length;
              const lateCount = sessionRecords.filter((r: any) => r.status === 'late').length;
              const totalStudents = stats?.total_students || sessionRecords.length;
              
              return {
                ...session,
                present_count: presentCount,
                late_count: lateCount,
                absent_count: totalStudents - presentCount - lateCount,
                attendance_rate: totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0
              };
            }
            
            return {
              ...session,
              present_count: 0,
              late_count: 0,
              absent_count: stats?.total_students || 0,
              attendance_rate: 0
            };
          })
        );
        
        setSessions(enhancedSessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Calculate attendance stats for each student
        const studentsWithStats = data.map((student: any) => {
          const studentRecords = attendanceRecords.filter(r => r.student_id === student.user_id);
          const presentCount = studentRecords.filter(r => r.status === 'present').length;
          const totalSessions = stats?.total_sessions || 1;
          
          return {
            ...student,
            attendance_count: presentCount,
            attendance_rate: (presentCount / totalSessions) * 100,
            last_attendance: studentRecords.length > 0 ? 
              studentRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
              'Never'
          };
        });
        
        setStudents(studentsWithStats);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayRecords = attendanceRecords.filter(record => record.date === selectedDate);

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
                <div className="text-2xl font-bold text-gray-900">{stats?.sessions_today || 0}</div>
                <div className="text-sm text-gray-600">Sessions Today</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.present_today || 0}</div>
                <div className="text-sm text-gray-600">Present Today</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.absent_today || 0}</div>
                <div className="text-sm text-gray-600">Absent Today</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.attendance_rate ? `${stats.attendance_rate.toFixed(1)}%` : '0%'}
                </div>
                <div className="text-sm text-gray-600">Overall Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setSelectedView('overview')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  selectedView === 'overview'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Daily Overview
              </button>
              <button
                onClick={() => setSelectedView('sessions')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  selectedView === 'sessions'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Session Breakdown
              </button>
              <button
                onClick={() => setSelectedView('students')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  selectedView === 'students'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Student Overview
              </button>
            </div>
          </div>
        </div>

        {/* Session Breakdown View */}
        {selectedView === 'sessions' && (
          <>
            {/* Session Timeline */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Session Timeline</h3>
              </div>
              <div className="p-6">
                {sessions.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {sessions
                      .sort((a, b) => (a.session_time || '').localeCompare(b.session_time || ''))
                      .map((session, index) => (
                        <div key={session.session_id} className="relative flex items-center mb-8 last:mb-0">
                          {/* Timeline dot */}
                          <div className={`absolute left-6 w-4 h-4 rounded-full border-2 bg-white ${
                            session.attendance_rate >= 80 ? 'border-green-500' :
                            session.attendance_rate >= 60 ? 'border-yellow-500' : 'border-red-500'
                          }`}></div>
                          
                          {/* Session card */}
                          <div className="ml-16 flex-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">{session.session_name}</h4>
                                <p className="text-sm text-gray-600">{session.session_time}</p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">{session.present_count}</div>
                                  <div className="text-xs text-gray-500">Present</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-yellow-600">{session.late_count}</div>
                                  <div className="text-xs text-gray-500">Late</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-red-600">{session.absent_count}</div>
                                  <div className="text-xs text-gray-500">Absent</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">{session.attendance_rate.toFixed(1)}%</div>
                                  <div className="text-xs text-gray-500">Rate</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No sessions found for this date
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Session Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border mb-8">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detailed Session Breakdown for {new Date(selectedDate).toLocaleDateString()}
                </h3>
              </div>
            
            <div className="divide-y divide-gray-200">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.session_id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 rounded-lg p-3 mr-4">
                          <ClockIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{session.session_name}</h4>
                          <p className="text-sm text-gray-600">
                            {session.session_time} • Session ID: {session.session_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {session.attendance_rate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Attendance Rate</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                          <div>
                            <div className="text-xl font-bold text-green-900">{session.present_count}</div>
                            <div className="text-sm text-green-700">Present</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <ClockIcon className="h-6 w-6 text-yellow-500 mr-2" />
                          <div>
                            <div className="text-xl font-bold text-yellow-900">{session.late_count}</div>
                            <div className="text-sm text-yellow-700">Late</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <XCircleIcon className="h-6 w-6 text-red-500 mr-2" />
                          <div>
                            <div className="text-xl font-bold text-red-900">{session.absent_count}</div>
                            <div className="text-sm text-red-700">Absent</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No sessions found for this date
                </div>
              )}
            </div>
          </div>
          </>
        )}

        {/* Daily Overview */}
        {selectedView === 'overview' && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance for {new Date(selectedDate).toLocaleDateString()}
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {todayRecords.length > 0 ? (
              todayRecords.map((record) => (
                <div key={record.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                      record.status === 'present' ? 'bg-green-100' : 
                      record.status === 'late' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {record.status === 'present' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : record.status === 'late' ? (
                        <ClockIcon className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{record.student_name}</div>
                      <div className="text-sm text-gray-500">
                        {record.method === 'face_recognition' ? 'Face Recognition' : 'Manual'} • 
                        {new Date(record.created_at).toLocaleTimeString()}
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
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No attendance records for this date
              </div>
            )}
          </div>
        </div>
        )}

        {/* Student Overview */}
        {selectedView === 'students' && (
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
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
