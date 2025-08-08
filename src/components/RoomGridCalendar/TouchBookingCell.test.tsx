import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TouchBookingCell } from './TouchBookingCell';
import { Room } from '../../types/property';
import { Booking } from '../../types/booking';

// Mock utils
vi.mock('../../utils/pricingUtils', () => ({
  calculateEffectivePrice: vi.fn(() => 5000),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, initial, variants, whileTap, ...validProps }: any) => {
      // Filter out framer-motion specific props that shouldn't go to DOM
      const { whileHover, whileInView, whileFocus, whileDrag, animate, exit, transition, ...domProps } = validProps;
      return (
        <div 
          className={className} 
          onClick={onClick}
          {...domProps}
        >
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the long press hook
vi.mock('../../hooks/useLongPress', () => ({
  useLongPress: vi.fn(() => ({
    onMouseDown: vi.fn(),
    onTouchStart: vi.fn(),
    onMouseUp: vi.fn(),
    onMouseLeave: vi.fn(),
    onTouchEnd: vi.fn(),
    onTouchCancel: vi.fn(),
    isLongPressing: false,
  })),
}));

// Mock the pricing components
vi.mock('../pricing/PricingDisplay', () => ({
  PricingDisplay: ({ room, date, compact, showDetails, onPriceClick }: { 
    room: Room; 
    date: Date; 
    compact?: boolean;
    showDetails?: boolean;
    onPriceClick?: () => void;
  }) => (
    <div 
      data-testid="pricing-display"
      onClick={onPriceClick}
      className={compact ? 'compact' : 'full'}
    >
      Price for {room.roomNumber} on {date.toDateString()}
    </div>
  ),
}));

// Mock the touch action menu
vi.mock('./TouchActionMenu', () => ({
  TouchActionMenu: ({ room, onClose }: { 
    room: Room; 
    onClose: () => void;
    date?: Date;
    booking?: Booking;
    showPricing?: boolean;
    onBookingClick?: (booking: Booking) => void;
    onCellClick?: (room: Room, date: Date) => void;
    onPricingUpdate?: (roomId: string, date: Date, newPrice: number) => void;
  }) => (
    <div data-testid="touch-action-menu">
      Action menu for {room.roomNumber}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

const mockRoom: Room = {
  id: '1',
  propertyId: 'prop1',
  roomNumber: '101',
  roomNo: '101',
  roomType: 'deluxe',
  maxOccupancy: 2,
  basePrice: 5000,
  amenities: ['WiFi', 'AC'],
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const mockBooking: Booking = {
  id: '1',
  roomNo: '101',
  guestName: 'John Doe',
  checkIn: '2024-01-15',
  checkOut: '2024-01-17',
  status: 'confirmed',
  totalAmount: 10000,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const mockDate = new Date('2024-01-15T12:00:00.000Z'); // Use ISO string with explicit time

describe('TouchBookingCell', () => {
  const defaultProps = {
    room: mockRoom,
    date: mockDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('renders available cell correctly', () => {
    render(<TouchBookingCell {...defaultProps} />);
    
    expect(screen.getByText('15')).toBeInTheDocument(); // Date
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders occupied cell with booking info', () => {
    render(<TouchBookingCell {...defaultProps} booking={mockBooking} />);
    
    expect(screen.getByText('15')).toBeInTheDocument(); // Date
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    // Note: The booking display format depends on the actual component implementation
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('shows weekend indicator for weekend dates', () => {
    const weekendDate = new Date('2024-01-14T12:00:00.000Z'); // Sunday - use ISO format
    render(<TouchBookingCell {...defaultProps} date={weekendDate} />);
    
    expect(screen.getByText('14')).toBeInTheDocument();
    // Weekend indicator should be present (orange dot)
    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('displays pricing when showPricing is true', () => {
    render(<TouchBookingCell {...defaultProps} showPricing={true} />);
    
    expect(screen.getByTestId('pricing-display')).toBeInTheDocument();
    expect(screen.getByText(`Price for ${mockRoom.roomNumber} on ${mockDate.toDateString()}`)).toBeInTheDocument();
  });

  it('calls onBookingClick when booking is clicked', () => {
    const mockOnBookingClick = vi.fn();
    render(
      <TouchBookingCell
        {...defaultProps}
        booking={mockBooking}
        onBookingClick={mockOnBookingClick}
      />
    );
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnBookingClick).toHaveBeenCalledWith(mockBooking);
  });

  it('calls onCellClick when available cell is clicked', () => {
    const mockOnCellClick = vi.fn();
    render(
      <TouchBookingCell
        {...defaultProps}
        onCellClick={mockOnCellClick}
      />
    );
    
    fireEvent.click(screen.getByText('Available'));
    expect(mockOnCellClick).toHaveBeenCalledWith(mockRoom, mockDate);
  });

  it('applies correct styling for occupied vs available cells', () => {
    const { rerender } = render(<TouchBookingCell {...defaultProps} />);
    
    // Available cell styling
    let cellElement = screen.getByTestId('touch-booking-cell');
    expect(cellElement).toHaveClass('bg-white');
    expect(cellElement).toHaveClass('border-gray-200');
    
    // Occupied cell styling
    rerender(<TouchBookingCell {...defaultProps} booking={mockBooking} />);
    cellElement = screen.getByTestId('touch-booking-cell');
    expect(cellElement).toHaveClass('bg-blue-50');
    expect(cellElement).toHaveClass('border-blue-200');
  });

  it('shows correct status styling', () => {
    const pendingBooking = { ...mockBooking, status: 'pending' as const };
    render(<TouchBookingCell {...defaultProps} booking={pendingBooking} />);
    
    const statusElement = screen.getByText('pending');
    expect(statusElement).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
});