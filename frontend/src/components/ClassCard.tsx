import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  CalendarIcon, 
  ClockIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import InviteCodeDisplay from './InviteCodeDisplay';

interface ClassCardProps {
  subject: {
    subject_id: string;
    subject_code: string;
    name: string;
    description?: string;
    invite_code: string;
    student_count: number;
    created_at: string;
  };
  index: number;
  showInviteCode?: boolean;
  showActions?: boolean;
  onEdit?: (subject: any) => void;
  onDelete?: (subject: any) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ 
  subject, 
  index, 
  showInviteCode = true,
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
  const getSubjectColor = (index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600', 
      'from-purple-500 to-purple-600',
      'from-red-500 to-red-600',
      'from-yellow-500 to-yellow-600',
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600'
    ];
    return colors[index % colors.length];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActionMenu(!showActionMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActionMenu(false);
    if (onEdit) {
      onEdit(subject);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActionMenu(false);
    if (onDelete) {
      onDelete(subject);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if not clicking on action menu
    if (!showActionMenu) {
      navigate(`/class/${subject.subject_id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group touch-manipulation block cursor-pointer"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1 relative">
        {/* Class Header with Gradient */}
        <div className={`bg-gradient-to-r ${getSubjectColor(index)} h-24 sm:h-28 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-300"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative p-4 sm:p-5 text-white h-full flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg sm:text-xl truncate group-hover:scale-105 transition-transform origin-left">
                {subject.name}
              </h3>
              <p className="text-sm sm:text-base opacity-90 font-medium">
                {subject.subject_code}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm opacity-90">
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  <span>{subject.student_count}</span>
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Active</span>
                </div>
              </div>

              {/* Action Menu */}
              {showActions && (
                <div className="relative" ref={actionMenuRef}>
                  <button
                    onClick={handleActionClick}
                    className="p-1 text-white/80 hover:text-white rounded-md hover:bg-white/20 transition-colors"
                    aria-label="Class actions"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>

                  {showActionMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                      <div className="py-1">
                        <button
                          onClick={handleEdit}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4 mr-3" />
                          Edit Class
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4 mr-3" />
                          Delete Class
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Class Info */}
        <div className="p-4 sm:p-5 space-y-3">
          {subject.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {subject.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Created {formatDate(subject.created_at)}</span>
            </div>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
              Active
            </span>
          </div>
          
          {showInviteCode && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <InviteCodeDisplay 
                code={subject.invite_code} 
                size="sm" 
                showLabel={false}
              />
            </div>
          )}
        </div>
        
        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default ClassCard;