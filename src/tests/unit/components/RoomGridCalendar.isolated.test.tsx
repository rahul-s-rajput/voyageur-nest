import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// IMPORTANT: This test file runs in isolation without MSW
// to avoid conflicts with the global mock server

// Mock all external dependencies first
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

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
    while (current <= end && dates.length < 7) { // Limit to prevent infinite loops
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

// Mock the services to prevent API calls
vi.mock('../../../services/propertyService', () => ({
  propertyService: {
    getPropertyRoomsWithBookings: vi.fn(() => Promise.resolve([])),
    getAllProperties: vi.fn(() => Promise.resolve([])),
    getRooms: vi.fn(() => Promise.resolve([]))
  }
}));

// Mock the hook
vi.mock('../../../hooks/useGridCalendar', () => ({
  useGridCalendar: vi.fn()
}));

// Mock contexts
vi.mock('../../../contexts/PropertyContext', () => ({
  PropertyProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="property-provider">{children}</div>
  ),
  useProperty: () => ({
    currentProperty: {
      id: 'test-property-id',
      name: 'Test Property',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@test.com',
      totalRooms: 10,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  })
}));

// Mock error boundary
vi.mock('../../../components/GridCalendarErrorBoundary', () => ({
  GridCalendarErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  )
}));

// Import after all mocks
import { RoomGridCalendar } from '../../../components/RoomGridCalendar';
import { useGridCalendar } from '../../../hooks/useGridCalendar';
import { propertyService } from '../../../services/propertyService';
import { toast } from 'react-hot-toast';

const mockUseGridCalendar = vi.mocked(useGridCalendar);
const mockPropertyService = vi.mocked(propertyService);
const mockToast = vi.mocked(toast);

const defaultHookReturn = {
  gridData: [],
  loading: false,
  error: null,
  settings: {
    viewType: 'week' as const,
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-07')
    },
    showPricing: true,
    selectedRooms: []
  },
  updateSettings: vi.fn(),
  refreshData: vi.fn()
};

// Simple test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('RoomGridCalendar - Isolated Tests', () => {
  const defaultProps = {
    propertyId: 'test-property-id',
    onBookingClick: vi.fn(),
    onCellClick: vi.fn()
  };

  beforeEach(() => {
    // Clear all mocks and set defaults
    vi.clearAllMocks();
    mockUseGridCalendar.mockReturnValue(defaultHookReturn);
    mockPropertyService.getPropertyRoomsWithBookings.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      console.log('🧪 Starting basic render test...');
      
      const result = render(
        <RoomGridCalendar {...defaultProps} />, 
        { wrapper: TestWrapper }
      );
      
      console.log('✅ Component rendered');
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('test-wrapper')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        loading: true
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Loading room grid...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const errorMessage = 'Failed to load room data';
      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        loading: false,
        error: errorMessage
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText('Failed to load room grid')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show empty state', () => {
      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        gridData: []
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText('No rooms found for this property')).toBeInTheDocument();
      expect(screen.getByText('Check your property configuration')).toBeInTheDocument();
    });
  });

  describe('Navigation Controls', () => {
    beforeEach(() => {
      // Set up some grid data so navigation shows
      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        gridData: [{
          room: {
            id: 'room-1',
            propertyId: 'test-property-id',
            roomNumber: '101',
            roomType: 'deluxe',
            floor: 1,
            maxOccupancy: 2,
            basePrice: 1500,
            seasonalPricing: {},
            amenities: ['wifi', 'ac'],
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          availability: {
            '2024-01-01': {
              status: 'available',
              price: 1500
            }
          },
          bookings: [],
          pricing: {
            '2024-01-01': 1500
          }
        }]
      });
    });

    it('should render navigation controls', () => {
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(screen.getByText(/Previous week/i)).toBeInTheDocument();
      expect(screen.getByText(/Next week/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle view type changes', () => {
      const mockUpdateSettings = vi.fn();
      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        gridData: [{
          room: {
            id: 'room-1',
            propertyId: 'test-property-id',
            roomNumber: '101',
            roomType: 'deluxe',
            floor: 1,
            maxOccupancy: 2,
            basePrice: 1500,
            seasonalPricing: {},
            amenities: ['wifi', 'ac'],
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          availability: {
            '2024-01-01': {
              status: 'available',
              price: 1500
            }
          },
          bookings: [],
          pricing: {
            '2024-01-01': 1500
          }
        }],
        updateSettings: mockUpdateSettings
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'month' } });
      
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  describe('Hook Integration', () => {
    it('should call useGridCalendar hook', () => {
      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      expect(mockUseGridCalendar).toHaveBeenCalled();
    });

    it('should handle hook return values', () => {
      const customSettings = {
        viewType: 'month' as const,
        dateRange: {
          start: new Date('2024-02-01'),
          end: new Date('2024-02-29')
        },
        showPricing: false,
        selectedRooms: ['101']
      };

      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        settings: customSettings
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      // Component should respect the hook's settings
      expect(mockUseGridCalendar).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle retry button click', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      mockUseGridCalendar.mockReturnValue({
        ...defaultHookReturn,
        error: 'Test error'
      });

      render(<RoomGridCalendar {...defaultProps} />, { wrapper: TestWrapper });
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
