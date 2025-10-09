import { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { 
  assignmentService, 
  AssignmentCreate, 
  AssignmentUpdate, 
  AssignmentSubmissionUpdate 
} from '../services/assignmentService';

export const useAssignments = (sessionId?: string) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async (id?: string) => {
    if (!id && !sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedAssignments = await assignmentService.getAssignmentsBySession(id || sessionId!);
      setAssignments(fetchedAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: AssignmentCreate) => {
    if (!sessionId) {
      setError('Session ID is required to create an assignment');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newAssignment = await assignmentService.createAssignment(sessionId, assignmentData);
      if (newAssignment) {
        setAssignments(prev => [newAssignment, ...prev]);
        return newAssignment;
      } else {
        setError('Failed to create assignment');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = async (assignmentId: string, assignmentData: AssignmentUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const updatedAssignment = await assignmentService.updateAssignment(assignmentId, assignmentData);
      if (updatedAssignment) {
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.assignment_id === assignmentId ? updatedAssignment : assignment
          )
        );
        return updatedAssignment;
      } else {
        setError('Failed to update assignment');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (assignmentId: string, submissionData: AssignmentSubmissionUpdate) => {
    setLoading(true);
    setError(null);

    try {
      const updatedAssignment = await assignmentService.updateSubmissionStatus(assignmentId, submissionData);
      if (updatedAssignment) {
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.assignment_id === assignmentId ? updatedAssignment : assignment
          )
        );
        return updatedAssignment;
      } else {
        setError('Failed to update submission status');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission status');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = await assignmentService.deleteAssignment(assignmentId);
      if (success) {
        setAssignments(prev => prev.filter(assignment => assignment.assignment_id !== assignmentId));
        return true;
      } else {
        setError('Failed to delete assignment');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchAssignments();
    }
  }, [sessionId]);

  return {
    assignments,
    loading,
    error,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    updateSubmissionStatus,
    deleteAssignment,
    refetch: () => fetchAssignments(sessionId),
  };
};

// Hook for student-specific assignment operations
export const useStudentAssignments = (studentId?: string) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [overdueAssignments, setOverdueAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentAssignments = async (id?: string) => {
    if (!id && !studentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedAssignments = await assignmentService.getStudentAssignments(id || studentId!);
      setAssignments(fetchedAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueAssignments = async (id?: string) => {
    if (!id && !studentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedOverdue = await assignmentService.getOverdueAssignments(id || studentId!);
      setOverdueAssignments(fetchedOverdue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overdue assignments');
    } finally {
      setLoading(false);
    }
  };

  const submitAssignment = async (assignmentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedAssignment = await assignmentService.updateSubmissionStatus(assignmentId, {
        submission_status: 'submitted'
      });
      
      if (updatedAssignment) {
        setAssignments(prev => 
          prev.map(assignment => 
            assignment.assignment_id === assignmentId ? updatedAssignment : assignment
          )
        );
        // Remove from overdue if it was there
        setOverdueAssignments(prev => 
          prev.filter(assignment => assignment.assignment_id !== assignmentId)
        );
        return updatedAssignment;
      } else {
        setError('Failed to submit assignment');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudentAssignments();
      fetchOverdueAssignments();
    }
  }, [studentId]);

  return {
    assignments,
    overdueAssignments,
    loading,
    error,
    fetchStudentAssignments,
    fetchOverdueAssignments,
    submitAssignment,
    refetch: () => {
      fetchStudentAssignments(studentId);
      fetchOverdueAssignments(studentId);
    },
  };
};