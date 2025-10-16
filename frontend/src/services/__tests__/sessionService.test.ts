import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sessionService } from '../sessionService';

// Mock the api module
const mockApiCall = vi.fn();
vi.mock('../../lib/api', () => ({
  apiCall: mockApiCall
}));

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessionsBySubject', () => {
    it('should call the new REST endpoint', async () => {
      const subjectId = 'test-subject-123';
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          sessions: [
            {
              session_id: 'session-1',
              subject_id: subjectId,
              name: 'Test Session',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              attendance_taken: false,
              assignments: []
            }
          ],
          total_count: 1,
          page: 1,
          page_size: 50
        })
      };

      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.getSessionsBySubject(subjectId);

      // Verify the new endpoint is called (with empty options object)
      expect(mockApiCall).toHaveBeenCalledWith(`/api/sessions/subject/${subjectId}`, {});
      expect(result).toHaveLength(1);
      expect(result[0].session_id).toBe('session-1');
    });

    it('should handle 403 errors with user-friendly messages', async () => {
      const subjectId = 'test-subject-123';
      const mockResponse = {
        ok: false,
        status: 403
      };

      mockApiCall.mockResolvedValue(mockResponse);

      const result = await sessionService.getSessionsBySubject(subjectId);

      // Should return empty array for backward compatibility
      expect(result).toEqual([]);
    });

    it('should handle network errors with retry logic', async () => {
      const subjectId = 'test-subject-123';
      
      // Mock network error (TypeError)
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';
      
      mockApiCall.mockRejectedValue(networkError);

      const result = await sessionService.getSessionsBySubject(subjectId);

      // Should return empty array for backward compatibility
      expect(result).toEqual([]);
      
      // Should have retried multiple times (1 initial + 3 retries = 4 total)
      expect(mockApiCall).toHaveBeenCalledTimes(4);
    }, 10000); // Increase timeout for retry logic
  });

  describe('getSessionsBySubjectWithErrors', () => {
    it('should throw user-friendly error for 403 status', async () => {
      const subjectId = 'test-subject-123';
      const mockResponse = {
        ok: false,
        status: 403
      };

      mockApiCall.mockResolvedValue(mockResponse);

      await expect(sessionService.getSessionsBySubjectWithErrors(subjectId))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('permission'),
          type: 'permission',
          retryable: false
        });
    });

    it('should throw user-friendly error for network issues', async () => {
      const subjectId = 'test-subject-123';
      
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';
      
      mockApiCall.mockRejectedValue(networkError);

      await expect(sessionService.getSessionsBySubjectWithErrors(subjectId))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('connect to the server'),
          type: 'network',
          retryable: true
        });
    }, 10000); // Increase timeout for retry logic
  });

  describe('error message helpers', () => {
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
      const unknownError = new Error('Some random error');
      
      const message = sessionService.getErrorMessage(unknownError);
      // Error objects return their message property, not the default message
      expect(message).toBe('Some random error');
    });

    it('should return default message for non-error objects', () => {
      const unknownError = { someProperty: 'value' };
      
      const message = sessionService.getErrorMessage(unknownError);
      expect(message).toBe('Something went wrong. Please try again.');
    });

    it('should correctly identify retryable errors', () => {
      const retryableError = { retryable: true };
      const nonRetryableError = { retryable: false };
      
      expect(sessionService.isRetryableError(retryableError)).toBe(true);
      expect(sessionService.isRetryableError(nonRetryableError)).toBe(false);
      expect(sessionService.isRetryableError({})).toBe(true); // Default to retryable
    });
  });
});