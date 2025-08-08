import React from 'react';
import { format } from 'date-fns';
import { Room, RoomGridData } from '../../types/property';
import { Booking } from '../../types/booking';

interface DesktopGridViewProps {
  rooms: Room[];
  dateRange: Date[];
  availabilityByRoom: Record<string, RoomGridData['availability']>;
  showPricing?: boolean;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (room: Room, date: Date) => void;
  onPricingUpdate?: (roomId: string, date: Date, newPrice: number) => void;
}

export const DesktopGridView: React.FC<DesktopGridViewProps> = ({
  rooms,
  dateRange,
  availabilityByRoom,
  showPricing = false,
  onBookingClick,
  onCellClick,
  onPricingUpdate,
}) => {
  const getAvailabilityForDate = (roomNumber: string, date: Date) => {
    const roomAvailability = availabilityByRoom[roomNumber];
    if (!roomAvailability) return null;
    
    const dateKey = date.toISOString().split('T')[0]; // Use same format as availability data
    return roomAvailability[dateKey] || null;
  };
  // Create a simple grid layout for desktop
  return (
    <div className="h-full overflow-auto">
      <div className="min-w-full">
        {/* Header Row */}
        <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="w-48 p-3 font-semibold text-gray-900 border-r border-gray-200">
            Room
          </div>
          {dateRange.map((date, index) => (
            <div key={index} className="flex-1 min-w-32 p-3 text-center font-medium text-gray-700 border-r border-gray-200">
              <div className="text-sm">{format(date, 'EEE')}</div>
              <div className="text-lg">{format(date, 'dd')}</div>
              <div className="text-xs text-gray-500">{format(date, 'MMM')}</div>
            </div>
          ))}
        </div>
        
        {/* Room Rows */}
        <div className="divide-y divide-gray-200">
          {rooms.map((room) => (
            <div key={room.id} className="flex hover:bg-gray-50">
              {/* Room Info */}
              <div className="w-48 p-3 border-r border-gray-200">
                <div className="font-semibold text-gray-900">{room.roomNumber}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {room.roomType.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-500">Max: {room.maxOccupancy}</div>
                {showPricing && (
                  <div className="text-sm font-medium text-green-600">
                    ₹{room.basePrice}
                  </div>
                )}
              </div>
              
              {/* Date Cells */}
              {dateRange.map((date, dateIndex) => {
                const availability = getAvailabilityForDate(room.roomNumber, date);
                const dayBooking = availability?.booking;
                const isCheckoutDay = availability?.status === 'checkout';
                
                // Get background style for checkout days
                const getBackgroundStyle = () => {
                  if (isCheckoutDay) {
                    return {
                      background: 'linear-gradient(to right, #dcfce7 50%, #ffffff 50%)'
                    };
                  }
                  return {};
                };
                
                return (
                  <div
                    key={`${room.id}-${date.toISOString()}`}
                    className={`
                      h-16 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50
                      ${availability?.status === 'available' ? 'bg-white' : 
                        availability?.status === 'checkin' ? 'bg-green-100' :
                        availability?.status === 'checkout' ? '' :
                        availability?.status === 'occupied' ? 'bg-blue-100' : 'bg-white'}
                    `}
                    style={getBackgroundStyle()}
                    onClick={() => {
                      if (dayBooking && onBookingClick) {
                        onBookingClick(dayBooking);
                      } else if (!dayBooking && onCellClick) {
                        onCellClick(room, date);
                      }
                    }}
                  >
                    {dayBooking ? (
                      <div className="text-xs">
                        <div className="font-medium text-blue-800 truncate">
                          {dayBooking.guestName}
                        </div>
                        <div className="text-blue-600 capitalize">
                          {availability?.status || dayBooking.status}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center">
                        Available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};