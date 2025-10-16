import { Session, SessionCreate, SessionUpdate } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Error types for better error handling
interface ApiError {
  message: string;
  type: 'network' | 'permission' | 'notFound' | 'server' | 'unknown';
  statusCode?: number;
  retryable: boolean;
}

export class SessionService {
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const { apiCall } = await import('../lib/api');
    return apiCall(endpoint, options);
  }

  // Method to get user-friendly error messages for UI components
  getErrorMessage(error: any): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }

  // Method to check if an error is retryable (for UI retry buttons)
  isRetryableError(error: any): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
      return error.retryable;
    }
    return true; // Default to retryable for unknown errors
  }

  private parseApiError(error: any, response?: Response): ApiError {
    if (!response) {
      // Network error
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        type: 'network',
        retryable: true
      };
    }

    const statusCode = response.status;
    
    switch (statusCode) {
      case 403:
        return {
          message: 'You don\'t have permission to access this class. Please check that you\'re enrolled or contact your teacher.',
          type: 'permission',
          statusCode,
          retryable: false
        };
      case 404:
        return {
          message: 'The class you\'re looking for doesn\'t exist or has been removed.',
          type: 'notFound',
          statusCode,
          retryable: false
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: 'The server is temporarily unavailable. Please try again in a moment.',
          type: 'server',
          statusCode,
          retryable: true
        };
      default:
        return {
          message: 'Something went wrong. Please try again.',
          type: 'unknown',
          statusCode,
          retryable: true
        };
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt or if error is not retryable
        if (attempt === maxRetries || (error as ApiError)?.retryable === false) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  async getSessionsBySubject(subjectId: string): Promise<Session[]> {
    return this.retryWithBackoff(async () => {
      try {
        // Use the new REST endpoint for better semantics
        const response = await this.apiCall(`/api/sessions/subject/${subjectId}`);
        
        if (response.ok) {
          const data = await response.json();
          // Backend returns { sessions: [...], total_count, page, page_size }
          return data.sessions || [];
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to fetch sessions:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error fetching sessions:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    }).catch(error => {
      // For getSessionsBySubject, return empty array on error to maintain backward compatibility
      console.error('Error fetching sessions:', error);
      return [];
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.apiCall(`/api/sessions/${sessionId}`);
        
        if (response.ok) {
          return await response.json();
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to fetch session:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error fetching session:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    }).catch(error => {
      // For getSession, return null on error to maintain backward compatibility
      console.error('Error fetching session:', error);
      return null;
    });
  }

  async createSession(subjectId: string, sessionData: SessionCreate): Promise<Session | null> {
    return this.retryWithBackoff(async () => {
      try {
        // Prepare the request data, filtering out undefined values
        const requestData = {
          subject_id: subjectId,
          ...(sessionData.name && { name: sessionData.name }),
          ...(sessionData.description && { description: sessionData.description }),
          ...(sessionData.session_date && { session_date: sessionData.session_date }),
        };

        const response = await this.apiCall(`/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to create session:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error creating session:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    }).catch(error => {
      // For createSession, return null on error to maintain backward compatibility
      console.error('Error creating session:', error);
      return null;
    });
  }

  async updateSession(sessionId: string, sessionData: SessionUpdate): Promise<Session | null> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.apiCall(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData),
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to update session:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error updating session:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    }).catch(error => {
      // For updateSession, return null on error to maintain backward compatibility
      console.error('Error updating session:', error);
      return null;
    });
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.retryWithBackoff(async () => {
      try {
        const response = await this.apiCall(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          return true;
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to delete session:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error deleting session:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    }).catch(error => {
      // For deleteSession, return false on error to maintain backward compatibility
      console.error('Error deleting session:', error);
      return false;
    });
  }

  async updateSessionNotes(sessionId: string, notes: string): Promise<Session | null> {
    return this.updateSession(sessionId, { notes: notes.trim() || undefined });
  }

  // Alternative methods that throw errors instead of returning null/false
  // These are useful for components that want to handle errors explicitly
  async getSessionsBySubjectWithErrors(subjectId: string): Promise<Session[]> {
    return this.retryWithBackoff(async () => {
      try {
        // Use the new REST endpoint for better semantics
        const response = await this.apiCall(`/api/sessions/subject/${subjectId}`);
        
        if (response.ok) {
          const data = await response.json();
          // Backend returns { sessions: [...], total_count, page, page_size }
          return data.sessions || [];
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to fetch sessions:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error fetching sessions:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    });
  }

  async createSessionWithErrors(subjectId: string, sessionData: SessionCreate): Promise<Session> {
    return this.retryWithBackoff(async () => {
      try {
        // Prepare the request data, filtering out undefined values
        const requestData = {
          subject_id: subjectId,
          ...(sessionData.name && { name: sessionData.name }),
          ...(sessionData.description && { description: sessionData.description }),
          ...(sessionData.session_date && { session_date: sessionData.session_date }),
        };

        const response = await this.apiCall(`/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          const apiError = this.parseApiError(null, response);
          console.error('Failed to create session:', apiError.message);
          throw apiError;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'TypeError') {
          // Network error (fetch failed)
          const apiError = this.parseApiError(error);
          console.error('Network error creating session:', apiError.message);
          throw apiError;
        }
        throw error;
      }
    });
  }
}

export const sessionService = new SessionService();