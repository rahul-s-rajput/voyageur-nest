import React from 'react';
import { motion } from 'framer-motion';
import { Booking } from '../../types/booking';
import { Room, RoomPricing } from '../../types/property';
import { calculateEffectivePrice, formatCurrency, getPriceVariation } from '../../utils/pricingUtils';

interface BookingCellWithPricingProps {
  room: Room;
  date: Date;
  booking?: Booking;
  checkInBooking?: Booking; // New booking checking in on this date
  checkOutBooking?: Booking; // Booking checking out on this date
  pricing?: RoomPricing;
  showPricing: boolean;
  isSelected?: boolean;
  availabilityStatus?: 'available' | 'occupied' | 'checkin' | 'checkout' | 'checkin-checkout' | 'unavailable';
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPriceClick?: (room: Room, date: Date) => void;
}

export const BookingCellWithPricing: React.FC<BookingCellWithPricingProps> = ({
  room,
  date,
  booking,
  checkInBooking,
  checkOutBooking,
  pricing,
  showPricing,
  isSelected = false,
  availabilityStatus,
  onClick,
  onDoubleClick,
  onPriceClick
}) => {
  // Calculate effective price considering seasonal pricing from room data
  const getEffectivePrice = () => {
    // First check if there's date-specific pricing in room.seasonalPricing
    if (room.seasonalPricing) {
      const dateKey = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const dateSpecificPrice = room.seasonalPricing[dateKey];
      if (dateSpecificPrice !== undefined) {
        return dateSpecificPrice;
      }
    }
    
    // Fall back to pricing calculations or base price
    return pricing ? calculateEffectivePrice(pricing, date) : room.basePrice;
  };

  const effectivePrice = getEffectivePrice();
  const priceVariation = pricing ? getPriceVariation(pricing, date) : { type: 'none' as const, percentage: 0, amount: 0 };
  
  const isCheckoutDay = availabilityStatus === 'checkout' || availabilityStatus === 'checkin-checkout';
  const isCheckinDay = availabilityStatus === 'checkin' || availabilityStatus === 'checkin-checkout';
  const isSameDayTransition = availabilityStatus === 'checkin-checkout';
  const isOccupied = availabilityStatus === 'occupied' || availabilityStatus === 'checkin' || availabilityStatus === 'checkout' || availabilityStatus === 'checkin-checkout';
  
  // Use specific bookings if provided, otherwise fall back to general booking
  const activeCheckOut = checkOutBooking || (isCheckoutDay ? booking : undefined);
  const activeCheckIn = checkInBooking || (isCheckinDay ? booking : undefined);

  const getCellStyle = () => {
    if (booking) {
      // Handle cancelled bookings first
      if (booking.cancelled) {
        return 'bg-red-100 border-red-300 text-red-800';
      }
      
      switch (booking.status) {
        case 'confirmed':
          return 'bg-green-100 border-green-300 text-green-800';
        case 'pending':
          return 'bg-yellow-100 border-yellow-300 text-yellow-800';
        case 'checked-in':
          return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'checked-out':
          return 'bg-gray-100 border-gray-300 text-gray-600';
        default:
          return 'bg-gray-50 border-gray-200 text-gray-700';
      }
    }
    
    // Use availability status when no booking is present
    if (availabilityStatus) {
      switch (availabilityStatus) {
        case 'checkin':
        case 'occupied':
          return 'bg-green-100 border-green-300 text-green-800';
        case 'checkout':
          return 'bg-green-100 border-green-300 text-green-800';
        case 'unavailable':
          return 'bg-red-50 border-red-200 text-red-700 opacity-80';
        case 'available':
        default:
          return isSelected 
            ? 'bg-blue-50 border-blue-300 text-blue-800' 
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
      }
    }
    
    return isSelected 
      ? 'bg-blue-50 border-blue-300 text-blue-800' 
      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
  };

  const getBookingStatusColor = (bookingToCheck?: Booking) => {
    const b = bookingToCheck || booking;
    if (!b || b.cancelled) return 'bg-red-100';
    
    switch (b.status) {
      case 'confirmed':
        return 'bg-green-100';
      case 'pending':
        return 'bg-yellow-100';
      case 'checked-in':
        return 'bg-blue-100';
      case 'checked-out':
        return 'bg-gray-100';
      default:
        return 'bg-gray-50';
    }
  };

  const getBookingStatusHexColor = (bookingToCheck?: Booking) => {
    const b = bookingToCheck || booking;
    if (!b || b.cancelled) return '#fecaca'; // red-200
    
    switch (b.status) {
      case 'confirmed':
        return '#86efac'; // green-300 for better visibility
      case 'pending':
        return '#fde047'; // yellow-300
      case 'checked-in':
        return '#93c5fd'; // blue-300
      case 'checked-out':
        return '#d1d5db'; // gray-300
      default:
        return '#f3f4f6'; // gray-100
    }
  };

  const handlePriceClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the cell onClick
    if (onPriceClick) {
      onPriceClick(room, date);
    }
  };

  // Determine background style based on check-in/check-out status
  const getBackgroundStyle = () => {
    if (isSameDayTransition && activeCheckOut && activeCheckIn) {
      // Split cell diagonally or in half for same-day transition
      return {
        background: `linear-gradient(to right, ${getBookingStatusHexColor(activeCheckOut)} 0%, ${getBookingStatusHexColor(activeCheckOut)} 45%, #e5e7eb 45%, #e5e7eb 55%, ${getBookingStatusHexColor(activeCheckIn)} 55%, ${getBookingStatusHexColor(activeCheckIn)} 100%)`
      };
    } else if (isCheckoutDay && !isCheckinDay) {
      // Check-out only: left half colored, right half white
      return {
        background: `linear-gradient(to right, ${getBookingStatusHexColor(activeCheckOut)} 0%, ${getBookingStatusHexColor(activeCheckOut)} 48%, #ffffff 52%, #ffffff 100%)`
      };
    } else if (isCheckinDay && !isCheckoutDay) {
      // Check-in only: left half white, right half colored
      return {
        background: `linear-gradient(to right, #ffffff 0%, #ffffff 48%, ${getBookingStatusHexColor(activeCheckIn)} 52%, ${getBookingStatusHexColor(activeCheckIn)} 100%)`
      };
    }
    return undefined;
  };

  return (
    <motion.div
      className={`relative h-full border cursor-pointer transition-all duration-200 ${(isCheckoutDay || isCheckinDay) ? getCellStyle().replace(/bg-\S+/, '') : getCellStyle()}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={getBackgroundStyle()}
    >
      {/* Booking Information */}
      {(booking || isOccupied) ? (
        <div className="p-1 h-full flex flex-col justify-between">
          <div>
            {/* Same day transition - show both guests */}
            {isSameDayTransition && activeCheckOut && activeCheckIn ? (
              <div className="flex justify-between text-xs">
                <div className="flex-1 pr-1">
                  <div className="font-semibold truncate text-gray-700">
                    {activeCheckOut.guestName}
                  </div>
                  <div className="text-gray-500">← Out</div>
                </div>
                <div className="w-px bg-gray-400 mx-1"></div>
                <div className="flex-1 pl-1">
                  <div className="font-semibold truncate text-gray-700">
                    {activeCheckIn.guestName}
                  </div>
                  <div className="text-gray-500">In →</div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold truncate">
                  {booking?.guestName || (availabilityStatus === 'occupied' ? 'Occupied' : 
                    availabilityStatus === 'checkin' ? 'Check-in' : 
                    availabilityStatus === 'checkout' ? 'Check-out' : 'Occupied')}
                </div>
                <div className="text-xs opacity-75">
                  {isCheckinDay && !isSameDayTransition ? '→ Check-in' : ''}
                  {isCheckoutDay && !isSameDayTransition ? '← Check-out' : ''}
                </div>
              </>
            )}
            {isCheckoutDay && !isCheckinDay && (
              <div className="text-xs text-green-600 font-medium">
                AM checkout
              </div>
            )}
            {isCheckinDay && !isCheckoutDay && (
              <div className="text-xs text-blue-600 font-medium">
                PM check-in
              </div>
            )}
          </div>
          
          {/* Integrated Clickable Pricing for Booked Rooms */}
          {showPricing && (
            <div 
              className="text-xs font-medium cursor-pointer hover:bg-black hover:bg-opacity-10 rounded px-1 py-0.5 transition-colors"
              onClick={handlePriceClick}
              title="Click to edit pricing"
            >
              <div className="flex items-center justify-between">
                <span>{formatCurrency(booking?.totalAmount || effectivePrice)}</span>
                {priceVariation.percentage !== 0 && (
                  <span className={`text-xs px-1 rounded ml-1 ${
                    priceVariation.percentage > 0 ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'
                  }`}>
                    {priceVariation.percentage > 0 ? '+' : ''}{priceVariation.percentage}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Available Room with Integrated Clickable Pricing */
        <div className="p-2 h-full flex flex-col justify-center items-center">
          <div className="text-xs text-gray-400 mb-1">{availabilityStatus === 'unavailable' ? 'Unavailable' : 'Available'}</div>
          {showPricing && (
            <div 
              className="text-xs font-medium text-green-600 cursor-pointer hover:bg-green-50 rounded px-2 py-1 transition-colors border border-transparent hover:border-green-200"
              onClick={handlePriceClick}
              title="Click to edit pricing"
            >
              <div className="flex items-center space-x-1">
                <span>{formatCurrency(effectivePrice)}</span>
                {priceVariation.percentage !== 0 && (
                  <span className={`text-xs px-1 rounded ${
                    priceVariation.percentage > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {priceVariation.percentage > 0 ? '+' : ''}{priceVariation.percentage}%
                  </span>
                )}
              </div>
              {pricing?.seasonalAdjustments && pricing.seasonalAdjustments.length > 0 && (
                <div className="w-1 h-1 bg-orange-400 rounded-full mx-auto mt-1" title="Seasonal pricing active" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 border-2 border-blue-500 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
};