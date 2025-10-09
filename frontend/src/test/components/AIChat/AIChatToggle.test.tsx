import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AIChatToggle from '../../../components/AIChat/AIChatToggle';

describe('AIChatToggle', () => {
  it('renders with correct initial state', () => {
    const mockOnClick = vi.fn();
    render(<AIChatToggle isOpen={false} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Open AI Chat');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows close icon when open', () => {
    const mockOnClick = vi.fn();
    render(<AIChatToggle isOpen={true} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Close AI Chat');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<AIChatToggle isOpen={false} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const mockOnClick = vi.fn();
    render(<AIChatToggle isOpen={false} onClick={mockOnClick} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});