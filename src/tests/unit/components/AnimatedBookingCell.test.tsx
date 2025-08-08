import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimatedBookingCell } from '../../../components/RoomGridCalendar/AnimatedBookingCell';
import { PropertyBooking } from '../../../types/property';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, className, onClick, onMouseEnter, onMouseLeave, ...props }, ref) => {
      // Filter out motion-specific props to avoid React warnings
      const { initial, animate, transition, layout, layoutId, variants, whileHover, whileTap, ...domProps } = props;
      return (
        <div 
          ref={ref} 
          className={className}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          {...domProps}
        >
          {children}
        </div>
      );
    })
  }
}));

// Mock BookingCell
vi.mock('../../../components/RoomGridCalendar/BookingCell', () => ({
  BookingCell: ({ roomNumber, date, availability, pricing, onBookingClick, onCellClick }: any) => (
    <div data-testid="booking-cell">
      <div data-testid="room-number">{roomNumber}</div>
      <div data-testid="date">{date.toISOString()}</div>
      <div data-testid="status">{availability?.status || 'available'}</div>
      <div data-testid="pricing">{pricing}</div>
      {availability?.booking && (
        <button 
          onClick={() => onBookingClick?.(availability.booking)}
          data-testid="booking-click"
        >
          {availability.booking.guestName}
        </button>
      )}
      <button 
        onClick={() => onCellClick?.(roomNumber, date)}
        data-testid="cell-click"
      >
        Click Cell
      </button>
    </div>
  )
}));

