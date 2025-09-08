import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';
import CameraCapture from '../components/CameraCapture';

interface Subject {
  subject_id: string;
  name: string;
}

interface ProcessingResult {
  session_id: string;
  status: 'processing' | 'completed' | 'error';
  processed_faces: Array<{
    id: number;
    student_id: string;
    name: string;
    face_img: string;
  }>;
  total_faces: number;
  present_count: number;
  absent_count: number;
  full_image?: string;
  error?: string;
}

const AttendanceUpload: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [facultyId, setFacultyId] = useState('FAC001'); // This would come from auth context
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSubject) {
      setError('Please select both a subject and an image');
      return;
    }

    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subject_id', selectedSubject);
      formData.append('faculty_id', facultyId);

      const response = await fetch('http://localhost:8000/api/attendance/face-recognition', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      // Start polling for results
      if (data.session_id) {
        pollForResults(data.session_id);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProcessing(false);
    }
  };

  const pollForResults = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/attendance/status/${sessionId}`);
        if (response.ok) {
          const data: ProcessingResult = await response.json();
          setResult(data);

          if (data.status === 'completed' || data.status === 'error') {
            clearInterval(pollInterval);
            setProcessing(false);
          }
        }
      } catch (error) {
        console.error('Error polling results:', error);
        clearInterval(pollInterval);
        setProcessing(false);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setProcessing(false);
    }, 300000);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setImagePreview('');
    setResult(null);
    setError('');
    setSelectedSubject('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Attendance Marking</h1>
        <p className="text-gray-600">Upload a class photo to automatically mark attendance using face recognition</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Subject Selection */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject *
            </label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={processing}
            >
              <option value="">Choose a subject</option>
              {subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.name} ({subject.subject_id})
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Photo *
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Class preview"
                    className="mx-auto max-h-64 rounded-lg shadow-md"
                  />
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-500"
                      disabled={processing}
                    >
                      Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">📸</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
                        disabled={processing}
                      >
                        <CameraIcon className="h-4 w-4 mr-2" />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center"
                        disabled={processing}
                      >
                        <PhotoIcon className="h-4 w-4 mr-2" />
                        Upload Photo
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      JPG, PNG up to 10MB. Group photo with clear faces works best.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Upload Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !selectedSubject || processing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-md text-sm font-medium flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>Mark Attendance with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <h3 className="text-lg font-medium text-blue-900">Processing Image...</h3>
              <p className="text-blue-700">AI is analyzing faces and marking attendance. This may take a few moments.</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && result.status === 'completed' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Results</h2>
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.present_count}</div>
                <div className="text-sm text-green-700">Present</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.absent_count}</div>
                <div className="text-sm text-red-700">Absent</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.total_faces}</div>
                <div className="text-sm text-blue-700">Faces Detected</div>
              </div>
            </div>
          </div>

          {/* Processed Image */}
          {result.full_image && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processed Image</h3>
              <img
                src={`data:image/jpeg;base64,${result.full_image}`}
                alt="Processed class photo"
                className="mx-auto max-h-96 rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Detected Students */}
          {result.processed_faces.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Students</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {result.processed_faces.map((face) => (
                  <div key={face.id} className="text-center">
                    <img
                      src={`data:image/jpeg;base64,${face.face_img}`}
                      alt={face.name}
                      className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                    />
                    <div className="text-xs font-medium text-gray-900">{face.name}</div>
                    <div className="text-xs text-gray-500">{face.student_id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Mark Another Class
            </button>
          </div>
        </div>
      )}

      {/* Error Result */}
      {result && result.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900">Processing Failed</h3>
          <p className="text-red-700 mt-2">{result.error}</p>
          <button
            onClick={resetForm}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">How it works</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">1.</span>
            <span>Select the subject for which you want to mark attendance</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">2.</span>
            <span>Upload a clear group photo of the class</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">3.</span>
            <span>AI will detect faces and match them with registered students</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-500">4.</span>
            <span>Attendance is automatically marked for recognized students</span>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        title="Take Class Photo"
        instructions="Capture a clear group photo with all students visible"
      />
    </div>
  );
};

export default AttendanceUpload;
