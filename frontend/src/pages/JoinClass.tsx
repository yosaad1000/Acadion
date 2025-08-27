import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const JoinClass: React.FC = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { apiCallJson } = await import('../lib/api');
      const enrollment = await apiCallJson('/api/subjects/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() })
      });
      
      navigate(`/class/${enrollment.subject_id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to join class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Join Class</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="text-center mb-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-blue-500" />
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Join a Class
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter the class code provided by your teacher
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter class code (e.g., ABC123XY)"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ textTransform: 'uppercase' }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Class codes are usually 6-8 characters long
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !inviteCode.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Need help?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ask your teacher for the class code</li>
            <li>• Make sure you're entering the code correctly</li>
            <li>• Class codes are case-insensitive</li>
            <li>• Contact your teacher if the code doesn't work</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;