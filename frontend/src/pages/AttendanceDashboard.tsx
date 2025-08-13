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
  created_at: string;
}

interface AttendanceStats {
  total_students: number;
  total_sessions: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchAttendanceData();
      fetchStudents();
    }
  }, [classId, selectedDate]);

  const fetchClassData = async () => {
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

  const fetchAttendanceData = async () => {
    try {
      const response = await fetch(`/api/attendance/${classId}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats({
          total_students: data.total_students,
          total_sessions: data.total_sessions,
          present_today: data.attendance_records.filter((r: any) => 
            r.date === selectedDate && r.status === 'present'
          ).length,
          absent_today: data.total_students - data.attendance_records.filter((r: any) => 
            r.date === selectedDate && r.status === 'present'
          ).length,
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

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

        {/* Today's Attendance */}
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