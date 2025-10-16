/**
 * Performance monitoring utilities for Acadion frontend
 * Tracks Core Web Vitals and custom metrics
 */

import { config } from '@/config/environment';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.enableAnalytics && !config.isDevelopment;
    
    if (this.isEnabled) {
      this.initializeWebVitals();
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    // First Contentful Paint (FCP)
    this.observePerformanceEntry('first-contentful-paint', (entry) => {
      this.recordMetric('FCP', entry.startTime);
    });

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime);
    });

    // First Input Delay (FID) - using PerformanceEventTiming
    this.observePerformanceEntry('first-input', (entry) => {
      const fid = entry.processingStart - entry.startTime;
      this.recordMetric('FID', fid);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntry('layout-shift', (entry) => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
        this.recordMetric('CLS', clsValue);
      }
    });
  }

  /**
   * Observe performance entries by type
   */
  private observePerformanceEntry(
    entryType: string,
    callback: (entry: PerformanceEntry) => void
  ): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(callback);
        });
        observer.observe({ entryTypes: [entryType] });
      } catch (error) {
        console.warn(`Failed to observe ${entryType}:`, error);
      }
    }
  }

  /**
   * Record a custom performance metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.pathname
    };

    this.metrics.push(metric);

    // Log in development
    if (config.enableDebug) {
      console.log(`📊 Performance Metric: ${name} = ${value.toFixed(2)}ms`);
    }

    // Send to analytics service (implement as needed)
    this.sendToAnalytics(metric);
  }

  /**
   * Measure function execution time
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.recordMetric(name, endTime - startTime);
    return result;
  }

  /**
   * Measure async function execution time
   */
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    this.recordMetric(name, endTime - startTime);
    return result;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Send metric to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Implement analytics integration here
    // For example: Google Analytics, Vercel Analytics, etc.
    
    if (config.isDevelopment) {
      // Don't send in development
      return;
    }

    // Example implementation for Vercel Analytics
    if (typeof window !== 'undefined' && (window as any).va) {
      (window as any).va('track', 'Performance', {
        metric: metric.name,
        value: metric.value,
        url: metric.url
      });
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const measurePerformance = (name: string, fn: () => any) => 
  performanceMonitor.measureFunction(name, fn);

export const measureAsyncPerformance = (name: string, fn: () => Promise<any>) => 
  performanceMonitor.measureAsyncFunction(name, fn);

export const recordCustomMetric = (name: string, value: number) => 
  performanceMonitor.recordMetric(name, value);

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  return {
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureAsyncFunction: performanceMonitor.measureAsyncFunction.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor)
  };
};