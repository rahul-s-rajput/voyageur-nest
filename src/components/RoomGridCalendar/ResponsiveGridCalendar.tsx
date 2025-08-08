import React, { useState, useMemo, useEffect } from 'react';
import { Room, RoomGridData, PropertyBooking } from '../../types/property';
import { Booking } from '../../types/booking';
import { useBreakpoint } from '../../hooks/useWindowSize';
import { MobileGridView } from './MobileGridView';
import { TabletGridView } from './TabletGridView';
import { DesktopGridView } from './DesktopGridView';

interface ResponsiveGridProps {
  gridData: RoomGridData[];
  dateRange: Date[];
  showPricing?: boolean;
  onBookingClick?: (booking: PropertyBooking | Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
  onPricingUpdate?: (roomId: string, date: Date, newPrice: number) => void;
  selectedRoomType?: import('../../types/property').RoomType | null;
  onRoomTypeSelect?: (type: import('../../types/property').RoomType | null) => void;
}

export const ResponsiveGridCalendar: React.FC<ResponsiveGridProps> = ({
  gridData,
  dateRange,
  showPricing = false,
  onBookingClick,
  onCellClick,
  onPricingUpdate,
  selectedRoomType = null,
  onRoomTypeSelect,
}) => {
  const { isMobile, isTablet } = useBreakpoint();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Track and persist current chunk index for mobile
  const rangeKey = useMemo(() => {
    const start = dateRange[0]?.toISOString().slice(0, 10) || 'na';
    const end = dateRange[dateRange.length - 1]?.toISOString().slice(0, 10) || 'na';
    return `mobile_week_idx_${start}_${end}`;
  }, [dateRange]);
  const [mobileChunkIndex, setMobileChunkIndex] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('mobile_week_idx_last');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  // Load per-range index when range changes
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(rangeKey);
      if (saved !== null) setMobileChunkIndex(parseInt(saved, 10) || 0);
    } catch {}
  }, [rangeKey]);
  // Persist both range-specific and last used index
  useEffect(() => {
    try {
      sessionStorage.setItem(rangeKey, String(mobileChunkIndex));
      sessionStorage.setItem('mobile_week_idx_last', String(mobileChunkIndex));
    } catch {}
  }, [mobileChunkIndex, rangeKey]);

  // Extract rooms and availability data from gridData
  const rooms = useMemo(() => gridData.map(data => data.room), [gridData]);
  
  // Create availability lookup by room
  const availabilityByRoom = useMemo(() => {
    const lookup: Record<string, RoomGridData['availability']> = {};
    gridData.forEach(data => {
      lookup[data.room.roomNumber] = data.availability;
    });
    return lookup;
  }, [gridData]);

  const commonProps = {
    rooms,
    dateRange,
    availabilityByRoom,
    showPricing,
    onBookingClick,
    onCellClick,
    onPricingUpdate,
  };

  if (isMobile) {
    return (
      <MobileGridView
        {...commonProps}
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
        selectedRoomType={selectedRoomType as any}
        onRoomTypeSelect={onRoomTypeSelect as any}
        currentChunkIndex={mobileChunkIndex}
        onChunkIndexChange={setMobileChunkIndex}
      />
    );
  }

  if (isTablet) {
    return (
      <TabletGridView
        {...commonProps}
      />
    );
  }

  return (
    <DesktopGridView
      {...commonProps}
    />
  );
};