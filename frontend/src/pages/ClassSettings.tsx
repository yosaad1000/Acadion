import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ClassSettings from '../components/ClassSettings';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const ClassSettingsPage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Teacher-only authorization check
  if (user?.user_type !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only teachers can access class settings.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Invalid Class</h2>
          <p className="text-gray-600 mt-2">Class ID is required.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleClassUpdated = () => {
    // This callback can be used to refresh data or show notifications
    // For now, we'll just log the update
    console.log('Class updated successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with breadcrumb navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Back to class"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <span className="text-gray-400 text-sm">/</span>
                  </li>
                  <li>
                    <button
                      onClick={() => navigate(`/class/${classId}`)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Class
                    </button>
                  </li>
                  <li>
                    <span className="text-gray-400 text-sm">/</span>
                  </li>
                  <li>
                    <span className="text-gray-900 text-sm font-medium">Settings</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClassSettings 
          classId={classId} 
          onClassUpdated={handleClassUpdated}
        />
      </div>
    </div>
  );
};

export default ClassSettingsPage;