import { Session, SessionCreate, SessionUpdate } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class SessionService {
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const { apiCall } = await import('../lib/api');
    return apiCall(endpoint, options);
  }

  async getSessionsBySubject(subjectId: string): Promise<Session[]> {
    try {
      const response = await this.apiCall(`/api/sessions/subject/${subjectId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch sessions:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await this.apiCall(`/api/sessions/${sessionId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  async createSession(subjectId: string, sessionData: SessionCreate): Promise<Session | null> {
    try {
      const response = await this.apiCall(`/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sessionData,
          subject_id: subjectId,
        }),
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to create session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, sessionData: SessionUpdate): Promise<Session | null> {
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
        console.error('Failed to update session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await this.apiCall(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
}

export const sessionService = new SessionService();