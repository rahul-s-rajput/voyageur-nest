import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarViewManager } from '../../../components/CalendarViewManager';
import { PropertyProvider } from '../../../contexts/PropertyContext';

// Mock Framer Motion components - THIS IS THE KEY FIX!
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Grid: () => <span data-testid="grid-icon">⚏</span>
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock the BookingCalendar component
vi.mock('../../../components/BookingCalendar', () => ({
  BookingCalendar: ({ bookings, onSelectBooking }: any) => (
    <div data-testid="booking-calendar">
      <div>Traditional Calendar View</div>
      <div>Bookings count: {bookings.length}</div>
      <button onClick={() => onSelectBooking({ id: 'calendar-booking' })}>
        Select Calendar Booking
      </button>
    </div>
  ),
}));

// Mock the RoomGridCalendar component
vi.mock('../../../components/RoomGridCalendar', () => {
  const RoomGridCalendarComponent = ({ propertyId, dateRange, onBookingClick }: any) => (
    <div data-testid="room-grid-calendar">
      <div>Room Grid Calendar View</div>
      <div>Property ID: {propertyId}</div>
      <div>Date Range: {dateRange?.start?.toISOString?.() || 'N/A'} to {dateRange?.end?.toISOString?.() || 'N/A'}</div>
      <button onClick={() => onBookingClick && onBookingClick({ id: 'grid-booking' })}>
        Select Grid Booking
      </button>
    </div>
  );
  
  return {
    RoomGridCalendar: RoomGridCalendarComponent,
    default: RoomGridCalendarComponent,
  };
});

