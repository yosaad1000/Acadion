import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSessions } from '../../hooks/useSessions';
import { Session } from '../../types';
import { 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface SessionListProps {
  subjectId: string;
  onCreateSession?: () => void;
}

const SessionList: React.FC<SessionListProps> = ({ subjectId, onCreateSession }) => {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const { sessions, loading, error } = useSessions(subjectId);
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

  const getSessionStatus = (session: Session) => {
    const hasAssignments = session.assignments && session.assignments.length > 0;
    const attendanceTaken = session.attendance_taken;
    
    if (attendanceTaken && hasAssignments) {
      return { status: 'complete', color: 'green', icon: CheckCircleIcon };
    } else if (attendanceTaken || hasAssignments) {
      return { status: 'partial', color: 'yellow', icon: ExclamationCircleIcon };
    } else {
      return { status: 'pending', color: 'gray', icon: ClockIcon };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12">
        <ExclamationCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 dark:text-red-500 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error Loading Sessions</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 px-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Sessions</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} in this class
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
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
              className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 sm:h-4 sm:w-4 mr-2" />
              <span className="text-sm sm:text-sm">Create Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <CalendarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Sessions Yet</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 px-4 sm:px-0">
            {currentRole === 'teacher' 
              ? 'Create your first session to start organizing class content and activities.'
              : 'Sessions will appear here once your teacher creates them.'
            }
          </p>
          {currentRole === 'teacher' && (
            <button
              onClick={onCreateSession}
              className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white inline-flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="text-sm sm:text-sm">Create First Session</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {sortedSessions.map((session) => {
            const statusInfo = getSessionStatus(session);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={session.session_id}
                onClick={() => handleSessionClick(session)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 hover:shadow-md transition-all cursor-pointer touch-manipulation active:scale-[0.98] group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 truncate">{session.name}</h3>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium self-start ${
                        statusInfo.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        <StatusIcon className="h-3 w-3" />
                        <span className="capitalize">{statusInfo.status}</span>
                      </div>
                    </div>
                    
                    {session.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{session.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{formatDate(session.session_date)}</span>
                      </div>
                      
                      {session.assignments && session.assignments.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <DocumentTextIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{session.assignments.length} assignment{session.assignments.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      
                      {session.attendance_taken && (
                        <div className="flex items-center space-x-1">
                          <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>Attendance taken</span>
                        </div>
                      )}
                      
                      {session.notes && (
                        <div className="flex items-center space-x-1">
                          <DocumentTextIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>Has notes</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 sm:ml-4">
                    <div>Created {new Date(session.created_at).toLocaleDateString()}</div>
                    {session.updated_at !== session.created_at && (
                      <div>Updated {new Date(session.updated_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionList;