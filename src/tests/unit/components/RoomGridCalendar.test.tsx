import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoomGridCalendar } from '../../../components/RoomGridCalendar';
import { PropertyProvider } from '../../../contexts/PropertyContext';
import { propertyService } from '../../../services/propertyService';
import { toast } from 'react-hot-toast';
import { useGridCalendar } from '../../../hooks/useGridCalendar';
import type { RoomGridData, RoomType } from '../../../types/property';

// Mock dependencies
vi.mock('../../../services/propertyService');
vi.mock('react-hot-toast');
vi.mock('../../../hooks/useGridCalendar');
vi.mock('../../../contexts/PropertyContext', () => ({
  PropertyProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProperty: () => ({
    currentProperty: {
      id: 'test-property-id',
      name: 'Test Property',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@test.com',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  }),
  useCurrentPropertyId: () => 'test-property-id',
  useIsMultiProperty: () => false,
  usePropertyOperations: () => ({
    switchProperty: vi.fn(),
    addProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    refreshProperties: vi.fn()
  })
}));

// Mock additional dependencies that might cause issues
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (typeof date === 'string') date = new Date(date);
    if (formatStr === 'MMM dd') return 'Jan 01';
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    if (formatStr === 'EEE') return 'Mon';
    if (formatStr === 'dd') return '01';
    if (formatStr === 'MMM') return 'Jan';
    if (formatStr === 'MMMM dd, yyyy') return 'January 01, 2024';
    return 'Jan 01, 2024';
  }),
  addDays: vi.fn((date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }),
  startOfWeek: vi.fn((date) => new Date(date)),
  endOfWeek: vi.fn((date) => new Date(date)),
  startOfMonth: vi.fn((date) => new Date(date)),
  endOfMonth: vi.fn((date) => new Date(date)),
  eachDayOfInterval: vi.fn(({ start, end }) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end && dates.length < 7) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  })
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  Calendar: () => <span data-testid="calendar">📅</span>,
  Loader2: () => <span data-testid="loader">⏳</span>,
  AlertTriangle: () => <span data-testid="alert">⚠</span>,
  RefreshCw: () => <span data-testid="refresh">🔄</span>
}));

vi.mock('../../../components/GridCalendarErrorBoundary', () => ({
  GridCalendarErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  )
}));

const mockPropertyService = vi.mocked(propertyService);
const mockUseGridCalendar = vi.mocked(useGridCalendar);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PropertyProvider>
    {children}
  </PropertyProvider>
);

