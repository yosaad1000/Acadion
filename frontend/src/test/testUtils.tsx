import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock contexts for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="auth-provider">{children}</div>;
};

const MockThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="theme-provider">{children}</div>;
};

const MockNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="notification-provider">{children}</div>;
};

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <MockAuthProvider>
        <MockThemeProvider>
          <MockNotificationProvider>
            {children}
          </MockNotificationProvider>
        </MockThemeProvider>
      </MockAuthProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Common test utilities
export const createMockUser = (role: 'teacher' | 'student' | 'both' = 'teacher') => ({
  user_id: `${role}-123`,
  email: `${role}@example.com`,
  full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
  role
});

export const createMockSession = (overrides = {}) => ({
  session_id: 'session-123',
  subject_id: 'subject-123',
  name: 'Test Session',
  description: 'Test Description',
  session_date: '2024-01-15T10:00:00Z',
  notes: null,
  attendance_taken: false,
  assignments: [],
  created_by: 'teacher-123',
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T09:00:00Z',
  ...overrides
});

export const createMockAssignment = (overrides = {}) => ({
  assignment_id: 'assignment-123',
  session_id: 'session-123',
  title: 'Test Assignment',
  description: 'Test Description',
  due_date: '2024-01-20T23:59:59Z',
  assignment_type: 'homework' as const,
  created_at: '2024-01-15T10:00:00Z',
  ...overrides
});

export const createMockAIChatMessage = (overrides = {}) => ({
  id: 'message-123',
  content: 'Test message',
  sender: 'user' as const,
  timestamp: new Date(),
  type: 'text' as const,
  ...overrides
});

// Mock implementations for common hooks
export const mockUseAuth = (overrides = {}) => ({
  user: createMockUser(),
  currentRole: 'teacher' as const,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
  subjects: [],
  ...overrides
});

export const mockUseSessions = (overrides = {}) => ({
  sessions: [createMockSession()],
  loading: false,
  error: null,
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  refreshSessions: vi.fn(),
  ...overrides
});

export const mockUseAIChat = (overrides = {}) => ({
  isOpen: false,
  messages: [],
  isTyping: false,
  toggleChat: vi.fn(),
  openChat: vi.fn(),
  closeChat: vi.fn(),
  sendMessage: vi.fn(),
  clearMessages: vi.fn(),
  addWelcomeMessage: vi.fn(),
  ...overrides
});

export const mockUseGoogleAuth = (overrides = {}) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  clearError: vi.fn(),
  ...overrides
});

// Test data generators
export const generateSessions = (count: number) => {
  return Array.from({ length: count }, (_, index) => 
    createMockSession({
      session_id: `session-${index + 1}`,
      name: `Session ${index + 1}`,
      session_date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString()
    })
  );
};

export const generateAssignments = (count: number, sessionId = 'session-123') => {
  return Array.from({ length: count }, (_, index) => 
    createMockAssignment({
      assignment_id: `assignment-${index + 1}`,
      session_id: sessionId,
      title: `Assignment ${index + 1}`,
      due_date: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  );
};

// Async test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock window methods
export const mockWindowMethods = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });
};

// Setup function to call in test files
export const setupTestEnvironment = () => {
  mockWindowMethods();
  
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });
};