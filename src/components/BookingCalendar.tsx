import React, { useState, useMemo } from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Booking } from '../types/booking';
import { Filter } from 'lucide-react';

const localizer = momentLocalizer(moment);

interface BookingCalendarProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Booking;
  cancelled: boolean;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  onSelectBooking
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  // Get unique room numbers from bookings
  const availableRooms = useMemo(() => {
    const rooms = [...new Set(bookings.map(booking => booking.roomNo))];
    return rooms.sort((a, b) => {
      // Try to sort numerically if possible, otherwise alphabetically
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [bookings]);

  // Filter bookings based on date and room filters
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Apply date filter
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(booking => {
        // Parse dates directly from the YYYY-MM-DD string format
        const checkInDateStr = booking.checkIn;
        const checkOutDateStr = booking.checkOut;
        
        let matchesFilter = true;
        
        if (dateFilter.start) {
          // Compare date strings directly (YYYY-MM-DD format allows string comparison)
          matchesFilter = matchesFilter && (checkInDateStr >= dateFilter.start || checkOutDateStr >= dateFilter.start);
        }
        
        if (dateFilter.end) {
          // Compare date strings directly
          matchesFilter = matchesFilter && (checkInDateStr <= dateFilter.end || checkOutDateStr <= dateFilter.end);
        }
        
        return matchesFilter;
      });
    }

    // Apply room filter
    if (selectedRooms.length > 0) {
      filtered = filtered.filter(booking => selectedRooms.includes(booking.roomNo));
    }

    return filtered;
  }, [bookings, dateFilter, selectedRooms]);

  // Transform bookings to calendar events
  const events: CalendarEvent[] = filteredBookings.map(booking => {
    // Parse dates from YYYY-MM-DD format ensuring local timezone
    const [checkInYear, checkInMonth, checkInDay] = booking.checkIn.split('-').map(Number);
    const [checkOutYear, checkOutMonth, checkOutDay] = booking.checkOut.split('-').map(Number);
    
    return {
      id: booking.id,
      title: `${booking.guestName} - Room ${booking.roomNo}${booking.cancelled ? ' (CANCELLED)' : ''}`,
      start: new Date(checkInYear, checkInMonth - 1, checkInDay, 12, 0, 0), // Set to noon to avoid DST issues
      end: new Date(checkOutYear, checkOutMonth - 1, checkOutDay, 12, 0, 0), // Set to noon to avoid DST issues
      resource: booking,
      cancelled: !!booking.cancelled
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    onSelectBooking(event.resource);
  };

  const handleRoomToggle = (roomNo: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomNo) 
        ? prev.filter(room => room !== roomNo)
        : [...prev, roomNo]
    );
  };

  const clearFilters = () => {
    setDateFilter({ start: '', end: '' });
    setSelectedRooms([]);
  };

  const hasActiveFilters = dateFilter.start || dateFilter.end || selectedRooms.length > 0;

  // Custom event style getter
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#265a87';
    
    if (event.cancelled) {
      backgroundColor = '#dc2626';
      borderColor = '#b91c1c';
      return {
        style: {
          backgroundColor,
          borderColor,
          color: 'white',
          opacity: 0.7,
          textDecoration: 'line-through'
        }
      };
    }

    // Color based on booking status
    switch (event.resource.status) {
      case 'confirmed':
        backgroundColor = '#16a34a';
        borderColor = '#15803d';
        break;
      case 'pending':
        backgroundColor = '#eab308';
        borderColor = '#ca8a04';
        break;
      case 'checked-in':
        backgroundColor = '#3b82f6';
        borderColor = '#2563eb';
        break;
      case 'checked-out':
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
        break;
      default:
        backgroundColor = '#3174ad';
        borderColor = '#265a87';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white'
      }
    };
  };

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <div className={`px-1 py-0.5 text-xs leading-tight ${event.cancelled ? 'line-through opacity-75' : ''}`}>
      <div className="truncate">
        {event.resource.guestName} - Room {event.resource.roomNo}
        {event.cancelled && <span className="text-red-200 ml-1">(CANCELLED)</span>}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .responsive-calendar .rbc-calendar {
          font-size: 0.875rem;
        }
        
        .responsive-calendar .rbc-toolbar {
          display: none;
        }
        
        .responsive-calendar .rbc-event {
          padding: 1px 2px;
          margin: 1px 0;
          border-radius: 2px;
          font-size: 0.75rem;
          line-height: 1.2;
          min-height: 16px;
        }
        
        .responsive-calendar .rbc-event-content {
          padding: 0;
        }
        
        .responsive-calendar .rbc-date-cell {
          padding: 2px;
        }
        
        @media (max-width: 640px) {
          .responsive-calendar .rbc-calendar {
            font-size: 0.75rem;
          }
          
          .responsive-calendar .rbc-header {
            padding: 0.25rem;
          }
          
          .responsive-calendar .rbc-date-cell {
            padding: 0.125rem;
          }
          
          .responsive-calendar .rbc-event {
            padding: 0.5px 1px;
            font-size: 0.625rem;
            min-height: 14px;
            margin: 0.5px 0;
          }
        }
        
        @media (max-width: 480px) {
          .responsive-calendar .rbc-calendar {
            font-size: 0.625rem;
          }
          
          .responsive-calendar .rbc-event {
            font-size: 0.5rem;
            padding: 0.5px 1px;
            min-height: 12px;
          }
        }
      `}</style>
      
      <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 lg:p-6">
        {/* Header with Filters */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
              Booking Calendar
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 border rounded-md transition-colors text-sm ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-1.5" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {(dateFilter.start || dateFilter.end ? 1 : 0) + (selectedRooms.length > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Room Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rooms ({selectedRooms.length} selected)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {availableRooms.map(roomNo => (
                        <label key={roomNo} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedRooms.includes(roomNo)}
                            onChange={() => handleRoomToggle(roomNo)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">Room {roomNo}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded mr-1.5 sm:mr-2"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded mr-1.5 sm:mr-2"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded mr-1.5 sm:mr-2"></div>
              <span>Checked In</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-500 rounded mr-1.5 sm:mr-2"></div>
              <span>Checked Out</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded mr-1.5 sm:mr-2 opacity-70"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>
        
        <div className="responsive-calendar" style={{ height: 'calc(100vh - 500px)', minHeight: '400px', maxHeight: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent
            }}
            views={[Views.MONTH]}
            defaultView={Views.MONTH}
            view={Views.MONTH}
            onView={() => {}} // Disable view changes
            style={{ height: '100%' }}
            popup
            showMultiDayTimes
            step={60}
            timeslots={1}
            formats={{
              monthHeaderFormat: (date, culture, localizer) =>
                window.innerWidth < 640 
                  ? localizer?.format(date, 'MMM YYYY', culture) || ''
                  : localizer?.format(date, 'MMMM YYYY', culture) || ''
            }}
          />
        </div>
      </div>
    </>
  );
};