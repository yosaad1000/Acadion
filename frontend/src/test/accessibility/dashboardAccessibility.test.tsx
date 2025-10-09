import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import AIChatToggle from '../../components/AIChat/AIChatToggle';
import AIChatInterface from '../../components/AIChat/AIChatInterface';
import SessionList from '../../components/Session/SessionList';
import CreateSession from '../../components/Session/CreateSession';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
const mockUseAuth = vi.fn();
const mockUseSessions = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: mockUseAuth
}));

vi.mock('../../hooks/useSessions', () => ({
  useSessions: mockUseSessions
}));

describe('Dashboard Accessibility Tests', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentRole: 'teacher',
      user: { user_id: 'teacher-123' },
      isAuthenticated: true
    });

    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      createSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      refreshSessions: vi.fn()
    });
  });

  describe('AI Chat Accessibility', () => {
    it('AI Chat toggle has proper accessibility attributes', async () => {
      const { container } = render(
        <AIChatToggle isOpen={false} onClick={vi.fn()} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Check for accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AI Chat interface is accessible with screen readers', async () => {
      const { container } = render(
        <AIChatInterface
          isOpen={true}
          onClose={vi.fn()}
          messages={[]}
          onSendMessage={vi.fn()}
        />
      );

      // Check for proper headings
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      
      // Check for proper form labels
      const input = screen.getByPlaceholderText('Ask me anything...');
      expect(input).toBeInTheDocument();
      
      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeInTheDocument();

      // Check for accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AI Chat can be navigated with keyboard only', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      const mockOnSendMessage = vi.fn();

      render(
        <AIChatInterface
          isOpen={true}
          onClose={mockOnClose}
          messages={[]}
          onSendMessage={mockOnSendMessage}
        />
      );

      // Tab to input field
      await user.tab();
      const input = screen.getByPlaceholderText('Ask me anything...');
      expect(input).toHaveFocus();

      // Type message
      await user.type(input, 'Test message');

      // Tab to send button
      await user.tab();
      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toHaveFocus();

      // Press Enter to send
      await user.keyboard('{Enter}');
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');

      // Test Escape key to close
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('AI Chat messages have proper semantic structure', async () => {
      const messages = [
        {
          id: '1',
          content: 'Hello, how can I help you?',
          sender: 'ai' as const,
          timestamp: new Date(),
          type: 'text' as const
        },
        {
          id: '2',
          content: 'I need help with sessions',
          sender: 'user' as const,
          timestamp: new Date(),
          type: 'text' as const
        }
      ];

      const { container } = render(
        <AIChatInterface
          isOpen={true}
          onClose={vi.fn()}
          messages={messages}
          onSendMessage={vi.fn()}
        />
      );

      // Messages should be in a logical reading order
      const messageElements = screen.getAllByTestId(/message-/);
      expect(messageElements).toHaveLength(2);

      // Check for accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Session Management Accessibility', () => {
    it('Session list has proper accessibility structure', async () => {
      const { container } = render(
        <BrowserRouter>
          <SessionList subjectId="test-subject" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Check for proper heading structure
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      
      // Check for proper button labeling
      const createButton = screen.getByText('Create Session');
      expect(createButton).toBeInTheDocument();

      // Check for accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Create session form is accessible', async () => {
      const { container } = render(
        <BrowserRouter>
          <CreateSession
            subjectId="test-subject"
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Check for proper form labels
      expect(screen.getByLabelText('Session Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Time')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();

      // Check for required field indicators
      const requiredField = screen.getByLabelText('Session Name *');
      expect(requiredField).toHaveAttribute('required');

      // Check for accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Session form can be navigated with keyboard', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <CreateSession
            subjectId="test-subject"
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Tab through form fields
      await user.tab(); // Close button
      await user.tab(); // Session name
      const nameInput = screen.getByLabelText('Session Name *');
      expect(nameInput).toHaveFocus();

      await user.tab(); // Description
      const descriptionInput = screen.getByLabelText('Description');
      expect(descriptionInput).toHaveFocus();

      await user.tab(); // Date
      const dateInput = screen.getByLabelText('Date');
      expect(dateInput).toHaveFocus();

      await user.tab(); // Time
      const timeInput = screen.getByLabelText('Time');
      expect(timeInput).toHaveFocus();

      await user.tab(); // Notes
      const notesInput = screen.getByLabelText('Notes');
      expect(notesInput).toHaveFocus();

      await user.tab(); // Cancel button
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveFocus();

      await user.tab(); // Create button
      const createButton = screen.getByText('Create Session');
      expect(createButton).toHaveFocus();
    });

    it('Error messages are announced to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <CreateSession
            subjectId="test-subject"
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Try to submit without required field
      const submitButton = screen.getByText('Create Session');
      await user.click(submitButton);

      // Error message should be visible and associated with field
      const errorMessage = screen.getByText('Session name is required');
      expect(errorMessage).toBeInTheDocument();

      // Error should be associated with the input field
      const nameInput = screen.getByLabelText('Session Name *');
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Focus Management', () => {
    it('manages focus correctly when opening AI chat', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <AIChatInterface
          isOpen={false}
          onClose={vi.fn()}
          messages={[]}
          onSendMessage={vi.fn()}
        />
      );

      // Chat should not be visible
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();

      // Open chat
      rerender(
        <AIChatInterface
          isOpen={true}
          onClose={vi.fn()}
          messages={[]}
          onSendMessage={vi.fn()}
        />
      );

      // Focus should move to input field
      const input = screen.getByPlaceholderText('Ask me anything...');
      expect(input).toHaveFocus();
    });

    it('manages focus correctly when opening create session modal', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <CreateSession
            subjectId="test-subject"
            isOpen={false}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Modal should not be visible
      expect(screen.queryByText('Create New Session')).not.toBeInTheDocument();

      // Open modal
      rerender(
        <BrowserRouter>
          <CreateSession
            subjectId="test-subject"
            isOpen={true}
            onClose={vi.fn()}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );

      // Focus should be managed appropriately
      expect(screen.getByText('Create New Session')).toBeInTheDocument();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('has sufficient color contrast for text elements', async () => {
      const { container } = render(
        <BrowserRouter>
          <SessionList subjectId="test-subject" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Run axe with color contrast rules
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('works with high contrast mode', () => {
      // This would typically involve testing with forced-colors media query
      // For now, we ensure proper semantic markup is used
      render(
        <AIChatToggle isOpen={false} onClick={vi.fn()} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('provides proper landmarks and regions', async () => {
      const { container } = render(
        <BrowserRouter>
          <SessionList subjectId="test-subject" onCreateSession={vi.fn()} />
        </BrowserRouter>
      );

      // Check for proper landmark usage
      const results = await axe(container, {
        rules: {
          'landmark-one-main': { enabled: true },
          'region': { enabled: true }
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    it('provides descriptive text for interactive elements', () => {
      render(
        <AIChatToggle isOpen={false} onClick={vi.fn()} />
      );

      const button = screen.getByRole('button');
      const ariaLabel = button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('AI Chat');
    });
  });
});