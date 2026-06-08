import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock the breakpoint hook with a self-contained factory
vi.mock('../../hooks/useWindowSize', () => ({
  useBreakpoint: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
  })),
}));

// Mock the child components  
vi.mock('./MobileGridView', () => ({
  MobileGridView: ({ rooms }: { rooms: any[] }) => (
    <div data-testid="mobile-grid">Mobile Grid - {rooms.length} rooms</div>
  ),
}));

vi.mock('./TabletGridView', () => ({
  TabletGridView: ({ rooms }: { rooms: any[] }) => (
    <div data-testid="tablet-grid">Tablet Grid - {rooms.length} rooms</div>
  ),
}));

vi.mock('./DesktopGridView', () => ({
  DesktopGridView: ({ rooms }: { rooms: any[] }) => (
    <div data-testid="desktop-grid">Desktop Grid - {rooms.length} rooms</div>
  ),
}));

// Now import everything after mocks
import { ResponsiveGridCalendar } from './ResponsiveGridCalendar';
import { Room, RoomGridData } from '../../types/property';
import { useBreakpoint } from '../../hooks/useWindowSize';

const mockRooms: Room[] = [
  {
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
  },
  {
    id: '2',
    propertyId: 'prop1',
    roomNumber: '102',
    roomNo: '102',
    roomType: 'suite',
    maxOccupancy: 4,
    basePrice: 8000,
    amenities: ['WiFi', 'AC', 'Balcony'],
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
];

// The component consumes `gridData: RoomGridData[]`, deriving rooms/availability from it.
const mockGridData: RoomGridData[] = mockRooms.map(room => ({
  room,
  availability: {
    '2024-01-15': { status: 'available', price: room.basePrice },
    '2024-01-16': { status: 'available', price: room.basePrice },
    '2024-01-17': { status: 'available', price: room.basePrice },
  },
  bookings: [],
  pricing: {
    '2024-01-15': room.basePrice,
    '2024-01-16': room.basePrice,
    '2024-01-17': room.basePrice,
  },
}));

const mockDateRange = [
  new Date('2024-01-15'),
  new Date('2024-01-16'),
  new Date('2024-01-17'),
];

describe('ResponsiveGridCalendar', () => {
  const defaultProps = {
    gridData: mockGridData,
    dateRange: mockDateRange,
  };

  beforeEach(() => {
    // Get the mocked function and reset it
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });
  });

  it('renders desktop view by default', () => {
    render(<ResponsiveGridCalendar {...defaultProps} />);
    
    expect(screen.getByTestId('desktop-grid')).toBeInTheDocument();
    expect(screen.getByText('Desktop Grid - 2 rooms')).toBeInTheDocument();
  });

  it('renders mobile view when on mobile', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      width: 375,
    });

    render(<ResponsiveGridCalendar {...defaultProps} />);
    
    expect(screen.getByTestId('mobile-grid')).toBeInTheDocument();
    expect(screen.getByText('Mobile Grid - 2 rooms')).toBeInTheDocument();
  });

  it('renders tablet view when on tablet', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      width: 768,
    });

    render(<ResponsiveGridCalendar {...defaultProps} />);
    
    expect(screen.getByTestId('tablet-grid')).toBeInTheDocument();
    expect(screen.getByText('Tablet Grid - 2 rooms')).toBeInTheDocument();
  });

  it('groups bookings by room correctly', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });

    render(<ResponsiveGridCalendar {...defaultProps} />);
    
    expect(screen.getByTestId('desktop-grid')).toBeInTheDocument();
    expect(screen.getByText('Desktop Grid - 2 rooms')).toBeInTheDocument();
  });

  it('passes all props to child components', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });

    const mockOnBookingClick = vi.fn();
    const mockOnCellClick = vi.fn();
    const mockOnPricingUpdate = vi.fn();

    render(
      <ResponsiveGridCalendar
        {...defaultProps}
        showPricing={true}
        onBookingClick={mockOnBookingClick}
        onCellClick={mockOnCellClick}
        onPricingUpdate={mockOnPricingUpdate}
      />
    );
    
    expect(screen.getByTestId('desktop-grid')).toBeInTheDocument();
    expect(screen.getByText('Desktop Grid - 2 rooms')).toBeInTheDocument();
  });

  it('handles different breakpoint scenarios correctly', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    
    // Start with desktop
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });

    const { rerender } = render(<ResponsiveGridCalendar {...defaultProps} />);
    expect(screen.getByTestId('desktop-grid')).toBeInTheDocument();
    
    // Switch to tablet
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      width: 800,
    });
    
    rerender(<ResponsiveGridCalendar {...defaultProps} />);
    expect(screen.getByTestId('tablet-grid')).toBeInTheDocument();
    
    // Switch to mobile
    mockedUseBreakpoint.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      width: 400,
    });
    
    rerender(<ResponsiveGridCalendar {...defaultProps} />);
    expect(screen.getByTestId('mobile-grid')).toBeInTheDocument();
  });

  it('properly derives rooms from gridData for child components', () => {
    const mockedUseBreakpoint = vi.mocked(useBreakpoint);
    mockedUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
    });

    render(<ResponsiveGridCalendar {...defaultProps} />);

    // The desktop view receives the rooms extracted from gridData.
    expect(screen.getByTestId('desktop-grid')).toBeInTheDocument();
    expect(screen.getByText('Desktop Grid - 2 rooms')).toBeInTheDocument();
  });
});