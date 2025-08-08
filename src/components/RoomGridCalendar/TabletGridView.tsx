import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Room, RoomGridData } from '../../types/property';
import { Booking } from '../../types/booking';
import { TouchBookingCell } from './TouchBookingCell';

interface TabletGridViewProps {
  rooms: Room[];
  dateRange: Date[];
  availabilityByRoom: Record<string, RoomGridData['availability']>;
  showPricing?: boolean;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
  onPricingUpdate?: (roomId: string, date: Date, newPrice: number) => void;
}

export const TabletGridView: React.FC<TabletGridViewProps> = ({
  rooms,
  dateRange,
  availabilityByRoom,
  showPricing = false,
  onBookingClick,
  onCellClick,
  onPricingUpdate,
}) => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const daysPerView = 7; // Show full week on tablet

  // Split date range into weeks
  const weeks = useMemo(() => {
    const weekChunks: Date[][] = [];
    for (let i = 0; i < dateRange.length; i += daysPerView) {
      weekChunks.push(dateRange.slice(i, i + daysPerView));
    }
    return weekChunks;
  }, [dateRange, daysPerView]);

  const currentWeek = weeks[currentWeekIndex] || [];
  const totalWeeks = weeks.length;

  const handlePrevWeek = () => {
    setCurrentWeekIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekIndex(prev => Math.min(totalWeeks - 1, prev + 1));
  };

  const getAvailabilityForDate = (roomNumber: string, date: Date) => {
    const roomAvailability = availabilityByRoom[roomNumber];
    if (!roomAvailability) return null;
    
    const dateKey = date.toISOString().split('T')[0]; // Use same format as availability data
    return roomAvailability[dateKey] || null;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tablet Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Room Calendar
          </h2>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePrevWeek}
              disabled={currentWeekIndex === 0}
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <div className="text-center min-w-[200px]">
              <div className="text-lg font-medium text-gray-900">
                {currentWeek.length > 0 && (
                  `${format(currentWeek[0], 'MMM dd')} - ${format(currentWeek[currentWeek.length - 1], 'MMM dd, yyyy')}`
                )}
              </div>
              <div className="text-sm text-gray-500">
                Week {currentWeekIndex + 1} of {totalWeeks}
              </div>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={currentWeekIndex === totalWeeks - 1}
              className="p-2 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto">
        <motion.div
          key={currentWeekIndex}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="min-w-full"
        >
          {/* Date Headers */}
          <div className="sticky top-0 z-5 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-8 gap-px">
              {/* Room Header Column */}
              <div className="p-4 bg-white">
                <div className="text-sm font-medium text-gray-900">Rooms</div>
              </div>
              
              {/* Date Columns */}
              {currentWeek.map((date) => {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={date.toISOString()}
                    className={`p-4 text-center bg-white ${
                      isWeekend ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {format(date, 'dd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Rows */}
          <div className="divide-y divide-gray-200">
            {rooms.map((room) => (
              <div key={room.id} className="grid grid-cols-8 gap-px bg-gray-200">
                {/* Room Info Column */}
                <div className="p-4 bg-white">
                  <div className="text-sm font-semibold text-gray-900">
                    Room {room.roomNumber}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {room.roomType}
                  </div>
                  <div className="text-xs text-gray-500">
                    Max {room.maxOccupancy}
                  </div>
                  {showPricing && room.basePrice && (
                    <div className="text-xs font-medium text-green-600 mt-1">
                      ₹{room.basePrice.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Date Cells */}
                {currentWeek.map((date) => {
                  const availability = getAvailabilityForDate(room.roomNumber, date);
                  const booking = availability?.booking;
                  return (
                    <div key={`${room.id}-${date.toISOString()}`} className="bg-white p-2">
                      <TouchBookingCell
                        room={room}
                        date={date}
                        booking={booking}
                        availabilityStatus={availability?.status}
                        showPricing={showPricing}
                        onBookingClick={onBookingClick}
                        onCellClick={onCellClick}
                        onPricingUpdate={onPricingUpdate}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};