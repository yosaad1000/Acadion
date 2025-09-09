import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import InviteCodeDisplay from '../components/InviteCodeDisplay';
import { api } from '../lib/api';

const CreateClass: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClass, setCreatedClass] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.createSubject(formData);

      if (response.ok) {
        const newClass = await response.json();
        setCreatedClass(newClass);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create class');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Success view after class creation
  if (createdClass) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area-padding">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4 sm:py-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="mr-3 sm:mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 touch-manipulation"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Class Created Successfully!</h1>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-white shadow rounded-lg p-6 sm:p-8 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-500 mb-3 sm:mb-4" />
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {createdClass.name}
            </h2>
            
            {createdClass.description && (
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">{createdClass.description}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 sm:mb-3">
                Share this code with your students
              </h3>
              <InviteCodeDisplay 
                code={createdClass.invite_code} 
                size="lg" 
                className="justify-center"
              />
              <p className="text-xs sm:text-sm text-blue-700 mt-2 sm:mt-3">
                Students can join your class using this invite code
              </p>
            </div>

            <div className="grid-responsive-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center">
                  <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Students Enrolled
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{createdClass.subject_code}</div>
                <div className="text-xs sm:text-sm text-gray-600">Subject Code</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/class/${createdClass.subject_id}`}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center justify-center"
              >
                <span className="text-sm sm:text-base">Go to Class</span>
              </Link>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-mobile border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center justify-center"
              >
                <span className="text-sm sm:text-base">Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4 sm:py-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-3 sm:mr-4 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Create Class</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Computer Science 101"
                className="input-mobile"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the class..."
                className="w-full min-h-[100px] px-3 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-mobile border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 order-2 sm:order-1 transition-colors"
              >
                <span className="text-sm sm:text-base">Cancel</span>
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 transition-colors"
              >
                <span className="text-sm sm:text-base">{loading ? 'Creating...' : 'Create Class'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-4 sm:mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 transition-colors">
          <h3 className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">What happens next?</h3>
          <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Your class will be created with a unique invite code</li>
            <li>• Share the invite code with your students to join</li>
            <li>• Students can register their faces for attendance tracking</li>
            <li>• You can mark attendance manually or using face recognition</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateClass;