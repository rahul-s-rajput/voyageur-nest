import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Room, RoomGridData, RoomType } from '../../types/property';
import { Booking } from '../../types/booking';
import { TouchBookingCell } from './TouchBookingCell';
import { RoomSelector } from './RoomSelector';
import { useBreakpoint } from '../../hooks/useWindowSize';

interface MobileGridViewProps {
  rooms: Room[];
  dateRange: Date[];
  availabilityByRoom: Record<string, RoomGridData['availability']>;
  selectedRoom: Room | null;
  onRoomSelect: (room: Room | null) => void;
  selectedRoomType?: RoomType | null;
  onRoomTypeSelect?: (type: RoomType | null) => void;
  showPricing?: boolean;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
  onPricingUpdate?: (roomId: string, date: Date, newPrice: number) => void;
  // Controlled chunk index to persist across re-renders
  currentChunkIndex?: number;
  onChunkIndexChange?: (idx: number) => void;
}

export const MobileGridView: React.FC<MobileGridViewProps> = ({
  rooms,
  dateRange,
  availabilityByRoom,
  selectedRoom,
  onRoomSelect,
  selectedRoomType = null,
  onRoomTypeSelect,
  showPricing = false,
  onBookingClick,
  onCellClick,
  onPricingUpdate,
  currentChunkIndex,
  onChunkIndexChange,
}) => {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(0);
  const currentWeekIndex = currentChunkIndex ?? uncontrolledIndex;
  const setCurrentWeekIndex = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === 'function' ? (updater as (prev: number) => number)(currentWeekIndex) : updater;
    if (onChunkIndexChange) onChunkIndexChange(next);
    else setUncontrolledIndex(next);
  };
  const rangeKey = useMemo(() => {
    const start = dateRange[0]?.toISOString().slice(0,10) || 'na';
    const end = dateRange[dateRange.length - 1]?.toISOString().slice(0,10) || 'na';
    return `mobile_week_idx_${start}_${end}`;
  }, [dateRange]);
  useEffect(() => {
    // When uncontrolled, restore persisted value
    if (currentChunkIndex !== undefined) return;
    try {
      const saved = sessionStorage.getItem(rangeKey);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (!isNaN(idx)) setUncontrolledIndex(idx);
      }
    } catch {}
  }, [rangeKey, currentChunkIndex]);
  useEffect(() => {
    try { sessionStorage.setItem(rangeKey, String(currentWeekIndex)); } catch {}
  }, [currentWeekIndex, rangeKey]);

  // Responsive days per view based on screen size
  const { isSmallMobile, isMediumMobile } = useBreakpoint();
  const daysPerView = isSmallMobile ? 2 : isMediumMobile ? 3 : 4; // Adaptive days per view
  const isWeeklyRange = dateRange.length === 7;
  const chunkSize = isWeeklyRange ? 7 : daysPerView;

  // Split date range into weeks for mobile navigation
  const weeks = useMemo(() => {
    const weekChunks: Date[][] = [];
    for (let i = 0; i < dateRange.length; i += chunkSize) {
      weekChunks.push(dateRange.slice(i, i + chunkSize));
    }
    return weekChunks;
  }, [dateRange, chunkSize]);

  const currentWeek = weeks[currentWeekIndex] || [];
  const totalWeeks = weeks.length;

  const handlePrevWeek = () => {
    setCurrentWeekIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekIndex(prev => Math.min(totalWeeks - 1, prev + 1));
  };

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    const velocityThreshold = 300;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      handleNextWeek();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      handlePrevWeek();
    }
  };

  const getAvailabilityForDate = (roomNumber: string, date: Date) => {
    const roomAvailability = availabilityByRoom[roomNumber];
    if (!roomAvailability) return null;
    const dateKey = date.toISOString().split('T')[0];
    return roomAvailability[dateKey] || null;
  };

  const visibleRooms = selectedRoom ? [selectedRoom] : (selectedRoomType ? rooms.filter(r => r.roomType === selectedRoomType) : rooms);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile Header with Date Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="w-8" />

          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {currentWeek.length > 0 && (
                `${format(currentWeek[0], 'MMM dd')} - ${format(currentWeek[currentWeek.length - 1], 'MMM dd')}`
              )}
            </span>
          </div>

          <div className="w-8" />
        </div>
      </div>

      {/* Room Selector */}
      <div className="px-4 py-3 border-b border-gray-200">
        <RoomSelector
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelect={onRoomSelect}
          selectedRoomType={selectedRoomType}
          onRoomTypeSelect={onRoomTypeSelect}
        />
      </div>

      {/* Mobile Grid Content */}
      <div className="flex-1 overflow-hidden">
        {visibleRooms.length > 0 ? (
          <motion.div
            key={currentWeekIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
          >
            {/* Date Headers */}
            <div className={`grid ${chunkSize === 2 ? 'grid-cols-2' : chunkSize === 3 ? 'grid-cols-3' : chunkSize === 4 ? 'grid-cols-4' : 'grid-cols-7'} bg-gray-50 border-b border-gray-200`}>
              {currentWeek.map((date) => (
                <div
                  key={date.toISOString()}
                  className="p-2 text-center border-r border-gray-200 last:border-r-0"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {format(date, 'dd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Rows */}
            <div className="p-4 space-y-4">
              {visibleRooms.map((room) => (
                <div key={room.id}>
                  <div className="mb-2 text-sm font-semibold text-gray-900">
                    Room {room.roomNumber} • {room.roomType}
                  </div>
                  <div className={`grid ${chunkSize === 2 ? 'grid-cols-2' : chunkSize === 3 ? 'grid-cols-3' : chunkSize === 4 ? 'grid-cols-4' : 'grid-cols-7'} gap-2`}>
                    {currentWeek.map((date) => {
                      const availability = getAvailabilityForDate(room.roomNumber, date);
                      const booking = availability?.booking;
                      return (
                        <TouchBookingCell
                          key={`${room.id}-${date.toISOString()}`}
                          room={room}
                          date={date}
                          booking={booking}
                          availabilityStatus={availability?.status}
                          showPricing={showPricing}
                          onBookingClick={onBookingClick}
                          onCellClick={onCellClick}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Room
              </h3>
              <p className="text-gray-500">
                Choose a room from the dropdown above to view its calendar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};