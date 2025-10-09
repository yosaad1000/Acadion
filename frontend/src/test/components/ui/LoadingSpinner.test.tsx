import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Loading sessions..." />);
    
    expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="lg" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="xl" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('applies correct color classes', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-blue-600');

    rerender(<LoadingSpinner color="white" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-white');

    rerender(<LoadingSpinner color="gray" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-gray-400');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const container = screen.getByRole('status').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    
    const srText = screen.getByText('Loading...');
    expect(srText).toHaveClass('sr-only');
  });

  it('applies correct text size based on spinner size', () => {
    const { rerender } = render(<LoadingSpinner size="sm" text="Loading" />);
    let text = screen.getByText('Loading');
    expect(text).toHaveClass('text-xs');

    rerender(<LoadingSpinner size="lg" text="Loading" />);
    text = screen.getByText('Loading');
    expect(text).toHaveClass('text-base');

    rerender(<LoadingSpinner size="xl" text="Loading" />);
    text = screen.getByText('Loading');
    expect(text).toHaveClass('text-lg');
  });

  it('has spinning animation', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('animate-spin');
  });
});