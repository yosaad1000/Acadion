import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import StudentDashboard from '../../pages/StudentDashboard';
import TeacherDashboard from '../../pages/TeacherDashboard';
import Profile from '../../pages/Profile';
import ClassSettings from '../../pages/ClassSettings';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ classId: 'class-123' })
}));

const mockStudentUser = {
  user_id: 'student-123',
  name: 'Test Student',
  email: 'student@example.com',
  user_type: 'student' as const,
  is_face_registered: false,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02')
};

const mockTeacherUser = {
  user_id: 'teacher-123',
  name: 'Test Teacher',
  email: 'teacher@example.com',
  user_type: 'teacher' as const,
  is_face_registered: false,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-02')
};

const mockStudentAuthContext = {
  user: mockStudentUser,
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  loading: false,
  refreshUser: jest.fn()
};

const mockTeacherAuthContext = {
  user: mockTeacherUser,
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  loading: false,
  refreshUser: jest.fn()
};

const mockSubjects = [
  {
    subject_id: 'subject-1',
    subject_code: 'CS101',
    name: 'Computer Science 101',
    description: 'Introduction to Computer Science',
    teacher_name: 'Dr. Smith',
    student_count: 25,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    subject_id: 'subject-2',
    subject_code: 'MATH201',
    name: 'Advanced Mathematics',
    description: 'Advanced mathematical concepts',
    teacher_name: 'Dr. Johnson',
    student_count: 18,
    created_at: '2024-01-02T00:00:00Z'
  }
];

