import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrganizationOnboardingSuccess from '../OrganizationOnboardingSuccess';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement, initialState?: any) => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/onboard/success', state: initialState }]}>
      {component}
    </MemoryRouter>
  );
};

describe('OrganizationOnboardingSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Content', () => {
    it('renders success page with default organization name when no state provided', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      expect(screen.getByText('Organization Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText('Your Organization')).toBeInTheDocument();
      expect(screen.getByText(/Congratulations! Your organization has been set up/)).toBeInTheDocument();
    });

    it('renders success page with provided organization data', () => {
      const state = {
        organizationName: 'Test University',
        adminEmail: 'admin@test.edu'
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      expect(screen.getByText('Organization Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText('Test University')).toBeInTheDocument();
      expect(screen.getByText('admin@test.edu')).toBeInTheDocument();
    });

    it('displays proper success message and next steps', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      expect(screen.getByText('What\'s Next?')).toBeInTheDocument();
      expect(screen.getByText('Sign In to Your Account')).toBeInTheDocument();
      expect(screen.getByText('Invite Teachers & Students')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Class')).toBeInTheDocument();
    });

    it('shows support information', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      expect(screen.getByText(/Need help getting started\?/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /support@acadion.com/ })).toBeInTheDocument();
    });
  });

  describe('Navigation and Interactions', () => {
    it('navigates to login page when continue button is clicked', async () => {
      const user = userEvent.setup();
      const state = {
        organizationName: 'Test University',
        adminEmail: 'admin@test.edu'
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      const continueButton = screen.getByRole('button', { name: /Continue to Sign In/ });
      await user.click(continueButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          message: 'Please sign in to complete your organization setup',
          email: 'admin@test.edu'
        }
      });
    });

    it('navigates to home page when back button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      const backButton = screen.getByRole('button', { name: /Back to Home/ });
      await user.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('handles continue navigation without email in state', async () => {
      const user = userEvent.setup();
      const state = {
        organizationName: 'Test University'
        // No adminEmail provided
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      const continueButton = screen.getByRole('button', { name: /Continue to Sign In/ });
      await user.click(continueButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          message: 'Please sign in to complete your organization setup',
          email: ''
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      // Main heading
      expect(screen.getByRole('heading', { level: 1, name: 'Acadion' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Organization Created Successfully!' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'What\'s Next?' })).toBeInTheDocument();
    });

    it('has proper button labels and roles', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      expect(screen.getByRole('button', { name: /Continue to Sign In/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Home/ })).toBeInTheDocument();
    });

    it('has accessible links', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      const supportLink = screen.getByRole('link', { name: /support@acadion.com/ });
      expect(supportLink).toBeInTheDocument();
      expect(supportLink).toHaveAttribute('href', 'mailto:support@acadion.com');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /Continue to Sign In/ })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /Back to Home/ })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('link', { name: /support@acadion.com/ })).toHaveFocus();
    });
  });

  describe('Visual Elements', () => {
    it('displays success icon and organization details', () => {
      const state = {
        organizationName: 'Test University',
        adminEmail: 'admin@test.edu'
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      // Check for organization details card
      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Test University')).toBeInTheDocument();
      expect(screen.getByText('Administrator Email')).toBeInTheDocument();
      expect(screen.getByText('admin@test.edu')).toBeInTheDocument();
    });

    it('handles missing email gracefully', () => {
      const state = {
        organizationName: 'Test University'
        // No adminEmail
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      expect(screen.getByText('Test University')).toBeInTheDocument();
      // Email section should not be rendered when email is not provided
      expect(screen.queryByText('Administrator Email')).not.toBeInTheDocument();
    });

    it('displays numbered next steps clearly', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      // Check for numbered steps
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Check step descriptions
      expect(screen.getByText(/Complete your organization setup by signing in/)).toBeInTheDocument();
      expect(screen.getByText(/Start adding teachers and students/)).toBeInTheDocument();
      expect(screen.getByText(/Set up classes and start using AI-powered attendance/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('maintains proper layout structure', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      // Check for main structural elements
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      
      // Check for proper content organization
      expect(screen.getByText('Organization Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText('What\'s Next?')).toBeInTheDocument();
    });

    it('has proper button styling and spacing', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      const continueButton = screen.getByRole('button', { name: /Continue to Sign In/ });
      const backButton = screen.getByRole('button', { name: /Back to Home/ });
      
      expect(continueButton).toBeInTheDocument();
      expect(backButton).toBeInTheDocument();
      
      // Buttons should be properly styled
      expect(continueButton).toHaveClass('w-full');
      expect(backButton).toHaveClass('w-full');
    });
  });

  describe('Error Handling', () => {
    it('handles missing state gracefully', () => {
      renderWithRouter(<OrganizationOnboardingSuccess />);
      
      // Should still render successfully with default values
      expect(screen.getByText('Organization Created Successfully!')).toBeInTheDocument();
      expect(screen.getByText('Your Organization')).toBeInTheDocument();
    });

    it('handles partial state data', () => {
      const state = {
        organizationName: 'Test University'
        // Missing adminEmail
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      expect(screen.getByText('Test University')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue to Sign In/ })).toBeInTheDocument();
    });

    it('handles empty state values', () => {
      const state = {
        organizationName: '',
        adminEmail: ''
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      // Should fall back to default organization name
      expect(screen.getByText('Your Organization')).toBeInTheDocument();
      
      // Email section should not be shown for empty email
      expect(screen.queryByText('Administrator Email')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('passes correct data to login page', async () => {
      const user = userEvent.setup();
      const state = {
        organizationName: 'Integration Test University',
        adminEmail: 'admin@integration.test'
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      const continueButton = screen.getByRole('button', { name: /Continue to Sign In/ });
      await user.click(continueButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          message: 'Please sign in to complete your organization setup',
          email: 'admin@integration.test'
        }
      });
    });

    it('maintains proper flow from onboarding to success to login', async () => {
      const user = userEvent.setup();
      const state = {
        organizationName: 'Flow Test University',
        adminEmail: 'admin@flow.test'
      };
      
      renderWithRouter(<OrganizationOnboardingSuccess />, state);
      
      // Verify success page content
      expect(screen.getByText('Flow Test University')).toBeInTheDocument();
      expect(screen.getByText('admin@flow.test')).toBeInTheDocument();
      
      // Continue to login
      const continueButton = screen.getByRole('button', { name: /Continue to Sign In/ });
      await user.click(continueButton);
      
      // Verify navigation call
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          message: 'Please sign in to complete your organization setup',
          email: 'admin@flow.test'
        }
      });
    });
  });
});