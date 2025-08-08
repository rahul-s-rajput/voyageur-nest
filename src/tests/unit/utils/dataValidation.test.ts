import { describe, it, expect } from 'vitest';
import {
  isValidDate,
  isValidAmount,
  isValidDateRange,
  isValidPaymentAmount,
  isValidPaymentStatus,
  isValidBookingStatus,
  isValidBooking,
  filterValidBookings,
  sanitizeBookingForKPI,
  calculateDaysBetween,
  isToday,
  isThisMonth,
  isThisWeek
} from '../../../utils/dataValidation';
import { Booking } from '../../../types/booking';

describe('Data Validation Utils', () => {
  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2023-12-31')).toBe(true);
      expect(isValidDate('2024-02-29')).toBe(true); // Leap year
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
      expect(isValidDate('2024-02-30')).toBe(false); // Invalid day
      expect(isValidDate('24-01-15')).toBe(false); // Wrong format
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null as any)).toBe(false);
      expect(isValidDate(undefined as any)).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid amounts', () => {
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(1000.50)).toBe(true);
    });

    it('should return false for invalid amounts', () => {
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
      expect(isValidAmount(null as any)).toBe(false);
      expect(isValidAmount('100' as any)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should return true for valid date ranges', () => {
      expect(isValidDateRange('2024-01-15', '2024-01-17')).toBe(true);
      expect(isValidDateRange('2024-01-01', '2024-12-31')).toBe(true);
    });

    it('should return false for invalid date ranges', () => {
      expect(isValidDateRange('2024-01-17', '2024-01-15')).toBe(false); // checkIn after checkOut
      expect(isValidDateRange('2024-01-15', '2024-01-15')).toBe(false); // Same date
      expect(isValidDateRange('invalid', '2024-01-17')).toBe(false);
      expect(isValidDateRange('2024-01-15', 'invalid')).toBe(false);
    });
  });

  describe('isValidPaymentAmount', () => {
    it('should return true for valid payment amounts', () => {
      expect(isValidPaymentAmount(100, 1000)).toBe(true);
      expect(isValidPaymentAmount(1000, 1000)).toBe(true); // Full payment
      expect(isValidPaymentAmount(0, 1000)).toBe(true);
      expect(isValidPaymentAmount(undefined, 1000)).toBe(true); // Allow undefined
      expect(isValidPaymentAmount(null as any, 1000)).toBe(true); // Allow null
    });

    it('should return false for invalid payment amounts', () => {
      expect(isValidPaymentAmount(1500, 1000)).toBe(false); // Payment > total
      expect(isValidPaymentAmount(-100, 1000)).toBe(false); // Negative payment
      expect(isValidPaymentAmount(100, -1000)).toBe(false); // Invalid total
    });
  });

  describe('isValidPaymentStatus', () => {
    it('should return true for consistent payment status', () => {
      expect(isValidPaymentStatus('paid', 1000, 1000)).toBe(true);
      expect(isValidPaymentStatus('paid', 1200, 1000)).toBe(true); // Overpayment allowed
      expect(isValidPaymentStatus('partial', 500, 1000)).toBe(true);
      expect(isValidPaymentStatus('unpaid', 0, 1000)).toBe(true);
      expect(isValidPaymentStatus('unpaid', undefined, 1000)).toBe(true);
    });

    it('should return false for inconsistent payment status', () => {
      expect(isValidPaymentStatus('paid', 500, 1000)).toBe(false); // Paid but partial amount
      expect(isValidPaymentStatus('partial', 0, 1000)).toBe(false); // Partial but no payment
      expect(isValidPaymentStatus('partial', 1000, 1000)).toBe(false); // Partial but full payment
      expect(isValidPaymentStatus('unpaid', 500, 1000)).toBe(false); // Unpaid but has payment
      expect(isValidPaymentStatus('invalid', 500, 1000)).toBe(false); // Invalid status
    });
  });

  describe('isValidBookingStatus', () => {
    it('should return true for valid booking statuses', () => {
      expect(isValidBookingStatus('confirmed')).toBe(true);
      expect(isValidBookingStatus('checked-in')).toBe(true);
      expect(isValidBookingStatus('checked-out')).toBe(true);
      expect(isValidBookingStatus('cancelled')).toBe(true);
      expect(isValidBookingStatus('no-show')).toBe(true);
    });

    it('should return false for invalid booking statuses', () => {
      expect(isValidBookingStatus('invalid')).toBe(false);
      expect(isValidBookingStatus('')).toBe(false);
      expect(isValidBookingStatus('pending')).toBe(false);
    });
  });

  describe('isValidBooking', () => {
    const validBooking: Booking = {
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
      paymentAmount: 500,
      paymentStatus: 'partial',
      status: 'confirmed',
      cancelled: false,
      bookingDate: '2024-01-10',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      propertyId: 'prop-1'
    };

    it('should return true for valid bookings', () => {
      expect(isValidBooking(validBooking)).toBe(true);
    });

    it('should return false for cancelled bookings', () => {
      expect(isValidBooking({ ...validBooking, cancelled: true })).toBe(false);
    });

    it('should return false for bookings with missing required fields', () => {
      expect(isValidBooking({ ...validBooking, id: '' })).toBe(false);
      expect(isValidBooking({ ...validBooking, guestName: '' })).toBe(false);
      expect(isValidBooking({ ...validBooking, roomNo: '' })).toBe(false);
    });

    it('should return false for bookings with invalid dates', () => {
      expect(isValidBooking({ ...validBooking, checkIn: 'invalid' })).toBe(false);
      expect(isValidBooking({ ...validBooking, checkOut: 'invalid' })).toBe(false);
      expect(isValidBooking({ ...validBooking, checkIn: '2024-01-17', checkOut: '2024-01-15' })).toBe(false);
    });

    it('should return false for bookings with invalid amounts', () => {
      expect(isValidBooking({ ...validBooking, totalAmount: -100 })).toBe(false);
      expect(isValidBooking({ ...validBooking, paymentAmount: 1500 })).toBe(false); // > total
    });

    it('should return false for bookings with inconsistent payment status', () => {
      expect(isValidBooking({ ...validBooking, paymentStatus: 'paid', paymentAmount: 500 })).toBe(false);
    });

    it('should return false for bookings with invalid room/guest numbers', () => {
      expect(isValidBooking({ ...validBooking, numberOfRooms: 0 })).toBe(false);
      expect(isValidBooking({ ...validBooking, noOfPax: 0 })).toBe(false);
    });
  });

  describe('filterValidBookings', () => {
    it('should filter out invalid bookings', () => {
      const bookings: Booking[] = [
        {
          id: 'valid-1',
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
        },
        {
          id: 'cancelled-1',
          folioNumber: 'F002',
          guestName: 'Jane Smith',
          checkIn: '2024-01-15',
          checkOut: '2024-01-17',
          roomNo: '102',
          numberOfRooms: 1,
          noOfPax: 2,
          adultChild: '2+0',
          totalAmount: 1000,
          paymentAmount: 1000,
          paymentStatus: 'paid',
          status: 'confirmed',
          cancelled: true, // Should be filtered out
          bookingDate: '2024-01-10',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
          propertyId: 'prop-1'
        },
        {
          id: 'invalid-dates',
          folioNumber: 'F003',
          guestName: 'Bob Wilson',
          checkIn: 'invalid-date', // Invalid
          checkOut: '2024-01-17',
          roomNo: '103',
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

      const validBookings = filterValidBookings(bookings);
      expect(validBookings).toHaveLength(1);
      expect(validBookings[0].id).toBe('valid-1');
    });
  });

  describe('sanitizeBookingForKPI', () => {
    it('should sanitize valid booking data', () => {
      const booking: Booking = {
        id: 'booking-1',
        folioNumber: 'F001',
        guestName: 'John Doe',
        checkIn: '2024-01-15',
        checkOut: '2024-01-17',
        roomNo: '101',
        numberOfRooms: undefined as any,
        noOfPax: undefined as any,
        adultChild: '2+0',
        totalAmount: '1000' as any, // String that needs parsing
        paymentAmount: '500' as any, // String that needs parsing
        paymentStatus: 'partial',
        status: 'confirmed',
        cancelled: false,
        bookingDate: '2024-01-10',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        propertyId: 'prop-1'
      };

      const sanitized = sanitizeBookingForKPI(booking);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.totalAmount).toBe(1000);
      expect(sanitized!.paymentAmount).toBe(500);
      expect(sanitized!.numberOfRooms).toBe(1); // Default value
      expect(sanitized!.noOfPax).toBe(1); // Default value
    });

    it('should return null for invalid bookings', () => {
      const invalidBooking: Booking = {
        id: '',
        folioNumber: 'F001',
        guestName: 'John Doe',
        checkIn: '2024-01-15',
        checkOut: '2024-01-17',
        roomNo: '101',
        numberOfRooms: 1,
        noOfPax: 2,
        adultChild: '2+0',
        totalAmount: 1000,
        paymentAmount: 500,
        paymentStatus: 'partial',
        status: 'confirmed',
        cancelled: false,
        bookingDate: '2024-01-10',
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
        propertyId: 'prop-1'
      };

      expect(sanitizeBookingForKPI(invalidBooking)).toBeNull();
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days between valid dates', () => {
      expect(calculateDaysBetween('2024-01-15', '2024-01-17')).toBe(2);
      expect(calculateDaysBetween('2024-01-01', '2024-01-31')).toBe(30);
      expect(calculateDaysBetween('2024-01-15', '2024-01-15')).toBe(0);
    });

    it('should return 0 for invalid dates', () => {
      expect(calculateDaysBetween('invalid', '2024-01-17')).toBe(0);
      expect(calculateDaysBetween('2024-01-15', 'invalid')).toBe(0);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isToday(today)).toBe(true);
    });

    it('should return false for other dates', () => {
      expect(isToday('2020-01-01')).toBe(false);
      expect(isToday('invalid-date')).toBe(false);
    });
  });

  describe('isThisMonth', () => {
    it('should return true for dates in current month', () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0];
      expect(isThisMonth(thisMonth)).toBe(true);
    });

    it('should return false for dates in other months', () => {
      expect(isThisMonth('2020-01-01')).toBe(false);
      expect(isThisMonth('invalid-date')).toBe(false);
    });
  });

  describe('isThisWeek', () => {
    it('should return true for dates in current week', () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      expect(isThisWeek(today)).toBe(true);
    });

    it('should return false for dates outside current week', () => {
      expect(isThisWeek('2020-01-01')).toBe(false);
      expect(isThisWeek('invalid-date')).toBe(false);
    });
  });
});