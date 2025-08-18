import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfileSettings from '../ProfileSettings';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the AuthContext
const mockAuthContext = {
  user: {
    user_id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    user_type: 'student' as const,
    is_face_registered: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02')
  },
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  loading: false,
  refreshUser: vi.fn()
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('ProfileSettings Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('Profile Information Section', () => {
    it('renders profile information form with current user data', () => {
      renderWithAuth(<ProfileSettings />);
      
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('allows updating name field', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      expect(nameInput).toHaveValue('Updated Name');
    });

    it('allows updating email field', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');
      
      expect(emailInput).toHaveValue('updated@example.com');
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('submits profile update successfully', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile updated successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          },
          body: JSON.stringify({
            name: 'Updated Name',
            email: 'test@example.com'
          })
        });
      });
    });

    it('handles profile update error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Email already exists' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'existing@example.com');
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('shows loading state during profile update', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithAuth(<ProfileSettings />);
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Password Change Section', () => {
    it('renders password change form', () => {
      renderWithAuth(<ProfileSettings />);
      
      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });

    it('validates password requirements', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
      
      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'weak');
      await user.type(confirmPasswordInput, 'weak');
      
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
      
      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'NewPassword123');
      await user.type(confirmPasswordInput, 'DifferentPassword123');
      
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('submits password change successfully', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
      
      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'NewPassword123');
      await user.type(confirmPasswordInput, 'NewPassword123');
      
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
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
    });

    it('handles incorrect current password error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Current password is incorrect' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
      
      await user.type(currentPasswordInput, 'wrongpassword');
      await user.type(newPasswordInput, 'NewPassword123');
      await user.type(confirmPasswordInput, 'NewPassword123');
      
      const changePasswordButton = screen.getByText('Change Password');
      await user.click(changePasswordButton);
      
      await waitFor(() => {
        expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
      });
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const currentPasswordInput = screen.getByLabelText('Current Password');
      expect(currentPasswordInput).toHaveAttribute('type', 'password');
      
      const toggleButton = screen.getAllByRole('button', { name: /toggle password visibility/i })[0];
      await user.click(toggleButton);
      
      expect(currentPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Face Registration Section', () => {
    it('renders face registration section for students', () => {
      renderWithAuth(<ProfileSettings />);
      
      expect(screen.getByText('Face Registration')).toBeInTheDocument();
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    it('does not render face registration for teachers', () => {
      const teacherAuthContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          user_type: 'teacher' as const
        }
      };

      render(
        <AuthContext.Provider value={teacherAuthContext}>
          <ProfileSettings />
        </AuthContext.Provider>
      );
      
      expect(screen.queryByText('Face Registration')).not.toBeInTheDocument();
    });

    it('shows face registration status when registered', () => {
      const registeredAuthContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          is_face_registered: true
        }
      };

      render(
        <AuthContext.Provider value={registeredAuthContext}>
          <ProfileSettings />
        </AuthContext.Provider>
      );
      
      expect(screen.getByText('Face Registered')).toBeInTheDocument();
      expect(screen.getByText('Remove Face Registration')).toBeInTheDocument();
    });

    it('handles face photo upload', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Face registered successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const fileInput = screen.getByLabelText(/upload photo/i);
      const file = new File(['fake image'], 'photo.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/face', {
          method: 'POST',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          },
          body: expect.any(FormData)
        });
      });
    });

    it('validates file type for face upload', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const fileInput = screen.getByLabelText(/upload photo/i);
      const file = new File(['fake text'], 'document.txt', { type: 'text/plain' });
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('Please select a valid image file (JPG, PNG, GIF)')).toBeInTheDocument();
    });

    it('handles face registration removal', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Face registration removed successfully' })
      });

      const registeredAuthContext = {
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          is_face_registered: true
        }
      };

      render(
        <AuthContext.Provider value={registeredAuthContext}>
          <ProfileSettings />
        </AuthContext.Provider>
      );
      
      const removeButton = screen.getByText('Remove Face Registration');
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/profile/face', {
          method: 'DELETE',
          headers: {
            'Authorization': expect.stringContaining('Bearer')
          }
        });
      });
    });
  });

  describe('Notifications', () => {
    it('shows success notification after profile update', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile updated successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });
    });

    it('auto-dismisses notifications after 5 seconds', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile updated successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });

      vi.advanceTimersByTime(5000);
      
      await waitFor(() => {
        expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('allows manual dismissal of notifications', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Profile updated successfully' })
      });

      renderWithAuth(<ProfileSettings />);
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close notification/i });
      await user.click(closeButton);
      
      expect(screen.queryByText('Profile updated successfully')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithAuth(<ProfileSettings />);
      
      expect(screen.getByRole('form', { name: /personal information/i })).toBeInTheDocument();
      expect(screen.getByRole('form', { name: /change password/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const emailInput = screen.getByLabelText('Email');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      const updateButton = screen.getByText('Update Profile');
      await user.click(updateButton);
      
      const errorMessage = screen.getByText('Please enter a valid email address');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('maintains focus management during form interactions', async () => {
      const user = userEvent.setup();
      renderWithAuth(<ProfileSettings />);
      
      const nameInput = screen.getByLabelText('Name');
      await user.click(nameInput);
      
      expect(nameInput).toHaveFocus();
    });
  });
});