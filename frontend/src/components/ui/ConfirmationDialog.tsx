import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon,
  XMarkIcon,
  TrashIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface CascadeEffect {
  type: 'sessions' | 'students' | 'assignments' | 'attendance';
  count: number;
  description: string;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName: string;
  itemType: 'session' | 'subject' | 'assignment';
  cascadeEffects?: CascadeEffect[];
  warnings?: string[];
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType,
  cascadeEffects = [],
  warnings = [],
  loading = false,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDangerous = true
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setIsConfirmationValid(false);
    }
  }, [isOpen]);

  // Validate confirmation input
  useEffect(() => {
    if (isDangerous) {
      setIsConfirmationValid(confirmationInput.trim() === itemName.trim());
    } else {
      setIsConfirmationValid(true);
    }
  }, [confirmationInput, itemName, isDangerous]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!loading && isConfirmationValid) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getItemIcon = () => {
    switch (itemType) {
      case 'session':
        return '📅';
      case 'subject':
        return '📚';
      case 'assignment':
        return '📝';
      default:
        return '📄';
    }
  };

  const getCascadeIcon = (type: CascadeEffect['type']) => {
    switch (type) {
      case 'sessions':
        return '📅';
      case 'students':
        return '👥';
      case 'assignments':
        return '📝';
      case 'attendance':
        return '✅';
      default:
        return '📄';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {isDangerous ? (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : (
                <ExclamationCircleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Message */}
          <div className="flex items-start space-x-3">
            <span className="text-2xl" role="img" aria-label={itemType}>
              {getItemIcon()}
            </span>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-gray-100">
                {message}
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                "{itemName}"
              </p>
            </div>
          </div>

          {/* Cascade Effects */}
          {cascadeEffects.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  This will also delete:
                </h4>
              </div>
              <ul className="space-y-2">
                {cascadeEffects.map((effect, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <span role="img" aria-label={effect.type}>
                      {getCascadeIcon(effect.type)}
                    </span>
                    <span>
                      <strong>{effect.count}</strong> {effect.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Important warnings:
                </h4>
              </div>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-300">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmation Input for Dangerous Actions */}
          {isDangerous && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                To confirm deletion, type the {itemType} name below:
              </p>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-500 mb-2">
                {itemName}
              </p>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`Type "${itemName}" to confirm`}
                className={`w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  confirmationInput && !isConfirmationValid
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={loading}
                id="confirmation-input"
              />
              {confirmationInput && !isConfirmationValid && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Please type the exact {itemType} name to confirm
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 order-2 sm:order-1"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !isConfirmationValid}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center order-1 sm:order-2 ${
              isDangerous 
                ? 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600' 
                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {loading ? 'Deleting...' : (
              <>
                <TrashIcon className="h-4 w-4 mr-2" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;