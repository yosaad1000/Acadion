import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UnenrollConfirmation from '../UnenrollConfirmation';

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  subjectName: 'Computer Science 101',
  subjectCode: 'CS101'
};

describe('UnenrollConfirmation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<UnenrollConfirmation {...mockProps} isOpen={false} />);
      
      expect(screen.queryByText('Unenroll from Class')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      expect(screen.getByText('Unenroll from Class')).toBeInTheDocument();
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    it('displays warning message', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      expect(screen.getByText(/Are you sure you want to unenroll from/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('displays action buttons', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Unenroll')).toBeInTheDocument();
    });

    it('shows warning icon', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const warningIcon = screen.getByRole('img', { hidden: true });
      expect(warningIcon).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when background overlay is clicked', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      const overlay = screen.getByRole('dialog').parentElement?.firstChild;
      if (overlay) {
        await user.click(overlay as Element);
        expect(mockProps.onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onConfirm when unenroll button is clicked', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockResolvedValueOnce(undefined);
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows loading state during unenrollment', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      expect(screen.getByText('Unenrolling...')).toBeInTheDocument();
      expect(unenrollButton).toBeDisabled();
    });

    it('disables buttons during unenrollment process', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      const cancelButton = screen.getByText('Cancel');
      
      await user.click(unenrollButton);
      
      expect(unenrollButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('re-enables buttons after unenrollment completes', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockResolvedValueOnce(undefined);
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      const cancelButton = screen.getByText('Cancel');
      
      await user.click(unenrollButton);
      
      await waitFor(() => {
        expect(unenrollButton).not.toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
      });
    });

    it('re-enables buttons after unenrollment fails', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockRejectedValueOnce(new Error('Unenrollment failed'));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      const cancelButton = screen.getByText('Cancel');
      
      await user.click(unenrollButton);
      
      await waitFor(() => {
        expect(unenrollButton).not.toBeDisabled();
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('focuses on cancel button by default', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveFocus();
    });

    it('allows tab navigation between buttons', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      const unenrollButton = screen.getByText('Unenroll');
      
      expect(cancelButton).toHaveFocus();
      
      await user.tab();
      expect(unenrollButton).toHaveFocus();
      
      await user.tab();
      expect(cancelButton).toHaveFocus(); // Should wrap around
    });

    it('activates buttons with Enter key', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockResolvedValueOnce(undefined);
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      unenrollButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('activates buttons with Space key', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      cancelButton.focus();
      
      await user.keyboard(' ');
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('has proper heading structure', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Unenroll from Class');
    });

    it('has descriptive button labels', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const unenrollButton = screen.getByRole('button', { name: 'Unenroll' });
      
      expect(cancelButton).toBeInTheDocument();
      expect(unenrollButton).toBeInTheDocument();
    });

    it('maintains focus trap within modal', async () => {
      const user = userEvent.setup();
      render(<UnenrollConfirmation {...mockProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      const unenrollButton = screen.getByText('Unenroll');
      
      // Focus should start on cancel button
      expect(cancelButton).toHaveFocus();
      
      // Tab forward
      await user.tab();
      expect(unenrollButton).toHaveFocus();
      
      // Tab forward again should wrap to cancel
      await user.tab();
      expect(cancelButton).toHaveFocus();
      
      // Shift+Tab should go to unenroll button
      await user.tab({ shift: true });
      expect(unenrollButton).toHaveFocus();
    });

    it('announces loading state to screen readers', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      const loadingText = screen.getByText('Unenrolling...');
      expect(loadingText).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Visual States', () => {
    it('applies correct styling to warning elements', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const warningIcon = screen.getByRole('img', { hidden: true });
      expect(warningIcon).toHaveClass('text-red-600');
      
      const unenrollButton = screen.getByText('Unenroll');
      expect(unenrollButton).toHaveClass('bg-red-600');
    });

    it('shows loading spinner during unenrollment', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      // Check for loading indicator (spinner or text)
      expect(screen.getByText('Unenrolling...')).toBeInTheDocument();
    });

    it('maintains proper contrast ratios', () => {
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      const cancelButton = screen.getByText('Cancel');
      
      // These classes should provide sufficient contrast
      expect(unenrollButton).toHaveClass('text-white');
      expect(cancelButton).toHaveClass('text-gray-900');
    });
  });

  describe('Error Handling', () => {
    it('handles onConfirm promise rejection gracefully', async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockProps.onConfirm.mockRejectedValueOnce(new Error('Network error'));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      // Component should handle the error gracefully and re-enable buttons
      await waitFor(() => {
        expect(unenrollButton).not.toBeDisabled();
      });
      
      consoleError.mockRestore();
    });

    it('does not call onClose during unenrollment process', async () => {
      const user = userEvent.setup();
      mockProps.onConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<UnenrollConfirmation {...mockProps} />);
      
      const unenrollButton = screen.getByText('Unenroll');
      await user.click(unenrollButton);
      
      // Try to close during unenrollment
      await user.keyboard('{Escape}');
      
      // onClose should not be called during unenrollment
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Props Validation', () => {
    it('handles empty subject name gracefully', () => {
      render(<UnenrollConfirmation {...mockProps} subjectName="" />);
      
      expect(screen.getByText(/Are you sure you want to unenroll from/)).toBeInTheDocument();
    });

    it('handles empty subject code gracefully', () => {
      render(<UnenrollConfirmation {...mockProps} subjectCode="" />);
      
      expect(screen.getByText('Computer Science 101')).toBeInTheDocument();
    });

    it('handles long subject names properly', () => {
      const longName = 'Very Long Subject Name That Might Cause Layout Issues';
      render(<UnenrollConfirmation {...mockProps} subjectName={longName} />);
      
      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });
});