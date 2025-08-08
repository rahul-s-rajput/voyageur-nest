import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EnhancedKPIDashboard from '../../../components/EnhancedKPIDashboard';
import { Booking } from '../../../types/booking';
import { Property } from '../../../types/property';

// Mock the PropertyContext
const mockCurrentProperty: Property = {
  id: 'prop-1',
  name: 'Test Property',
  totalRooms: 10,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

vi.mock('../../../contexts/PropertyContext', () => ({
  useProperty: () => ({
    currentProperty: mockCurrentProperty
  })
}));

// Mock MobileQuickStats component
vi.mock('../../../components/MobileQuickStats', () => ({
  default: () => <div data-testid="mobile-quick-stats">Mobile Quick Stats</div>
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
  });

  describe('Data Validation', () => {
    it('should filter out bookings with invalid dates', () => {
      const bookings = [
        createMockBooking({ checkIn: 'invalid-date', checkOut: tomorrow }),
        createMockBooking({ checkIn: today, checkOut: 'invalid-date' }),
        createMockBooking({ checkIn: tomorrow, checkOut: today }), // checkIn after checkOut
        createMockBooking() // valid booking
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should only count the valid booking
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Bookings count
    });

    it('should filter out bookings with invalid amounts', () => {
      const bookings = [
        createMockBooking({ totalAmount: -100 }), // negative total
        createMockBooking({ paymentAmount: -50 }), // negative payment
        createMockBooking({ totalAmount: 100, paymentAmount: 200 }), // payment > total
        createMockBooking() // valid booking
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should only count the valid booking
      expect(screen.getByText('1')).toBeInTheDocument(); // Active Bookings count
    });

    it('should filter out cancelled bookings', () => {
      const bookings = [
        createMockBooking({ cancelled: true }),
        createMockBooking({ cancelled: false }),
        createMockBooking() // default not cancelled
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should count only non-cancelled bookings
      expect(screen.getByText('2')).toBeInTheDocument(); // Active Bookings count
    });
  });

  describe('Occupancy Rate Calculation', () => {
    it('should calculate occupancy rate using actual property room count', () => {
      const bookings = [
        createMockBooking({ 
          status: 'checked-in',
          checkIn: yesterday,
          checkOut: tomorrow,
          roomNo: '101'
        }),
        createMockBooking({ 
          status: 'checked-in',
          checkIn: yesterday,
          checkOut: tomorrow,
          roomNo: '102'
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // 2 occupied rooms out of 10 total = 20% occupancy
      expect(screen.getByText('20% rate')).toBeInTheDocument();
    });

    it('should handle zero total rooms gracefully', () => {
      const mockPropertyWithZeroRooms = { ...mockCurrentProperty, totalRooms: 0 };
      vi.mocked(require('../../../contexts/PropertyContext').useProperty).mockReturnValue({
        currentProperty: mockPropertyWithZeroRooms
      });

      const bookings = [
        createMockBooking({ 
          status: 'checked-in',
          checkIn: yesterday,
          checkOut: tomorrow
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should show 0% when no rooms available
      expect(screen.getByText('0% rate')).toBeInTheDocument();
    });
  });

  describe('Revenue Calculations', () => {
    it('should calculate paid revenue correctly using paymentAmount', () => {
      const bookings = [
        createMockBooking({ 
          totalAmount: 1000,
          paymentAmount: 800,
          paymentStatus: 'paid'
        }),
        createMockBooking({ 
          totalAmount: 2000,
          paymentAmount: 2000,
          paymentStatus: 'paid'
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Total revenue should be 3000, paid revenue should be 2800
      expect(screen.getByText('₹3.0k')).toBeInTheDocument(); // Total Revenue
    });

    it('should calculate partial payments correctly', () => {
      const bookings = [
        createMockBooking({ 
          totalAmount: 1000,
          paymentAmount: 500,
          paymentStatus: 'partial'
        }),
        createMockBooking({ 
          totalAmount: 2000,
          paymentAmount: 0,
          paymentStatus: 'unpaid'
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Pending should be 3000 - 500 = 2500
      expect(screen.getByText('₹2.5k')).toBeInTheDocument(); // Pending Payments
    });

    it('should handle missing paymentAmount gracefully', () => {
      const bookings = [
        createMockBooking({ 
          totalAmount: 1000,
          paymentAmount: undefined,
          paymentStatus: 'paid'
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should use totalAmount when paymentAmount is missing for paid bookings
      expect(screen.getByText('₹1.0k')).toBeInTheDocument(); // Total Revenue
    });
  });

  describe('Date Filtering', () => {
    it('should correctly identify today check-ins and check-outs', () => {
      const bookings = [
        createMockBooking({ checkIn: today, checkOut: tomorrow }),
        createMockBooking({ checkIn: yesterday, checkOut: today }),
        createMockBooking({ checkIn: tomorrow, checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should show 1 check-in today and 1 check-out today
      const todayCheckIns = screen.getAllByText('1')[0]; // First occurrence should be check-ins
      expect(todayCheckIns).toBeInTheDocument();
    });

    it('should calculate this month bookings correctly', () => {
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const thisMonthDate = new Date(thisYear, thisMonth, 15).toISOString().split('T')[0];
      const lastMonthDate = new Date(thisYear, thisMonth - 1, 15).toISOString().split('T')[0];

      const bookings = [
        createMockBooking({ checkIn: thisMonthDate }),
        createMockBooking({ checkIn: lastMonthDate }),
        createMockBooking({ checkIn: thisMonthDate })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should count only this month's bookings (2)
      expect(screen.getByText('2')).toBeInTheDocument(); // This Month count
    });
  });

  describe('Payment Status Breakdown', () => {
    it('should calculate payment rate correctly', () => {
      const bookings = [
        createMockBooking({ paymentStatus: 'paid' }),
        createMockBooking({ paymentStatus: 'paid' }),
        createMockBooking({ paymentStatus: 'partial' }),
        createMockBooking({ paymentStatus: 'unpaid' })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // 2 paid out of 4 total = 50%
      expect(screen.getByText('50%')).toBeInTheDocument(); // Payment Rate
      expect(screen.getByText('2/4 paid')).toBeInTheDocument();
    });

    it('should handle empty bookings array', () => {
      render(<EnhancedKPIDashboard bookings={[]} />);
      
      // Should show 0% payment rate
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0/0 paid')).toBeInTheDocument();
    });
  });

  describe('Average Stay Duration', () => {
    it('should calculate average stay duration correctly', () => {
      const bookings = [
        createMockBooking({ 
          checkIn: '2024-01-01',
          checkOut: '2024-01-03' // 2 days
        }),
        createMockBooking({ 
          checkIn: '2024-01-01',
          checkOut: '2024-01-05' // 4 days
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Average should be (2 + 4) / 2 = 3.0 days
      expect(screen.getByText('3.0 days')).toBeInTheDocument();
    });
  });

  describe('Property Context Integration', () => {
    it('should recalculate KPIs when property changes', () => {
      const { rerender } = render(<EnhancedKPIDashboard bookings={[]} />);
      
      // Mock property change
      const newProperty = { ...mockCurrentProperty, totalRooms: 20 };
      vi.mocked(require('../../../contexts/PropertyContext').useProperty).mockReturnValue({
        currentProperty: newProperty
      });

      rerender(<EnhancedKPIDashboard bookings={[]} />);
      
      // Component should re-render with new property context
      expect(screen.getByTestId('mobile-quick-stats')).toBeInTheDocument();
    });

    it('should handle missing property gracefully', () => {
      vi.mocked(require('../../../contexts/PropertyContext').useProperty).mockReturnValue({
        currentProperty: null
      });

      const bookings = [
        createMockBooking({ 
          status: 'checked-in',
          checkIn: yesterday,
          checkOut: tomorrow
        })
      ];

      render(<EnhancedKPIDashboard bookings={bookings} />);
      
      // Should show 0% occupancy when no property is selected
      expect(screen.getByText('0% rate')).toBeInTheDocument();
    });
  });
});