const renderWithRouter = (component: React.ReactElement, authContext: any) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('User Workflows Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Student Unenrollment Workflow', () => {
    it('completes full unenrollment workflow successfully', async () => {
      const user = userEvent.setup();
      
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Successfully unenrolled from subject' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects.slice(1) // Remove first subject
        });

      renderWithRouter(<StudentDashboard />, mockStudentAuthContext);
      
      // Wait for subjects to load
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      // Click unenroll button
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      // Confirm unenrollment in modal
      expect(screen.getByText('Unenroll from Class')).toBeInTheDocument();
      const confirmButton = screen.getByText('Unenroll');
      await user.click(confirmButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/subject-1/enrollment', {
          method: 'DELETE',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
      });
      
      // Verify dashboard updates
      await waitFor(() => {
        expect(screen.queryByText('Computer Science 101')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Mathematics')).toBeInTheDocument();
      });
    });

    it('handles unenrollment cancellation', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubjects
      });

      renderWithRouter(<StudentDashboard />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      // Click unenroll button
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      // Cancel unenrollment
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      // Verify modal is closed and subject still exists
      expect(screen.queryByText('Unenroll from Class')).not.toBeInTheDocument();
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
    });

    it('handles unenrollment errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Failed to unenroll from subject' })
        });

      renderWithRouter(<StudentDashboard />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      const confirmButton = screen.getByText('Unenroll');
      await user.click(confirmButton);
      
      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText('Failed to unenroll from subject')).toBeInTheDocument();
      });
      
      // Subject should still be visible
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
    });
  });

  describe('Profile Management Workflow', () => {
    it('completes profile update workflow successfully', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Profile updated successfully' })
        });

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Student')).toBeInTheDocument();
      });
      
      // Update name
      const nameInput = screen.getByDisplayValue('Test Student');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Student Name');
      
      // Submit update
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          },
          body: JSON.stringify({
            name: 'Updated Student Name',
            email: 'student@example.com'
          })
        });
      });
      
      // Verify success message
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
    });

    it('completes password change workflow successfully', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Password changed successfully' })
        });

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      });
      
      // Fill password form
      await user.type(screen.getByLabelText('Current Password'), 'oldpassword');
      await user.type(screen.getByLabelText('New Password'), 'NewPassword123');
      await user.type(screen.getByLabelText('Confirm New Password'), 'NewPassword123');
      
      // Submit password change
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          },
          body: JSON.stringify({
            current_password: 'oldpassword',
            new_password: 'NewPassword123'
          })
        });
      });
      
      // Verify success message
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });

    it('completes face registration workflow for students', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Face registered successfully' })
        });

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByText('Face Registration')).toBeInTheDocument();
      });
      
      // Upload face photo
      const fileInput = screen.getByLabelText(/upload photo/i);
      const file = new File(['fake image'], 'photo.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, file);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/face', {
          method: 'POST',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          },
          body: expect.any(FormData)
        });
      });
      
      // Verify success message
      expect(screen.getByText('Face registered successfully')).toBeInTheDocument();
    });
  });

  describe('Teacher Class Management Workflow', () => {
    it('completes class settings update workflow', async () => {
      const user = userEvent.setup();
      
      const mockClassData = {
        subject_id: 'class-123',
        subject_code: 'CS101',
        name: 'Computer Science 101',
        description: 'Introduction to Computer Science',
        teacher_name: 'Test Teacher',
        invite_code: 'ABC123',
        student_count: 3,
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const mockStudents = [
        {
          user_id: 'student-1',
          name: 'Student One',
          email: 'student1@example.com',
          is_face_registered: true,
          enrollment_date: '2024-01-01T00:00:00Z'
        }
      ];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClassData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Class updated successfully' })
        });

      renderWithRouter(<ClassSettings />, mockTeacherAuthContext);
      
      // Wait for class data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      // Update class name
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      await user.type(nameInput, 'Advanced Computer Science');
      
      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          },
          body: JSON.stringify({
            name: 'Advanced Computer Science',
            description: 'Introduction to Computer Science'
          })
        });
      });
      
      // Verify success message
      expect(screen.getByText('Class updated successfully')).toBeInTheDocument();
    });

    it('completes student removal workflow', async () => {
      const user = userEvent.setup();
      
      const mockClassData = {
        subject_id: 'class-123',
        subject_code: 'CS101',
        name: 'Computer Science 101',
        description: 'Introduction to Computer Science',
        teacher_name: 'Test Teacher',
        invite_code: 'ABC123',
        student_count: 2,
        created_at: '2024-01-01T00:00:00Z'
      };
      
      const mockStudents = [
        {
          user_id: 'student-1',
          name: 'Student One',
          email: 'student1@example.com',
          is_face_registered: true,
          enrollment_date: '2024-01-01T00:00:00Z'
        },
        {
          user_id: 'student-2',
          name: 'Student Two',
          email: 'student2@example.com',
          is_face_registered: false,
          enrollment_date: '2024-01-02T00:00:00Z'
        }
      ];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClassData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Student removed successfully' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents.slice(1) // Remove first student
        });

      renderWithRouter(<ClassSettings />, mockTeacherAuthContext);
      
      // Wait for students to load
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
      });
      
      // Click remove button for first student
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      // Confirm removal
      const confirmButton = screen.getByText('Remove Student');
      await user.click(confirmButton);
      
      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123/students/student-1', {
          method: 'DELETE',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
      });
      
      // Verify student is removed from list
      await waitFor(() => {
        expect(screen.queryByText('Student One')).not.toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('recovers from network errors during profile update', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Profile updated successfully' })
        });

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Student')).toBeInTheDocument();
      });
      
      // First attempt fails
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      // Retry succeeds
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });
    });

    it('handles validation errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Email address is already registered' })
        });

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('student@example.com')).toBeInTheDocument();
      });
      
      // Update email to existing one
      const emailInput = screen.getByDisplayValue('student@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'existing@example.com');
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      // Verify error message
      await waitFor(() => {
        expect(screen.getByText('Email address is already registered')).toBeInTheDocument();
      });
      
      // Form should still be editable
      expect(emailInput).not.toBeDisabled();
    });
  });

  describe('Loading States and User Feedback', () => {
    it('shows appropriate loading states during operations', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<Profile />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Student')).toBeInTheDocument();
      });
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      // Should show loading state
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(updateButton).toBeDisabled();
    });

    it('provides clear feedback for successful operations', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Successfully unenrolled from subject' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects.slice(1)
        });

      renderWithRouter(<StudentDashboard />, mockStudentAuthContext);
      
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      const confirmButton = screen.getByText('Unenroll');
      await user.click(confirmButton);
      
      // Should show success feedback
      await waitFor(() => {
        expect(screen.getByText('Successfully unenrolled from subject')).toBeInTheDocument();
      });
    });
  });
});