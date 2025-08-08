import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import BookingManagement from '../../components/BookingManagement';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { Property } from '../../types/property';
import { Booking } from '../../types/booking';

// Mock Supabase client with flexible return types
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn()
    }))
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Mock components that aren't relevant for integration testing
vi.mock('../../components/MobileQuickStats', () => ({
  default: () => <div data-testid="mobile-quick-stats">Mobile Quick Stats</div>
}));

vi.mock('../../components/InvoiceForm', () => ({
  default: () => <div data-testid="invoice-form">Invoice Form</div>
}));

vi.mock('../../components/InvoicePreview', () => ({
  default: () => <div data-testid="invoice-preview">Invoice Preview</div>
}));

describe('KPI Dashboard Integration Tests', () => {
  const mockProperty: Property = {
    id: 'prop-1',
    name: 'Test Hotel Manali',
    totalRooms: 15,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockBookings: Booking[] = [
    {
      id: 'booking-1',
      folioNumber: 'F001',
      guestName: 'John Doe',
      checkIn: '2024-01-15',
      checkOut: '2024-01-17',
      roomNo: '101',
      numberOfRooms: 1,
      noOfPax: 2,
      adultChild: '2+0',
      totalAmount: 5000,
      paymentAmount: 5000,
      paymentStatus: 'paid',
      status: 'checked-in',
      cancelled: false,
      bookingDate: '2024-01-10',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      propertyId: 'prop-1'
    },
    {
      id: 'booking-2',
      folioNumber: 'F002',
      guestName: 'Jane Smith',
      checkIn: '2024-01-16',
      checkOut: '2024-01-18',
      roomNo: '102',
      numberOfRooms: 1,
      noOfPax: 1,
      adultChild: '1+0',
      totalAmount: 3000,
      paymentAmount: 1500,
      paymentStatus: 'partial',
      status: 'confirmed',
      cancelled: false,
      bookingDate: '2024-01-12',
      createdAt: '2024-01-12T00:00:00Z',
      updatedAt: '2024-01-12T00:00:00Z',
      propertyId: 'prop-1'
    },
    {
      id: 'booking-3',
      folioNumber: 'F003',
      guestName: 'Bob Wilson',
      checkIn: '2024-01-20',
      checkOut: '2024-01-22',
      roomNo: '103',
      numberOfRooms: 1,
      noOfPax: 2,
      adultChild: '2+0',
      totalAmount: 4000,
      paymentAmount: 0,
      paymentStatus: 'unpaid',
      status: 'confirmed',
      cancelled: false,
      bookingDate: '2024-01-14',
      createdAt: '2024-01-14T00:00:00Z',
      updatedAt: '2024-01-14T00:00:00Z',
      propertyId: 'prop-1'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful data loading
    const mockBookings: Booking[] = [
      {
        id: 'booking-1',
        folioNumber: 'F001',
        guestName: 'John Doe',
        checkIn: '2024-01-15',
        checkOut: '2024-01-17',
        roomNo: '101',
        numberOfRooms: 1,
        noOfPax: 2,
        adultChild: '2+0',
        totalAmount: 1000,
        paymentAmount: 1000,
        paymentStatus: 'paid',
        status: 'confirmed',
        cancelled: false,
        bookingDate: '2024-01-10',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        propertyId: 'prop-1'
      }
    ];

    (mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBookings, error: null })
        })
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithPropertyContext = (component: React.ReactElement) => {
    return render(
      <PropertyProvider>
        {component}
      </PropertyProvider>
    );
  };

  describe('Data Loading and KPI Calculation Integration', () => {
    it('should load bookings from Supabase and calculate KPIs correctly', async () => {
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Verify Supabase query was called with correct parameters
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings');
      });

      await waitFor(() => {
        // Check if KPI calculations are displayed
        // Total Revenue: 5000 + 3000 + 4000 = 12000 (₹12.0k)
        expect(screen.getByText('₹12.0k')).toBeInTheDocument();
        
        // Active Bookings: 3 non-cancelled bookings
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should calculate occupancy rate using actual property room count', async () => {
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // 1 checked-in booking out of 15 total rooms = 6.7% occupancy
        // (rounded to nearest percentage)
        expect(screen.getByText(/6\.7%|7%/)).toBeInTheDocument();
      });
    });

    it('should handle revenue calculations with mixed payment statuses', async () => {
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Paid Revenue: 5000 (fully paid) + 1500 (partial) = 6500
        // Pending Revenue: 1500 (remaining partial) + 4000 (unpaid) = 5500
        expect(screen.getByText('₹5.5k')).toBeInTheDocument(); // Pending
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should set up Supabase real-time subscriptions', async () => {
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Verify real-time channel setup
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith('bookings-changes');
      });
    });

    it('should handle booking updates in real-time', async () => {
      const mockChannel = {
        on: vi.fn(() => ({
          subscribe: vi.fn()
        }))
      };
      
      mockSupabaseClient.channel.mockReturnValue(mockChannel);

      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Verify subscription to INSERT, UPDATE, DELETE events
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'bookings'
          }),
          expect.any(Function)
        );
      });
    });
  });

  describe('Property Context Integration', () => {
    it('should filter bookings by current property', async () => {
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Verify query includes property filter
        const selectCall = mockSupabaseClient.from().select();
        expect(selectCall.eq).toHaveBeenCalledWith('propertyId', 'prop-1');
      });
    });

    it('should recalculate KPIs when property changes', async () => {
      const newProperty: Property = {
        ...mockProperty,
        id: 'prop-2',
        totalRooms: 25
      };

      const { rerender } = renderWithPropertyContext(<BookingManagement />);

      // Change property context
      rerender(
        <PropertyProvider>
          <BookingManagement />
        </PropertyProvider>
      );

      await waitFor(() => {
        // Should query for new property's bookings
        expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('propertyId', 'prop-2');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Supabase query errors gracefully', async () => {
      // Mock error response
      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      });

      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        // Should still render component without crashing
        expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
      });
    });

    it('should handle missing property context', async () => {
      render(<BookingManagement />);

      await waitFor(() => {
        // Should render without property context
        expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should memoize KPI calculations to prevent unnecessary recalculations', async () => {
      const { rerender } = renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        expect(screen.getByText('₹12.0k')).toBeInTheDocument();
      });

      // Re-render with same data
      rerender(
        <PropertyProvider>
        <BookingManagement />
      </PropertyProvider>
      );

      // KPIs should still be displayed (memoization working)
      expect(screen.getByText('₹12.0k')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeBookingSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-${i}`,
        folioNumber: `F${String(i).padStart(3, '0')}`,
        roomNo: `${100 + (i % 50)}`
      }));

      (mockSupabaseClient.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: largeBookingSet, 
              error: null 
            }))
          }))
        }))
      });

      const startTime = performance.now();
      renderWithPropertyContext(<BookingManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    });
  });
});