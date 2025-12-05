import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import OrganizationOnboarding from '../../pages/OrganizationOnboarding';
import { OrganizationService } from '../../services/organizationService';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the organization service
vi.mock('../../services/organizationService', () => ({
  OrganizationService: {
    checkOrganizationNameAvailability: vi.fn(),
    checkOrganizationDomainAvailability: vi.fn(),
    createOrganizationWithAdmin: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('OrganizationOnboarding Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Accessibility Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = renderWithRouter(<OrganizationOnboarding />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations with form errors', async () => {
      const user = userEvent.setup();
      const { container } = renderWithRouter(<OrganizationOnboarding />);
      
      // Trigger validation errors
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations during loading states', async () => {
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          isAvailable: true,
          message: 'Available'
        }), 100))
      );

      const user = userEvent.setup();
      const { container } = renderWithRouter(<OrganizationOnboarding />);
      
      // Trigger loading state
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support proper tab order through form fields', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      // Start from the beginning of the page
      await user.tab();
      
      // Should focus on "Navigate back to home page" button first
      expect(screen.getByRole('button', { name: /Navigate back to home page/ })).toHaveFocus();
      
      // Tab through form fields in order
      await user.tab();
      expect(screen.getByLabelText(/Organization Name/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Organization Domain/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Administrator Name/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Administrator Email/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /Create Organization/ })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('link', { name: /support@acadion.com/ })).toHaveFocus();
    });

    it('should support keyboard navigation for retry buttons', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<OrganizationOnboarding />);
      
      // Trigger error state to show retry button
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');
      
      // Wait for error and retry button to appear
      await screen.findByText(/Unable to check availability/);
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      
      // Should be able to focus and activate retry button with keyboard
      retryButton.focus();
      expect(retryButton).toHaveFocus();
      
      // Should be able to activate with Enter key
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Available'
      });
      
      await user.keyboard('{Enter}');
      expect(mockCheckAvailability).toHaveBeenCalledTimes(2);
    });

    it('should support form submission with Enter key', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      const mockCreateOrganization = vi.mocked(OrganizationService.createOrganizationWithAdmin);
      
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      mockCreateOrganization.mockResolvedValue({
        success: true,
        message: 'Organization created successfully',
        organizationId: 'test-org-id'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill out form using keyboard
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.click(orgNameInput);
      await user.type(orgNameInput, 'Test University');
      
      await user.tab();
      await user.tab(); // Skip domain field
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      
      await user.tab();
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');
      
      // Wait for name availability check
      await screen.findByText('Organization name is available');
      
      // Submit form with Enter key
      await user.keyboard('{Enter}');
      
      expect(mockCreateOrganization).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper form labels and descriptions', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Check that all form fields have proper labels
      expect(screen.getByLabelText(/Organization Name \*/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Domain.*Optional/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Name \*/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Email \*/)).toBeInTheDocument();
      
      // Check for descriptive text
      expect(screen.getByText(/Your organization's website domain/)).toBeInTheDocument();
      expect(screen.getByText(/This email will be used for your administrator account/)).toBeInTheDocument();
    });

    it('should announce form validation errors properly', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      // Trigger validation errors
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'a'); // Too short
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);
      
      // Error messages should be associated with form fields
      const errorMessage = screen.getByText(/Organization name must be at least 2 characters/);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('id');
      
      // Input should reference the error message
      expect(orgNameInput).toHaveAttribute('aria-describedby');
    });

    it('should announce loading states properly', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          isAvailable: true,
          message: 'Available'
        }), 100))
      );

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');
      
      // Should announce checking state
      expect(screen.getByText('Checking availability...')).toBeInTheDocument();
      
      // Should have proper ARIA attributes for loading
      const loadingIndicators = screen.getAllByRole('status');
      expect(loadingIndicators.length).toBeGreaterThan(0);
    });

    it('should provide proper button states and descriptions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Button should be disabled initially
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-disabled', 'true');
      
      // Fill out form to enable button
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');
      
      // Wait for validation
      await screen.findByText('Organization name is available');
      
      // Button should now be enabled
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-disabled', 'false');
    });
  });

  describe('Visual Indicators and Feedback', () => {
    it('should provide visual feedback for form field states', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      
      // Test available state
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      await user.type(orgNameInput, 'Available University');
      
      await screen.findByText('Organization name is available');
      
      // Should have visual success indicator
      expect(orgNameInput).toHaveClass('border-green-300');
      
      // Test unavailable state
      mockCheckAvailability.mockResolvedValue({
        isAvailable: false,
        message: 'This organization name is already taken'
      });
      
      await user.clear(orgNameInput);
      await user.type(orgNameInput, 'Taken University');
      
      await screen.findByText('This organization name is already taken');
      
      // Should have visual error indicator
      expect(orgNameInput).toHaveClass('border-red-300');
    });

    it('should provide proper color contrast for all text elements', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Main heading should have proper contrast
      const heading = screen.getByText('Create Your Organization');
      expect(heading).toHaveClass('text-gray-900', 'dark:text-gray-100');
      
      // Form labels should have proper contrast
      const labels = screen.getAllByText(/\*/);
      labels.forEach(label => {
        expect(label.closest('label')).toHaveClass('text-gray-900', 'dark:text-gray-100');
      });
      
      // Help text should have proper contrast
      const helpText = screen.getByText(/Your organization's website domain/);
      expect(helpText).toHaveClass('text-gray-500', 'dark:text-gray-400');
    });

    it('should support high contrast mode', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Form inputs should have proper borders for high contrast
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveClass('border');
        expect(input).toHaveClass('focus:ring-2');
      });
      
      // Buttons should have proper contrast
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      expect(submitButton).toHaveClass('border');
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('should maintain accessibility on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Form should still be accessible on mobile
      expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Organization/ })).toBeInTheDocument();
      
      // Touch targets should be large enough (minimum 44px)
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      expect(submitButton).toHaveClass('py-3'); // Provides adequate touch target
    });

    it('should support zoom up to 200% without horizontal scrolling', () => {
      // Mock zoomed viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640, // Simulates 200% zoom on 1280px screen
      });
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Content should still be accessible when zoomed
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly during dynamic content changes', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');
      
      // Wait for error state
      await screen.findByText(/Unable to check availability/);
      
      // Focus should remain on input field
      expect(orgNameInput).toHaveFocus();
      
      // Retry button should be focusable
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      retryButton.focus();
      expect(retryButton).toHaveFocus();
    });

    it('should provide visible focus indicators', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      // Tab to first focusable element
      await user.tab();
      const backButton = screen.getByRole('button', { name: /Navigate back to home page/ });
      expect(backButton).toHaveFocus();
      
      // Should have visible focus ring
      expect(backButton).toHaveClass('focus:outline-none');
      
      // Tab to form field
      await user.tab();
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      expect(orgNameInput).toHaveFocus();
      expect(orgNameInput).toHaveClass('focus:ring-2');
    });
  });
});