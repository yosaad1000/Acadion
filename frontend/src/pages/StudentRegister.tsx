import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import CameraCapture from '../components/CameraCapture';

const StudentRegister: React.FC = () => {
  const [formData, setFormData] = useState({
    student_id: '',
    name: '',
    email: '',
    department_id: '',
    batch_year: new Date().getFullYear(),
    current_semester: 1
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'batch_year' || name === 'current_semester' ? parseInt(value) : value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.student_id || !formData.name || !formData.department_id) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting student data:', formData);
      
      // First, create the student record
      const studentResponse = await fetch('http://localhost:8000/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Student response status:', studentResponse.status);

      if (!studentResponse.ok) {
        const errorText = await studentResponse.text();
        console.error('Student creation failed:', errorText);
        throw new Error(`Failed to create student record: ${studentResponse.status} ${errorText}`);
      }

      const studentResult = await studentResponse.json();
      console.log('Student created successfully:', studentResult);

      // If photo is provided, upload it for face recognition
      if (photo) {
        console.log('Uploading photo...');
        const photoFormData = new FormData();
        photoFormData.append('file', photo);

        const photoResponse = await fetch(`http://localhost:8000/api/students/${formData.student_id}/upload-photo`, {
          method: 'POST',
          body: photoFormData,
        });

        if (!photoResponse.ok) {
          console.warn('Photo upload failed, but student was created');
          // Don't fail the whole process if photo upload fails
        } else {
          console.log('Photo uploaded successfully');
        }
      }

      setSuccess('Student registered successfully!');
      setTimeout(() => {
        navigate('/students');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Register New Student</h1>
        <p className="text-gray-600">Add a new student with face recognition setup</p>
      </div>

      {/* Registration Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Student Information</h3>
              
              <div>
                <label htmlFor="student_id" className="block text-sm font-medium text-gray-700">
                  Student ID *
                </label>
                <input
                  type="text"
                  id="student_id"
                  name="student_id"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  placeholder="e.g., STU001"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label htmlFor="department_id" className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  id="department_id"
                  name="department_id"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.department_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select Department</option>
                  <option value="CS">Computer Science</option>
                  <option value="EE">Electrical Engineering</option>
                  <option value="ME">Mechanical Engineering</option>
                  <option value="CE">Civil Engineering</option>
                  <option value="IT">Information Technology</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="batch_year" className="block text-sm font-medium text-gray-700">
                    Batch Year *
                  </label>
                  <input
                    type="number"
                    id="batch_year"
                    name="batch_year"
                    required
                    min="2020"
                    max="2030"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.batch_year}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label htmlFor="current_semester" className="block text-sm font-medium text-gray-700">
                    Current Semester *
                  </label>
                  <select
                    id="current_semester"
                    name="current_semester"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.current_semester}
                    onChange={handleInputChange}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Face Recognition Setup</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Photo (for face recognition)
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {photoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={photoPreview}
                        alt="Student preview"
                        className="mx-auto h-32 w-32 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-4xl text-gray-400">📷</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => setShowCamera(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
                          >
                            <CameraIcon className="h-4 w-4 mr-2" />
                            Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
                          >
                            <PhotoIcon className="h-4 w-4 mr-2" />
                            Upload Photo
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          JPG, PNG up to 10MB. Clear face photo recommended.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Face Recognition Tips
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use a clear, well-lit photo</li>
                        <li>Face should be clearly visible</li>
                        <li>Avoid sunglasses or face coverings</li>
                        <li>Front-facing photo works best</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        title="Take Profile Photo"
        instructions="Position your face in the center with good lighting"
      />
    </div>
  );
};

export default StudentRegister;
