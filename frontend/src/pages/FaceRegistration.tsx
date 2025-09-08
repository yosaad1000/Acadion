import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import CameraCapture from '../components/CameraCapture';
import { useCamera } from '../hooks/useCamera';

const FaceRegistration: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasCamera, isSupported } = useCamera();

  // Redirect if already registered
  React.useEffect(() => {
    if (user?.is_face_registered) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file.');
      setMessageType('error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Image size must be less than 10MB.');
      setMessageType('error');
      return;
    }

    setSelectedImage(file);
    setMessage('');
    setMessageType('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFaceRegistration = async () => {
    if (!selectedImage) {
      setMessage('Please select an image first.');
      setMessageType('error');
      return;
    }

    setUploading(true);
    setMessage('Processing your face registration...');
    setMessageType('');

    const formData = new FormData();
    formData.append('file', selectedImage);

    try {
      const { apiCall } = await import('../lib/api');
      const response = await apiCall('/api/auth/register-face', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessage('Face registered successfully! You can now use face recognition for attendance.');
        setMessageType('success');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.detail || 'Failed to register face. Please try again.');
        setMessageType('error');
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to register face. Please check your connection and try again.');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedImage(file);
    setMessage('');
    setMessageType('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setImagePreview('');
    setMessage('');
    setMessageType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CameraIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Register Your Face</h1>
          <p className="text-gray-600 mt-2">
            Upload a clear photo of your face for automatic attendance tracking
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Status Message */}
          {message && (
            <div className={`p-4 ${
              messageType === 'success' 
                ? 'bg-green-50 border-b border-green-200' 
                : messageType === 'error'
                ? 'bg-red-50 border-b border-red-200'
                : 'bg-blue-50 border-b border-blue-200'
            }`}>
              <div className="flex items-center">
                {messageType === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />}
                {messageType === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />}
                <span className={`text-sm font-medium ${
                  messageType === 'success' 
                    ? 'text-green-800' 
                    : messageType === 'error'
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}>
                  {message}
                </span>
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Image Upload Area */}
            <div className="mb-8">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Selected face"
                      className="mx-auto h-48 w-48 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <div className="space-x-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-500 font-medium"
                        disabled={uploading}
                      >
                        Choose Different Photo
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-gray-600 hover:text-gray-500 font-medium"
                        disabled={uploading}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CameraIcon className="mx-auto h-16 w-16 text-gray-400" />
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {isSupported && hasCamera && (
                          <button
                            type="button"
                            onClick={() => setShowCamera(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                            disabled={uploading}
                          >
                            <CameraIcon className="h-5 w-5 mr-2" />
                            Take Photo
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`${isSupported && hasCamera ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center`}
                          disabled={uploading}
                        >
                          <PhotoIcon className="h-5 w-5 mr-2" />
                          Upload Photo
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-blue-900 mb-3">
                📸 Tips for a Good Photo
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="font-medium mr-2">•</span>
                  Face the camera directly with good lighting
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">•</span>
                  Remove glasses, hats, or face coverings if possible
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">•</span>
                  Keep a neutral expression
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">•</span>
                  Ensure your entire face is clearly visible
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-2">•</span>
                  Use a plain background if possible
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                disabled={uploading}
              >
                Skip for Now
              </button>
              
              <button
                type="button"
                onClick={handleFaceRegistration}
                disabled={!selectedImage || uploading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Register Face'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>🔒 Your face data is securely encrypted and stored for attendance purposes only.</p>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        title="Register Your Face"
        instructions="Position your face in the center and ensure good lighting"
      />
    </div>
  );
};

export default FaceRegistration;