import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeftIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface Student {
  user_id: string;
  name: string;
  email: string;
  is_face_registered: boolean;
  created_at: string;
}

interface Subject {
  subject_id: string;
  name: string;
  subject_code: string;
  student_count: number;
}

const ViewStudents: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudents(selectedSubject);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subjects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubject(data[0].subject_id);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (subjectId: string) => {
    setLoadingStudents(true);
    try {
      const response = await fetch(`http://localhost:8000/api/subjects/${subjectId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const selectedSubjectData = subjects.find(s => s.subject_id === selectedSubject);
  const faceRegisteredCount = filteredStudents.filter(s => s.is_face_registered).length;
  const faceNotRegisteredCount = filteredStudents.length - faceRegisteredCount;

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
                onClick={() => navigate('/dashboard')}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
                <p className="text-sm text-gray-600">
                  Manage your student roster across all classes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subject Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Class</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.subject_id}
                onClick={() => setSelectedSubject(subject.subject_id)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedSubject === subject.subject_id
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{subject.name}</div>
                <div className="text-sm text-gray-600">{subject.subject_code}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {subject.student_count} students
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedSubjectData && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <UserIcon className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{filteredStudents.length}</div>
                    <div className="text-sm text-gray-600">Total Students</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{faceRegisteredCount}</div>
                    <div className="text-sm text-gray-600">Face Registered</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <XCircleIcon className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{faceNotRegisteredCount}</div>
                    <div className="text-sm text-gray-600">Face Pending</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <CalendarIcon className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">0</div>
                    <div className="text-sm text-gray-600">Present Today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/take-attendance/${selectedSubject}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Take Attendance
                  </button>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Students in {selectedSubjectData.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredStudents.length} students enrolled
                </p>
              </div>
              
              {loadingStudents ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center">
                  <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search terms.' : 'No students have joined this class yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <div key={student.user_id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
                          <UserIcon className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Joined {new Date(student.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {student.is_face_registered ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Face Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Face Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewStudents;
