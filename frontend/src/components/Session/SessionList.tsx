import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSessions } from '../../hooks/useSessions';
import { Session } from '../../types';
import { 
  PlusIcon
} from '@heroicons/react/24/outline';
import { NoSessionsEmptyState } from '../ui/EmptyState';
import { SessionLoadErrorMessage } from '../ui/ErrorMessage';
import SessionLoadingState from '../ui/SessionLoadingState';
import SessionManagementErrorBoundary from '../ui/SessionManagementErrorBoundary';
import NetworkErrorState from '../ui/NetworkErrorState';
import SessionCard from './SessionCard';

interface SessionListProps {
  subjectId: string;
  onCreateSession?: () => void;
}

const SessionList: React.FC<SessionListProps> = ({ subjectId, onCreateSession }) => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const { 
    sessions, 
    loading, 
    error, 
    networkError, 
    isRetrying, 
    retryNetwork, 
    clearNetworkError,
    refetch 
  } = useSessions(subjectId);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'date') {
      // Sort by date, most recent first
      const dateA = a.session_date ? new Date(a.session_date).getTime() : new Date(a.created_at).getTime();
      const dateB = b.session_date ? new Date(b.session_date).getTime() : new Date(b.created_at).getTime();
      return dateB - dateA;
    } else {
      // Sort by name alphabetically
      return a.name.localeCompare(b.name);
    }
  });

  const handleSessionClick = (session: Session) => {
    navigate(`/class/${subjectId}/session/${session.session_id}`);
  };

  if (loading) {
    return (
      <SessionLoadingState 
        type="list" 
        message="Loading sessions..." 
        className="animate-pulse"
      />
    );
  }

  // Show network error state if there's a network issue
  if (networkError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <NetworkErrorState
          onRetry={() => retryNetwork(refetch)}
          onDismiss={clearNetworkError}
          autoRetry={true}
          className="my-8"
        />
      </div>
    );
  }

  // Show other errors
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <SessionLoadErrorMessage
          onRetry={() => refetch()}
          onGoBack={() => window.history.back()}
          className="my-8"
        />
      </div>
    );
  }

  return (
    <SessionManagementErrorBoundary
      context="session-loading"
      onRetry={() => window.location.reload()}
      onGoBack={() => window.history.back()}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Sessions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} in this class
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="input-mobile text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
            
            {/* Create Session Button - Only for Teachers */}
            {currentRole === 'teacher' && (
              <button
                onClick={onCreateSession}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 inline-flex items-center justify-center font-medium shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                <span>Create Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <NoSessionsEmptyState
              onCreateSession={onCreateSession}
              isTeacher={currentRole === 'teacher'}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {sortedSessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                subjectId={subjectId}
                onClick={handleSessionClick}
                className="transition-all duration-200"
              />
            ))}
          </div>
        )}
      </div>
    </SessionManagementErrorBoundary>
  );
};

export default SessionList;