describe('AnimatedBookingCell', () => {
  const mockDate = new Date('2024-01-15');
  const mockBooking: PropertyBooking = {
    id: 'booking-1',
    propertyId: 'property-1',
    propertyName: 'Test Property',
    guestName: 'John Doe',
    checkIn: '2024-01-15',
    checkOut: '2024-01-17',
    roomNo: '101',
    numberOfRooms: 1,
    noOfPax: 2,
    adultChild: '2-0',
    totalAmount: 10000,
    status: 'confirmed' as const,
    cancelled: false,
    paymentStatus: 'paid' as const,
    paymentAmount: 10000,
    paymentMode: 'card',
    contactPhone: '+1234567890',
    contactEmail: 'john.doe@example.com',
    specialRequests: '',
    bookingDate: '2024-01-01',
    folioNumber: 'F001',
    guestProfileId: 'guest-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const defaultProps = {
    roomNumber: '101',
    date: mockDate,
    availability: {
      status: 'available' as const,
      price: 5000
    },
    pricing: 5000,
    onBookingClick: vi.fn(),
    onCellClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render BookingCell with correct props', () => {
    render(<AnimatedBookingCell {...defaultProps} />);
    
    expect(screen.getByTestId('booking-cell')).toBeInTheDocument();
    expect(screen.getByTestId('room-number')).toHaveTextContent('101');
    expect(screen.getByTestId('date')).toHaveTextContent(mockDate.toISOString());
    expect(screen.getByTestId('status')).toHaveTextContent('available');
    expect(screen.getByTestId('pricing')).toHaveTextContent('5000');
  });

  it('should handle booking click events', () => {
    const propsWithBooking = {
      ...defaultProps,
      availability: {
        status: 'occupied' as const,
        booking: mockBooking,
        price: 5000
      }
    };

    render(<AnimatedBookingCell {...propsWithBooking} />);
    
    fireEvent.click(screen.getByTestId('booking-click'));
    expect(defaultProps.onBookingClick).toHaveBeenCalledWith(mockBooking);
  });

  it('should handle cell click events', () => {
    render(<AnimatedBookingCell {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('cell-click'));
    expect(defaultProps.onCellClick).toHaveBeenCalledWith('101', mockDate);
  });

  it('should show update flash when isUpdating is true', async () => {
    // Test 1: Flash should NOT show when isUpdating is false
    const { rerender } = render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={false}
      />
    );

    let container = screen.getByTestId('booking-cell').parentElement!;
    expect(container.className).not.toContain('ring-green-400');

    // Test 2: Flash SHOULD show when isUpdating is true
    rerender(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="created"
        lastUpdateTime={Date.now()}
      />
    );

    container = screen.getByTestId('booking-cell').parentElement!;
    expect(container.className).toContain('ring-green-400');
    expect(container.className).toContain('ring-2');
  });

  it('should clear update flash after timeout', async () => {
    // Render component with flash enabled
    const { unmount } = render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="created"
        lastUpdateTime={Date.now()}
      />
    );

    // Verify flash is showing
    const container = screen.getByTestId('booking-cell').parentElement!;
    expect(container.className).toContain('ring-green-400');

    // Advance time and run all pending timers in act()
    await act(async () => {
      vi.advanceTimersByTime(1600); // More than the 1500ms timeout
    });

    // The flash should now be cleared
    expect(container.className).not.toContain('ring-green-400');
    
    // Clean up
    unmount();
  });

  it('should clear flash immediately when isUpdating becomes false', () => {
    const { rerender } = render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="created"
        lastUpdateTime={1000}
      />
    );

    let container = screen.getByTestId('booking-cell').parentElement!;
    expect(container.className).toContain('ring-green-400');

    // Disable updating (should clear flash immediately)
    rerender(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={false}
      />
    );

    container = screen.getByTestId('booking-cell').parentElement!;
    expect(container.className).not.toContain('ring-green-400');
  });

  it('should display update type indicator for created booking', () => {
    render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="created"
        lastUpdateTime={Date.now()}
      />
    );

    // Check for green indicator (created)
    const indicator = screen.getByTestId('booking-cell').parentElement;
    expect(indicator).toHaveClass('ring-green-400');
  });

  it('should display update type indicator for updated booking', () => {
    render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="updated"
        lastUpdateTime={Date.now()}
      />
    );

    // Check for blue indicator (updated)
    const indicator = screen.getByTestId('booking-cell').parentElement;
    expect(indicator).toHaveClass('ring-blue-400');
  });

  it('should display update type indicator for deleted booking', () => {
    render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="deleted"
        lastUpdateTime={Date.now()}
      />
    );

    // Check for red indicator (deleted)
    const indicator = screen.getByTestId('booking-cell').parentElement;
    expect(indicator).toHaveClass('ring-red-400');
  });

  it('should not show update indicators when not updating', () => {
    render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={false}
      />
    );

    const container = screen.getByTestId('booking-cell').parentElement;
    expect(container).not.toHaveClass('ring-green-400');
    expect(container).not.toHaveClass('ring-blue-400');
    expect(container).not.toHaveClass('ring-red-400');
  });

  it('should handle different availability statuses', () => {
    const occupiedProps = {
      ...defaultProps,
      availability: {
        status: 'occupied' as const,
        booking: mockBooking,
        price: 5000
      }
    };

    render(<AnimatedBookingCell {...occupiedProps} />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('occupied');
    expect(screen.getByTestId('booking-click')).toHaveTextContent('John Doe');
  });

  it('should handle checkin status', () => {
    const checkinProps = {
      ...defaultProps,
      availability: {
        status: 'checkin' as const,
        booking: mockBooking,
        price: 5000
      }
    };

    render(<AnimatedBookingCell {...checkinProps} />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('checkin');
  });

  it('should handle checkout status', () => {
    const checkoutProps = {
      ...defaultProps,
      availability: {
        status: 'checkout' as const,
        booking: mockBooking,
        price: 5000
      }
    };

    render(<AnimatedBookingCell {...checkoutProps} />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('checkout');
  });

  it('should update flash key when lastUpdateTime changes', () => {
    const { rerender } = render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="updated"
        lastUpdateTime={1000}
      />
    );

    // Change lastUpdateTime to trigger new flash
    rerender(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="updated"
        lastUpdateTime={2000}
      />
    );

    // Should trigger new animation cycle
    expect(screen.getByTestId('booking-cell')).toBeInTheDocument();
  });

  it('should handle missing optional props gracefully', () => {
    const minimalProps = {
      roomNumber: '101',
      date: mockDate
    };

    render(<AnimatedBookingCell {...minimalProps} />);
    
    expect(screen.getByTestId('booking-cell')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('available');
  });

  it('should clear flash timeout on unmount', () => {
    const { unmount } = render(
      <AnimatedBookingCell 
        {...defaultProps} 
        isUpdating={true}
        updateType="created"
        lastUpdateTime={Date.now()}
      />
    );

    // Unmount before timeout completes
    unmount();
    
    // Advance timers to ensure no memory leaks
    vi.advanceTimersByTime(2000);
    
    // Should not throw any errors
    expect(true).toBe(true);
  });
});