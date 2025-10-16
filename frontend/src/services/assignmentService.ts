import { Assignment } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AssignmentCreate {
  title: string;
  description?: string;
  due_date?: string;
  assignment_type: 'homework' | 'test' | 'project';
  google_drive_link?: string;
}

export interface AssignmentUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  assignment_type?: 'homework' | 'test' | 'project';
  google_drive_link?: string;
}

export interface AssignmentSubmissionUpdate {
  submission_status: 'pending' | 'submitted' | 'graded';
}

export class AssignmentService {
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const { apiCall } = await import('../lib/api');
    return apiCall(endpoint, options);
  }

  async getAssignmentsBySession(sessionId: string): Promise<Assignment[]> {
    try {
      const response = await this.apiCall(`/api/sessions/${sessionId}/assignments`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns { assignments: [...], total_count, page, page_size }
        return data.assignments || [];
      } else {
        console.error('Failed to fetch assignments:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    try {
      const response = await this.apiCall(`/api/assignments/${assignmentId}`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch assignment:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      return null;
    }
  }

  async createAssignment(sessionId: string, assignmentData: AssignmentCreate): Promise<Assignment | null> {
    try {
      const response = await this.apiCall(`/api/sessions/${sessionId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...assignmentData,
          session_id: sessionId,
        }),
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to create assignment:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      return null;
    }
  }

  async updateAssignment(assignmentId: string, assignmentData: AssignmentUpdate): Promise<Assignment | null> {
    try {
      const response = await this.apiCall(`/api/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to update assignment:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      return null;
    }
  }

  async updateSubmissionStatus(assignmentId: string, submissionData: AssignmentSubmissionUpdate): Promise<Assignment | null> {
    try {
      const response = await this.apiCall(`/api/assignments/${assignmentId}/submission`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to update submission status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Error updating submission status:', error);
      return null;
    }
  }

  async deleteAssignment(assignmentId: string): Promise<boolean> {
    try {
      const response = await this.apiCall(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return false;
    }
  }

  // Get assignments for a student across all sessions
  async getStudentAssignments(studentId: string): Promise<Assignment[]> {
    try {
      const response = await this.apiCall(`/api/students/${studentId}/assignments`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch student assignments:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      return [];
    }
  }

  // Get overdue assignments for a student
  async getOverdueAssignments(studentId: string): Promise<Assignment[]> {
    try {
      const response = await this.apiCall(`/api/students/${studentId}/assignments/overdue`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch overdue assignments:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching overdue assignments:', error);
      return [];
    }
  }
}

export const assignmentService = new AssignmentService();