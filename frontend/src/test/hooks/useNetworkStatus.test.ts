import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNetworkStatus, useNetworkRecovery } from '../../hooks/useNetworkStatus';

// Mock navigator
const mockNavigator = {
  onLine: true,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
};

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });

    // Mock window event listeners
    Object.defineProperty(global.window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    });

    Object.defineProperty(global.window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial network status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.connectionType).toBe('4g');
    expect(result.current.downlink).toBe(10);
    expect(result.current.effectiveType).toBe('4g');
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should detect slow connection for 2g', () => {
    mockNavigator.connection.effectiveType = '2g';
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('should detect slow connection for slow-2g', () => {
    mockNavigator.connection.effectiveType = 'slow-2g';
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('should detect slow connection for 3g with low downlink', () => {
    mockNavigator.connection.effectiveType = '3g';
    mockNavigator.connection.downlink = 0.5;
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(true);
  });

  it('should not detect slow connection for 3g with good downlink', () => {
    mockNavigator.connection.effectiveType = '3g';
    mockNavigator.connection.downlink = 2;
    
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should handle missing connection API', () => {
    const navigatorWithoutConnection = { onLine: true };
    Object.defineProperty(global, 'navigator', {
      value: navigatorWithoutConnection,
      writable: true
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.connectionType).toBe('unknown');
    expect(result.current.downlink).toBeUndefined();
    expect(result.current.effectiveType).toBeUndefined();
    expect(result.current.isSlowConnection).toBe(false);
  });

  it('should set up event listeners', () => {
    renderHook(() => useNetworkStatus());

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockNavigator.connection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockNavigator.connection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should handle online event', () => {
    mockNavigator.onLine = false;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);

    // Simulate online event
    mockNavigator.onLine = true;
    const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
    
    act(() => {
      onlineHandler?.();
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should handle offline event', () => {
    mockNavigator.onLine = true;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);

    // Simulate offline event
    mockNavigator.onLine = false;
    const offlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'offline')?.[1];
    
    act(() => {
      offlineHandler?.();
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('should handle connection change event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.effectiveType).toBe('4g');

    // Simulate connection change
    mockNavigator.connection.effectiveType = '3g';
    const connectionChangeHandler = mockNavigator.connection.addEventListener.mock.calls
      .find(call => call[0] === 'change')?.[1];
    
    act(() => {
      connectionChangeHandler?.();
    });

    expect(result.current.effectiveType).toBe('3g');
  });
});

describe('useNetworkRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: { ...mockNavigator, onLine: true },
      writable: true
    });

    // Mock window event listeners
    Object.defineProperty(global.window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true
    });

    Object.defineProperty(global.window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true
    });
  });

  it('should call recovery callback when network comes back online', () => {
    const onRecovery = vi.fn();
    
    // Start offline
    mockNavigator.onLine = false;
    const { result } = renderHook(() => useNetworkRecovery(onRecovery));

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);

    // Go offline (should set wasOffline to true)
    act(() => {
      const offlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'offline')?.[1];
      offlineHandler?.();
    });

    expect(result.current.wasOffline).toBe(true);

    // Come back online (should trigger recovery)
    mockNavigator.onLine = true;
    act(() => {
      const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
      onlineHandler?.();
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(onRecovery).toHaveBeenCalledTimes(1);
  });

  it('should not call recovery callback if was never offline', () => {
    const onRecovery = vi.fn();
    
    // Start online and stay online
    mockNavigator.onLine = true;
    renderHook(() => useNetworkRecovery(onRecovery));

    // Simulate online event (but we were never offline)
    act(() => {
      const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
      onlineHandler?.();
    });

    expect(onRecovery).not.toHaveBeenCalled();
  });

  it('should work without recovery callback', () => {
    // Start offline
    mockNavigator.onLine = false;
    const { result } = renderHook(() => useNetworkRecovery());

    expect(result.current.isOnline).toBe(false);

    // Go offline
    act(() => {
      const offlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'offline')?.[1];
      offlineHandler?.();
    });

    // Come back online
    mockNavigator.onLine = true;
    act(() => {
      const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];
      onlineHandler?.();
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    // Should not throw error
  });

  it('should include all network status properties', () => {
    const { result } = renderHook(() => useNetworkRecovery());

    expect(result.current).toHaveProperty('isOnline');
    expect(result.current).toHaveProperty('isSlowConnection');
    expect(result.current).toHaveProperty('connectionType');
    expect(result.current).toHaveProperty('downlink');
    expect(result.current).toHaveProperty('effectiveType');
    expect(result.current).toHaveProperty('wasOffline');
  });
});