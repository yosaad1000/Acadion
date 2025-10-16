/**
 * Unit tests for SessionService
 * Tests the frontend session service methods and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../../services/sessionService';
import type { Session, SessionCreate, SessionUpdate } from '../../types';

// Mock the api module
vi.mock('../../lib/api', () => ({
  apiCall: vi.fn()
}));

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockApiCall: any;

  beforeEach(async () => {
    sessionService = new SessionService();
    // Get the mocked apiCall function
    mockApiCall = vi.mocked((await import('../../lib/api')).apiCall);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSessionsBySubject', () => {
    const subjectId = 'test-subject-id';
    const mockSessions: Session[] = [
      {
        session_id: 'session-1',
        subject_id: subjectId,
        name: 'Session 1',
        description: 'Test session',
        session_date: '2024-01-01T10:00:00Z',
        notes: null,
        attendance_taken: false,
        created_by: 'teacher-id',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      }
    ];

    it('should return sessions on successful API call', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ sessions: mockSessions })
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.getSessionsBySubject(subjectId);

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/subject/${subjectId}`);
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.getSessionsBySubject(subjectId);

      expect(result).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockApiCall.mockRejectedValue(networkError);

      const result = await sessionService.getSessionsBySubject(subjectId);

      expect(result).toEqual([]);
    });

    it('should handle malformed response data', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ /* missing sessions field */ })
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.getSessionsBySubject(subjectId);

      expect(result).toEqual([]);
    });
  });

  describe('getSessionsBySubjectWithErrors', () => {
    const subjectId = 'test-subject-id';

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 403
      };
      mockApiCall.mockResolvedValue(mockResponse);

      await expect(sessionService.getSessionsBySubjectWithErrors(subjectId))
        .rejects.toThrow();
    });

    it('should throw error on network failure', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockApiCall.mockRejectedValue(networkError);

      await expect(sessionService.getSessionsBySubjectWithErrors(subjectId))
        .rejects.toThrow();
    });
  });

  describe('createSession', () => {
    const subjectId = 'test-subject-id';
    const sessionData: SessionCreate = {
      name: 'New Session',
      description: 'Test description',
      session_date: '2024-01-01T10:00:00Z'
    };

    const mockCreatedSession: Session = {
      session_id: 'new-session-id',
      subject_id: subjectId,
      name: 'New Session',
      description: 'Test description',
      session_date: '2024-01-01T10:00:00Z',
      notes: null,
      attendance_taken: false,
      created_by: 'teacher-id',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:00Z',
      assignments: [],
      subject_name: 'Test Subject',
      teacher_name: 'Test Teacher',
      assignment_count: 0,
      has_overdue_assignments: false
    };

    it('should create session successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockCreatedSession)
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.createSession(subjectId, sessionData);

      expect(mockApiCall).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject_id: subjectId,
          name: sessionData.name,
          description: sessionData.description,
          session_date: sessionData.session_date
        })
      });
      expect(result).toEqual(mockCreatedSession);
    });

    it('should filter out undefined values from request', async () => {
      const partialSessionData: SessionCreate = {
        name: 'New Session'
        // description and session_date are undefined
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockCreatedSession)
      };
      mockApiCall.mockResolvedValue(mockResponse);

      await sessionService.createSession(subjectId, partialSessionData);

      const expectedBody = {
        subject_id: subjectId,
        name: partialSessionData.name
        // description and session_date should not be included
      };

      expect(mockApiCall).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expectedBody)
      });
    });

    it('should return null on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 403
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.createSession(subjectId, sessionData);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockApiCall.mockRejectedValue(networkError);

      const result = await sessionService.createSession(subjectId, sessionData);

      expect(result).toBeNull();
    });
  });

  describe('createSessionWithErrors', () => {
    const subjectId = 'test-subject-id';
    const sessionData: SessionCreate = {
      name: 'New Session'
    };

    it('should throw error on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 403
      };
      mockApiCall.mockResolvedValue(mockResponse);

      await expect(sessionService.createSessionWithErrors(subjectId, sessionData))
        .rejects.toThrow();
    });
  });

  describe('updateSession', () => {
    const sessionId = 'test-session-id';
    const updateData: SessionUpdate = {
      name: 'Updated Session',
      notes: 'Updated notes'
    };

    it('should update session successfully', async () => {
      const mockUpdatedSession: Session = {
        session_id: sessionId,
        subject_id: 'subject-id',
        name: 'Updated Session',
        description: null,
        session_date: '2024-01-01T10:00:00Z',
        notes: 'Updated notes',
        attendance_taken: false,
        created_by: 'teacher-id',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockUpdatedSession)
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.updateSession(sessionId, updateData);

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      expect(result).toEqual(mockUpdatedSession);
    });

    it('should return null on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.updateSession(sessionId, updateData);

      expect(result).toBeNull();
    });
  });

  describe('updateSessionNotes', () => {
    const sessionId = 'test-session-id';
    const notes = 'Important session notes';

    it('should update session notes', async () => {
      const mockUpdatedSession: Session = {
        session_id: sessionId,
        subject_id: 'subject-id',
        name: 'Test Session',
        description: null,
        session_date: '2024-01-01T10:00:00Z',
        notes: notes,
        attendance_taken: false,
        created_by: 'teacher-id',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        assignments: [],
        subject_name: 'Test Subject',
        teacher_name: 'Test Teacher',
        assignment_count: 0,
        has_overdue_assignments: false
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockUpdatedSession)
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.updateSessionNotes(sessionId, notes);

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: notes })
      });
      expect(result).toEqual(mockUpdatedSession);
    });

    it('should trim whitespace from notes', async () => {
      const notesWithWhitespace = '  Important notes  ';
      const trimmedNotes = 'Important notes';

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({})
      };
      mockApiCall.mockResolvedValue(mockResponse);

      await sessionService.updateSessionNotes(sessionId, notesWithWhitespace);

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: trimmedNotes })
      });
    });

    it('should handle empty notes', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({})
      };
      mockApiCall.mockResolvedValue(mockResponse);

      await sessionService.updateSessionNotes(sessionId, '   ');

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: undefined })
      });
    });
  });

  describe('deleteSession', () => {
    const sessionId = 'test-session-id';

    it('should delete session successfully', async () => {
      const mockResponse = {
        ok: true
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.deleteSession(sessionId);

      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.deleteSession(sessionId);

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockApiCall.mockRejectedValue(networkError);

      const result = await sessionService.deleteSession(sessionId);

      expect(result).toBe(false);
    });
  });

  describe('error handling utilities', () => {
    it('should return user-friendly error messages', () => {
      const apiError = {
        message: 'You don\'t have permission to access this class.',
        type: 'permission',
        retryable: false
      };

      const message = sessionService.getErrorMessage(apiError);
      expect(message).toBe('You don\'t have permission to access this class.');
    });

    it('should return default message for unknown errors', () => {
      const unknownError = new Error('Some internal error');

      const message = sessionService.getErrorMessage(unknownError);
      expect(message).toBe('Something went wrong. Please try again.');
    });

    it('should correctly identify retryable errors', () => {
      const retryableError = {
        message: 'Server temporarily unavailable',
        type: 'server',
        retryable: true
      };

      const nonRetryableError = {
        message: 'Permission denied',
        type: 'permission',
        retryable: false
      };

      expect(sessionService.isRetryableError(retryableError)).toBe(true);
      expect(sessionService.isRetryableError(nonRetryableError)).toBe(false);
      expect(sessionService.isRetryableError({})).toBe(true); // Default to retryable
    });
  });

  describe('retry mechanism', () => {
    it('should retry on retryable errors', async () => {
      const subjectId = 'test-subject-id';
      
      // First call fails, second succeeds
      const failResponse = { ok: false, status: 500 };
      const successResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ sessions: [] })
      };
      
      mockApiCall
        .mockResolvedValueOnce(failResponse)
        .mockResolvedValueOnce(successResponse);

      const result = await sessionService.getSessionsBySubjectWithErrors(subjectId);

      expect(mockApiCall).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should not retry on non-retryable errors', async () => {
      const subjectId = 'test-subject-id';
      
      // Permission error (non-retryable)
      const failResponse = { ok: false, status: 403 };
      mockApiCall.mockResolvedValue(failResponse);

      await expect(sessionService.getSessionsBySubjectWithErrors(subjectId))
        .rejects.toThrow();

      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });
  });
});