import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookingCalendar } from './BookingCalendar';
import { RoomGridCalendar } from './RoomGridCalendar';
import { Booking } from '../types/booking';
import { useProperty } from '../contexts/PropertyContext';

type CalendarViewType = 'traditional' | 'grid';

interface SharedCalendarState {
  selectedDate: Date;
  dateRange: { start: Date; end: Date };
  selectedBooking: Booking | null;
  viewPreferences: {
    traditional: {
      view: 'month' | 'week' | 'day';
      showWeekends: boolean;
    };
    grid: {
      viewType: 'week' | 'month' | 'custom';
      showPricing: boolean;
      selectedRooms: string[];
    };
  };
}

interface CalendarViewManagerProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  viewMode?: 'calendar' | 'grid';
}

const getDefaultSharedState = (): SharedCalendarState => ({
  selectedDate: new Date(),
  dateRange: {
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  selectedBooking: null,
  viewPreferences: {
    traditional: {
      view: 'month',
      showWeekends: true
    },
    grid: {
      viewType: 'week',
      showPricing: false,
      selectedRooms: []
    }
  }
});

const saveViewState = (view: CalendarViewType, state: SharedCalendarState) => {
  const stateKey = `calendarState_${view}`;
  try {
    localStorage.setItem(stateKey, JSON.stringify({
      ...state,
      selectedDate: state.selectedDate.toISOString(),
      dateRange: {
        start: state.dateRange.start.toISOString(),
        end: state.dateRange.end.toISOString()
      }
    }));
  } catch (error) {
    console.warn('Failed to save view state:', error);
  }
};

const loadViewState = (view: CalendarViewType): SharedCalendarState => {
  const stateKey = `calendarState_${view}`;
  try {
    const saved = localStorage.getItem(stateKey);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        selectedDate: new Date(parsed.selectedDate),
        dateRange: {
          start: new Date(parsed.dateRange.start),
          end: new Date(parsed.dateRange.end)
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load view state:', error);
  }
  
  return getDefaultSharedState();
};

// CalendarViewToggle component removed - using main tabs instead

interface CalendarViewContentProps {
  view: CalendarViewType;
  bookings: Booking[];
  sharedState: SharedCalendarState;
  onStateChange: (state: SharedCalendarState) => void;
  onBookingSelect: (booking: Booking) => void;
}

const CalendarViewContent: React.FC<CalendarViewContentProps> = ({
  view,
  bookings,
  sharedState,
  onStateChange,
  onBookingSelect
}) => {
  const { currentProperty } = useProperty();

  const handleBookingClick = (booking: Booking) => {
    onStateChange({
      ...sharedState,
      selectedBooking: booking
    });
    onBookingSelect(booking);
  };

  return (
    <div className="min-h-[600px] bg-white rounded-lg shadow-sm border overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'traditional' ? (
          <motion.div
            key="traditional"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <BookingCalendar
              bookings={bookings}
              onSelectBooking={handleBookingClick}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <RoomGridCalendar 
              propertyId={currentProperty?.id || ''}
              onBookingClick={handleBookingClick}
              dateRange={sharedState.dateRange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CalendarViewManager: React.FC<CalendarViewManagerProps> = ({
  bookings,
  onSelectBooking,
  viewMode = 'calendar'
}) => {
  // Convert viewMode prop to internal CalendarViewType
  const currentView: CalendarViewType = viewMode === 'grid' ? 'grid' : 'traditional';
  
  const [sharedState, setSharedState] = useState<SharedCalendarState>(() => 
    loadViewState(currentView)
  );

  // Save state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      saveViewState(currentView, sharedState);
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [currentView, sharedState]);

  // Update shared state when view changes
  useEffect(() => {
    const newState = loadViewState(currentView);
    setSharedState(newState);
  }, [currentView]);

  return (
    <div className="calendar-view-manager">
      <CalendarViewContent 
        view={currentView}
        bookings={bookings}
        sharedState={sharedState}
        onStateChange={setSharedState}
        onBookingSelect={onSelectBooking}
      />
    </div>
  );
};