import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CameraIcon, UserIcon } from '@heroicons/react/24/outline';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFaceRegistration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/auth/register-face', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        setMessage('Face registered successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.detail || 'Failed to register face');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <div className="flex items-center">
              <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                <p className="text-gray-600">{user?.email}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  user?.user_type === 'teacher' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user?.user_type === 'teacher' ? 'Teacher' : 'Student'}
                </span>
              </div>
            </div>
          </div>

          {user?.user_type === 'student' && (
            <div className="border-t border-gray-200 px-6 py-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Face Recognition</h2>
              
              {message && (
                <div className={`mb-4 p-4 rounded-md ${
                  message.includes('successfully') 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <CameraIcon className="h-8 w-8 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {user?.is_face_registered ? 'Face Registered' : 'Register Your Face'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user?.is_face_registered 
                        ? 'Your face is registered for attendance' 
                        : 'Upload a clear photo of your face for attendance tracking'
                      }
                    </div>
                  </div>
                </div>
                
                {!user?.is_face_registered && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaceRegistration}
                      className="hidden"
                      id="face-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="face-upload"
                      className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        uploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </label>
                  </div>
                )}
              </div>

              {!user?.is_face_registered && (
                <div className="mt-4 text-sm text-gray-600">
                  <p className="font-medium mb-2">Tips for a good photo:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Face the camera directly</li>
                    <li>Ensure good lighting</li>
                    <li>Remove glasses if possible</li>
                    <li>Keep a neutral expression</li>
                    <li>Make sure your face is clearly visible</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;