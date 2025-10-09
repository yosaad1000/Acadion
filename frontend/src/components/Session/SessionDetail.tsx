import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Session, Assignment } from '../../types';
import { sessionService } from '../../services/sessionService';
import { AssignmentList, CreateAssignment } from '../Assignment';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SessionDetailProps {
  sessionId?: string;
  subjectId?: string;
}

const SessionDetail: React.FC<SessionDetailProps> = ({ sessionId: propSessionId, subjectId: propSubjectId }) => {
  const { sessionId: paramSessionId, classId: paramSubjectId } = useParams<{ sessionId: string; classId: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  
  const sessionId = propSessionId || paramSessionId;
  const subjectId = propSubjectId || paramSubjectId;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'notes' | 'assignments'>('overview');
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedSession = await sessionService.getSession(sessionId);
      if (fetchedSession) {
        setSession(fetchedSession);
      } else {
        setError('Session not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (subjectId) {
      navigate(`/class/${subjectId}`);
    } else {
      navigate(-1);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    return {
      date: date.toLocaleDateString('en-US', dateOptions),
      time: date.toLocaleTimeString('en-US', timeOptions),
      isPast: date < now,
      isToday: date.toDateString() === now.toDateString()
    };
  };

  const handleCreateAssignment = () => {
    setShowCreateAssignment(true);
  };

  const handleAssignmentCreated = (assignmentId: string) => {
    // Refresh session data to include new assignment
    fetchSession();
    setShowCreateAssignment(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 dark:text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error || 'Session not found'}
          </h2>
          <button
            onClick={handleBack}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm sm:text-base"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const dateTimeInfo = formatDateTime(session.session_date);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 safe-area-padding">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 space-y-3 sm:space-y-0">
            <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={handleBack}
                className="mt-1 p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation flex-shrink-0"
              >
                <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{session.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {dateTimeInfo ? (
                    <>
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">{dateTimeInfo.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{dateTimeInfo.time}</span>
                      </div>
                      {dateTimeInfo.isToday && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded-full">
                          Today
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No date set</span>
                  )}
                </div>
              </div>
            </div>
            
            {currentRole === 'teacher' && (
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-manipulation">
                  <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max px-1">
              {['overview', 'attendance', 'notes', 'assignments'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap touch-manipulation ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab}
                  {tab === 'assignments' && session.assignments && session.assignments.length > 0 && (
                    <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                      {session.assignments.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-responsive py-4 sm:py-8">
        {activeTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Session Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Session Information</h2>
              
              {session.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{session.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    {dateTimeInfo ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{dateTimeInfo.date}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{dateTimeInfo.time}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-gray-500 dark:text-gray-400">No date set</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                  <div className="space-y-2">
                    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                      session.attendance_taken ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">
                        {session.attendance_taken ? 'Attendance Taken' : 'Attendance Pending'}
                      </span>
                    </div>
                    
                    {session.assignments && session.assignments.length > 0 && (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md">
                        <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">
                          {session.assignments.length} Assignment{session.assignments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid-responsive-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {session.assignments ? session.assignments.length : 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Assignments</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 dark:text-green-400 flex-shrink-0" />
                  <div className="ml-3">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {session.assignments ? 
                        session.assignments.filter(a => a.submission_status === 'submitted' || a.submission_status === 'graded').length : 
                        0
                      }
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <div className="flex items-center">
                  <UserGroupIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                  <div className="ml-3">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {session.attendance_taken ? '✓' : '—'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Attendance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance</h2>
              {currentRole === 'teacher' && !session.attendance_taken && (
                <button className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
                  Take Attendance
                </button>
              )}
            </div>
            
            {session.attendance_taken ? (
              <div className="text-center py-6 sm:py-8">
                <CheckCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-green-400 dark:text-green-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Attendance Recorded</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">Attendance has been taken for this session.</p>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <UserGroupIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Attendance Yet</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  {currentRole === 'teacher' 
                    ? 'Take attendance to record student participation for this session.'
                    : 'Attendance will be recorded by your teacher during the session.'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Session Notes</h2>
              {currentRole === 'teacher' && (
                <button className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white inline-flex items-center justify-center">
                  <PencilIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">Edit Notes</span>
                </button>
              )}
            </div>
            
            {session.notes ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 dark:text-gray-300">{session.notes}</div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <DocumentTextIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Notes Yet</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  {currentRole === 'teacher' 
                    ? 'Add notes to help students remember key points from this session.'
                    : 'Session notes will appear here when your teacher adds them.'
                  }
                </p>
                {currentRole === 'teacher' && (
                  <button className="mt-4 btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
                    Add Notes
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <AssignmentList
              sessionId={sessionId!}
              onCreateAssignment={handleCreateAssignment}
              showCreateButton={currentRole === 'teacher'}
            />
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {sessionId && (
        <CreateAssignment
          sessionId={sessionId}
          isOpen={showCreateAssignment}
          onClose={() => setShowCreateAssignment(false)}
          onSuccess={handleAssignmentCreated}
        />
      )}
    </div>
  );
};

export default SessionDetail;