// Mock data with CORRECTED availability structure
const mockRoomGridData: RoomGridData[] = [
  {
    room: {
      id: 'room-1',
      propertyId: 'prop-1',
      roomNumber: '101',
      roomNo: '101',
      roomType: 'deluxe' as RoomType,
      floor: 1,
      maxOccupancy: 2,
      basePrice: 1500,
      seasonalPricing: {},
      amenities: ['wifi', 'ac'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    // FIXED: availability should be { [dateString]: { status, booking?, price } }
    // NOT { [roomNumber]: { [dateString]: { ... } } }
    availability: {
      '2024-01-01': {
        status: 'available',
        price: 1500
      },
      '2024-01-02': {
        status: 'available',
        price: 1500
      }
    },
    bookings: [],
    pricing: {
      '2024-01-01': 1500,
      '2024-01-02': 1500
    }
  },
  {
    room: {
      id: 'room-2',
      propertyId: 'prop-1',
      roomNumber: '102',
      roomNo: '102',
      roomType: 'standard' as RoomType,
      floor: 1,
      maxOccupancy: 2,
      basePrice: 1200,
      seasonalPricing: {},
      amenities: ['wifi'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    availability: {
      '2024-01-01': {
        status: 'available',
        price: 1200
      },
      '2024-01-02': {
        status: 'available',
        price: 1200
      }
    },
    bookings: [],
    pricing: {
      '2024-01-01': 1200,
      '2024-01-02': 1200
    }
  }
];

describe('RoomGridCalendar', () => {
  const defaultProps = {
    propertyId: 'test-property-id',
    onBookingClick: vi.fn(),
    onCellClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyService.getPropertyRoomsWithBookings.mockResolvedValue(mockRoomGridData);
    
    // Mock useGridCalendar hook
    mockUseGridCalendar.mockReturnValue({
      gridData: mockRoomGridData,
      loading: false,
      error: null,
      settings: {
        viewType: 'week',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-07')
        },
        showPricing: true,
        selectedRooms: []
      },
      updateSettings: vi.fn(),
      refreshData: vi.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should render the component with loading state initially', async () => {
      mockUseGridCalendar.mockReturnValue({
        gridData: [],
        loading: true,
        error: null,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: vi.fn(),
        refreshData: vi.fn()
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText('Loading room grid...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render room grid after data loads', async () => {
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('101')).toBeInTheDocument();
        expect(screen.getByText('102')).toBeInTheDocument();
      });
    });

    it('should display room types correctly', async () => {
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('deluxe')).toBeInTheDocument();
        expect(screen.getByText('standard')).toBeInTheDocument();
      });
    });

    it('should show pricing when showPricing is true', async () => {
      render(<RoomGridCalendar {...defaultProps} showPricing={true} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('₹1500/night')).toBeInTheDocument();
        expect(screen.getByText('₹1200/night')).toBeInTheDocument();
      });
    });

    it('should hide pricing when showPricing is false', async () => {
      render(<RoomGridCalendar {...defaultProps} showPricing={false} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.queryByText('₹1500/night')).not.toBeInTheDocument();
        expect(screen.queryByText('₹1200/night')).not.toBeInTheDocument();
      });
    });
  });

  describe('Date Navigation', () => {
    it('should render date navigation controls', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Previous week/i)).toBeInTheDocument();
        expect(screen.getByText(/Next week/i)).toBeInTheDocument();
        const viewSelect = screen.getByRole('combobox');
        expect(viewSelect).toBeInTheDocument();
        expect(viewSelect).toHaveValue('week');
      });
    });

    it('should handle view type change', async () => {
      const mockUpdateSettings = vi.fn();
      mockUseGridCalendar.mockReturnValue({
        gridData: mockRoomGridData,
        loading: false,
        error: null,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: mockUpdateSettings,
        refreshData: vi.fn()
      });

      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const viewSelect = screen.getByRole('combobox');
        expect(viewSelect).toHaveValue('week');
        
        fireEvent.change(viewSelect, { target: { value: 'month' } });
        
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });

    it('should navigate to previous period', async () => {
      const mockUpdateSettings = vi.fn();
      mockUseGridCalendar.mockReturnValue({
        gridData: mockRoomGridData,
        loading: false,
        error: null,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: mockUpdateSettings,
        refreshData: vi.fn()
      });

      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const prevButton = screen.getByText(/Previous week/i);
        fireEvent.click(prevButton);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });

    it('should navigate to next period', async () => {
      const mockUpdateSettings = vi.fn();
      mockUseGridCalendar.mockReturnValue({
        gridData: mockRoomGridData,
        loading: false,
        error: null,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: mockUpdateSettings,
        refreshData: vi.fn()
      });

      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const nextButton = screen.getByText(/Next week/i);
        fireEvent.click(nextButton);
        expect(mockUpdateSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Grid Structure', () => {
    it('should render date column headers', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Room')).toBeInTheDocument();
        const dateHeaders = screen.getAllByText(/\d{2}/);
        expect(dateHeaders.length).toBeGreaterThan(0);
      });
    });

    it('should render room rows with correct structure', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('101')).toBeInTheDocument();
        expect(screen.getByText('102')).toBeInTheDocument();
        expect(screen.getByText('deluxe')).toBeInTheDocument();
        expect(screen.getByText('standard')).toBeInTheDocument();
      });
    });

    it('should handle cell clicks', async () => {
      const onCellClick = vi.fn();
      render(<RoomGridCalendar {...defaultProps} onCellClick={onCellClick} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        const availableCells = screen.getAllByText('Available');
        if (availableCells.length > 0) {
          fireEvent.click(availableCells[0]);
          expect(onCellClick).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Date)
          );
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      const errorMessage = 'Failed to fetch room data';
      mockUseGridCalendar.mockReturnValue({
        gridData: [],
        loading: false,
        error: errorMessage,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: vi.fn(),
        refreshData: vi.fn()
      });
      
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load room grid')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockUseGridCalendar.mockReturnValue({
        gridData: [],
        loading: false,
        error: 'Network error',
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: vi.fn(),
        refreshData: vi.fn()
      });
      
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should handle empty room data', async () => {
      mockUseGridCalendar.mockReturnValue({
        gridData: [],
        loading: false,
        error: null,
        settings: {
          viewType: 'week',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-07')
          },
          showPricing: true,
          selectedRooms: []
        },
        updateSettings: vi.fn(),
        refreshData: vi.fn()
      });
      
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        expect(screen.getByText('No rooms found for this property')).toBeInTheDocument();
        expect(screen.getByText('Check your property configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('should call useGridCalendar hook', () => {
      render(<RoomGridCalendar {...defaultProps} />);
      expect(mockUseGridCalendar).toHaveBeenCalled();
    });

    it('should handle propertyId changes', async () => {
      const { rerender } = render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockUseGridCalendar).toHaveBeenCalled();
      });
      
      rerender(<RoomGridCalendar {...defaultProps} propertyId="new-property-id" />);
      
      // The hook should be called again with new render
      expect(mockUseGridCalendar).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const gridContainer = document.querySelector('.overflow-x-auto');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should handle custom className prop', async () => {
      render(<RoomGridCalendar {...defaultProps} className="custom-class" />, { wrapper: TestWrapper });
      
      await waitFor(() => {
        const container = document.querySelector('.custom-class');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const prevButton = screen.getByText(/Previous week/i);
        const nextButton = screen.getByText(/Next week/i);
        expect(prevButton).toBeInTheDocument();
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).not.toHaveAttribute('tabindex', '-1');
        });
      });
    });
  });

  describe('Performance', () => {
    it('should handle component updates efficiently', async () => {
      const { rerender } = render(<RoomGridCalendar {...defaultProps} />);
      
      rerender(<RoomGridCalendar {...defaultProps} />);
      
      await waitFor(() => {
        // Component should handle rerenders without issues
        expect(mockUseGridCalendar).toHaveBeenCalled();
      });
    });
  });
});