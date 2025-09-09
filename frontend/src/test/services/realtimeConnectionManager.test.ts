import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  RealtimeConnectionManager, 
  ConnectionState 
} from '../../services/realtimeConnectionManager';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  state: 'joined'
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  }
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('RealtimeConnectionManager', () => {
  let connectionManager: RealtimeConnectionManager;
  let statusCallback: vi.Mock;
  let messageCallback: vi.Mock;
  let fallbackCallback: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    connectionManager = new RealtimeConnectionManager({
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      fallbackPollingInterval: 5000,
      heartbeatInterval: 10000
    });

    statusCallback = vi.fn();
    messageCallback = vi.fn();
    fallbackCallback = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should start in disconnected state', () => {
      const status = connectionManager.getStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.reconnectAttempts).toBe(0);
      expect(status.fallbackActive).toBe(false);
    });

    it('should transition to connecting state when connect is called', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      
      // Mock successful subscription
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      
      // Should immediately transition to connecting
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConnectionState.CONNECTING })
      );

      // Advance timers to complete connection
      vi.advanceTimersByTime(200);
      await connectPromise;

      unsubscribe();
    });

    it('should transition to connected state on successful subscription', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      
      // Mock successful subscription
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: ConnectionState.CONNECTED,
          reconnectAttempts: 0,
          fallbackActive: false
        })
      );

      unsubscribe();
    });

    it('should set up Supabase channel correctly', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      expect(mockSupabase.channel).toHaveBeenCalledWith('notifications');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'recipient_id=eq.test-user-id'
        },
        expect.any(Function)
      );
    });

    it('should not connect if already connecting or connected', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      // First connection
      const connectPromise1 = connectionManager.connect('test-user-id');
      
      // Second connection attempt while first is in progress
      const connectPromise2 = connectionManager.connect('test-user-id');

      vi.advanceTimersByTime(200);
      await Promise.all([connectPromise1, connectPromise2]);

      // Should only create one channel
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Handling', () => {
    it('should call message callbacks when real-time message is received', async () => {
      const unsubscribe = connectionManager.onMessage(messageCallback);
      
      let messageHandler: Function;
      mockChannel.on.mockImplementation((event, config, handler) => {
        messageHandler = handler;
        return mockChannel;
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Simulate receiving a message
      const testPayload = { eventType: 'INSERT', new: { id: 'test-notification' } };
      messageHandler!(testPayload);

      expect(messageCallback).toHaveBeenCalledWith(testPayload);

      unsubscribe();
    });

    it('should handle errors in message callbacks gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const unsubscribe = connectionManager.onMessage(errorCallback);
      
      let messageHandler: Function;
      mockChannel.on.mockImplementation((event, config, handler) => {
        messageHandler = handler;
        return mockChannel;
      });

      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Should not throw when callback errors
      expect(() => {
        messageHandler!({ eventType: 'INSERT', new: {} });
      }).not.toThrow();

      unsubscribe();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection error', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      
      let subscriptionCallback: Function;
      mockChannel.subscribe.mockImplementation((callback) => {
        subscriptionCallback = callback;
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: ConnectionState.RECONNECTING,
          reconnectAttempts: 1
        })
      );

      unsubscribe();
    });

    it('should use exponential backoff for reconnection delays', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // First reconnection attempt should be scheduled
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ reconnectAttempts: 1 })
      );

      // Advance time to trigger reconnection
      vi.advanceTimersByTime(1000); // First delay: 1000ms

      // Should attempt second reconnection with longer delay
      vi.advanceTimersByTime(200); // Allow subscription to fail again
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ reconnectAttempts: 2 })
      );

      unsubscribe();
    });

    it('should activate fallback after max reconnection attempts', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      connectionManager.setFallbackCallback(fallbackCallback);
      
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000 * Math.pow(2, i)); // Exponential backoff
        vi.advanceTimersByTime(200); // Allow subscription to fail
      }

      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: ConnectionState.FAILED,
          fallbackActive: true
        })
      );

      unsubscribe();
    });
  });

  describe('Fallback Mechanism', () => {
    it('should start fallback polling when connection fails', async () => {
      connectionManager.setFallbackCallback(fallbackCallback);
      
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Simulate max reconnection attempts reached
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000 * Math.pow(2, i));
        vi.advanceTimersByTime(200);
      }

      // Should call fallback immediately
      expect(fallbackCallback).toHaveBeenCalledTimes(1);

      // Should schedule regular polling
      vi.advanceTimersByTime(5000); // fallbackPollingInterval
      expect(fallbackCallback).toHaveBeenCalledTimes(2);
    });

    it('should stop fallback when connection is restored', async () => {
      const unsubscribe = connectionManager.onStatusChange(statusCallback);
      connectionManager.setFallbackCallback(fallbackCallback);
      
      // First fail, then succeed
      let callCount = 0;
      mockChannel.subscribe.mockImplementation((callback) => {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => callback('CHANNEL_ERROR'), 100);
        } else {
          setTimeout(() => callback('SUBSCRIBED'), 100);
        }
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Trigger reconnection
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(200);

      // Should transition back to connected and stop fallback
      expect(statusCallback).toHaveBeenCalledWith(
        expect.objectContaining({ 
          state: ConnectionState.CONNECTED,
          fallbackActive: false
        })
      );

      unsubscribe();
    });

    it('should handle errors in fallback callback gracefully', async () => {
      const errorFallback = vi.fn().mockRejectedValue(new Error('Fallback error'));
      connectionManager.setFallbackCallback(errorFallback);
      
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Simulate max reconnection attempts reached
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000 * Math.pow(2, i));
        vi.advanceTimersByTime(200);
      }

      // Should not throw when fallback errors
      expect(() => {
        vi.advanceTimersByTime(5000);
      }).not.toThrow();
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should start heartbeat when connected', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Simulate channel going bad
      mockChannel.state = 'errored';

      // Advance heartbeat interval
      vi.advanceTimersByTime(10000);

      // Should detect connection loss and start reconnection
      const status = connectionManager.getStatus();
      expect(status.state).toBe(ConnectionState.RECONNECTING);
    });
  });

  describe('Disconnection', () => {
    it('should clean up resources on disconnect', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      await connectionManager.disconnect();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      
      const status = connectionManager.getStatus();
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.fallbackActive).toBe(false);
    });

    it('should stop all timers on disconnect', async () => {
      connectionManager.setFallbackCallback(fallbackCallback);
      
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      });

      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Start fallback
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000 * Math.pow(2, i));
        vi.advanceTimersByTime(200);
      }

      await connectionManager.disconnect();

      // Advance time - fallback should not be called
      const callCountBefore = fallbackCallback.mock.calls.length;
      vi.advanceTimersByTime(10000);
      expect(fallbackCallback).toHaveBeenCalledTimes(callCountBefore);
    });
  });

  describe('Reconnect Method', () => {
    it('should disconnect and reconnect', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 100);
      });

      // Initial connection
      const connectPromise = connectionManager.connect('test-user-id');
      vi.advanceTimersByTime(200);
      await connectPromise;

      // Reconnect
      const reconnectPromise = connectionManager.reconnect('test-user-id');
      vi.advanceTimersByTime(200);
      await reconnectPromise;

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });
  });
});