/**
 * Optimized API hooks with caching, error handling, and performance monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedFetch, apiCache, performanceMonitor, debounce } from '../utils/performance';

interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseOptimizedAPIOptions {
  cacheKey?: string;
  cacheTTL?: number;
  debounceMs?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

export function useOptimizedAPI<T>(
  url: string,
  options: UseOptimizedAPIOptions = {}
): APIState<T> & { refetch: () => Promise<void>; invalidateCache: () => void } {
  const {
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    debounceMs = 0,
    enabled = true,
    refetchOnWindowFocus = false
  } = options;

  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
  if (!enabled) return;

  // Cancel previous request if it exists
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  abortControllerRef.current = new AbortController();

  setState(prev => ({ ...prev, loading: true, error: null }));

  try {
    // Get auth token from localStorage
    const token = localStorage.getItem("token");

    // Fetch data with optimizedFetch
    const data = await optimizedFetch(
      url,
      { 
        signal: abortControllerRef.current.signal,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      },
      cacheKey,
      cacheTTL
    );

    // Only update state if component is still mounted
    if (mountedRef.current) {
      setState({ data, loading: false, error: null });
    }
  } catch (error: any) {
    if (error.name !== "AbortError" && mountedRef.current) {
      const errorMessage = error.message || "An error occurred";
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  }
}, [url, enabled, cacheKey, cacheTTL]);

  // Debounced fetch function
  const debouncedFetch = useCallback(
    debounceMs > 0 ? debounce(fetchData, debounceMs) : fetchData,
    [fetchData, debounceMs]
  );

  const refetch = useCallback(async () => {
    if (cacheKey) {
      apiCache.invalidate(cacheKey);
    }
    await fetchData();
  }, [fetchData, cacheKey]);

  const invalidateCache = useCallback(() => {
    if (cacheKey) {
      apiCache.invalidate(cacheKey);
    }
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [refetch, refetchOnWindowFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { ...state, refetch, invalidateCache };
}

// Specialized hook for dashboard data
export function useDashboardData(classId: string) {
  return useOptimizedAPI(`/api/attendance/${classId}/dashboard`, {
    cacheKey: `dashboard_${classId}`,
    cacheTTL: 2 * 60 * 1000, // 2 minutes
    enabled: !!classId,
    refetchOnWindowFocus: true
  });
}

// Specialized hook for subjects with student counts
export function useSubjects() {
  return useOptimizedAPI('/api/subjects', {
    cacheKey: 'user_subjects',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });
}

// Specialized hook for class students
export function useClassStudents(classId: string) {
  return useOptimizedAPI(`/api/subjects/${classId}/students`, {
    cacheKey: `students_${classId}`,
    cacheTTL: 3 * 60 * 1000, // 3 minutes
    enabled: !!classId
  });
}

// Hook for optimized mutations with cache invalidation
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidatePatterns?: string[];
  } = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null
  });

  const mutate = useCallback(async (variables: TVariables) => {
    const endTimer = performanceMonitor.startTimer('mutation');
    setState({ loading: true, error: null });

    try {
      const data = await mutationFn(variables);
      
      // Invalidate related cache entries
      if (options.invalidatePatterns) {
        options.invalidatePatterns.forEach(pattern => {
          apiCache.invalidate(pattern);
        });
      }

      setState({ loading: false, error: null });
      options.onSuccess?.(data, variables);
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      setState({ loading: false, error: errorMessage });
      options.onError?.(error, variables);
      throw error;
    } finally {
      endTimer();
    }
  }, [mutationFn, options]);

  return { ...state, mutate };
}

// Hook for batch operations
export function useBatchOperation<T>(
  batchSize: number = 10,
  delayMs: number = 100
) {
  const [queue, setQueue] = useState<T[]>([]);
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);

  const addToQueue = useCallback((items: T | T[]) => {
    const itemsArray = Array.isArray(items) ? items : [items];
    setQueue(prev => [...prev, ...itemsArray]);
  }, []);

  const processBatch = useCallback(async (
    processor: (batch: T[]) => Promise<void>
  ) => {
    if (processingRef.current || queue.length === 0) return;

    processingRef.current = true;
    setProcessing(true);

    try {
      while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);
        await processor(batch);
        
        // Small delay between batches to prevent overwhelming the server
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    } finally {
      processingRef.current = false;
      setProcessing(false);
      setQueue([]);
    }
  }, [queue, batchSize, delayMs]);

  return {
    queue,
    queueSize: queue.length,
    processing,
    addToQueue,
    processBatch,
    clearQueue: () => setQueue([])
  };
}