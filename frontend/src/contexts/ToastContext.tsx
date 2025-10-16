import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastData, ToastType } from '../components/ui/Toast';
import ToastContainer from '../components/ui/ToastContainer';

interface ToastContextType {
  showToast: (
    type: ToastType,
    message: string,
    options?: {
      title?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => void;
  showSuccess: (message: string, options?: { title?: string; duration?: number }) => void;
  showError: (message: string, options?: { title?: string; duration?: number }) => void;
  showWarning: (message: string, options?: { title?: string; duration?: number }) => void;
  showInfo: (message: string, options?: { title?: string; duration?: number }) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const generateId = () => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const showToast = useCallback((
    type: ToastType,
    message: string,
    options?: {
      title?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    const id = generateId();
    const defaultDuration = type === 'error' ? 8000 : 5000; // Errors stay longer
    
    const newToast: ToastData = {
      id,
      type,
      message,
      title: options?.title,
      duration: options?.duration ?? defaultDuration,
      action: options?.action,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration if specified
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, []);

  const showSuccess = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    showToast('success', message, options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    showToast('error', message, options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    showToast('warning', message, options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: { title?: string; duration?: number }) => {
    showToast('info', message, options);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        clearAllToasts,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience hooks for specific toast types
export const useSuccessToast = () => {
  const { showSuccess } = useToast();
  return showSuccess;
};

export const useErrorToast = () => {
  const { showError } = useToast();
  return showError;
};

export const useWarningToast = () => {
  const { showWarning } = useToast();
  return showWarning;
};

export const useInfoToast = () => {
  const { showInfo } = useToast();
  return showInfo;
};