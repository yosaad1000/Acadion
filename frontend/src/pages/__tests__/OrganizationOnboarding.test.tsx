import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OrganizationOnboarding from '../OrganizationOnboarding';
import { OrganizationService } from '../../services/organizationService';

// Mock the organization service
vi.mock('../../services/organizationService', () => ({
  OrganizationService: {
    checkOrganizationNameAvailability: vi.fn(),
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

  it('renders the organization onboarding form', () => {
    renderWithRouter(<OrganizationOnboarding />);
    
    expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Domain/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Email/)).toBeInTheDocument();
  });

  it('validates required fields and disables submit button', async () => {
    renderWithRouter(<OrganizationOnboarding />);
    
    const submitButton = screen.getByRole('button', { name: /Create Organization/ });
    
    // Submit button should be disabled when form is empty
    expect(submitButton).toBeDisabled();
    
    // Fill in invalid data
    const orgNameInput = screen.getByLabelText(/Organization Name/);
    const adminNameInput = screen.getByLabelText(/Administrator Name/);
    const adminEmailInput = screen.getByLabelText(/Administrator Email/);
    
    fireEvent.change(orgNameInput, { target: { value: 'a' } }); // Too short
    fireEvent.change(adminNameInput, { target: { value: 'b' } }); // Too short
    fireEvent.change(adminEmailInput, { target: { value: 'invalid-email' } }); // Invalid email
    
    // Submit button should still be disabled with invalid data
    expect(submitButton).toBeDisabled();
    
    // Fill in valid data
    fireEvent.change(orgNameInput, { target: { value: 'Valid University' } });
    fireEvent.change(adminNameInput, { target: { value: 'John Doe' } });
    fireEvent.change(adminEmailInput, { target: { value: 'john@valid.edu' } });
    
    // Wait for name availability check to complete
    await waitFor(() => {
      // Button should still be disabled until name availability is confirmed
      expect(submitButton).toBeDisabled();
    });
  });

  it('checks organization name availability', async () => {
    const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: true,
      message: 'Organization name is available'
    });

    renderWithRouter(<OrganizationOnboarding />);
    
    const orgNameInput = screen.getByLabelText(/Organization Name/);
    fireEvent.change(orgNameInput, { target: { value: 'Test University' } });

    await waitFor(() => {
      expect(mockCheckAvailability).toHaveBeenCalledWith('Test University');
    });

    await waitFor(() => {
      expect(screen.getByText('Organization name is available')).toBeInTheDocument();
    });
  });

  it('shows error when organization name is taken', async () => {
    const mockCheckAvailability = vi.mocked(OrganizationService.checkOrganizationNameAvailability);
    mockCheckAvailability.mockResolvedValue({
      isAvailable: false,
      message: 'This organization name is already taken'
    });

    renderWithRouter(<OrganizationOnboarding />);
    
    const orgNameInput = screen.getByLabelText(/Organization Name/);
    fireEvent.change(orgNameInput, { target: { value: 'Taken University' } });

    await waitFor(() => {
      expect(screen.getByText('This organization name is already taken')).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
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
    fireEvent.change(screen.getByLabelText(/Organization Name/), { 
      target: { value: 'Test University' } 
    });
    fireEvent.change(screen.getByLabelText(/Administrator Name/), { 
      target: { value: 'John Doe' } 
    });
    fireEvent.change(screen.getByLabelText(/Administrator Email/), { 
      target: { value: 'john@test.edu' } 
    });

    // Wait for name availability check
    await waitFor(() => {
      expect(screen.getByText('Organization name is available')).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Organization/ });
    fireEvent.click(submitButton);

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

  it('handles form submission errors', async () => {
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
    fireEvent.change(screen.getByLabelText(/Organization Name/), { 
      target: { value: 'Test University' } 
    });
    fireEvent.change(screen.getByLabelText(/Administrator Name/), { 
      target: { value: 'John Doe' } 
    });
    fireEvent.change(screen.getByLabelText(/Administrator Email/), { 
      target: { value: 'john@test.edu' } 
    });

    // Wait for name availability check
    await waitFor(() => {
      expect(screen.getByText('Organization name is available')).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Create Organization/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to create organization')).toBeInTheDocument();
    });
  });
});