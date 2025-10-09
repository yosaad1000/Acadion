import React from 'react';
import { Assignment } from '../../types';
import { 
  CalendarIcon, 
  ClockIcon,
  DocumentTextIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

interface AssignmentCardProps {
  assignment: Assignment;
  onClick?: (assignment: Assignment) => void;
  onSubmit?: (assignmentId: string) => void;
  showSubmissionStatus?: boolean;
  className?: string;
  compact?: boolean;
}

const AssignmentCard: React.FC<AssignmentCardProps> = ({ 
  assignment, 
  onClick,
  onSubmit,
  showSubmissionStatus = true,
  className = '',
  compact = false
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(assignment);
    }
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSubmit) {
      onSubmit(assignment.assignment_id);
    }
  };

  const getAssignmentTypeInfo = () => {
    switch (assignment.assignment_type) {
      case 'homework':
        return {
          icon: BookOpenIcon,
          label: 'Homework',
          color: 'blue',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'test':
        return {
          icon: AcademicCapIcon,
          label: 'Test',
          color: 'red',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      case 'project':
        return {
          icon: BeakerIcon,
          label: 'Project',
          color: 'purple',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          icon: DocumentTextIcon,
          label: 'Assignment',
          color: 'gray',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getSubmissionStatusInfo = () => {
    switch (assignment.submission_status) {
      case 'submitted':
        return {
          icon: CheckCircleIcon,
          label: 'Submitted',
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'graded':
        return {
          icon: CheckCircleIcon,
          label: 'Graded',
          color: 'green',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'pending':
      default:
        return {
          icon: ClockIcon,
          label: 'Pending',
          color: 'yellow',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800'
        };
    }
  };

  const getDueDateInfo = () => {
    if (!assignment.due_date) return null;
    
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    const isOverdue = diffTime < 0;
    const isUrgent = diffTime > 0 && diffHours <= 24;
    
    let timeText = '';
    let urgency: 'overdue' | 'urgent' | 'normal' = 'normal';
    
    if (isOverdue) {
      urgency = 'overdue';
      if (Math.abs(diffDays) === 1) {
        timeText = 'Due yesterday';
      } else if (Math.abs(diffDays) < 7) {
        timeText = `Due ${Math.abs(diffDays)} days ago`;
      } else {
        timeText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
    } else if (isUrgent) {
      urgency = 'urgent';
      if (diffHours <= 1) {
        timeText = 'Due in 1 hour';
      } else if (diffHours < 24) {
        timeText = `Due in ${diffHours} hours`;
      } else {
        timeText = 'Due tomorrow';
      }
    } else {
      if (diffDays === 1) {
        timeText = 'Due tomorrow';
      } else if (diffDays <= 7) {
        timeText = `Due in ${diffDays} days`;
      } else {
        timeText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
    }
    
    return { timeText, urgency, dueDate };
  };

  const typeInfo = getAssignmentTypeInfo();
  const statusInfo = getSubmissionStatusInfo();
  const dueDateInfo = getDueDateInfo();
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded-full ${typeInfo.bgColor}`}>
              <TypeIcon className={`h-4 w-4 ${typeInfo.textColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{assignment.title}</h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                  {typeInfo.label}
                </span>
                {dueDateInfo && (
                  <span className={`text-xs ${
                    dueDateInfo.urgency === 'overdue' ? 'text-red-600 font-medium' :
                    dueDateInfo.urgency === 'urgent' ? 'text-orange-600 font-medium' :
                    'text-gray-500'
                  }`}>
                    {dueDateInfo.timeText}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {showSubmissionStatus && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.textColor}`}>
              <StatusIcon className="h-3 w-3" />
              <span>{statusInfo.label}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer ${
        dueDateInfo?.urgency === 'overdue' ? 'border-red-200 bg-red-50' :
        dueDateInfo?.urgency === 'urgent' ? 'border-orange-200 bg-orange-50' :
        ''
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${typeInfo.bgColor} ${typeInfo.borderColor} border`}>
            <TypeIcon className={`h-5 w-5 ${typeInfo.textColor}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-base font-medium text-gray-900 truncate">{assignment.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.bgColor} ${typeInfo.textColor} font-medium`}>
                {typeInfo.label}
              </span>
            </div>
            
            {assignment.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>
            )}
          </div>
        </div>
        
        {showSubmissionStatus && (
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ml-3 ${statusInfo.bgColor} ${statusInfo.textColor}`}>
            <StatusIcon className="h-4 w-4" />
            <span>{statusInfo.label}</span>
          </div>
        )}
      </div>

      {/* Due Date */}
      {dueDateInfo && (
        <div className="flex items-center space-x-2 mb-3">
          <CalendarIcon className={`h-4 w-4 ${
            dueDateInfo.urgency === 'overdue' ? 'text-red-500' :
            dueDateInfo.urgency === 'urgent' ? 'text-orange-500' :
            'text-gray-400'
          }`} />
          <span className={`text-sm font-medium ${
            dueDateInfo.urgency === 'overdue' ? 'text-red-600' :
            dueDateInfo.urgency === 'urgent' ? 'text-orange-600' :
            'text-gray-600'
          }`}>
            {dueDateInfo.timeText}
          </span>
          {dueDateInfo.urgency === 'overdue' && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Google Drive Link */}
          {assignment.google_drive_link && (
            <a
              href={assignment.google_drive_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <LinkIcon className="h-3 w-3" />
              <span>Drive</span>
            </a>
          )}
          
          {/* Created Date */}
          <div className="text-xs text-gray-400">
            Created {new Date(assignment.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        {/* Submit Button for Students */}
        {onSubmit && assignment.submission_status === 'pending' && (
          <button
            onClick={handleSubmit}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Mark as Submitted
          </button>
        )}
      </div>
    </div>
  );
};

export default AssignmentCard;