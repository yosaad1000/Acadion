import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ErrorMessage, { 
  NetworkErrorMessage, 
  NotFoundErrorMessage, 
  PermissionErrorMessage, 
  ValidationErrorMessage 
} from '../../../components/ui/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders basic error message', () => {
    render(<ErrorMessage message="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<ErrorMessage title="Error Title" message="Error message" />);
    
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with details', () => {
    render(<ErrorMessage message="Error message" details="Detailed error information" />);
    
    expect(screen.getByText('Show Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Show Details'));
    expect(screen.getByText('Detailed error information')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockRetry = vi.fn();
    
    render(<ErrorMessage message="Error message" onRetry={mockRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const mockDismiss = vi.fn();
    
    render(<ErrorMessage message="Error message" onDismiss={mockDismiss} dismissible />);
    
    const dismissButton = screen.getByText('Dismiss');
    await user.click(dismissButton);
    
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when X button is clicked', async () => {
    const user = userEvent.setup();
    const mockDismiss = vi.fn();
    
    render(<ErrorMessage message="Error message" onDismiss={mockDismiss} dismissible />);
    
    const closeButton = screen.getByLabelText('Dismiss');
    await user.click(closeButton);
    
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders different types with correct styling', () => {
    const { rerender } = render(<ErrorMessage type="error" message="Error message" />);
    let container = screen.getByText('Error message').closest('div');
    expect(container).toHaveClass('bg-red-50');

    rerender(<ErrorMessage type="warning" message="Warning message" />);
    container = screen.getByText('Warning message').closest('div');
    expect(container).toHaveClass('bg-yellow-50');

    rerender(<ErrorMessage type="info" message="Info message" />);
    container = screen.getByText('Info message').closest('div');
    expect(container).toHaveClass('bg-blue-50');

    rerender(<ErrorMessage type="success" message="Success message" />);
    container = screen.getByText('Success message').closest('div');
    expect(container).toHaveClass('bg-green-50');
  });

  it('renders custom retry text', () => {
    render(<ErrorMessage message="Error message" onRetry={vi.fn()} retryText="Retry Now" />);
    
    expect(screen.getByText('Retry Now')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage message="Error message" className="custom-class" />);
    
    const container = screen.getByText('Error message').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<ErrorMessage message="Error message" size="sm" />);
    let container = screen.getByText('Error message').closest('div');
    expect(container).toHaveClass('p-3', 'text-sm');

    rerender(<ErrorMessage message="Error message" size="lg" />);
    container = screen.getByText('Error message').closest('div');
    expect(container).toHaveClass('p-6', 'text-base');
  });
});

describe('Predefined Error Messages', () => {
  it('renders NetworkErrorMessage correctly', () => {
    const mockRetry = vi.fn();
    render(<NetworkErrorMessage onRetry={mockRetry} />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();
  });

  it('renders NotFoundErrorMessage correctly', () => {
    render(<NotFoundErrorMessage resource="session" />);
    
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText(/session you're looking for could not be found/)).toBeInTheDocument();
  });

  it('renders PermissionErrorMessage correctly', () => {
    render(<PermissionErrorMessage action="delete this session" />);
    
    expect(screen.getByText('Permission Denied')).toBeInTheDocument();
    expect(screen.getByText(/don't have permission to delete this session/)).toBeInTheDocument();
  });

  it('renders ValidationErrorMessage correctly', () => {
    const errors = ['Name is required', 'Email is invalid'];
    render(<ValidationErrorMessage errors={errors} />);
    
    expect(screen.getByText('Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Show Details'));
    expect(screen.getByText('Name is required\nEmail is invalid')).toBeInTheDocument();
  });

  it('uses default resource in NotFoundErrorMessage', () => {
    render(<NotFoundErrorMessage />);
    
    expect(screen.getByText(/resource you're looking for could not be found/)).toBeInTheDocument();
  });

  it('uses default action in PermissionErrorMessage', () => {
    render(<PermissionErrorMessage />);
    
    expect(screen.getByText(/don't have permission to perform this action/)).toBeInTheDocument();
  });
});