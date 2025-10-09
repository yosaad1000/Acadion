import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { Assignment } from '../../types';
import AssignmentCard from './AssignmentCard';
import { 
  PlusIcon, 
  DocumentTextIcon,
  FunnelIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface AssignmentListProps {
  sessionId: string;
  onCreateAssignment?: () => void;
  onAssignmentClick?: (assignment: Assignment) => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

type FilterType = 'all' | 'homework' | 'test' | 'project';
type SortType = 'due_date' | 'created' | 'title' | 'type';
type StatusFilter = 'all' | 'pending' | 'submitted' | 'graded' | 'overdue';

const AssignmentList: React.FC<AssignmentListProps> = ({ 
  sessionId, 
  onCreateAssignment,
  onAssignmentClick,
  showCreateButton = true,
  compact = false
}) => {
  const { currentRole } = useAuth();
  const { assignments, loading, error, updateSubmissionStatus } = useAssignments(sessionId);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('due_date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleSubmitAssignment = async (assignmentId: string) => {
    await updateSubmissionStatus(assignmentId, { submission_status: 'submitted' });
  };

  const getFilteredAndSortedAssignments = () => {
    let filtered = [...assignments];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(assignment => assignment.assignment_type === filterType);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(assignment => {
          if (!assignment.due_date) return false;
          const dueDate = new Date(assignment.due_date);
          const now = new Date();
          return dueDate < now && assignment.submission_status === 'pending';
        });
      } else {
        filtered = filtered.filter(assignment => assignment.submission_status === statusFilter);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.assignment_type.localeCompare(b.assignment_type);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getAssignmentStats = () => {
    const total = assignments.length;
    const pending = assignments.filter(a => a.submission_status === 'pending').length;
    const submitted = assignments.filter(a => a.submission_status === 'submitted').length;
    const graded = assignments.filter(a => a.submission_status === 'graded').length;
    const overdue = assignments.filter(a => {
      if (!a.due_date) return false;
      const dueDate = new Date(a.due_date);
      const now = new Date();
      return dueDate < now && a.submission_status === 'pending';
    }).length;

    return { total, pending, submitted, graded, overdue };
  };

  const filteredAssignments = getFilteredAndSortedAssignments();
  const stats = getAssignmentStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 sm:py-8">
        <ExclamationCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-400 dark:text-red-500 mx-auto mb-2" />
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 px-4">{error}</p>
      </div>
    );
  }

  if (compact && assignments.length === 0) {
    return (
      <div className="text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400">
        <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
        <p className="text-xs sm:text-sm">No assignments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {!compact && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Assignments</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stats.total} {stats.total === 1 ? 'assignment' : 'assignments'}
                {stats.overdue > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                    • {stats.overdue} overdue
                  </span>
                )}
              </p>
            </div>
            
            {showCreateButton && currentRole === 'teacher' && (
              <button
                onClick={onCreateAssignment}
                className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center justify-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                <span className="text-sm">Add Assignment</span>
              </button>
            )}
          </div>

          {/* Stats Cards */}
          {currentRole === 'student' && stats.total > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 truncate">Pending</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.pending}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100 truncate">Submitted</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400 mt-1">{stats.submitted}</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 sm:p-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100 truncate">Graded</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.graded}</p>
              </div>
              
              {stats.overdue > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 sm:p-3">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <ExclamationCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-red-900 dark:text-red-100 truncate">Overdue</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 mt-1">{stats.overdue}</p>
                </div>
              )}
            </div>
          )}

          {/* Filters and Sort */}
          {assignments.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2 flex-shrink-0">
                <FunnelIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="input-mobile text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="homework">Homework</option>
                <option value="test">Tests</option>
                <option value="project">Projects</option>
              </select>
              
              {currentRole === 'student' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="input-mobile text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                  <option value="overdue">Overdue</option>
                </select>
              )}
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="input-mobile text-xs sm:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="due_date">Sort by Due Date</option>
                <option value="created">Sort by Created</option>
                <option value="title">Sort by Title</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
          )}
        </>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Assignments Yet</h4>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 px-4">
            {currentRole === 'teacher' 
              ? 'Create assignments to help students track their work and deadlines.'
              : 'Assignments will appear here once your teacher creates them.'
            }
          </p>
          {showCreateButton && currentRole === 'teacher' && (
            <button
              onClick={onCreateAssignment}
              className="btn-mobile bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white inline-flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="text-sm">Create First Assignment</span>
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-${compact ? '2' : '2 sm:space-y-3'}`}>
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.assignment_id}
              assignment={assignment}
              onClick={onAssignmentClick}
              onSubmit={currentRole === 'student' ? handleSubmitAssignment : undefined}
              showSubmissionStatus={currentRole === 'student'}
              compact={compact}
            />
          ))}
          
          {filteredAssignments.length === 0 && assignments.length > 0 && (
            <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              <p className="text-xs sm:text-sm px-4">No assignments match the current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;