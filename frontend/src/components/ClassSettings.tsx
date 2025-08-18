import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  PencilIcon,
  UserGroupIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface ClassSettingsProps {
  classId: string;
  onClassUpdated?: () => void;
}

interface ClassData {
  subject_id: string;
  subject_code: string;
  name: string;
  description: string;
  teacher_name: string;
  invite_code: string;
  student_count: number;
  created_at: string;
}

interface EnrolledStudent {
  user_id: string;
  name: string;
  email: string;
  is_face_registered: boolean;
  enrollment_date: string;
}

interface ClassUpdateData {
  name: string;
  description: string;
}

interface NotificationProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
      type === 'success' 
        ? 'bg-green-50 text-green-700 border border-green-200' 
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      <div className="flex items-center">
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 mr-2" />
        ) : (
          <ExclamationCircleIcon className="h-5 w-5 mr-2" />
        )}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

interface RemoveStudentModalProps {
  student: EnrolledStudent | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const RemoveStudentModal: React.FC<RemoveStudentModalProps> = ({
  student,
  isOpen,
  onClose,
  onConfirm,
  loading
}) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mt-4">Remove Student</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Are you sure you want to remove <strong>{student.name}</strong> from this class? 
              This action cannot be undone and the student will lose access to all class materials.
            </p>
          </div>
          <div className="items-center px-4 py-3">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Removing...' : 'Remove Student'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClassSettings: React.FC<ClassSettingsProps> = ({ classId, onClassUpdated }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'students'>('info');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Class data state
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  // Class information form state
  const [classFormData, setClassFormData] = useState<ClassUpdateData>({
    name: '',
    description: ''
  });
  const [classFormLoading, setClassFormLoading] = useState(false);
  const [classFormErrors, setClassFormErrors] = useState<Partial<ClassUpdateData>>({});

  // Students management state
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [removeStudentModal, setRemoveStudentModal] = useState<{
    isOpen: boolean;
    student: EnrolledStudent | null;
    loading: boolean;
  }>({
    isOpen: false,
    student: null,
    loading: false
  });

  useEffect(() => {
    fetchClassData();
    fetchEnrolledStudents();
  }, [classId]);

