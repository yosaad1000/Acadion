import React, { createContext, useContext, useState, useCallback } from 'react';

export type ClassViewType = 'sessions' | 'students' | 'settings';
export type SessionViewType = 'overview' | 'attendance' | 'notes' | 'assignments';

interface ViewState {
  classViews: Record<string, ClassViewType>;
  sessionViews: Record<string, SessionViewType>;
  lastVisitedClass?: string;
  lastVisitedSession?: string;
}

interface ViewContextType {
  // Class view management
  getClassView: (classId: string) => ClassViewType;
  setClassView: (classId: string, view: ClassViewType) => void;
  
  // Session view management
  getSessionView: (sessionId: string) => SessionViewType;
  setSessionView: (sessionId: string, view: SessionViewType) => void;
  
  // Navigation history
  setLastVisitedClass: (classId: string) => void;
  getLastVisitedClass: () => string | undefined;
  setLastVisitedSession: (sessionId: string) => void;
  getLastVisitedSession: () => string | undefined;
  
  // Breadcrumb helpers
  getBreadcrumbsForClass: (classId: string, className?: string) => Array<{ label: string; href?: string; current?: boolean }>;
  getBreadcrumbsForSession: (
    classId: string, 
    sessionId: string, 
    className?: string, 
    sessionName?: string
  ) => Array<{ label: string; href?: string; current?: boolean }>;
  
  // Reset state
  clearViewState: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

const DEFAULT_CLASS_VIEW: ClassViewType = 'sessions';
const DEFAULT_SESSION_VIEW: SessionViewType = 'overview';

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewState, setViewState] = useState<ViewState>({
    classViews: {},
    sessionViews: {},
  });

  // Class view management
  const getClassView = useCallback((classId: string): ClassViewType => {
    return viewState.classViews[classId] || DEFAULT_CLASS_VIEW;
  }, [viewState.classViews]);

  const setClassView = useCallback((classId: string, view: ClassViewType) => {
    setViewState(prev => ({
      ...prev,
      classViews: {
        ...prev.classViews,
        [classId]: view,
      },
    }));
  }, []);

  // Session view management
  const getSessionView = useCallback((sessionId: string): SessionViewType => {
    return viewState.sessionViews[sessionId] || DEFAULT_SESSION_VIEW;
  }, [viewState.sessionViews]);

  const setSessionView = useCallback((sessionId: string, view: SessionViewType) => {
    setViewState(prev => ({
      ...prev,
      sessionViews: {
        ...prev.sessionViews,
        [sessionId]: view,
      },
    }));
  }, []);

  // Navigation history
  const setLastVisitedClass = useCallback((classId: string) => {
    setViewState(prev => ({
      ...prev,
      lastVisitedClass: classId,
    }));
  }, []);

  const getLastVisitedClass = useCallback(() => {
    return viewState.lastVisitedClass;
  }, [viewState.lastVisitedClass]);

  const setLastVisitedSession = useCallback((sessionId: string) => {
    setViewState(prev => ({
      ...prev,
      lastVisitedSession: sessionId,
    }));
  }, []);

  const getLastVisitedSession = useCallback(() => {
    return viewState.lastVisitedSession;
  }, [viewState.lastVisitedSession]);

  // Breadcrumb helpers
  const getBreadcrumbsForClass = useCallback((
    classId: string, 
    className?: string
  ) => {
    const currentView = getClassView(classId);
    const classLabel = className || `Class ${classId.slice(0, 8)}`;
    
    return [
      {
        label: classLabel,
        href: `/class/${classId}`,
        current: false,
      },
      {
        label: currentView.charAt(0).toUpperCase() + currentView.slice(1),
        current: true,
      },
    ];
  }, [getClassView]);

  const getBreadcrumbsForSession = useCallback((
    classId: string,
    sessionId: string,
    className?: string,
    sessionName?: string
  ) => {
    const currentView = getSessionView(sessionId);
    const classLabel = className || `Class ${classId.slice(0, 8)}`;
    const sessionLabel = sessionName || `Session ${sessionId.slice(0, 8)}`;
    
    return [
      {
        label: classLabel,
        href: `/class/${classId}`,
        current: false,
      },
      {
        label: sessionLabel,
        href: `/class/${classId}/session/${sessionId}`,
        current: false,
      },
      {
        label: currentView.charAt(0).toUpperCase() + currentView.slice(1),
        current: true,
      },
    ];
  }, [getSessionView]);

  // Reset state
  const clearViewState = useCallback(() => {
    setViewState({
      classViews: {},
      sessionViews: {},
    });
  }, []);

  return (
    <ViewContext.Provider
      value={{
        getClassView,
        setClassView,
        getSessionView,
        setSessionView,
        setLastVisitedClass,
        getLastVisitedClass,
        setLastVisitedSession,
        getLastVisitedSession,
        getBreadcrumbsForClass,
        getBreadcrumbsForSession,
        clearViewState,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};