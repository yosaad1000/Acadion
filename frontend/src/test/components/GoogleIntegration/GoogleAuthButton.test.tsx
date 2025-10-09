import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoogleAuthButton from '../../../components/GoogleIntegration/GoogleAuthButton';

// Mock the useGoogleAuth hook
vi.mock('../../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: vi.fn()
}));

const { useGoogleAuth } = await import('../../../hooks/useGoogleAuth');
const mockUseGoogleAuth = useGoogleAuth as vi.MockedFunction<typeof useGoogleAuth>;

describe('GoogleAuthButton', () => {
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in button when not authenticated', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText('Connect Google Account')).toBeInTheDocument();
    expect(screen.getByText('Connect your Google account to enable Calendar, Drive, and Meet integration')).toBeInTheDocument();
  });

  it('renders sign out button when authenticated', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText('Google Account Connected')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('shows loading state during authentication', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('displays error message when authentication fails', () => {
    const errorMessage = 'Authentication failed';
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: errorMessage,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls signIn when connect button is clicked', async () => {
    const user = userEvent.setup();
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    const connectButton = screen.getByText('Connect Google Account');
    await user.click(connectButton);
    
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('calls signOut when disconnect button is clicked', async () => {
    const user = userEvent.setup();
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    const disconnectButton = screen.getByText('Disconnect');
    await user.click(disconnectButton);
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('calls signIn when try again button is clicked after error', async () => {
    const user = userEvent.setup();
    const mockClearError = vi.fn();
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: 'Authentication failed',
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: mockClearError
    });

    render(<GoogleAuthButton />);
    
    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);
    
    expect(mockClearError).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('displays user avatar when available', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    const avatar = screen.getByAltText('Test User');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows fallback avatar when picture is not available', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: undefined
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    // Should show initials or default avatar
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton className={customClass} />);
    
    const container = screen.getByText('Connect Google Account').closest('div');
    expect(container).toHaveClass(customClass);
  });

  it('has proper accessibility attributes', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('shows correct status indicators', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('handles missing user name gracefully', () => {
    mockUseGoogleAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '123',
        email: 'test@example.com',
        name: undefined,
        picture: undefined
      },
      error: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
      clearError: vi.fn()
    });

    render(<GoogleAuthButton />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    // Should show email initials when name is not available
    expect(screen.getByText('TE')).toBeInTheDocument();
  });
});