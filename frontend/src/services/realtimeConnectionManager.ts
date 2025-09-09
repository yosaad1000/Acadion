import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { withRetry, createNetworkError } from '../utils/errorHandling';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface ConnectionStatus {
  state: ConnectionState;
  lastConnected?: Date;
  lastError?: string;
  reconnectAttempts: number;
  fallbackActive: boolean;
}

export interface RealtimeConnectionOptions {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  fallbackPollingInterval: number;
  heartbeatInterval: number;
}

const DEFAULT_OPTIONS: RealtimeConnectionOptions = {
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
  fallbackPollingInterval: 10000, // 10 seconds
  heartbeatInterval: 30000 // 30 seconds
};

/**
 * Manages real-time connections with fallback mechanisms
 */
export class RealtimeConnectionManager {
  private channel: RealtimeChannel | null = null;
  private status: ConnectionStatus = {
    state: ConnectionState.DISCONNECTED,
    reconnectAttempts: 0,
    fallbackActive: false
  };
  private options: RealtimeConnectionOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private messageCallbacks: ((payload: any) => void)[] = [];
  private fallbackCallback: (() => Promise<void>) | null = null;

  constructor(options: Partial<RealtimeConnectionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    // Immediately call with current status
    callback(this.status);
    
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to real-time messages
   */
  onMessage(callback: (payload: any) => void): () => void {
    this.messageCallbacks.push(callback);
    
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Set fallback callback for when real-time fails
   */
  setFallbackCallback(callback: () => Promise<void>): void {
    this.fallbackCallback = callback;
  }

  /**
   * Connect to real-time notifications
   */
  async connect(userId: string): Promise<void> {
    if (this.status.state === ConnectionState.CONNECTING || 
        this.status.state === ConnectionState.CONNECTED) {
      return;
    }

    this.updateStatus({ state: ConnectionState.CONNECTING });
    console.log('🔄 Connecting to real-time notifications...');

    try {
      await this.establishConnection(userId);
    } catch (error) {
      console.error('❌ Failed to establish real-time connection:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Disconnect from real-time notifications
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from real-time notifications...');
    
    this.clearTimers();
    
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.updateStatus({ 
      state: ConnectionState.DISCONNECTED,
      fallbackActive: false 
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Force reconnection
   */
  async reconnect(userId: string): Promise<void> {
    await this.disconnect();
    await this.connect(userId);
  }

  private async establishConnection(userId: string): Promise<void> {
    return withRetry(async () => {
      this.channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            console.log('🔔 Real-time notification received:', payload);
            this.messageCallbacks.forEach(callback => {
              try {
                callback(payload);
              } catch (error) {
                console.error('❌ Error in message callback:', error);
              }
            });
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          this.handleSubscriptionStatus(status, userId);
        });

      // Wait for connection to be established
      await this.waitForConnection();
    }, { maxAttempts: 3, baseDelay: 1000 });
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(createNetworkError('Connection timeout', undefined, true));
      }, 10000);

      const checkConnection = () => {
        if (this.channel?.state === 'joined') {
          clearTimeout(timeout);
          resolve();
        } else if (this.channel?.state === 'errored') {
          clearTimeout(timeout);
          reject(createNetworkError('Connection failed', undefined, true));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private handleSubscriptionStatus(status: string, userId: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        console.log('✅ Real-time connection established');
        this.updateStatus({ 
          state: ConnectionState.CONNECTED,
          lastConnected: new Date(),
          reconnectAttempts: 0,
          fallbackActive: false
        });
        this.stopFallback();
        this.startHeartbeat();
        break;

      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        console.warn('⚠️ Real-time connection lost:', status);
        this.handleConnectionError(new Error(`Connection ${status}`));
        break;
    }
  }

  private handleConnectionError(error: any): void {
    this.status.lastError = error.message;
    this.status.reconnectAttempts++;

    if (this.status.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.updateStatus({ state: ConnectionState.RECONNECTING });
      this.scheduleReconnect();
    } else {
      console.error('❌ Max reconnection attempts reached, activating fallback');
      this.updateStatus({ 
        state: ConnectionState.FAILED,
        fallbackActive: true 
      });
      this.startFallback();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.options.reconnectDelay * Math.pow(2, this.status.reconnectAttempts - 1);
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.status.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        // Get current user for reconnection
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await this.establishConnection(user.id);
        }
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.handleConnectionError(error);
      }
    }, delay);
  }

  private startFallback(): void {
    if (!this.fallbackCallback || this.fallbackTimer) {
      return;
    }

    console.log('🔄 Starting fallback polling mechanism');
    
    const poll = async () => {
      try {
        await this.fallbackCallback!();
      } catch (error) {
        console.error('❌ Fallback polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Schedule regular polling
    this.fallbackTimer = setInterval(poll, this.options.fallbackPollingInterval);
  }

  private stopFallback(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
      console.log('⏹️ Stopped fallback polling');
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.channel?.state !== 'joined') {
        console.warn('💔 Heartbeat failed - connection lost');
        this.handleConnectionError(new Error('Heartbeat failed'));
      }
    }, this.options.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateStatus(updates: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('❌ Error in status callback:', error);
      }
    });
  }
}