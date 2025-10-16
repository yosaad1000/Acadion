import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '../../types';
import { formatDateForDisplay } from '../../utils/dateTimeUtils';
import { 
  CalendarIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface SessionCardProps {
  session: Session;
  subjectId: string;
  onClick?: (session: Session) => void;
  className?: string;
  showActions?: boolean;
  onEdit?: (session: Session) => void;
  onDelete?: (session: Session) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  subjectId, 
  onClick,
  className = '',
  showActions = false,
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActionMenu]);

  const handleClick = () => {
    if (onClick) {
      onClick(session);
    } else {
      navigate(`/class/${subjectId}/session/${session.session_id}`);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionMenu(!showActionMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionMenu(false);
    if (onEdit) {
      onEdit(session);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionMenu(false);
    if (onDelete) {
      onDelete(session);
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

  // Use the centralized date formatting utility
  const formatDate = formatDateForDisplay;

  const statusInfo = getSessionStatus();
  const StatusIcon = statusInfo.icon;
  const dateInfo = formatDate(session.session_date);

  return (
    <div
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer touch-manipulation active:scale-[0.98] active:bg-gray-50 dark:active:bg-gray-750 group ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex flex-col space-y-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 leading-tight">{session.name}</h3>
            {session.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 leading-relaxed">{session.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Status Badge */}
            <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium ${
              statusInfo.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              <StatusIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{statusInfo.status}</span>
            </div>

            {/* Action Menu */}
            {showActions && (
              <div className="relative" ref={actionMenuRef}>
                <button
                  onClick={handleActionClick}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Session actions"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>

                {showActionMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={handleEdit}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4 mr-3" />
                        Edit Session
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 mr-3" />
                        Delete Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date */}
      {dateInfo && (
        <div className="flex items-center space-x-2 mb-4">
          <CalendarIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className={`text-sm ${dateInfo.urgent ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
            {dateInfo.text}
          </span>
        </div>
      )}

      {/* Activity Indicators */}
      <div className="flex flex-col space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Assignments */}
          {session.assignments && session.assignments.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
              <span>{session.assignments.length} assignment{session.assignments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {/* Attendance */}
          {session.attendance_taken && (
            <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
              <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
              <span>Attendance taken</span>
            </div>
          )}
          
          {/* Notes */}
          {session.notes && session.notes.trim().length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
              <span>Has notes</span>
            </div>
          )}
        </div>
        
        {/* Created Date */}
        <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
          Created {new Date(session.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: new Date(session.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })}
        </div>
      </div>

      {/* Assignments Preview */}
      {session.assignments && session.assignments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-2">
            {session.assignments.slice(0, 2).map((assignment) => {
              const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date();
              
              return (
                <div key={assignment.assignment_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      assignment.assignment_type === 'homework' ? 'bg-blue-400 dark:bg-blue-500' :
                      assignment.assignment_type === 'test' ? 'bg-red-400 dark:bg-red-500' :
                      'bg-purple-400 dark:bg-purple-500'
                    }`}></div>
                    <span className="text-gray-700 dark:text-gray-300 truncate font-medium">{assignment.title}</span>
                  </div>
                  {dueDate && (
                    <span className={`flex-shrink-0 ml-3 text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      Due {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
            {session.assignments.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 font-medium">
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