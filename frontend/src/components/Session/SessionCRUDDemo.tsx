import React, { useState } from 'react';
import { SessionResponse } from '../../types';
import { useSessions } from '../../hooks/useSessions';
import { useToast } from '../../contexts/ToastContext';
import SessionCard from './SessionCard';
import EditSession from './EditSession';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface SessionCRUDDemoProps {
  subjectId: string;
  sessions: SessionResponse[];
  isTeacher: boolean;
}

const SessionCRUDDemo: React.FC<SessionCRUDDemoProps> = ({
  subjectId,
  sessions,
  isTeacher
}) => {
  const { updateSession, deleteSession, loading } = useSessions(subjectId);
  const { showSuccess, showError } = useToast();
  
  const [editingSession, setEditingSession] = useState<SessionResponse | null>(null);
  const [deletingSession, setDeletingSession] = useState<SessionResponse | null>(null);

  const handleEdit = (session: SessionResponse) => {
    setEditingSession(session);
  };

  const handleDelete = (session: SessionResponse) => {
    setDeletingSession(session);
  };

  const handleEditSuccess = (updatedSession: SessionResponse) => {
    setEditingSession(null);
    showSuccess(`Session "${updatedSession.name}" updated successfully!`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSession) return;

    try {
      const success = await deleteSession(deletingSession.session_id);
      if (success) {
        setDeletingSession(null);
        showSuccess(`Session "${deletingSession.name}" deleted successfully!`);
      } else {
        showError('Failed to delete session. Please try again.');
      }
    } catch (error) {
      showError('Failed to delete session. Please try again.');
    }
  };

  const getCascadeEffects = (session: SessionResponse) => {
    const effects = [];
    
    if (session.assignment_count > 0) {
      effects.push({
        type: 'assignments' as const,
        count: session.assignment_count,
        description: `assignment${session.assignment_count !== 1 ? 's' : ''}`
      });
    }

    // Add attendance records if attendance was taken
    if (session.attendance_taken) {
      effects.push({
        type: 'attendance' as const,
        count: 1,
        description: 'attendance record'
      });
    }

    return effects;
  };

  const getDeleteWarnings = (session: SessionResponse) => {
    const warnings = [];
    
    if (session.attendance_taken) {
      warnings.push('Student attendance data will be permanently lost');
    }
    
    if (session.assignment_count > 0) {
      warnings.push('All assignments and submissions will be deleted');
    }

    return warnings;
  };

  return (
    <div className="space-y-4">
      {/* Session Cards with CRUD Actions */}
      {sessions.map((session) => (
        <SessionCard
          key={session.session_id}
          session={session}
          subjectId={subjectId}
          showActions={isTeacher}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {/* Edit Session Modal */}
      {editingSession && (
        <EditSession
          session={editingSession}
          isOpen={true}
          onClose={() => setEditingSession(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingSession && (
        <ConfirmationDialog
          isOpen={true}
          onClose={() => setDeletingSession(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Session"
          message="Are you sure you want to delete this session?"
          itemName={deletingSession.name}
          itemType="session"
          cascadeEffects={getCascadeEffects(deletingSession)}
          warnings={getDeleteWarnings(deletingSession)}
          loading={loading}
          confirmText="Delete Session"
          cancelText="Cancel"
          isDangerous={true}
        />
      )}
    </div>
  );
};

export default SessionCRUDDemo;