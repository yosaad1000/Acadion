import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeftIcon, 
  CameraIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

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

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchStudents();
    }
  }, [classId]);

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

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
            method: 'manual'
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

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        method: 'manual'
      }
    }));
  };

  const handleFaceRecognition = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      const response = await fetch(`/api/attendance/mark-face?subject_id=${classId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('🎯 Face Recognition Results:', result);
      
      // Store detailed results for UI display
      setFaceResults(result);
      
      if (response.ok && result.success) {
        // Update attendance for recognized student
        setAttendance(prev => ({
          ...prev,
          [result.student_id]: {
            student_id: result.student_id,
            status: 'present',
            method: 'face_recognition',
            confidence_score: result.similarity_score
          }
        }));
        
        // Log detailed results to console
        console.log(`✅ SUCCESS: ${result.faces_detected} face(s) detected`);
        console.log(`👥 Recognized: ${result.faces_recognized} students`);
        console.log(`❓ Unrecognized: ${result.faces_unrecognized} faces`);
        if (result.recognized_students) {
          result.recognized_students.forEach((student: any, index: number) => {
            console.log(`🎓 Student ${index + 1}: ${student.student_id} (${(student.similarity_score * 100).toFixed(1)}% confidence)`);
          });
        }
      } else {
        console.log(`❌ FAILED: ${result.message}`);
        console.log(`👥 Faces detected: ${result.faces_detected || 0}`);
        console.log(`❓ Unrecognized faces: ${result.faces_unrecognized || 0}`);
      }
    } catch (error) {
      console.error('💥 Error processing photo:', error);
      setFaceResults({
        success: false,
        message: 'Network error occurred',
        faces_detected: 0,
        faces_recognized: 0,
        faces_unrecognized: 0
      });
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendanceRecords = Object.values(attendance).filter(record => record.status === 'present');
      
      for (const record of attendanceRecords) {
        await fetch('/api/attendance/manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            student_id: record.student_id,
            subject_id: classId,
            date: new Date().toISOString().split('T')[0],
            status: record.status
          })
        });
      }
      
      alert('Attendance saved successfully!');
      navigate(`/class/${classId}`);
    } catch (error) {
      alert('Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount = students.length - presentCount;

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
                Absent: <span className="font-semibold text-red-600">{absentCount}</span>
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
        {/* Face Recognition Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Recognition Attendance</h3>
          
          <div className="flex items-center space-x-4 mb-6">
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
              className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              {uploadingPhoto ? 'Processing...' : 'Take Photo for Attendance'}
            </label>
            <p className="text-sm text-gray-600">
              Take a photo to automatically detect and mark attendance for students
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
              <div className={`p-4 rounded-lg ${
                faceResults.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  faceResults.success ? 'text-green-700' : 'text-red-700'
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
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        attendance[student.user_id]?.status === 'present'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-green-50'
                      }`}
                    >
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      Present
                    </button>
                    <button
                      onClick={() => markAttendance(student.user_id, 'absent')}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        attendance[student.user_id]?.status === 'absent'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-red-50'
                      }`}
                    >
                      <XCircleIcon className="h-4 w-4 inline mr-1" />
                      Absent
                    </button>
                    <button
                      onClick={() => markAttendance(student.user_id, 'late')}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        attendance[student.user_id]?.status === 'late'
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
    </div>
  );
};

export default TakeAttendance;