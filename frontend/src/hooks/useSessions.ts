import { useState, useEffect } from 'react';
import { Session, SessionCreate, SessionUpdate } from '../types';
import { sessionService } from '../services/sessionService';

export const useSessions = (subjectId?: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (id?: string) => {
    if (!id && !subjectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedSessions = await sessionService.getSessionsBySubject(id || subjectId!);
      setSessions(fetchedSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: SessionCreate) => {
    if (!subjectId) {
      setError('Subject ID is required to create a session');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newSession = await sessionService.createSession(subjectId, sessionData);
      if (newSession) {
        setSessions(prev => [newSession, ...prev]);
        return newSession;
      } else {
        setError('Failed to create session');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (sessionId: string, sessionData: SessionUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const updatedSession = await sessionService.updateSession(sessionId, sessionData);
      if (updatedSession) {
        setSessions(prev => 
          prev.map(session => 
            session.session_id === sessionId ? updatedSession : session
          )
        );
        return updatedSession;
      } else {
        setError('Failed to update session');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = await sessionService.deleteSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(session => session.session_id !== sessionId));
        return true;
      } else {
        setError('Failed to delete session');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subjectId) {
      fetchSessions();
    }
  }, [subjectId]);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    refetch: () => fetchSessions(subjectId),
  };
};