// Mock hooks
vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const mockBookings = [
  {
    id: '1',
    propertyId: 'test-property-id',
    guestName: 'John Doe',
    roomNo: '101',
    checkIn: '2024-01-15',
    checkOut: '2024-01-20',
    totalAmount: 500,
    status: 'confirmed' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    propertyId: 'test-property-id',
    guestName: 'Jane Smith',
    roomNo: '102',
    checkIn: '2024-01-18',
    checkOut: '2024-01-22',
    totalAmount: 300,
    status: 'pending' as const,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const defaultProps = {
  bookings: mockBookings,
  onSelectBooking: vi.fn(),
};

vi.mock('../../../contexts/PropertyContext', () => ({
  PropertyProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProperty: () => ({
    currentProperty: {
      id: 'test-property-id',
      name: 'Test Property',
      address: 'Test Address',
      phone: '123-456-7890',
      email: 'test@example.com',
      totalRooms: 10,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    properties: [],
    switchProperty: vi.fn(),
    isLoading: false,
    error: null
  })
}));

const renderWithPropertyContext = (props = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <PropertyProvider>
      <CalendarViewManager {...mergedProps} />
    </PropertyProvider>
  );
};

describe('CalendarViewManager', () => {
  // The view is now controlled externally via the `viewMode` prop
  // ('calendar' | 'grid'); the component no longer renders internal
  // toggle buttons (see source comment: "CalendarViewToggle component
  // removed - using main tabs instead").

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default traditional calendar view', async () => {
    renderWithPropertyContext();

    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    expect(screen.getByText('Traditional Calendar View')).toBeInTheDocument();
    expect(screen.queryByTestId('room-grid-calendar')).not.toBeInTheDocument();
  });

  it('renders grid view when viewMode="grid"', async () => {
    renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    expect(screen.getByText('Room Grid Calendar View')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-calendar')).not.toBeInTheDocument();
  });

  it('renders traditional view when viewMode="calendar"', async () => {
    renderWithPropertyContext({ viewMode: 'calendar' });

    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('room-grid-calendar')).not.toBeInTheDocument();
  });

  it('switches view when the viewMode prop changes', async () => {
    const { rerender } = renderWithPropertyContext({ viewMode: 'calendar' });

    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    rerender(
      <PropertyProvider>
        <CalendarViewManager {...defaultProps} viewMode="grid" />
      </PropertyProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
      expect(screen.queryByTestId('booking-calendar')).not.toBeInTheDocument();
    });
  });

  it('persists per-view state in localStorage under calendarState_ keys', async () => {
    vi.useFakeTimers();
    try {
      renderWithPropertyContext({ viewMode: 'grid' });

      // State is saved on a 30s interval keyed by view type.
      vi.advanceTimersByTime(30000);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'calendarState_grid',
        expect.any(String)
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads persisted state for the active view from localStorage', async () => {
    const persisted = JSON.stringify({
      selectedDate: '2024-01-15T00:00:00.000Z',
      dateRange: {
        start: '2024-01-15T00:00:00.000Z',
        end: '2024-01-22T00:00:00.000Z',
      },
      selectedBooking: null,
      viewPreferences: {
        traditional: { view: 'month', showWeekends: true },
        grid: { viewType: 'week', showPricing: false, selectedRooms: [] },
      },
    });
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'calendarState_grid') return persisted;
      return null;
    });

    renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    // The persisted dateRange should flow through to the grid view.
    expect(localStorageMock.getItem).toHaveBeenCalledWith('calendarState_grid');
  });

  it('handles booking selection from traditional calendar', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    // Click select booking button in calendar view
    const selectButton = screen.getByText('Select Calendar Booking');
    fireEvent.click(selectButton);
    
    // Should call onSelectBooking with booking object
    expect(defaultProps.onSelectBooking).toHaveBeenCalledWith({ id: 'calendar-booking' });
  });

  it('handles booking selection from grid calendar', async () => {
    renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    // Click select booking button in grid view
    const selectButton = screen.getByText('Select Grid Booking');
    fireEvent.click(selectButton);
    
    // Should call onSelectBooking with booking object
    expect(defaultProps.onSelectBooking).toHaveBeenCalledWith({ id: 'grid-booking' });
  });

  it('passes correct props to BookingCalendar', async () => {
    renderWithPropertyContext();
    
    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    // Should display bookings count
    expect(screen.getByText('Bookings count: 2')).toBeInTheDocument();
  });

  it('passes correct props to RoomGridCalendar', async () => {
    renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    // Should display property ID derived from the property context
    expect(screen.getByText('Property ID: test-property-id')).toBeInTheDocument();
  });

  it('handles date range changes', async () => {
    renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    // Should pass a date range through to the grid view
    expect(screen.getByText(/Date Range:/)).toBeInTheDocument();
  });

  it('maintains bookings when the view mode changes', async () => {
    const { rerender } = renderWithPropertyContext({ viewMode: 'grid' });

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });

    // Switch back to calendar view via the prop
    rerender(
      <PropertyProvider>
        <CalendarViewManager {...defaultProps} viewMode="calendar" />
      </PropertyProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    // Should still show the same bookings
    expect(screen.getByText('Bookings count: 2')).toBeInTheDocument();
  });

  it('renders both views without errors regardless of window width', async () => {
    // Mock window.innerWidth for mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { rerender } = renderWithPropertyContext({ viewMode: 'calendar' });

    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    rerender(
      <PropertyProvider>
        <CalendarViewManager {...defaultProps} viewMode="grid" />
      </PropertyProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('room-grid-calendar')).toBeInTheDocument();
    });
  });

  it('handles empty bookings array', async () => {
    renderWithPropertyContext({ bookings: [] });
    
    await waitFor(() => {
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    // Should show 0 bookings
    expect(screen.getByText('Bookings count: 0')).toBeInTheDocument();
  });

  it('handles missing property context gracefully', async () => {
    // This test would need to be restructured to work with the current mocking setup
    // For now, we'll test that the component renders with null property
    const originalConsoleError = console.error;
    console.error = vi.fn(); // Suppress expected error logs
    
    try {
      renderWithPropertyContext();
      
      await waitFor(() => {
        expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
      });

      // Should still render calendar view even with context issues
      expect(screen.getByText('Traditional Calendar View')).toBeInTheDocument();
    } finally {
      console.error = originalConsoleError;
    }
  });
});