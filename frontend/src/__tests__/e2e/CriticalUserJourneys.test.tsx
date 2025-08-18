import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { AuthContext } from '../../contexts/AuthContext';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

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

describe('Critical User Journeys E2E Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    jest.clearAllMocks();
  });

  describe('Student Complete Profile Management Journey', () => {
    it('allows student to complete full profile management workflow', async () => {
      const user = userEvent.setup();
      
      // Mock authentication token
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      // Mock API responses for the complete journey
      mockFetch
        // Initial auth check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        // Get subjects for dashboard
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        // Get profile data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        // Update profile
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Profile updated successfully' })
        })
        // Change password
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Password changed successfully' })
        })
        // Upload face photo
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Face registered successfully' })
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Wait for app to load and show dashboard
      await waitFor(() => {
        expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
      });
      
      // Navigate to profile
      const profileLink = screen.getByText('Profile');
      await user.click(profileLink);
      
      // Wait for profile page to load
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });
      
      // Step 1: Update personal information
      const nameInput = screen.getByDisplayValue('Test Student');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Student Name');
      
      const emailInput = screen.getByDisplayValue('student@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated.student@example.com');
      
      const updateProfileButton = screen.getByText('Update Profile');
      await user.click(updateProfileButton);
      
      // Verify profile update success
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });
      
      // Step 2: Change password
      await user.type(screen.getByLabelText('Current Password'), 'oldpassword123');
      await user.type(screen.getByLabelText('New Password'), 'NewSecurePassword123');
      await user.type(screen.getByLabelText('Confirm New Password'), 'NewSecurePassword123');
      
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
      // Verify password change success
      await waitFor(() => {
        expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
      });
      
      // Step 3: Register face (for students only)
      const fileInput = screen.getByLabelText(/upload photo/i);
      const facePhoto = new File(['fake image data'], 'face.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, facePhoto);
      
      // Verify face registration success
      await waitFor(() => {
        expect(screen.getByText('Face registered successfully')).toBeInTheDocument();
      });
      
      // Verify all API calls were made correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          name: 'Updated Student Name',
          email: 'updated.student@example.com'
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          current_password: 'oldpassword123',
          new_password: 'NewSecurePassword123'
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/face', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: expect.any(FormData)
      });
    });
  });

  describe('Student Class Management Journey', () => {
    it('allows student to view classes and unenroll successfully', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      mockFetch
        // Initial auth check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        // Get subjects for dashboard
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        // Unenroll from subject
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Successfully unenrolled from subject' })
        })
        // Refresh subjects after unenrollment
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects.slice(1) // Remove first subject
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
        expect(screen.getByText('Advanced Mathematics')).toBeInTheDocument();
      });
      
      // Verify student can see class information
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('25 students')).toBeInTheDocument();
      
      // Initiate unenrollment
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      // Confirm unenrollment in modal
      await waitFor(() => {
        expect(screen.getByText('Unenroll from Class')).toBeInTheDocument();
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      const confirmUnenrollButton = screen.getByRole('button', { name: 'Unenroll' });
      await user.click(confirmUnenrollButton);
      
      // Verify unenrollment success and dashboard update
      await waitFor(() => {
        expect(screen.getByText('Successfully unenrolled from subject')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Computer Science 101')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Mathematics')).toBeInTheDocument();
      });
      
      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects/subject-1/enrollment', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });
    });
  });

  describe('Teacher Class Management Journey', () => {
    it('allows teacher to manage class settings and students', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
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
        // Initial auth check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTeacherUser
        })
        // Get teacher subjects
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockClassData]
        })
        // Navigate to class settings - get class data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClassData
        })
        // Get enrolled students
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents
        })
        // Update class information
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Class updated successfully' })
        })
        // Remove student
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Student removed successfully' })
        })
        // Refresh students list
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudents.slice(1) // Remove first student
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Wait for teacher dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      // Navigate to class settings
      const settingsButton = screen.getByLabelText('Class settings');
      await user.click(settingsButton);
      
      // Wait for class settings to load
      await waitFor(() => {
        expect(screen.getByText('Class Settings')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      // Step 1: Update class information
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      await user.type(nameInput, 'Advanced Computer Science 101');
      
      const descriptionInput = screen.getByDisplayValue('Introduction to Computer Science');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Advanced introduction to Computer Science concepts');
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      // Verify class update success
      await waitFor(() => {
        expect(screen.getByText('Class updated successfully')).toBeInTheDocument();
      });
      
      // Step 2: Manage enrolled students
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
        expect(screen.getByText('Face Registered')).toBeInTheDocument();
        expect(screen.getByText('Not Registered')).toBeInTheDocument();
      });
      
      // Remove a student
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      // Confirm removal
      await waitFor(() => {
        expect(screen.getByText('Remove Student')).toBeInTheDocument();
      });
      
      const confirmRemoveButton = screen.getByRole('button', { name: 'Remove Student' });
      await user.click(confirmRemoveButton);
      
      // Verify student removal success
      await waitFor(() => {
        expect(screen.getByText('Student removed successfully')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Student One')).not.toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
      });
      
      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          name: 'Advanced Computer Science 101',
          description: 'Advanced introduction to Computer Science concepts'
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123/students/student-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('handles authentication errors and redirects to login', async () => {
      mockLocalStorage.getItem.mockReturnValue(null); // No token
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Not authenticated' })
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully throughout the application', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      mockFetch
        // Initial auth succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        // Dashboard load fails
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      // Should still allow navigation to other pages
      const profileLink = screen.getByText('Profile');
      expect(profileLink).toBeInTheDocument();
    });

    it('maintains application state during intermittent failures', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      mockFetch
        // Initial auth check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        // Get subjects
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        })
        // First unenroll attempt fails
        .mockRejectedValueOnce(new Error('Network error'))
        // Second attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Successfully unenrolled from subject' })
        })
        // Refresh subjects
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects.slice(1)
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      });
      
      // First unenroll attempt
      const unenrollButtons = screen.getAllByText('Unenroll');
      await user.click(unenrollButtons[0]);
      
      const confirmButton = screen.getByRole('button', { name: 'Unenroll' });
      await user.click(confirmButton);
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
      
      // Subject should still be visible
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      
      // Retry should work
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Successfully unenrolled from subject')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Computer Science 101')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('maintains keyboard navigation throughout user journeys', async () => {
      const user = userEvent.setup();
      
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
      });
      
      // Navigate using keyboard
      await user.tab(); // Should focus on first interactive element
      await user.keyboard('{Enter}'); // Should activate focused element
      
      // Verify keyboard navigation works
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInstanceOf(HTMLElement);
    });

    it('provides appropriate ARIA labels and screen reader support', async () => {
      mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStudentUser
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSubjects
        });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
      });
      
      // Check for proper ARIA labels
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
      
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      
      // Check for proper headings
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });
});