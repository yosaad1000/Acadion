import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OrganizationOnboarding from '../../pages/OrganizationOnboarding';
import { OrganizationService } from '../../services/organizationService';

// Mock the organization service
vi.mock('../../services/organizationService');
const mockOrganizationService = vi.mocked(OrganizationService);

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('OrganizationOnboarding - Enhanced Validation & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Form Validation', () => {
    it('should validate organization name format', async () => {
      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Test invalid characters
      fireEvent.change(nameInput, { target: { value: 'Test@#$%' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText(/organization name contains invalid characters/i)).toBeInTheDocument();
      });
    });

    it('should validate domain format', async () => {
      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const domainInput = screen.getByLabelText(/organization domain/i);
      
      // Test invalid domain format
      fireEvent.change(domainInput, { target: { value: 'invalid-domain' } });
      fireEvent.blur(domainInput);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid domain format/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/administrator email/i);
      
      // Test invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should prevent whitespace-only names', async () => {
      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Test whitespace-only name
      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText(/organization name cannot be only whitespace/i)).toBeInTheDocument();
      });
    });
  });

  describe('Name Availability Checking', () => {
    it('should check name availability with debouncing', async () => {
      mockOrganizationService.checkOrganizationNameAvailability.mockResolvedValue({
        isAvailable: true,
        message: '✓ Organization name is available'
      });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Type a valid name
      fireEvent.change(nameInput, { target: { value: 'Test University' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockOrganizationService.checkOrganizationNameAvailability).toHaveBeenCalledWith('Test University');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/organization name is available/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on validation failure', async () => {
      mockOrganizationService.checkOrganizationNameAvailability
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          isAvailable: true,
          message: '✓ Organization name is available'
        });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Type a valid name
      fireEvent.change(nameInput, { target: { value: 'Test University' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(screen.getByText(/unable to check availability/i)).toBeInTheDocument();
      });
      
      // Should show retry button
      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
      
      // Click retry button
      fireEvent.click(screen.getByText(/retry/i));
      
      await waitFor(() => {
        expect(mockOrganizationService.checkOrganizationNameAvailability).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle timeout errors', async () => {
      mockOrganizationService.checkOrganizationNameAvailability.mockRejectedValue(
        new Error('Request timeout')
      );

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Type a valid name
      fireEvent.change(nameInput, { target: { value: 'Test University' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
      });
    });
  });

  describe('Domain Availability Checking', () => {
    it('should check domain availability when provided', async () => {
      mockOrganizationService.checkOrganizationDomainAvailability.mockResolvedValue({
        isAvailable: true,
        message: '✓ Domain is available'
      });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const domainInput = screen.getByLabelText(/organization domain/i);
      
      // Type a valid domain
      fireEvent.change(domainInput, { target: { value: 'test.edu' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockOrganizationService.checkOrganizationDomainAvailability).toHaveBeenCalledWith('test.edu');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/domain is available/i)).toBeInTheDocument();
      });
    });

    it('should show domain unavailable message', async () => {
      mockOrganizationService.checkOrganizationDomainAvailability.mockResolvedValue({
        isAvailable: false,
        message: 'This domain is already registered with another organization'
      });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const domainInput = screen.getByLabelText(/organization domain/i);
      
      // Type a domain that's taken
      fireEvent.change(domainInput, { target: { value: 'taken.edu' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(screen.getByText(/already registered with another organization/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      // Mock successful availability checks
      mockOrganizationService.checkOrganizationNameAvailability.mockResolvedValue({
        isAvailable: true,
        message: '✓ Organization name is available'
      });
      
      mockOrganizationService.checkOrganizationDomainAvailability.mockResolvedValue({
        isAvailable: true,
        message: '✓ Domain is available'
      });
    });

    it('should handle successful organization creation', async () => {
      mockOrganizationService.createOrganizationWithAdmin.mockResolvedValue({
        success: true,
        message: 'Organization created successfully',
        organizationId: 'test-org-id'
      });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/organization name/i), {
        target: { value: 'Test University' }
      });
      fireEvent.change(screen.getByLabelText(/administrator name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/administrator email/i), {
        target: { value: 'john@test.edu' }
      });

      // Wait for validation to complete
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(screen.getByText(/organization name is available/i)).toBeInTheDocument();
      });

      // Submit the form
      fireEvent.click(screen.getByText(/create organization/i));

      await waitFor(() => {
        expect(mockOrganizationService.createOrganizationWithAdmin).toHaveBeenCalledWith({
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

    it('should handle organization creation failure with retry', async () => {
      mockOrganizationService.createOrganizationWithAdmin
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          message: 'Organization created successfully',
          organizationId: 'test-org-id'
        });

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/organization name/i), {
        target: { value: 'Test University' }
      });
      fireEvent.change(screen.getByLabelText(/administrator name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/administrator email/i), {
        target: { value: 'john@test.edu' }
      });

      // Wait for validation to complete
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(screen.getByText(/organization name is available/i)).toBeInTheDocument();
      });

      // Submit the form
      fireEvent.click(screen.getByText(/create organization/i));

      // Should retry automatically and eventually succeed
      await waitFor(() => {
        expect(mockOrganizationService.createOrganizationWithAdmin).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('should prevent submission when validation is in progress', async () => {
      // Mock a slow validation response
      mockOrganizationService.checkOrganizationNameAvailability.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          isAvailable: true,
          message: '✓ Organization name is available'
        }), 2000))
      );

      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/organization name/i), {
        target: { value: 'Test University' }
      });
      fireEvent.change(screen.getByLabelText(/administrator name/i), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText(/administrator email/i), {
        target: { value: 'john@test.edu' }
      });

      // Try to submit while validation is in progress
      vi.advanceTimersByTime(1000); // Trigger validation
      
      const submitButton = screen.getByText(/create organization/i);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Recovery', () => {
    it('should clear errors when user starts typing', async () => {
      render(
        <TestWrapper>
          <OrganizationOnboarding />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/organization name/i);
      
      // Trigger validation error
      fireEvent.change(nameInput, { target: { value: 'A' } }); // Too short
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText(/must be at least 2 characters/i)).toBeInTheDocument();
      });
      
      // Start typing again - error should clear
      fireEvent.change(nameInput, { target: { value: 'AB' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/must be at least 2 characters/i)).not.toBeInTheDocument();
      });
    });
  });
});