import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeManager, ConnectionState, DataUpdate } from '../services/analytics/RealtimeManager';
import { useProperty } from '../contexts/PropertyContext';

export interface RealtimeStatus {
  isUpdating: boolean;
  lastUpdated: Date | null;
  connectionState: ConnectionState;
  queueLength: number;
  isOffline: boolean;
  updateCount: number;
}

export interface UseRealtimeAnalyticsOptions {
  enabled?: boolean;
  throttleMs?: number;
  onDataUpdate?: (update: DataUpdate) => void;
  onError?: (error: any) => void;
}

export function useRealtimeAnalytics(options: UseRealtimeAnalyticsOptions = {}) {
  const { enabled = true, throttleMs = 500, onDataUpdate, onError } = options;
  const { currentProperty } = useProperty();
  const realtimeManagerRef = useRef<RealtimeManager | null>(null);
  
  const [status, setStatus] = useState<RealtimeStatus>({
    isUpdating: false,
    lastUpdated: null,
    connectionState: 'connecting',
    queueLength: 0,
    isOffline: !navigator.onLine,
    updateCount: 0,
  });

  // Callback to handle status updates
  const updateStatus = useCallback((updates: Partial<RealtimeStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize realtime manager when property changes
  useEffect(() => {
    if (!enabled || !currentProperty?.id) {
      return;
    }

    const initializeRealtime = async () => {
      try {
        // Clean up existing manager
        if (realtimeManagerRef.current) {
          await realtimeManagerRef.current.cleanup();
        }

        // Create new manager for current property
        const manager = new RealtimeManager({
          propertyId: currentProperty.id,
          throttleMs,
        });

        // Set up event listeners
        const unsubscribers = [
          // Connection state changes
          manager.subscribe('connection-state', (state: ConnectionState) => {
            updateStatus({ connectionState: state });
          }),

          // Data update events
          manager.subscribe('booking-update-start', () => {
            updateStatus({ isUpdating: true });
          }),

          manager.subscribe('expense-update-start', () => {
            updateStatus({ isUpdating: true });
          }),

          manager.subscribe('booking-update', (update: DataUpdate) => {
            updateStatus({ 
              isUpdating: false, 
              lastUpdated: new Date(),
              updateCount: status.updateCount + 1 
            });
            onDataUpdate?.(update);
          }),

          manager.subscribe('expense-update', (update: DataUpdate) => {
            updateStatus({ 
              isUpdating: false, 
              lastUpdated: new Date(),
              updateCount: status.updateCount + 1 
            });
            onDataUpdate?.(update);
          }),

          // Last updated timestamp
          manager.subscribe('last-updated', (timestamp: Date) => {
            updateStatus({ lastUpdated: timestamp, isUpdating: false });
          }),

          // Error handling
          manager.subscribe('update-error', (error: any) => {
            updateStatus({ isUpdating: false });
            onError?.(error);
          }),

          // Cache invalidation (triggers UI refresh)
          manager.subscribe('cache-invalidation', (cacheKeys: string[]) => {
            console.log('Cache invalidated for:', cacheKeys);
            // This could trigger React Query cache invalidation or state updates
          }),
        ];

        // Initialize the manager
        await manager.initialize();
        realtimeManagerRef.current = manager;

        // Set initial connection state
        updateStatus({ 
          connectionState: manager.getConnectionState(),
          isOffline: !navigator.onLine 
        });

        // Store unsubscribers for cleanup
        (manager as any)._unsubscribers = unsubscribers;

      } catch (error) {
        console.error('Failed to initialize realtime analytics:', error);
        updateStatus({ connectionState: 'error' });
        onError?.(error);
      }
    };

    initializeRealtime();

    // Network status listeners
    const handleOnline = () => updateStatus({ isOffline: false });
    const handleOffline = () => updateStatus({ isOffline: true });
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Cleanup
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (realtimeManagerRef.current) {
        // Clean up subscriptions
        const unsubscribers = (realtimeManagerRef.current as any)._unsubscribers || [];
        unsubscribers.forEach((unsub: () => void) => unsub());
        
        // Clean up manager
        realtimeManagerRef.current.cleanup();
        realtimeManagerRef.current = null;
      }
    };
  }, [enabled, currentProperty?.id, throttleMs, onDataUpdate, onError, updateStatus]);

  // Pause/resume functionality
  const pauseUpdates = useCallback(() => {
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.pauseUpdates();
    }
  }, []);

  const resumeUpdates = useCallback(() => {
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.resumeUpdates();
    }
  }, []);

  // Manual refresh trigger
  const refreshData = useCallback(() => {
    if (realtimeManagerRef.current) {
      updateStatus({ isUpdating: true });
      // This would trigger a cache invalidation and data refetch
      // The actual implementation would depend on your data fetching strategy
      setTimeout(() => {
        updateStatus({ 
          isUpdating: false, 
          lastUpdated: new Date() 
        });
      }, 1000);
    }
  }, [updateStatus]);

  // Get queue status
  const getQueueStatus = useCallback(() => {
    if (realtimeManagerRef.current) {
      return realtimeManagerRef.current.getQueueStatus();
    }
    return null;
  }, []);

  return {
    status,
    pauseUpdates,
    resumeUpdates,
    refreshData,
    getQueueStatus,
    manager: realtimeManagerRef.current,
  };
}

// Simplified hook for just connection status
export function useRealtimeStatus() {
  const { status } = useRealtimeAnalytics();
  return status;
}

// Hook for data invalidation events
export function useRealtimeInvalidation(callback: (cacheKeys: string[]) => void) {
  const { manager } = useRealtimeAnalytics({ enabled: true });

  useEffect(() => {
    if (!manager) return;

    const unsubscribe = manager.subscribe('cache-invalidation', callback);
    return unsubscribe;
  }, [manager, callback]);
}
