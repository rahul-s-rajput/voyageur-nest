import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EnhancedKPIDashboard from '../../../components/EnhancedKPIDashboard';
import { Booking } from '../../../types/booking';
import { Property } from '../../../types/property';
import { useProperty } from '../../../contexts/PropertyContext';

// The Bookings-tab KPI dashboard now shows only the four day-to-day operational
// cards: Today Check-ins, Today Check-outs, Current Occupancy, Pending Payments.
// Revenue / expenses / margin / averages moved to the Analytics tab.

const mockCurrentProperty: Property = {
  id: 'prop-1',
  name: 'Test Property',
  totalRooms: 10,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

vi.mock('../../../contexts/PropertyContext', () => ({
  useProperty: vi.fn(() => ({
    currentProperty: mockCurrentProperty
  }))
}));

const mockedUseProperty = vi.mocked(useProperty);

// Each KPI metric renders inside a card as a `label` div followed by sibling
// `value` (and optional `subValue`) divs in the same `.flex-1` wrapper. Scope
// value assertions to a metric by its label to avoid cross-card collisions.
const getMetricCard = (label: string): HTMLElement => {
  const labelEl = screen.getByText(label);
  const wrapper = labelEl.parentElement as HTMLElement;
  expect(wrapper).toBeTruthy();
  return wrapper;
};

const expectMetricValue = (label: string, value: string) => {
  const card = getMetricCard(label);
  expect(within(card).getByText(value)).toBeInTheDocument();
};

// Mock MobileQuickStats component
vi.mock('../../../components/MobileQuickStats', () => ({
  default: () => <div data-testid="mobile-quick-stats">Mobile Quick Stats</div>
}));

// The enforcement banner loads compliance counts in an effect.
vi.mock('../../../services/bookingComplianceService', () => ({
  bookingComplianceService: {
    getTodayCount: vi.fn().mockResolvedValue(0),
    getOverdueCount: vi.fn().mockResolvedValue(0),
  }
}));

describe('EnhancedKPIDashboard', () => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const createMockBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-1',
    folioNumber: 'F001',
    guestName: 'John Doe',
    checkIn: today,
    checkOut: tomorrow,
    roomNo: '101',
    numberOfRooms: 1,
    noOfPax: 2,
    adultChild: '2+0',
    totalAmount: 1000,
    paymentAmount: 1000,
    paymentStatus: 'paid',
    status: 'confirmed',
    cancelled: false,
    bookingDate: today,
    createdAt: today,
    updatedAt: today,
    propertyId: 'prop-1',
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseProperty.mockReturnValue({ currentProperty: mockCurrentProperty } as ReturnType<typeof useProperty>);
  });

  describe('Data Validation', () => {
    // Default mock bookings check in today, so "Today Check-ins" reflects the
    // count of valid (non-filtered) bookings here.
    it('should filter out bookings with invalid dates', () => {
      const bookings = [
        createMockBooking({ checkIn: 'invalid-date', checkOut: tomorrow }),
        createMockBooking({ checkIn: today, checkOut: 'invalid-date' }),
        createMockBooking({ checkIn: tomorrow, checkOut: today }), // checkIn after checkOut
        createMockBooking() // valid booking, checks in today
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      expectMetricValue('Today Check-ins', '1');
    });

    it('should filter out bookings with invalid amounts', () => {
      const bookings = [
        createMockBooking({ totalAmount: -100 }), // negative total
        createMockBooking({ paymentAmount: -50 }), // negative payment
        createMockBooking({ totalAmount: 100, paymentAmount: 200 }), // payment > total
        createMockBooking() // valid booking, checks in today
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      expectMetricValue('Today Check-ins', '1');
    });

    it('should filter out cancelled bookings', () => {
      const bookings = [
        createMockBooking({ cancelled: true }),
        createMockBooking({ cancelled: false }),
        createMockBooking() // default not cancelled
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      // Two non-cancelled bookings both check in today.
      expectMetricValue('Today Check-ins', '2');
    });
  });

  describe('Occupancy Rate Calculation', () => {
    it('should calculate occupancy rate using actual property room count', () => {
      const bookings = [
        createMockBooking({ status: 'checked-in', checkIn: yesterday, checkOut: tomorrow, roomNo: '101' }),
        createMockBooking({ status: 'checked-in', checkIn: yesterday, checkOut: tomorrow, roomNo: '102' })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      // 2 occupied rooms out of 10 total = 20% occupancy
      expectMetricValue('Current Occupancy', '20% rate');
    });

    it('should handle zero total rooms gracefully', () => {
      const mockPropertyWithZeroRooms = { ...mockCurrentProperty, totalRooms: 0 };
      mockedUseProperty.mockReturnValue({
        currentProperty: mockPropertyWithZeroRooms
      } as ReturnType<typeof useProperty>);

      const bookings = [
        createMockBooking({ status: 'checked-in', checkIn: yesterday, checkOut: tomorrow })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      expectMetricValue('Current Occupancy', '0% rate');
    });
  });

  describe('Pending Payments', () => {
    it('should calculate the outstanding balance across payment statuses', () => {
      const bookings = [
        createMockBooking({ totalAmount: 1000, paymentAmount: 500, paymentStatus: 'partial' }),
        createMockBooking({ totalAmount: 2000, paymentAmount: 0, paymentStatus: 'unpaid' })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      // Pending = total(3000) - paid(0) - partialPaid(500) = 2500
      expectMetricValue('Pending Payments', '₹2.5k');
    });

    it('should show a zero balance for an empty booking set', () => {
      render(<EnhancedKPIDashboard bookings={[]} />);

      expectMetricValue('Pending Payments', '₹0.0k');
    });
  });

  describe('Today Movements', () => {
    it('should correctly identify today check-ins and check-outs', () => {
      const bookings = [
        createMockBooking({ checkIn: today, checkOut: tomorrow }),
        createMockBooking({ checkIn: yesterday, checkOut: today }),
        createMockBooking({ checkIn: tomorrow, checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      expectMetricValue('Today Check-ins', '1');
      expectMetricValue('Today Check-outs', '1');
    });
  });

  describe('Property Context Integration', () => {
    it('should recalculate KPIs when property changes', () => {
      const { rerender } = render(<EnhancedKPIDashboard bookings={[]} />);

      const newProperty = { ...mockCurrentProperty, totalRooms: 20 };
      mockedUseProperty.mockReturnValue({
        currentProperty: newProperty
      } as ReturnType<typeof useProperty>);

      rerender(<EnhancedKPIDashboard bookings={[]} />);

      expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
    });

    it('should handle missing property gracefully', () => {
      mockedUseProperty.mockReturnValue({
        currentProperty: null
      } as ReturnType<typeof useProperty>);

      const bookings = [
        createMockBooking({ status: 'checked-in', checkIn: yesterday, checkOut: tomorrow })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);

      expectMetricValue('Current Occupancy', '0% rate');
    });
  });
});
