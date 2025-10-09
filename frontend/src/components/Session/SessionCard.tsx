import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '../../types';
import { 
  CalendarIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface SessionCardProps {
  session: Session;
  subjectId: string;
  onClick?: (session: Session) => void;
  className?: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  subjectId, 
  onClick,
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(session);
    } else {
      navigate(`/class/${subjectId}/session/${session.session_id}`);
    }
  };

  const getSessionStatus = () => {
    const hasAssignments = session.assignments && session.assignments.length > 0;
    const attendanceTaken = session.attendance_taken;
    const hasNotes = session.notes && session.notes.trim().length > 0;
    
    if (attendanceTaken && hasAssignments) {
      return { 
        status: 'Complete', 
        color: 'green', 
        icon: CheckCircleIcon,
        description: 'Attendance taken, assignments available'
      };
    } else if (attendanceTaken || hasAssignments || hasNotes) {
      return { 
        status: 'In Progress', 
        color: 'yellow', 
        icon: ExclamationCircleIcon,
        description: 'Partially completed'
      };
    } else {
      return { 
        status: 'Pending', 
        color: 'gray', 
        icon: ClockIcon,
        description: 'No activities yet'
      };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: 'Today', urgent: true };
    if (diffDays === 1) return { text: 'Tomorrow', urgent: true };
    if (diffDays === -1) return { text: 'Yesterday', urgent: false };
    if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} days`, urgent: false };
    if (diffDays < -1 && diffDays >= -7) return { text: `${Math.abs(diffDays)} days ago`, urgent: false };
    
    return { 
      text: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }), 
      urgent: false 
    };
  };

  const statusInfo = getSessionStatus();
  const StatusIcon = statusInfo.icon;
  const dateInfo = formatDate(session.session_date);

  return (
    <div
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer touch-manipulation active:scale-[0.98] group ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">{session.name}</h3>
          {session.description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{session.description}</p>
          )}
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium self-start sm:ml-3 flex-shrink-0 ${
          statusInfo.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          <StatusIcon className="h-3 w-3" />
          <span>{statusInfo.status}</span>
        </div>
      </div>

      {/* Date */}
      {dateInfo && (
        <div className="flex items-center space-x-1 mb-3">
          <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className={`text-xs sm:text-sm ${dateInfo.urgent ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
            {dateInfo.text}
          </span>
        </div>
      )}

      {/* Activity Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Assignments */}
          {session.assignments && session.assignments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-3 w-3 flex-shrink-0" />
              <span>{session.assignments.length}</span>
            </div>
          )}
          
          {/* Attendance */}
          {session.attendance_taken && (
            <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
              <UserGroupIcon className="h-3 w-3 flex-shrink-0" />
              <span>Attended</span>
            </div>
          )}
          
          {/* Notes */}
          {session.notes && session.notes.trim().length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-3 w-3 flex-shrink-0" />
              <span>Notes</span>
            </div>
          )}
        </div>
        
        {/* Created Date */}
        <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          {new Date(session.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Assignments Preview */}
      {session.assignments && session.assignments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-1">
            {session.assignments.slice(0, 2).map((assignment) => {
              const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date();
              
              return (
                <div key={assignment.assignment_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      assignment.assignment_type === 'homework' ? 'bg-blue-400 dark:bg-blue-500' :
                      assignment.assignment_type === 'test' ? 'bg-red-400 dark:bg-red-500' :
                      'bg-purple-400 dark:bg-purple-500'
                    }`}></div>
                    <span className="text-gray-700 dark:text-gray-300 truncate">{assignment.title}</span>
                  </div>
                  {dueDate && (
                    <span className={`flex-shrink-0 ml-2 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
            {session.assignments.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                +{session.assignments.length - 2} more assignment{session.assignments.length - 2 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCard;