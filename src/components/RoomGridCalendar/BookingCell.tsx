import React, { useState } from 'react';
import { format } from 'date-fns';
import { PropertyBooking } from '../../types/property';

export interface BookingCellProps {
  roomNumber: string;
  date: Date;
  availability?: {
    status: 'available' | 'occupied' | 'checkout' | 'checkin';
    booking?: PropertyBooking;
    price: number;
  };
  pricing?: number;
  onBookingClick?: (booking: PropertyBooking) => void;
  onCellClick?: (roomNumber: string, date: Date) => void;
}

export const BookingCell: React.FC<BookingCellProps> = ({
  roomNumber,
  date,
  availability,
  pricing,
  onBookingClick,
  onCellClick
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (availability?.booking && onBookingClick) {
      onBookingClick(availability.booking);
    } else if (onCellClick) {
      onCellClick(roomNumber, date);
    }
  };

  const getCellStatusClass = (status?: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'checkin':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'checkout':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      default:
        return 'bg-white hover:bg-blue-50 text-gray-700';
    }
  };

  const getCellAriaLabel = () => {
    const dateStr = format(date, 'MMMM dd, yyyy');
    if (availability?.booking) {
      return `${dateStr}: ${availability.booking.guestName} - ${availability.status}`;
    }
    return `${dateStr}: Available - ₹${pricing || 0}`;
  };

  return (
    <div
      className={`p-2 border-r border-gray-200 cursor-pointer min-h-[80px] flex flex-col justify-center items-center text-xs transition-all duration-200 hover:shadow-md relative ${getCellStatusClass(availability?.status)}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="gridcell"
      aria-label={getCellAriaLabel()}
    >
      <CellContent availability={availability} pricing={pricing} />
      {showTooltip && (
        <CellTooltip 
          availability={availability} 
          pricing={pricing} 
          date={date}
        />
      )}
    </div>
  );
};

// Cell Content Component
interface CellContentProps {
  availability?: BookingCellProps['availability'];
  pricing?: number;
}

const CellContent: React.FC<CellContentProps> = ({ availability, pricing }) => {
  if (!availability || availability.status === 'available') {
    return (
      <div className="text-center">
        <div className="text-xs text-green-600 font-medium">Available</div>
        <div className="text-xs text-gray-600 font-medium">₹{pricing || 0}</div>
      </div>
    );
  }

  const { booking, status } = availability;
  
  return (
    <div className="text-center w-full">
      <div className="font-medium truncate w-full text-center">
        {booking?.guestName?.split(' ')[0] || 'Guest'}
      </div>
      <div className="flex items-center justify-center space-x-1 text-xs">
        {status === 'checkin' && <span className="font-bold text-green-600">→</span>}
        {status === 'checkout' && <span className="font-bold text-yellow-600">←</span>}
        <span>
          {booking?.checkIn && booking?.checkOut ? 
            `${Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))}n` : 
            '1n'
          }
        </span>
      </div>
      {booking?.noOfPax && (
        <div className="text-xs text-gray-500">
          {booking.noOfPax} pax
        </div>
      )}
    </div>
  );
};

// Cell Tooltip Component
interface CellTooltipProps {
  availability?: BookingCellProps['availability'];
  pricing?: number;
  date: Date;
}

const CellTooltip: React.FC<CellTooltipProps> = ({ availability, pricing, date }) => (
  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-20 whitespace-nowrap">
    <div className="font-medium">{format(date, 'MMM dd, yyyy')}</div>
    {availability?.booking ? (
      <div className="space-y-1 mt-1">
        <div>Guest: {availability.booking.guestName}</div>
        <div>Status: {availability.status}</div>
        <div>Contact: {availability.booking.contactPhone || 'N/A'}</div>
        <div>Room: {availability.booking.roomNo}</div>
        {availability.booking.specialRequests && (
          <div>Notes: {availability.booking.specialRequests}</div>
        )}
      </div>
    ) : (
      <div className="mt-1">
        <div>Available</div>
        <div>Price: ₹{pricing || 0}/night</div>
      </div>
    )}
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
  </div>
);