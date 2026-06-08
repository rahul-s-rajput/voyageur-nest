import { Booking } from '../types/booking';

/**
 * Validates if a date string is valid and properly formatted
 */
export const isValidDate = (dateString: string): boolean => {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Enforce strict YYYY-MM-DD format first
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return false;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;

  // Reject calendar-invalid dates that JS silently rolls over
  // (e.g. '2024-02-30' -> Mar 1). Compare the parsed UTC parts back to the input.
  const [year, month, day] = dateString.split('-').map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

/**
 * Validates if an amount is a valid positive number
 */
export const isValidAmount = (amount: number | undefined): boolean => {
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
};

/**
 * Validates if check-in date is before check-out date
 */
export const isValidDateRange = (checkIn: string, checkOut: string): boolean => {
  if (!isValidDate(checkIn) || !isValidDate(checkOut)) return false;
  
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  return checkInDate < checkOutDate;
};

/**
 * Validates if payment amount is not greater than total amount
 */
export const isValidPaymentAmount = (paymentAmount: number | undefined, totalAmount: number): boolean => {
  if (!isValidAmount(totalAmount)) return false;
  if (paymentAmount === undefined || paymentAmount === null) return true; // Allow undefined/null
  
  return isValidAmount(paymentAmount) && paymentAmount <= totalAmount;
};

/**
 * Validates payment status consistency with payment amount
 */
export const isValidPaymentStatus = (
  paymentStatus: string | undefined,
  paymentAmount: number | undefined,
  totalAmount: number
): boolean => {
  if (!isValidAmount(totalAmount)) return false;
  if (!paymentStatus) return true; // Allow undefined payment status
  
  const validStatuses = ['paid', 'partial', 'unpaid'];
  if (!validStatuses.includes(paymentStatus)) return false;
  
  const payment = paymentAmount || 0;
  
  switch (paymentStatus) {
    case 'paid':
      return payment >= totalAmount;
    case 'partial':
      return payment > 0 && payment < totalAmount;
    case 'unpaid':
      return payment === 0;
    default:
      return false;
  }
};

/**
 * Validates booking status
 */
export const isValidBookingStatus = (status: string): boolean => {
  const validStatuses = ['confirmed', 'pending', 'checked-in', 'checked-out', 'no-show'];
  return validStatuses.includes(status);
};

/**
 * Comprehensive booking validation
 */
export const isValidBooking = (booking: Booking): boolean => {
  // Skip validation for cancelled bookings (they might have incomplete data)
  if (booking.cancelled) return false;
  
  // Validate required fields exist
  if (!booking.id || !booking.guestName || !booking.roomNo) return false;
  
  // Validate dates
  if (!isValidDateRange(booking.checkIn, booking.checkOut)) return false;
  
  // Validate amounts
  if (!isValidAmount(booking.totalAmount)) return false;
  if (!isValidPaymentAmount(booking.paymentAmount, booking.totalAmount)) return false;
  
  // Validate payment status consistency
  if (!isValidPaymentStatus(booking.paymentStatus, booking.paymentAmount, booking.totalAmount)) return false;
  
  // Validate booking status
  if (!isValidBookingStatus(booking.status)) return false;
  
  // Validate room and guest numbers (reject explicit non-positive values,
  // including 0, while still allowing undefined/null which default later)
  if (booking.numberOfRooms != null && booking.numberOfRooms <= 0) return false;
  if (booking.noOfPax != null && booking.noOfPax <= 0) return false;
  
  return true;
};

/**
 * Filters array of bookings to only include valid ones
 */
export const filterValidBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter(isValidBooking);
};

/**
 * Validates and sanitizes booking data for KPI calculations
 */
export const sanitizeBookingForKPI = (booking: Booking): Booking | null => {
  // Coerce numeric fields up front so string-typed values (e.g. '1000')
  // are parsed before validation. This is the whole point of this helper.
  const coerced: Booking = {
    ...booking,
    totalAmount:
      booking.totalAmount != null ? parseFloat(booking.totalAmount.toString()) : (undefined as any),
    paymentAmount:
      booking.paymentAmount != null ? parseFloat(booking.paymentAmount.toString()) : undefined,
    numberOfRooms: booking.numberOfRooms || 1,
    noOfPax: booking.noOfPax || 1
  };

  if (!isValidBooking(coerced)) return null;

  return {
    ...coerced,
    paymentAmount: coerced.paymentAmount !== undefined ? coerced.paymentAmount : 0
  };
};

/**
 * Calculates the number of days between two dates
 */
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Checks if a date is today (in local timezone)
 */
export const isToday = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
};

/**
 * Checks if a date is in the current month
 */
export const isThisMonth = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  
  const date = new Date(dateString);
  const now = new Date();
  
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

/**
 * Checks if a date is in the current week
 */
export const isThisWeek = (dateString: string): boolean => {
  if (!isValidDate(dateString)) return false;
  
  const date = new Date(dateString);
  const now = new Date();
  
  // Get the start of the current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get the end of the current week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
};