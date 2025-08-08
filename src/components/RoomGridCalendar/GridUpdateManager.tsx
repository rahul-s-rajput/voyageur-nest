import React, { useCallback, useMemo, useState } from 'react';
import { useRealTimeGrid, GridUpdateEvent } from '../../hooks/useRealTimeGrid';
import { RealTimeStatusBar } from './RealTimeIndicators';
import { Booking } from '../../types/booking';
import { Room } from '../../types/room';

interface GridUpdateManagerProps {
  dateRange: { start: Date; end: Date };
  propertyId: string;
  onBookingsUpdate: (bookings: Booking[]) => void;
  onRoomsUpdate: (rooms: Room[]) => void;
  onOptimisticUpdate?: (update: GridUpdateEvent) => void;
  children: React.ReactNode;
  className?: string;
}

export const GridUpdateManager: React.FC<GridUpdateManagerProps> = ({
  dateRange,
  propertyId,
  onBookingsUpdate,
  onRoomsUpdate,
  onOptimisticUpdate,
  children,
  className = ''
}) => {
  // Initialize local state for bookings and rooms since the hook doesn't provide them
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const {
    pendingUpdates,
    lastUpdateTime,
    sendOptimisticUpdate,
    isSubscribed
  } = useRealTimeGrid({
    dateRange,
    propertyId,
    onUpdate: (event: GridUpdateEvent) => {
      // Handle different update types
      if (event.type.includes('booking') && event.data.booking) {
        // Update local bookings state
        setBookings(prev => {
          const updated = prev.filter(b => b.id !== event.data.booking!.id);
          return [...updated, event.data.booking!];
        });
        onBookingsUpdate([event.data.booking]);
      }
      if (event.type === 'room_updated' && event.data.room) {
        // Update local rooms state
        setRooms(prev => {
          const updated = prev.filter(r => r.id !== event.data.room!.id);
          return [...updated, event.data.room!];
        });
        onRoomsUpdate([event.data.room]);
      }
    }
  });

  // Handle optimistic updates from child components
  const handleOptimisticUpdate = useCallback((update: GridUpdateEvent) => {
    sendOptimisticUpdate(update);
    onOptimisticUpdate?.(update);
  }, [sendOptimisticUpdate, onOptimisticUpdate]);

  // Provide context for child components
  const gridContext = useMemo(() => ({
    bookings,
    rooms,
    isSubscribed,
    pendingUpdates,
    lastUpdateTime,
    sendOptimisticUpdate: handleOptimisticUpdate
  }), [
    bookings,
    rooms,
    isSubscribed,
    pendingUpdates,
    lastUpdateTime,
    handleOptimisticUpdate
  ]);

  return (
    <div className={`real-time-grid-container ${className}`}>
      {/* Only show status bar if there are pending updates */}
      {pendingUpdates.length > 0 && (
        <RealTimeStatusBar
          pendingUpdates={pendingUpdates}
          className="sticky top-0 z-10"
        />
      )}
      
      <GridUpdateContext.Provider value={gridContext}>
        {children}
      </GridUpdateContext.Provider>
    </div>
  );
};

// Context for sharing real-time grid state
export const GridUpdateContext = React.createContext<{
  bookings: Booking[];
  rooms: Room[];
  isSubscribed: boolean;
  pendingUpdates: GridUpdateEvent[];
  lastUpdateTime: number | null;
  sendOptimisticUpdate: (update: GridUpdateEvent) => void;
} | null>(null);

// Hook to use grid update context
export const useGridUpdateContext = () => {
  const context = React.useContext(GridUpdateContext);
  if (!context) {
    throw new Error('useGridUpdateContext must be used within a GridUpdateManager');
  }
  return context;
};