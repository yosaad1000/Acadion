import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ClassSettings from '../ClassSettings';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the AuthContext
const mockAuthContext = {
  user: {
    user_id: 'teacher-123',
    name: 'Test Teacher',
    email: 'teacher@example.com',
    user_type: 'teacher' as const,
    is_face_registered: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02')
  },
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
  loading: false,
  refreshUser: jest.fn()
};

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

const mockEnrolledStudents = [
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
  },
  {
    user_id: 'student-3',
    name: 'Student Three',
    email: 'student3@example.com',
    is_face_registered: true,
    enrollment_date: '2024-01-03T00:00:00Z'
  }
];

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('ClassSettings Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
    
    // Mock initial data fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnrolledStudents
      });
  });

  describe('Component Initialization', () => {
    it('renders loading state initially', () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      expect(screen.getByText('Loading class settings...')).toBeInTheDocument();
    });

    it('fetches class data and enrolled students on mount', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123', {
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123/students', {
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
      });
    });

    it('displays class information after loading', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Introduction to Computer Science')).toBeInTheDocument();
      });
    });

    it('displays enrolled students list', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('Student Two')).toBeInTheDocument();
        expect(screen.getByText('Student Three')).toBeInTheDocument();
        expect(screen.getByText('3 students enrolled')).toBeInTheDocument();
      });
    });
  });

  describe('Class Information Editing', () => {
    it('allows editing class name', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      await user.type(nameInput, 'Advanced Computer Science');
      
      expect(nameInput).toHaveValue('Advanced Computer Science');
    });

    it('allows editing class description', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Introduction to Computer Science')).toBeInTheDocument();
      });
      
      const descriptionInput = screen.getByDisplayValue('Introduction to Computer Science');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Advanced topics in Computer Science');
      
      expect(descriptionInput).toHaveValue('Advanced topics in Computer Science');
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      expect(screen.getByText('Class name is required')).toBeInTheDocument();
    });

    it('submits class information updates successfully', async () => {
      const user = userEvent.setup();
      const onClassUpdated = jest.fn();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Class updated successfully' })
        });

      renderWithAuth(<ClassSettings classId="class-123" onClassUpdated={onClassUpdated} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Class Name');
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          },
          body: JSON.stringify({
            name: 'Updated Class Name',
            description: 'Introduction to Computer Science'
          })
        });
      });
      
      expect(onClassUpdated).toHaveBeenCalled();
    });

    it('handles class update errors', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Class name already exists' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Class name already exists')).toBeInTheDocument();
      });
    });

    it('shows loading state during update', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Student Management', () => {
    it('displays student information correctly', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
        expect(screen.getByText('student1@example.com')).toBeInTheDocument();
        expect(screen.getByText('Face Registered')).toBeInTheDocument();
      });
    });

    it('shows face registration status for each student', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        const faceRegisteredElements = screen.getAllByText('Face Registered');
        const notRegisteredElements = screen.getAllByText('Not Registered');
        
        expect(faceRegisteredElements).toHaveLength(2); // student-1 and student-3
        expect(notRegisteredElements).toHaveLength(1); // student-2
      });
    });

    it('opens confirmation dialog when removing student', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      expect(screen.getByText('Remove Student')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to remove Student One from this class?')).toBeInTheDocument();
    });

    it('cancels student removal when clicking cancel', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Remove Student')).not.toBeInTheDocument();
    });

    it('removes student successfully when confirmed', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Student removed successfully' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnrolledStudents.slice(1) // Remove first student
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      const confirmButton = screen.getByText('Remove Student');
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subjects/class-123/students/student-1', {
          method: 'DELETE',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
      });
    });

    it('handles student removal errors', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Failed to remove student' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      const confirmButton = screen.getByText('Remove Student');
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to remove student')).toBeInTheDocument();
      });
    });

    it('shows loading state during student removal', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Student One')).toBeInTheDocument();
      });
      
      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);
      
      const confirmButton = screen.getByText('Remove Student');
      await user.click(confirmButton);
      
      expect(screen.getByText('Removing...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles class data fetch error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Class not found' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load class settings')).toBeInTheDocument();
      });
    });

    it('handles students data fetch error', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ detail: 'Failed to load students' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load enrolled students')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load class settings')).toBeInTheDocument();
      });
    });
  });

  describe('Notifications', () => {
    it('shows success notification after class update', async () => {
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Class updated successfully' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Class updated successfully')).toBeInTheDocument();
      });
    });

    it('auto-dismisses notifications after 5 seconds', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();
      
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockClassData })
        .mockResolvedValueOnce({ ok: true, json: async () => mockEnrolledStudents })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Class updated successfully' })
        });

      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Class updated successfully')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('Class updated successfully')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByRole('form', { name: /class information/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Class Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
      });
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.clear(nameInput);
      
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);
      
      const errorMessage = screen.getByText('Class name is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('maintains focus management during interactions', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ClassSettings classId="class-123" />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Computer Science 101')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Computer Science 101');
      await user.click(nameInput);
      
      expect(nameInput).toHaveFocus();
    });
  });
});