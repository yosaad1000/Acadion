import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrganizationOnboarding from '../../pages/OrganizationOnboarding';
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

describe('OrganizationOnboarding Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Organization Name Validation', () => {
    it('should validate minimum length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(orgNameInput, 'a');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name must be at least 2 characters/)).toBeInTheDocument();
      });
    });

    it('should validate maximum length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Create a string longer than 100 characters
      const longName = 'a'.repeat(101);
      await user.type(orgNameInput, longName);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name must be less than 100 characters/)).toBeInTheDocument();
      });
    });

    it('should validate against invalid characters', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(orgNameInput, 'Test<>University');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name contains invalid characters/)).toBeInTheDocument();
      });
    });

    it('should reject whitespace-only names', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(orgNameInput, '   ');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name cannot be only whitespace/)).toBeInTheDocument();
      });
    });

    it('should reject names with leading/trailing spaces', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(orgNameInput, ' Test University ');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name cannot start or end with spaces/)).toBeInTheDocument();
      });
    });
  });

  describe('Domain Validation', () => {
    it('should validate domain format', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const domainInput = screen.getByLabelText(/Organization Domain/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(domainInput, 'invalid-domain');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid domain format/)).toBeInTheDocument();
      });
    });

    it('should accept valid domain formats', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const domainInput = screen.getByLabelText(/Organization Domain/);
      
      // Test valid domains
      const validDomains = ['example.edu', 'university.ac.uk', 'school.org'];
      
      for (const domain of validDomains) {
        await user.clear(domainInput);
        await user.type(domainInput, domain);
        
        // Should not show validation error
        expect(screen.queryByText(/Invalid domain format/)).not.toBeInTheDocument();
      }
    });

    it('should allow empty domain (optional field)', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const domainInput = screen.getByLabelText(/Organization Domain/);
      
      // Leave domain empty
      expect(domainInput.value).toBe('');
      
      // Should not show validation error
      expect(screen.queryByText(/Invalid domain format/)).not.toBeInTheDocument();
    });
  });

  describe('Administrator Name Validation', () => {
    it('should validate minimum length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const adminNameInput = screen.getByLabelText(/Administrator Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(adminNameInput, 'a');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Administrator name must be at least 2 characters/)).toBeInTheDocument();
      });
    });

    it('should validate maximum length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const adminNameInput = screen.getByLabelText(/Administrator Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      const longName = 'a'.repeat(51);
      await user.type(adminNameInput, longName);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Administrator name must be less than 50 characters/)).toBeInTheDocument();
      });
    });

    it('should validate against invalid characters', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const adminNameInput = screen.getByLabelText(/Administrator Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(adminNameInput, 'John@Doe');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Administrator name contains invalid characters/)).toBeInTheDocument();
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const emailInput = screen.getByLabelText(/Administrator Email/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
      });
    });

    it('should validate against consecutive dots', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const emailInput = screen.getByLabelText(/Administrator Email/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      await user.type(emailInput, 'test..email@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Email cannot contain consecutive dots/)).toBeInTheDocument();
      });
    });

    it('should validate maximum length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const emailInput = screen.getByLabelText(/Administrator Email/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Create very long email
      const longEmail = 'a'.repeat(250) + '@example.com';
      await user.type(emailInput, longEmail);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Email address is too long/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission Validation', () => {
    it('should prevent submission with invalid data', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Try to submit empty form
      await user.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Organization name must be at least 2 characters/)).toBeInTheDocument();
      });
      
      // Should not call the service
      expect(OrganizationService.createOrganizationWithAdmin).not.toHaveBeenCalled();
    });

    it('should prevent submission while availability is being checked', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      
      // Make availability check hang
      mockCheckAvailability.mockImplementation(() => new Promise(() => {}));
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill form
      await user.type(screen.getByLabelText(/Organization Name/), 'Test University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Should be disabled while checking
      expect(submitButton).toBeDisabled();
    });

    it('should prevent submission when name is unavailable', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      
      mockCheckAvailability.mockResolvedValue({
        isAvailable: false,
        message: 'This organization name is already taken'
      });
      
      renderWithRouter(<OrganizationOnboarding />);
      
      // Fill form
      await user.type(screen.getByLabelText(/Organization Name/), 'Taken University');
      await user.type(screen.getByLabelText(/Administrator Name/), 'John Doe');
      await user.type(screen.getByLabelText(/Administrator Email/), 'john@test.edu');
      
      // Wait for availability check
      await waitFor(() => {
        expect(screen.getByText('This organization name is already taken')).toBeInTheDocument();
      });
      
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Real-time Validation', () => {
    it('should clear errors when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      const submitButton = screen.getByRole('button', { name: /Create Organization/ });
      
      // Trigger error
      await user.type(orgNameInput, 'a');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Organization name must be at least 2 characters/)).toBeInTheDocument();
      });
      
      // Start typing again
      await user.type(orgNameInput, 'b');
      
      // Error should be cleared
      expect(screen.queryByText(/Organization name must be at least 2 characters/)).not.toBeInTheDocument();
    });

    it('should show validation feedback immediately', async () => {
      const user = userEvent.setup();
      const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
      
      mockCheckAvailability.mockResolvedValue({
        isAvailable: true,
        message: 'Organization name is available'
      });
      
      renderWithRouter(<OrganizationOnboarding />);
      
      const orgNameInput = screen.getByLabelText(/Organization Name/);
      
      // Type valid name
      await user.type(orgNameInput, 'Valid University');
      
      // Should show checking state first
      expect(screen.getByText('Checking availability...')).toBeInTheDocument();
      
      // Then show result
      await waitFor(() => {
        expect(screen.getByText('Organization name is available')).toBeInTheDocument();
      });
    });
  });
});