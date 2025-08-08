import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Room } from '../../types/property';
import { Booking } from '../../types/booking';
import { useLongPress } from '../../hooks/useLongPress';
import { TouchActionMenu } from './TouchActionMenu';
import { PricingDisplay } from '../pricing/PricingDisplay';
import { calculateEffectivePrice } from '../../utils/pricingUtils';

interface TouchBookingCellProps {
  room: Room;
  date: Date;
  booking?: Booking;
  availabilityStatus?: 'available' | 'occupied' | 'checkin' | 'checkout' | 'checkin-checkout' | 'unavailable';
  showPricing?: boolean;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
}

export const TouchBookingCell: React.FC<TouchBookingCellProps> = ({
  room,
  date,
  booking,
  availabilityStatus,
  showPricing = false,
  onBookingClick,
  onCellClick,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleLongPress = useCallback(() => {
    setShowActions(true);
    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleTap = useCallback(() => {
    if (booking && onBookingClick) {
      onBookingClick(booking);
    } else if (!booking && onCellClick) {
      onCellClick(room, date);
    }
  }, [booking, onBookingClick, onCellClick, room, date]);

  const longPressProps = useLongPress(handleLongPress, 500, {
    onStart: () => {
      // Visual feedback on press start
    },
    onCancel: () => {
      setShowActions(false);
    },
  });

  // Extract isLongPressing separately to avoid passing it as DOM prop
  const { isLongPressing, ...longPressDOMProps } = longPressProps;

  const isOccupied = !!booking;
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isCheckoutDay = availabilityStatus === 'checkout';
  
  // Calculate effective price for the date
  const effectivePrice = room.pricing ? 
    calculateEffectivePrice(room.pricing, date) : 
    room.basePrice;

  const cellVariants = {
    initial: { scale: 1 },
    pressed: { scale: 0.95 },
    released: { scale: 1 },
  };

  // Get background style for checkout days
  const getBackgroundStyle = () => {
    if (isCheckoutDay) {
      return {
        background: 'linear-gradient(to right, #dbeafe 50%, #ffffff 50%)'
      };
    }
    return {};
  };

  return (
    <>
      <motion.div
        data-testid="touch-booking-cell"
        className={`
          relative min-h-[80px] p-3 rounded-lg border-2 cursor-pointer
          transition-all duration-200 select-none
          ${isOccupied && !isCheckoutDay
            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
            : !isCheckoutDay
            ? 'bg-white border-gray-200 hover:bg-gray-50'
            : 'border-blue-200'
          }
          ${isWeekend ? 'ring-1 ring-orange-200' : ''}
          active:scale-95
        `}
        style={getBackgroundStyle()}
        variants={cellVariants}
        initial="initial"
        whileTap="pressed"
        onClick={handleTap}
        {...longPressDOMProps}
      >
        {/* Date Label */}
        <div className="text-xs font-medium text-gray-500 mb-1">
          {format(date, 'dd')}
          {isWeekend && <span className="ml-1 text-orange-500">•</span>}
        </div>

        {/* Booking Info */}
        {booking ? (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {booking.guestName}
            </div>
            <div className="text-xs text-gray-600">
              {(() => {
                const checkIn = new Date(booking.checkIn);
                const checkOut = new Date(booking.checkOut);
                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                const guests = booking.noOfPax || booking.numberOfGuests || 1;
                return `${nights}n • ${guests} guests`;
              })()
            }</div>
            {booking.status && (
              <div className={`
                text-xs px-2 py-1 rounded-full inline-block
                ${booking.status === 'confirmed' 
                  ? 'bg-green-100 text-green-800' 
                  : booking.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
                }
              `}>
                {booking.status}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className={`text-xs mb-2 ${availabilityStatus === 'unavailable' ? 'text-red-600' : 'text-gray-400'}`}>
              {availabilityStatus === 'unavailable' ? 'Unavailable' : 'Available'}
            </div>
            {showPricing && effectivePrice && (
              <PricingDisplay
                room={room}
                date={date}
                showDetails={false}
                compact={true}
                onPriceClick={() => {
                  // Handle price click for mobile
                }}
              />
            )}
          </div>
        )}

        {/* Long Press Indicator */}
        {isLongPressing && (
          <motion.div
            className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>

      {/* Touch Action Menu */}
      <AnimatePresence>
        {showActions && (
          <TouchActionMenu
            room={room}
            date={date}
            booking={booking}
            showPricing={showPricing}
            onClose={() => setShowActions(false)}
            onBookingClick={onBookingClick}
            onCellClick={onCellClick}
          />
        )}
      </AnimatePresence>
    </>
  );
};