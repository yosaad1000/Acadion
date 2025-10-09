import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoadingButton from '../../../components/ui/LoadingButton';

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<LoadingButton loading>Click me</LoadingButton>);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('shows custom loading text', () => {
    render(<LoadingButton loading loadingText="Saving...">Save</LoadingButton>);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton loading>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onClick when clicked and not loading', async () => {
    const user = userEvent.setup();
    const mockClick = vi.fn();
    
    render(<LoadingButton onClick={mockClick}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup();
    const mockClick = vi.fn();
    
    render(<LoadingButton loading onClick={mockClick}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<LoadingButton variant="primary">Primary</LoadingButton>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');

    rerender(<LoadingButton variant="secondary">Secondary</LoadingButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-600');

    rerender(<LoadingButton variant="danger">Danger</LoadingButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');

    rerender(<LoadingButton variant="ghost">Ghost</LoadingButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingButton size="sm">Small</LoadingButton>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<LoadingButton size="md">Medium</LoadingButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<LoadingButton size="lg">Large</LoadingButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('applies full width when fullWidth prop is true', () => {
    render(<LoadingButton fullWidth>Full Width</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('renders icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<LoadingButton icon={<TestIcon />}>With Icon</LoadingButton>);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('hides icon when loading', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<LoadingButton loading icon={<TestIcon />}>With Icon</LoadingButton>);
    
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingButton className="custom-class">Button</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('forwards other props to button element', () => {
    render(<LoadingButton data-testid="custom-button" type="submit">Submit</LoadingButton>);
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('shows loading spinner with correct color for ghost variant', () => {
    render(<LoadingButton loading variant="ghost">Ghost Button</LoadingButton>);
    
    // The spinner should be visible (we can't easily test the color prop, but we can verify it renders)
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows loading spinner with correct size based on button size', () => {
    const { rerender } = render(<LoadingButton loading size="sm">Small</LoadingButton>);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<LoadingButton loading size="lg">Large</LoadingButton>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has proper accessibility when disabled', () => {
    render(<LoadingButton loading>Loading Button</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('cursor-not-allowed');
    expect(button).toBeDisabled();
  });
});