/**
 * Performance monitoring dashboard component
 * Shows real-time performance metrics and system health
 */
import React, { useState, useEffect } from 'react';
import { performanceMonitor, logMemoryUsage } from '../utils/performance';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface PerformanceMetrics {
  [operation: string]: {
    avg: number;
    min: number;
    max: number;
    count: number;
  };
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') return;

    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getAllMetrics();
      setMetrics(currentMetrics);

      // Get memory info if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
          limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
        });
      }
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
        if (!isVisible) {
          logMemoryUsage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  const getPerformanceStatus = (avgTime: number) => {
    if (avgTime < 100) return { color: 'text-green-600', icon: CheckCircleIcon, status: 'Excellent' };
    if (avgTime < 300) return { color: 'text-yellow-600', icon: ClockIcon, status: 'Good' };
    if (avgTime < 1000) return { color: 'text-orange-600', icon: ExclamationTriangleIcon, status: 'Warning' };
    return { color: 'text-red-600', icon: ExclamationTriangleIcon, status: 'Critical' };
  };

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {/* Memory Usage */}
      {memoryInfo && (
        <div className="mb-4 p-2 bg-gray-50 rounded">
          <div className="flex items-center mb-1">
            <CpuChipIcon className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-xs font-medium text-gray-700">Memory Usage</span>
          </div>
          <div className="text-xs text-gray-600">
            <div>Used: {memoryInfo.used} MB</div>
            <div>Total: {memoryInfo.total} MB</div>
            <div>Limit: {memoryInfo.limit} MB</div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="space-y-2">
        {Object.entries(metrics).map(([operation, metric]) => {
          const { color, icon: Icon, status } = getPerformanceStatus(metric.avg);
          
          return (
            <div key={operation} className="p-2 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 truncate">
                  {operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className="flex items-center">
                  <Icon className={`h-3 w-3 ${color} mr-1`} />
                  <span className={`text-xs ${color}`}>{status}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Avg: {metric.avg.toFixed(1)}ms</div>
                <div>Count: {metric.count}</div>
                <div>Min: {metric.min.toFixed(1)}ms</div>
                <div>Max: {metric.max.toFixed(1)}ms</div>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(metrics).length === 0 && (
        <div className="text-center text-gray-500 text-xs py-4">
          No performance data available yet.
          <br />
          Use the app to generate metrics.
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor;