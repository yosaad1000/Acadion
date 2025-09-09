/**
 * Error handling utilities for the notifications system
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface NetworkError extends Error {
  isNetworkError: boolean;
  status?: number;
  retryable: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Creates a network error with additional metadata
 */
export const createNetworkError = (
  message: string, 
  status?: number, 
  retryable: boolean = true
): NetworkError => {
  const error = new Error(message) as NetworkError;
  error.isNetworkError = true;
  error.status = status;
  error.retryable = retryable;
  return error;
};

/**
 * Determines if an error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  // Network errors
  if (error.isNetworkError && error.retryable) {
    return true;
  }

  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  // Connection errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return true;
  }

  return false;
};

/**
 * Calculates delay for exponential backoff
 */
export const calculateDelay = (attempt: number, options: RetryOptions): number => {
  const delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
};

/**
 * Adds jitter to delay to prevent thundering herd
 */
export const addJitter = (delay: number): number => {
  return delay + Math.random() * 1000;
};

/**
 * Sleeps for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry wrapper for async functions
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      console.warn(`Attempt ${attempt}/${config.maxAttempts} failed:`, error);

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === config.maxAttempts || !isRetryableError(error)) {
        break;
      }

      // Calculate delay with jitter
      const delay = addJitter(calculateDelay(attempt, config));
      console.log(`Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 3
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
        throw createNetworkError('Circuit breaker is open', undefined, false);
      }
      this.state = CircuitBreakerState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}