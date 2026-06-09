import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BookingManagement from '../../components/BookingManagement';
import { NotificationProvider } from '../../components/NotificationContainer';
import { useProperty } from '../../contexts/PropertyContext';
import { bookingService } from '../../lib/supabase';
import { Property } from '../../types/property';
import { Booking } from '../../types/booking';

/**
 * Integration test for the KPI dashboard data flow.
 *
 * Real architecture (verified against current source):
 *   BookingManagement loads bookings via bookingService.getBookings({ propertyId })
 *   -> passes them to HomePage
 *   -> HomePage renders <EnhancedKPIDashboard bookings={bookings} />
 *   -> EnhancedKPIDashboard computes & renders the KPI cards.
 *
 * The current property comes from PropertyContext (useProperty), NOT from a
 * createClient() Supabase mock. There is no `bookings-changes` realtime channel
 * in BookingManagement (realtime lives in RealtimeManager, covered separately).
 * The previous version of this test mocked `@supabase/supabase-js`'s createClient
 * and asserted against an API this component never uses, so it could never pass.
 * This rewrite mocks the real data-loading boundary (bookingService) and the
 * PropertyContext, then asserts on the rendered KPI values.
 */

// ---- Mock the data-loading boundary used by BookingManagement & children ----
// Everything referenced inside the (hoisted) vi.mock factory must be created via
// vi.hoisted to avoid temporal-dead-zone errors.
const { getBookingsMock, supabaseStub } = vi.hoisted(() => {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  const subscription = { unsubscribe: vi.fn() };
  const channelStub: any = {
    on: vi.fn(() => channelStub),
    subscribe: vi.fn(() => subscription),
    unsubscribe: vi.fn(),
  };
  const supabaseStub = {
    from: vi.fn(() => chain),
    channel: vi.fn(() => channelStub),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };
  return { getBookingsMock: vi.fn(), supabaseStub };
});

vi.mock('../../lib/supabase', () => ({
  supabase: supabaseStub,
  default: supabaseStub,
  bookingService: {
    getBookings: getBookingsMock,
    getBookingById: vi.fn().mockResolvedValue(null),
    updateBooking: vi.fn().mockResolvedValue(null),
    deleteBooking: vi.fn().mockResolvedValue(true),
    cancelBooking: vi.fn().mockResolvedValue(true),
  },
  invoiceCounterService: {
    getCounter: vi.fn().mockResolvedValue(391),
  },
  checkInService: {},
  expenseService: {},
  updateBookingWithValidation: vi.fn().mockResolvedValue({ success: true }),
  createBookingWithValidation: vi.fn().mockResolvedValue({ success: true }),
  getSchedulingConflicts: vi.fn().mockResolvedValue([]),
}));

