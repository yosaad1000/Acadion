import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  downlink?: number;
  effectiveType?: string;
}

/**
 * Hook to monitor network status and connection quality
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown'
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const isOnline = navigator.onLine;
    let isSlowConnection = false;
    let connectionType = 'unknown';
    let downlink: number | undefined;
    let effectiveType: string | undefined;

    if (connection) {
      connectionType = connection.type || connection.effectiveType || 'unknown';
      downlink = connection.downlink;
      effectiveType = connection.effectiveType;
      
      // Consider connection slow if effective type is 2g or 3g, or downlink is very low
      isSlowConnection = 
        effectiveType === '2g' || 
        effectiveType === 'slow-2g' ||
        (effectiveType === '3g' && (downlink || 0) < 1);
    }

    setNetworkStatus({
      isOnline,
      isSlowConnection,
      connectionType,
      downlink,
      effectiveType
    });
  }, []);

  useEffect(() => {
    // Initial status
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 Network: Back online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('📵 Network: Gone offline');
      updateNetworkStatus();
    };

    // Listen for connection changes
    const handleConnectionChange = () => {
      console.log('🔄 Network: Connection changed');
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection API changes if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  return networkStatus;
};

/**
 * Hook to detect when network comes back online after being offline
 */
export const useNetworkRecovery = (onRecovery?: () => void) => {
  const [wasOffline, setWasOffline] = useState(false);
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setWasOffline(true);
    } else if (wasOffline && networkStatus.isOnline) {
      console.log('🔄 Network recovered, triggering recovery callback');
      setWasOffline(false);
      onRecovery?.();
    }
  }, [networkStatus.isOnline, wasOffline, onRecovery]);

  return {
    ...networkStatus,
    wasOffline
  };
};