import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeftIcon,
  CameraIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import CameraCapture from '../components/CameraCapture';

interface Student {
  user_id: string;
  name: string;
  email: string;
  is_face_registered: boolean;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late';
  method: 'manual' | 'face_recognition';
  confidence_score?: number;
  session_id?: string;
  session_name?: string;
  session_time?: string;
}

interface Session {
  session_id: string;
  session_name: string;
  session_time: string;
  date: string;
  student_count?: number;
}

const TakeAttendance: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState<any>(null);
  const [faceRecognitionMode, setFaceRecognitionMode] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [faceResults, setFaceResults] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session>({
    session_id: 'default',
    session_name: 'Default Session',
    session_time: new Date().toTimeString().slice(0, 5),
    date: new Date().toISOString().split('T')[0]
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchStudents();
      fetchSessions();
    }
  }, [classId]);

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

  const fetchStudents = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);

        // Initialize attendance records
        const initialAttendance: Record<string, AttendanceRecord> = {};
        data.forEach((student: Student) => {
          initialAttendance[student.user_id] = {
            student_id: student.user_id,
            status: 'absent',
            method: 'manual',
            session_id: currentSession.session_id,
            session_name: currentSession.session_name,
            session_time: currentSession.session_time
          };
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`http://localhost:8000/api/attendance/${classId}/sessions?attendance_date=${today}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        method: 'manual',
        session_id: currentSession.session_id,
        session_name: currentSession.session_name,
        session_time: currentSession.session_time
      }
    }));
  };

  const createNewSession = () => {
    const now = new Date();
    const sessionId = `session_${now.getTime()}`;
    const sessionTime = now.toTimeString().slice(0, 5);
    
    const newSession: Session = {
      session_id: sessionId,
      session_name: `Session ${sessions.length + 1}`,
      session_time: sessionTime,
      date: now.toISOString().split('T')[0]
    };
    
    setCurrentSession(newSession);
    setSessions(prev => [...prev, newSession]);
    
    // Reset attendance for new session
    const resetAttendance: Record<string, AttendanceRecord> = {};
    students.forEach((student: Student) => {
      resetAttendance[student.user_id] = {
        student_id: student.user_id,
        status: 'absent',
        method: 'manual',
        session_id: newSession.session_id,
        session_name: newSession.session_name,
        session_time: newSession.session_time
      };
    });
    setAttendance(resetAttendance);
    setShowSessionModal(false);
  };

  const switchToSession = (session: Session) => {
    setCurrentSession(session);
    
    // Reset attendance for selected session
    const resetAttendance: Record<string, AttendanceRecord> = {};
    students.forEach((student: Student) => {
      resetAttendance[student.user_id] = {
        student_id: student.user_id,
        status: 'absent',
        method: 'manual',
        session_id: session.session_id,
        session_name: session.session_name,
        session_time: session.session_time
      };
    });
    setAttendance(resetAttendance);
    setShowSessionModal(false);
  };

  const handleCameraCapture = async (file: File) => {
    await processPhotoForAttendance(file);
  };

  const handleFaceRecognition = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processPhotoForAttendance(file);
  };

  const processPhotoForAttendance = async (file: File) => {

    setUploadingPhoto(true);
    setFaceResults(null);

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = `http://localhost:8000/api/attendance/mark-face?subject_id=${classId}&session_id=${currentSession.session_id}&session_name=${encodeURIComponent(currentSession.session_name)}&session_time=${currentSession.session_time}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('🎯 Face Recognition Results:', result);

      // Store detailed results for UI display
      setFaceResults(result);

      if (response.ok && result.success) {
        // Try both recognized_students and identified_students (backend sends both)
        const studentsToUpdate = result.recognized_students || result.identified_students || [];

        // Update attendance for ALL recognized students
        if (studentsToUpdate && studentsToUpdate.length > 0) {
          const attendanceUpdates: any = {};

          studentsToUpdate.forEach((student: any) => {
            attendanceUpdates[student.student_id] = {
              student_id: student.student_id,
              status: 'present',
              method: 'face_recognition',
              confidence_score: student.similarity_score,
              session_id: currentSession.session_id,
              session_name: currentSession.session_name,
              session_time: currentSession.session_time
            };
          });

          setAttendance(prev => ({
            ...prev,
            ...attendanceUpdates
          }));
        }
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      setFaceResults({
        success: false,
        message: 'Network error occurred',
        faces_detected: 0,
        faces_recognized: 0,
        faces_unrecognized: 0
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      // Ensure all students have an attendance status (default to absent if not set)
      const completeAttendance = { ...attendance };
      students.forEach(student => {
        if (!completeAttendance[student.user_id]) {
          completeAttendance[student.user_id] = {
            student_id: student.user_id,
            status: 'absent',
            method: 'manual',
            session_id: currentSession.session_id,
            session_name: currentSession.session_name,
            session_time: currentSession.session_time
          };
        }
      });

      // Save ALL attendance records (present, absent, late)
      const attendanceRecords = Object.values(completeAttendance);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of attendanceRecords) {
        try {
          const response = await fetch('http://localhost:8000/api/attendance/manual', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
            },
            body: JSON.stringify({
              student_id: record.student_id,
              subject_id: classId,
              date: new Date().toISOString().split('T')[0],
              status: record.status,
              method: record.method,
              confidence_score: record.confidence_score,
              session_id: record.session_id || currentSession.session_id,
              session_name: record.session_name || currentSession.session_name,
              session_time: record.session_time || currentSession.session_time
            })
          });
          
          if (response.ok) {
            successCount++;
          } else {
            console.error(`Failed to save attendance for student ${record.student_id}: ${response.status}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error saving attendance for student ${record.student_id}:`, error);
          errorCount++;
        }
      }

      const totalRecords = attendanceRecords.length;
      const presentRecords = attendanceRecords.filter(r => r.status === 'present').length;
      const absentRecords = attendanceRecords.filter(r => r.status === 'absent').length;
      const lateRecords = attendanceRecords.filter(r => r.status === 'late').length;
      
      if (errorCount > 0) {
        alert(`Attendance saved with some issues.\n${successCount} of ${totalRecords} records saved successfully.\n\nSummary:\n- ${presentRecords} Present\n- ${absentRecords} Absent\n- ${lateRecords} Late`);
      } else {
        alert(`Attendance saved successfully!\n\nSummary:\n- ${presentRecords} Present\n- ${absentRecords} Absent\n- ${lateRecords} Late`);
      }
      navigate(`/class/${classId}`);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount = Object.values(attendance).filter(a => a.status === 'absent').length;
  const lateCount = Object.values(attendance).filter(a => a.status === 'late').length;

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
                <h1 className="text-2xl font-bold text-gray-900">Take Attendance</h1>
                <p className="text-sm text-gray-600">
                  {classData?.name} • {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                Present: <span className="font-semibold text-green-600">{presentCount}</span> •
                Absent: <span className="font-semibold text-red-600">{absentCount}</span> •
                Late: <span className="font-semibold text-yellow-600">{lateCount}</span>
              </div>
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Management */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Session</h3>
            <button
              onClick={() => setShowSessionModal(true)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Manage Sessions
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="text-sm text-blue-700">Session Name</div>
              <div className="font-semibold text-blue-900">{currentSession.session_name}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <div className="text-sm text-green-700">Time</div>
              <div className="font-semibold text-green-900">{currentSession.session_time}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
              <div className="text-sm text-purple-700">Session ID</div>
              <div className="font-semibold text-purple-900">{currentSession.session_id}</div>
            </div>
          </div>
        </div>

        {/* Face Recognition Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Recognition Attendance</h3>

          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCamera(true)}
                disabled={uploadingPhoto}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CameraIcon className="h-5 w-5 mr-2" />
                {uploadingPhoto ? 'Processing...' : 'Take Photo'}
              </button>
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFaceRecognition}
                className="hidden"
                id="face-photo"
                disabled={uploadingPhoto}
              />
              <label
                htmlFor="face-photo"
                className={`cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <PhotoIcon className="h-5 w-5 mr-2" />
                Upload Photo
              </label>
            </div>
            <p className="text-sm text-gray-600">
              Take or upload a photo to automatically detect and mark attendance for students
            </p>
          </div>

          {/* Face Recognition Results */}
          {faceResults && (
            <div className="border-t pt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Detection Results</h4>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <UserIcon className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <div className="text-2xl font-bold text-blue-900">{faceResults.faces_detected || 0}</div>
                      <div className="text-sm text-blue-700">Faces Detected</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <div className="text-2xl font-bold text-green-900">{faceResults.faces_recognized || 0}</div>
                      <div className="text-sm text-green-700">Students Recognized</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircleIcon className="h-8 w-8 text-yellow-500" />
                    <div className="ml-3">
                      <div className="text-2xl font-bold text-yellow-900">{faceResults.faces_unrecognized || 0}</div>
                      <div className="text-sm text-yellow-700">Unrecognized Faces</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Image Preview */}
              {uploadedImage && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Uploaded Image</h5>
                  <img
                    src={uploadedImage}
                    alt="Uploaded for recognition"
                    className="max-w-md max-h-64 object-contain border rounded-lg"
                  />
                </div>
              )}

              {/* Recognized Students Cards */}
              {faceResults.recognized_students && faceResults.recognized_students.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">✅ Recognized Students</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faceResults.recognized_students.map((student: any, index: number) => {
                      const studentData = students.find(s => s.user_id === student.student_id);
                      return (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                <CheckCircleIcon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <div className="font-medium text-green-900">
                                  {studentData?.name || `Student ${student.student_id}`}
                                </div>
                                <div className="text-sm text-green-700">
                                  Face {student.face_index} • {(student.similarity_score * 100).toFixed(1)}% confidence
                                </div>
                              </div>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              RECOGNIZED
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unrecognized Faces Cards */}
              {faceResults.unrecognized_faces && faceResults.unrecognized_faces.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">❓ Unrecognized Faces</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faceResults.unrecognized_faces.map((face: any, index: number) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                              <XCircleIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-yellow-900">
                                Unknown Person
                              </div>
                              <div className="text-sm text-yellow-700">
                                Face {face.face_index} • Not in database
                              </div>
                            </div>
                          </div>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            UNKNOWN
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result Message */}
              <div className={`p-4 rounded-lg ${faceResults.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
                }`}>
                <p className={`text-sm ${faceResults.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {faceResults.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manual Attendance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Manual Attendance</h3>
            <p className="text-sm text-gray-600 mt-1">Mark attendance manually for each student</p>
          </div>

          <div className="divide-y divide-gray-200">
            {students.map((student) => (
              <div key={student.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                    {student.is_face_registered && (
                      <div className="text-xs text-green-600">Face registered</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {attendance[student.user_id]?.method === 'face_recognition' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Face Recognition ({(attendance[student.user_id].confidence_score! * 100).toFixed(1)}%)
                    </span>
                  )}

                  <div className="flex space-x-1">
                    <button
                      onClick={() => markAttendance(student.user_id, 'present')}
                      className={`px-3 py-1 text-xs font-medium rounded ${attendance[student.user_id]?.status === 'present'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-green-50'
                        }`}
                    >
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      Present
                    </button>
                    <button
                      onClick={() => markAttendance(student.user_id, 'absent')}
                      className={`px-3 py-1 text-xs font-medium rounded ${attendance[student.user_id]?.status === 'absent'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-red-50'
                        }`}
                    >
                      <XCircleIcon className="h-4 w-4 inline mr-1" />
                      Absent
                    </button>
                    <button
                      onClick={() => markAttendance(student.user_id, 'late')}
                      className={`px-3 py-1 text-xs font-medium rounded ${attendance[student.user_id]?.status === 'late'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-yellow-50'
                        }`}
                    >
                      Late
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Management Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Sessions</h3>
              
              <div className="mb-4">
                <button
                  onClick={createNewSession}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-3"
                >
                  Create New Session
                </button>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Sessions Today</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                        currentSession.session_id === session.session_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => switchToSession(session)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{session.session_name}</div>
                          <div className="text-xs text-gray-500">{session.session_time}</div>
                        </div>
                        {session.student_count && (
                          <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {session.student_count} students
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No sessions created today
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        title="Take Attendance Photo"
        instructions="Capture a clear group photo with all students visible"
      />
    </div>
  );
};

export default TakeAttendance;