  useEffect(() => {
    if (classData) {
      setClassFormData({
        name: classData.name,
        description: classData.description || ''
      });
    }
  }, [classData]);

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
      } else {
        throw new Error('Failed to fetch class data');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to load class information'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledStudents = async () => {
    setStudentsLoading(true);
    try {
      const response = await fetch(`/api/subjects/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        throw new Error('Failed to fetch students');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to load enrolled students'
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  // Class information form validation
  const validateClassField = (field: keyof ClassUpdateData, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Class name is required';
        if (value.trim().length < 3) return 'Class name must be at least 3 characters';
        if (value.trim().length > 100) return 'Class name must be less than 100 characters';
        return null;
      case 'description':
        if (value.length > 500) return 'Description must be less than 500 characters';
        return null;
      default:
        return null;
    }
  };

  const handleClassFormInputChange = (field: keyof ClassUpdateData, value: string) => {
    setClassFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const error = validateClassField(field, value);
    setClassFormErrors(prev => ({ ...prev, [field]: error || undefined }));
  };

  const handleClassFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors: Partial<ClassUpdateData> = {};
    Object.keys(classFormData).forEach(key => {
      const field = key as keyof ClassUpdateData;
      const error = validateClassField(field, classFormData[field]);
      if (error) errors[field] = error;
    });

    if (Object.keys(errors).length > 0) {
      setClassFormErrors(errors);
      return;
    }

    setClassFormLoading(true);
    
    try {
      const response = await fetch(`/api/subjects/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(classFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update class information');
      }

      const updatedClass = await response.json();
      setClassData(updatedClass);
      
      setNotification({
        type: 'success',
        message: 'Class information updated successfully!'
      });

      // Notify parent component if callback provided
      if (onClassUpdated) {
        onClassUpdated();
      }
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update class information'
      });
    } finally {
      setClassFormLoading(false);
    }
  };

  const handleRemoveStudent = (student: EnrolledStudent) => {
    setRemoveStudentModal({
      isOpen: true,
      student,
      loading: false
    });
  };

  const confirmRemoveStudent = async () => {
    if (!removeStudentModal.student) return;

    setRemoveStudentModal(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`/api/subjects/${classId}/students/${removeStudentModal.student!.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove student');
      }

      // Remove student from local state
      setStudents(prev => prev.filter(s => s.user_id !== removeStudentModal.student!.user_id));
      
      // Update class data student count
      if (classData) {
        setClassData(prev => prev ? { ...prev, student_count: prev.student_count - 1 } : null);
      }

      setNotification({
        type: 'success',
        message: `${removeStudentModal.student.name} has been removed from the class`
      });

      // Close modal
      setRemoveStudentModal({
        isOpen: false,
        student: null,
        loading: false
      });

      // Notify parent component if callback provided
      if (onClassUpdated) {
        onClassUpdated();
      }
      
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to remove student'
      });
      setRemoveStudentModal(prev => ({ ...prev, loading: false }));
    }
  };

  const closeRemoveStudentModal = () => {
    setRemoveStudentModal({
      isOpen: false,
      student: null,
      loading: false
    });
  };

  // Check if user is authorized (teacher only)
  if (user?.user_type !== 'teacher') {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          Only teachers can access class settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-sm font-medium text-gray-900">Class not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested class could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Remove Student Modal */}
      <RemoveStudentModal
        student={removeStudentModal.student}
        isOpen={removeStudentModal.isOpen}
        onClose={closeRemoveStudentModal}
        onConfirm={confirmRemoveStudent}
        loading={removeStudentModal.loading}
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Class Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage {classData.name} settings and enrollment
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PencilIcon className="h-4 w-4 inline mr-2" />
            Class Information
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'students'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-2" />
            Enrolled Students ({students.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Class Information</h2>
          
          <form onSubmit={handleClassFormSubmit} className="space-y-6">
            <div>
              <label htmlFor="className" className="block text-sm font-medium text-gray-700 mb-1">
                Class Name *
              </label>
              <input
                type="text"
                id="className"
                value={classFormData.name}
                onChange={(e) => handleClassFormInputChange('name', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  classFormErrors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter class name"
              />
              {classFormErrors.name && (
                <p className="mt-1 text-sm text-red-600">{classFormErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="classDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="classDescription"
                rows={4}
                value={classFormData.description}
                onChange={(e) => handleClassFormInputChange('description', e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  classFormErrors.description 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter class description (optional)"
              />
              <p className="mt-1 text-sm text-gray-500">
                {classFormData.description.length}/500 characters
              </p>
              {classFormErrors.description && (
                <p className="mt-1 text-sm text-red-600">{classFormErrors.description}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Class Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Subject Code:</span>
                  <span className="ml-2 font-medium">{classData.subject_code}</span>
                </div>
                <div>
                  <span className="text-gray-600">Invite Code:</span>
                  <span className="ml-2 font-mono bg-gray-200 px-2 py-1 rounded">{classData.invite_code}</span>
                </div>
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2">{new Date(classData.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Students:</span>
                  <span className="ml-2">{classData.student_count}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={classFormLoading || Object.keys(classFormErrors).some(key => classFormErrors[key as keyof ClassUpdateData])}
                className={`px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  classFormLoading || Object.keys(classFormErrors).some(key => classFormErrors[key as keyof ClassUpdateData])
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {classFormLoading ? 'Updating...' : 'Update Class Information'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Enrolled Students ({students.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage student enrollment and remove students from the class
            </p>
          </div>
          
          <div className="p-6">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : students.length > 0 ? (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-lg">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                        <div className="text-xs text-gray-400">
                          Enrolled {new Date(student.enrollment_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {student.is_face_registered ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Face Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Face Pending
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleRemoveStudent(student)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove student from class"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students enrolled</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Students will appear here once they join the class using the invite code.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSettings;