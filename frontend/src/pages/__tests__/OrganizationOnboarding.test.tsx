import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrganizationOnboarding from '../OrganizationOnboarding';
import { OrganizationService } from '../../services/organizationService';

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

describe('OrganizationOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Basic Functionality', () => {
    it('renders the organization onboarding form with all required elements', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Domain/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Administrator Email/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Organization/ })).toBeInTheDocument();
    });

    it('displays proper form structure and labels', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      // Check for proper form structure
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      // Check for required field indicators
      expect(screen.getByText('Organization Name *')).toBeInTheDocument();
      expect(screen.getByText('Administrator Name *')).toBeInTheDocument();
      expect(screen.getByText('Administrator Email *')).toBeInTheDocument();
      
      // Check for optional field indicator
      expect(screen.getByText('(Optional)')).toBeInTheDocument();
    });

    it('shows help text and support information', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      expect(screen.getByText(/Your organization's website domain/)).toBeInTheDocument();
      expect(screen.getByText(/This email will be used for your administrator account/)).toBeInTheDocument();
      expect(screen.getByText(/Need help\? Contact our support team/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /support@acadion.com/ })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields and disables submit button appropriately', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Submit button should be disabled when form is empty
      expect(submitButton).toBeDisabled();
      
      // Fill in invalid data
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const adminNameInput = screen.getByLabelText(/Administrator Name/);
      const adminEmailInput = screen.getByLabelText(/Administrator Email/);
      
      await user.type(orgNameInput, 'a'); // Too short
      await user.type(adminNameInput, 'b'); // Too short
      await user.type(adminEmailInput, 'invalid-email'); // Invalid email
      
      // Submit button should still be disabled with invalid data
      expect(submitButton).toBeDisabled();
      
      // Clear and fill in valid data
      await user.clear(orgNameInput);
      await user.clear(adminNameInput);
      await user.clear(adminEmailInput);
      
      await user.type(orgNameInput, 'Valid University');
      await user.type(adminNameInput, 'John Doe');
      await user.type(adminEmailInput, 'john@valid.edu');
      
      // Button should still be disabled until name availability is confirmed
      expect(submitButton).toBeDisabled();
    });

    it('validates organization name format and shows appropriate errors', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Test too short name
      await user.type(orgNameInput, 'a');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name must be at least 2 characters/)).toBeInTheDocument();
      });
      
      // Test invalid characters
      await user.clear(orgNameInput);
      await user.type(orgNameInput, 'Test<>University');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name contains invalid characters/)).toBeInTheDocument();
      });
    });

    it('validates email format and shows appropriate errors', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const emailInput = screen.getByLabelText(/Administrator Email/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Test invalid email format
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
      });
      
      // Test email with consecutive dots
      await user.clear(emailInput);
      await user.type(emailInput, 'test..email@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Email cannot contain consecutive dots/)).toBeInTheDocument();
      });
    });

    it('validates domain format when provided', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const domainInput = screen.getByLabelText(/Organization Domain/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Test invalid domain format
      await user.type(domainInput, 'invalid-domain');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid domain format/)).toBeInTheDocument();
      });
    });
  });

  describe('Availability Checking', () => {
    it('checks organization name availability with debouncing', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');

      // Should show checking state
      expect(screen.getByText('Checking availability...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockCheckAvailability).toHaveBeenCalledWith('Test University');
      });

      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });
    });

    it('shows error when organization name is taken', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockResolvedValue({
        isAvailable: false,
        message: 'This organization name is already taken'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Taken University');

      await waitFor(() => {
        expect(screen.getByText('This organization name is already taken')).toBeInTheDocument();
      });
    });

    it('checks domain availability when provided', async () => {
      const user = userEvent.setup();
      const mockCheckDomainAvailability = vi.mocked(OrganizationService.checkOrganizationDomainAvailability);
      mockCheckDomainAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Domain is available'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      const domainInput = screen.getByLabelText(/Organization Domain/);
      await user.type(domainInput, 'test.edu');

      await waitFor(() => {
        expect(mockCheckDomainAvailability).toHaveBeenCalledWith('test.edu');
      });

      await waitFor(() => {
        expect(screen.getByText('Domain is available')).toBeInTheDocument();
      });
    });

    it('handles availability check errors with retry functionality', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      mockCheckAvailability.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Test University');

      await waitFor(() => {
        expect(screen.getByText(/Unable to check availability/)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });

      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form successfully with all required data', async () => {
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
      
      // Fill out the form
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');

      // Wait for name availability check
      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith({
          organizationName: 'Test University',
          organizationDomain: undefined,
          adminName: 'John Doe',
          adminEmail: 'john@test.edu'
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboard/success', {
          state: {
            organizationName: 'Test University',
            adminEmail: 'john@test.edu',
            organizationId: 'test-org-id'
          }
        });
      });
    });

    it('submits form successfully with optional domain', async () => {
      const user = userEvent.setup();
      const mockCheckNameAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      const mockCheckDomainAvailability = vi.mocked(OrganizationService.checkOrganizationDomainAvailability);
      const mockCreateOrganization = vi.mocked(OrganizationService.createOrganizationWithAdmin);
      
      mockCheckNameAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      mockCheckDomainAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Domain is available'
      });
      
      mockCreateOrganization.mockResolvedValue({
        success: true,
        message: 'Organization created successfully',
        organizationId: 'test-org-id'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill out the form with domain
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Organization Domain/), 'test.edu');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');

      // Wait for availability checks
      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Domain is available')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith({
          organizationName: 'Test University',
          organizationDomain: 'test.edu',
          adminName: 'John Doe',
          adminEmail: 'john@test.edu'
        });
      });
    });

    it('handles form submission errors gracefully', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      const mockCreateOrganization = vi.mocked(OrganizationService.createOrganizationWithAdmin);
      
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      mockCreateOrganization.mockResolvedValue({
        success: false,
        message: 'Failed to create organization'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill out the form
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');

      // Wait for name availability check
      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create organization')).toBeInTheDocument();
      });
    });

    it('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      const mockCreateOrganization = vi.mocked(OrganizationService.createOrganizationWithAdmin);
      
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      // Make the create function take some time
      mockCreateOrganization.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'Organization created successfully',
          organizationId: 'test-org-id'
        }), 100))
      );

      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill out the form
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');

      // Wait for name availability check
      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Creating Organization...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation and User Experience', () => {
    it('provides navigation back to home', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const backButton = screen.getByRole('button', { name: /Back to Home/ });
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('displays proper page title and description', () => {
      renderWithRouter(<OrganizationOnboarding />);
      
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByText(/Set up your educational institution on Acadion/)).toBeInTheDocument();
    });

    it('shows proper visual feedback for form states', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      
      // Test available state
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });

      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      await user.type(orgNameInput, 'Available University');

      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });

      // Should show success icon (it's an SVG with aria-label)
      const successIcon = within(orgNameInput.parentElement!).getByLabelText('Available');
      expect(successIcon).toBeInTheDocument();
    });
  });
});