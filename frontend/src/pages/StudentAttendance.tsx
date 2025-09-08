import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CameraIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  method: 'manual' | 'face_recognition';
  confidence_score?: number;
  created_at: string;
}

interface AttendanceStats {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

const StudentAttendance: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, isFetchingProfile } = useAuth();
  const [classData, setClassData] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch data if we have classId, user is authenticated, and not currently fetching profile
    if (classId && user && !isFetchingProfile) {
      fetchClassData();
      fetchAttendanceData();
    }
  }, [classId, selectedMonth, user, isFetchingProfile]);

  const fetchClassData = async () => {
    try {
      const { apiCall } = await import('../lib/api');
      const response = await apiCall(`/api/subjects/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setClassData(data);
      } else {
        console.error('Failed to fetch class data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const { apiCall } = await import('../lib/api');
      const response = await apiCall(`/api/attendance/${classId}`);
      if (response.ok) {
        const data = await response.json();
        const myRecords = data.filter((record: any) => record.student_id === user?.user_id);
        
        setAttendanceRecords(myRecords);
        
        // Calculate stats
        const presentCount = myRecords.filter((r: any) => r.status === 'present').length;
        const absentCount = myRecords.filter((r: any) => r.status === 'absent').length;
        const lateCount = myRecords.filter((r: any) => r.status === 'late').length;
        const totalSessions = myRecords.length;
        
        setStats({
          total_sessions: totalSessions,
          present_count: presentCount,
          absent_count: absentCount,
          late_count: lateCount,
          attendance_rate: totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0
        });
      } else {
        console.error('Failed to fetch attendance data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'late':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'absent':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = attendanceRecords.filter(record => 
    record.date.startsWith(selectedMonth)
  );

  if (loading || isFetchingProfile || !user) {
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
                <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
                <p className="text-sm text-gray-600">
                  {classData?.name} • {classData?.subject_code}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Face Registration Alert */}
        {!user?.is_face_registered && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Face Registration Required
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Register your face for automatic attendance tracking in future classes.
                </p>
              </div>
              <button
                onClick={() => navigate('/register-face')}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-900 bg-yellow-100 px-3 py-1 rounded"
              >
                Register Now
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-500" />
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
                <div className="text-sm text-gray-600">Present</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats?.absent_count || 0}</div>
                <div className="text-sm text-gray-600">Absent</div>
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
                <div className="text-sm text-gray-600">Attendance Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Progress */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats?.attendance_rate || 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>0%</span>
            <span className="font-medium">
              {stats?.attendance_rate ? `${stats.attendance_rate.toFixed(1)}%` : '0%'} Complete
            </span>
            <span>100%</span>
          </div>
          
          {stats && stats.attendance_rate < 75 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">
                  Your attendance is below 75%. Please attend classes regularly to maintain good standing.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Records */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance Records - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredRecords.length > 0 ? (
              filteredRecords
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3">
                        {getStatusIcon(record.status)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.method === 'face_recognition' ? (
                            <span className="flex items-center">
                              <CameraIcon className="h-4 w-4 mr-1" />
                              Face Recognition
                              {record.confidence_score && (
                                <span className="ml-2">({(record.confidence_score * 100).toFixed(1)}% confidence)</span>
                              )}
                            </span>
                          ) : (
                            'Manual Entry'
                          )} • {new Date(record.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
                <p>No attendance records found for the selected month.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;