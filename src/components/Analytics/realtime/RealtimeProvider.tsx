import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RealtimeManager, ConnectionState, DataUpdate } from '../../../services/analytics/RealtimeManager';
import { useProperty } from '../../../contexts/PropertyContext';

export interface RealtimeContextValue {
  manager: RealtimeManager | null;
  connectionState: ConnectionState;
  isUpdating: boolean;
  lastUpdated: Date | null;
  subscribe: (event: string, callback: (data: any) => void) => (() => void) | null;
  invalidateCache: (cacheKeys: string[]) => void;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export interface RealtimeProviderProps {
  children: ReactNode;
  enabled?: boolean;
  throttleMs?: number;
  onError?: (error: any) => void;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({
  children,
  enabled = true,
  throttleMs = 500,
  onError,
}) => {
  const { currentProperty } = useProperty();
  const [manager, setManager] = useState<RealtimeManager | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize realtime manager
  useEffect(() => {
    if (!enabled || !currentProperty?.id) {
      return;
    }

    let mounted = true;

    const initializeRealtime = async () => {
      try {
        // Clean up existing manager
        if (manager) {
          await manager.cleanup();
        }

        const realtimeManager = new RealtimeManager({
          propertyId: currentProperty.id,
          throttleMs,
        });

        // Set up event listeners
        const unsubscribers = [
          realtimeManager.subscribe('connection-state', (state: ConnectionState) => {
            if (mounted) {
              setConnectionState(state);
            }
          }),

          realtimeManager.subscribe('booking-update-start', () => {
            if (mounted) {
              setIsUpdating(true);
            }
          }),

          realtimeManager.subscribe('expense-update-start', () => {
            if (mounted) {
              setIsUpdating(true);
            }
          }),

          realtimeManager.subscribe('booking-update', (_update: DataUpdate) => {
            if (mounted) {
              setIsUpdating(false);
              setLastUpdated(new Date());
            }
          }),

          realtimeManager.subscribe('expense-update', (_update: DataUpdate) => {
            if (mounted) {
              setIsUpdating(false);
              setLastUpdated(new Date());
            }
          }),

          realtimeManager.subscribe('last-updated', (timestamp: Date) => {
            if (mounted) {
              setLastUpdated(timestamp);
              setIsUpdating(false);
            }
          }),

          realtimeManager.subscribe('update-error', (error: any) => {
            if (mounted) {
              setIsUpdating(false);
              onError?.(error);
            }
          }),
        ];

        // Initialize
        await realtimeManager.initialize();

        if (mounted) {
          setManager(realtimeManager);
          setConnectionState(realtimeManager.getConnectionState());
          
          // Store unsubscribers for cleanup
          (realtimeManager as any)._unsubscribers = unsubscribers;
        } else {
          // Component unmounted, clean up
          unsubscribers.forEach(unsub => unsub());
          await realtimeManager.cleanup();
        }

      } catch (error) {
        console.error('Failed to initialize realtime manager:', error);
        if (mounted) {
          setConnectionState('error');
          onError?.(error);
        }
      }
    };

    initializeRealtime();

    return () => {
      mounted = false;
      if (manager) {
        const unsubscribers = (manager as any)._unsubscribers || [];
        unsubscribers.forEach((unsub: () => void) => unsub());
        manager.cleanup();
      }
    };
  }, [enabled, currentProperty?.id, throttleMs, onError]);

  // Context methods
  const subscribe = (event: string, callback: (data: any) => void) => {
    if (!manager) return null;
    return manager.subscribe(event, callback);
  };

  const invalidateCache = (cacheKeys: string[]) => {
    if (manager) {
      // This would typically trigger React Query invalidation
      console.log('Invalidating cache for:', cacheKeys);
    }
  };

  const pauseUpdates = () => {
    if (manager) {
      manager.pauseUpdates();
    }
  };

  const resumeUpdates = () => {
    if (manager) {
      manager.resumeUpdates();
    }
  };

  const contextValue: RealtimeContextValue = {
    manager,
    connectionState,
    isUpdating,
    lastUpdated,
    subscribe,
    invalidateCache,
    pauseUpdates,
    resumeUpdates,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

// Specialized hooks for specific use cases
export const useRealtimeConnection = () => {
  const { connectionState } = useRealtime();
  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    hasError: connectionState === 'error',
  };
};

export const useRealtimeUpdates = () => {
  const { isUpdating, lastUpdated, pauseUpdates, resumeUpdates } = useRealtime();
  return {
    isUpdating,
    lastUpdated,
    pauseUpdates,
    resumeUpdates,
  };
};