// ---- Mock PropertyContext so a property is available synchronously ----
const mockProperty: Property = {
  id: 'prop-1',
  name: 'Test Hotel Manali',
  totalRooms: 15,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

vi.mock('../../contexts/PropertyContext', () => ({
  useProperty: vi.fn(() => ({ currentProperty: mockProperty })),
  useCurrentPropertyId: vi.fn(() => 'prop-1'),
}));

// ---- Mock enforcement/expense services the KPI dashboard loads in effects ----
vi.mock('../../services/bookingComplianceService', () => ({
  bookingComplianceService: {
    getTodayCount: vi.fn().mockResolvedValue(0),
    getOverdueCount: vi.fn().mockResolvedValue(0),
    listToday: vi.fn().mockResolvedValue([]),
    listOverdue: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/expenseService', () => ({
  default: {
    listExpensesForPropertyView: vi.fn().mockResolvedValue([]),
  },
}));

// ---- Mock heavy view/leaf components not under test ----
vi.mock('../../components/MobileQuickStats', () => ({
  default: () => <div data-testid="mobile-quick-stats">Mobile Quick Stats</div>,
}));

vi.mock('../../components/CalendarViewManager', () => ({
  CalendarViewManager: () => <div data-testid="calendar-view">Calendar</div>,
}));

vi.mock('../../components/BookingList', () => ({
  BookingList: () => <div data-testid="booking-list">Booking List</div>,
}));

vi.mock('../../components/BookingDetails', () => ({
  BookingDetails: () => null,
}));

vi.mock('../../components/InvoiceForm', () => ({
  InvoiceForm: () => <div data-testid="invoice-form">Invoice Form</div>,
}));

vi.mock('../../components/InvoicePreview', () => ({
  InvoicePreview: () => <div data-testid="invoice-preview">Invoice Preview</div>,
}));

const mockedUseProperty = vi.mocked(useProperty);

describe('KPI Dashboard Integration Tests', () => {
  // Three active bookings: revenue 5000 + 3000 + 4000 = 12000 -> ₹12.0k.
  // booking-1 is checked-in (occupies 1 of 15 rooms -> 6.7% occupancy).
  // Pending: 0 (paid) + 1500 (partial remaining) + 4000 (unpaid) = 5500 -> ₹5.5k.
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const mockBookings: Booking[] = [
    {
      id: 'booking-1',
      folioNumber: 'F001',
      guestName: 'John Doe',
      checkIn: yesterday,
      checkOut: tomorrow,
      roomNo: '101',
      numberOfRooms: 1,
      noOfPax: 2,
      adultChild: '2+0',
      totalAmount: 5000,
      paymentAmount: 5000,
      paymentStatus: 'paid',
      status: 'checked-in',
      cancelled: false,
      bookingDate: yesterday,
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      propertyId: 'prop-1',
    },
    {
      id: 'booking-2',
      folioNumber: 'F002',
      guestName: 'Jane Smith',
      checkIn: today,
      checkOut: tomorrow,
      roomNo: '102',
      numberOfRooms: 1,
      noOfPax: 1,
      adultChild: '1+0',
      totalAmount: 3000,
      paymentAmount: 1500,
      paymentStatus: 'partial',
      status: 'confirmed',
      cancelled: false,
      bookingDate: today,
      createdAt: '2024-01-12T00:00:00Z',
      updatedAt: '2024-01-12T00:00:00Z',
      propertyId: 'prop-1',
    },
    {
      id: 'booking-3',
      folioNumber: 'F003',
      guestName: 'Bob Wilson',
      checkIn: today,
      checkOut: tomorrow,
      roomNo: '103',
      numberOfRooms: 1,
      noOfPax: 2,
      adultChild: '2+0',
      totalAmount: 4000,
      paymentAmount: 0,
      paymentStatus: 'unpaid',
      status: 'confirmed',
      cancelled: false,
      bookingDate: today,
      createdAt: '2024-01-14T00:00:00Z',
      updatedAt: '2024-01-14T00:00:00Z',
      propertyId: 'prop-1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseProperty.mockReturnValue({ currentProperty: mockProperty } as ReturnType<typeof useProperty>);
    getBookingsMock.mockResolvedValue(mockBookings);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = (component: React.ReactElement) =>
    render(<NotificationProvider>{component}</NotificationProvider>);

  // Each KPI metric renders a `label` div followed by a sibling `value` div.
  // Scope value assertions to a metric by label to avoid cross-card collisions.
  const expectMetricValue = (label: string, value: string) => {
    const wrapper = screen.getByText(label).parentElement as HTMLElement;
    expect(within(wrapper).getByText(value)).toBeInTheDocument();
  };

  describe('Data Loading and KPI Calculation Integration', () => {
    it('should load bookings from the booking service and calculate KPIs correctly', async () => {
      renderApp(<BookingManagement />);

      await waitFor(() => {
        // Verify bookings were loaded for the current property.
        expect(getBookingsMock).toHaveBeenCalledWith({ propertyId: 'prop-1' });
      });

      await waitFor(() => {
        // booking-2 and booking-3 both check in today.
        expectMetricValue('Today Check-ins', '2');
      });

      // Pending = total - paid - partialPaid = 12000 - 5000 - 1500 = 5500 -> ₹5.5k
      expectMetricValue('Pending Payments', '₹5.5k');
    });

    it('should calculate occupancy rate using actual property room count', async () => {
      renderApp(<BookingManagement />);

      await waitFor(() => {
        // 1 checked-in booking out of 15 total rooms -> 7% (rounded from 6.7%).
        expectMetricValue('Current Occupancy', '7% rate');
      });
    });

    it('should handle revenue calculations with mixed payment statuses', async () => {
      renderApp(<BookingManagement />);

      await waitFor(() => {
        // Pending = total - paid - partialPaid = 12000 - 5000 - 1500 = 5500 -> ₹5.5k
        expectMetricValue('Pending Payments', '₹5.5k');
      });
    });
  });

  describe('Property Context Integration', () => {
    it('should request bookings filtered by the current property', async () => {
      renderApp(<BookingManagement />);

      await waitFor(() => {
        expect(getBookingsMock).toHaveBeenCalledWith({ propertyId: 'prop-1' });
      });
    });

    it('should recalculate KPIs when the property changes', async () => {
      const { rerender } = renderApp(<BookingManagement />);

      await waitFor(() => {
        expect(getBookingsMock).toHaveBeenCalledWith({ propertyId: 'prop-1' });
      });

      // Switch to a different property; BookingManagement reloads on property id change.
      const newProperty: Property = { ...mockProperty, id: 'prop-2', totalRooms: 25 };
      mockedUseProperty.mockReturnValue({ currentProperty: newProperty } as ReturnType<typeof useProperty>);

      rerender(<NotificationProvider><BookingManagement /></NotificationProvider>);

      await waitFor(() => {
        expect(getBookingsMock).toHaveBeenCalledWith({ propertyId: 'prop-2' });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle booking load errors gracefully', async () => {
      getBookingsMock.mockRejectedValueOnce(new Error('Database connection failed'));

      renderApp(<BookingManagement />);

      await waitFor(() => {
        // Component should still render its mobile quick stats without crashing.
        expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
      });
    });

    it('should render with an empty booking set', async () => {
      getBookingsMock.mockResolvedValueOnce([]);

      renderApp(<BookingManagement />);

      await waitFor(() => {
        // With no bookings, there are no check-ins today.
        expectMetricValue('Today Check-ins', '0');
      });
    });
  });

  describe('Performance Integration', () => {
    it('should render large datasets within a reasonable time', async () => {
      const largeBookingSet: Booking[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBookings[0],
        id: `booking-${i}`,
        folioNumber: `F${String(i).padStart(3, '0')}`,
        roomNo: `${100 + (i % 50)}`,
      }));
      getBookingsMock.mockResolvedValueOnce(largeBookingSet);

      const startTime = performance.now();
      renderApp(<BookingManagement />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(5000);
    });
  });
});
