import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoomBookingService, RoomAvailabilityMap, OccupancyStatus, ConflictResult } from '../../../services/roomBookingService';
import { Booking } from '../../../types/booking';

// Mock Supabase
const mockSupabaseResponse = vi.fn();

vi.mock('../../../lib/supabase', () => {
  // The query builder is both chainable (every filter returns `this`) and
  // awaitable (it implements `.then`, resolving to the current queued
  // mockSupabaseResponse()). This mirrors the real Supabase builder, which can
  // be awaited at ANY terminal point regardless of which filter came last
  // (getBookingsForRoom ends on .order, getBatchRoomAvailability ends on .gte,
  // batch pricing ends on .in, override lookup ends on .maybeSingle, etc.).
  const makeQuery = () => {
    const query: any = {};
    const chain = () => query;
    const resolve = () => mockSupabaseResponse();
    // Chainable filters / modifiers
    query.eq = vi.fn(chain);
    query.gte = vi.fn(chain);
    query.lte = vi.fn(chain);
    query.gt = vi.fn(chain);
    query.lt = vi.fn(chain);
    query.in = vi.fn(chain);
    query.or = vi.fn(chain);
    query.order = vi.fn(chain);
    // Terminal resolvers (return a thenable so they can be chained or awaited)
    query.limit = vi.fn(resolve);
    query.single = vi.fn(resolve);
    query.maybeSingle = vi.fn(resolve);
    // Make the builder itself awaitable
    query.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve(resolve()).then(onFulfilled, onRejected);
    return query;
  };

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => makeQuery())
      }))
    }
  };
});

// Helper function to create Date objects from strings
const createDate = (dateStr: string): Date => new Date(dateStr);

// Helper function to format dates for comparison
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

describe('RoomBookingService', () => {
  let roomBookingService: RoomBookingService;

  beforeEach(() => {
    // mockReset (not just clearAllMocks) clears any queued mockResolvedValueOnce
    // values left over from a previous test, preventing cross-test leakage.
    mockSupabaseResponse.mockReset();
    // Safe default so awaiting an unstubbed query never throws on destructure.
    mockSupabaseResponse.mockResolvedValue({ data: null, error: null });
    vi.clearAllMocks();
    roomBookingService = new RoomBookingService();
  });

  describe('getBookingsForRoom', () => {
    it('should fetch bookings for a specific room within date range', async () => {
      const mockDatabaseBookings = [
        {
          id: '1',
          property_id: 'prop1',
          guest_name: 'John Doe',
          room_no: 'R101',
          number_of_rooms: 1,
          check_in: '2024-01-15',
          check_out: '2024-01-18',
          no_of_pax: 2,
          adult_child: '2 Adults',
          status: 'confirmed',
          cancelled: false,
          total_amount: '300',
          payment_status: 'paid',
          contact_phone: '+91-9876543210',
          contact_email: 'john@example.com',
          special_requests: '',
          booking_date: '2024-01-10',
          folio_number: 'F001',
          guest_profile_id: 'guest1',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ];

      mockSupabaseResponse.mockResolvedValue({ data: mockDatabaseBookings, error: null });

      const result = await roomBookingService.getBookingsForRoom(
        'R101',
        createDate('2024-01-15'),
        createDate('2024-01-20')
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        guestName: 'John Doe',
        roomNo: 'R101',
        checkIn: '2024-01-15',
        checkOut: '2024-01-18',
        status: 'confirmed',
        totalAmount: 300
      });
    });

    it('should return empty array when no bookings found', async () => {
      mockSupabaseResponse.mockResolvedValue({ data: [], error: null });

      const result = await roomBookingService.getBookingsForRoom(
        'R101',
        createDate('2024-01-15'),
        createDate('2024-01-20')
      );

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseResponse.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      const result = await roomBookingService.getBookingsForRoom(
        'R101',
        createDate('2024-01-15'),
        createDate('2024-01-20')
      );

      expect(result).toEqual([]);
    });
  });

  describe('getRoomAvailability', () => {
    it('should calculate availability for room grid display', async () => {
      const mockBookings = [
        {
          id: '1',
          property_id: 'prop1',
          guest_name: 'John Doe',
          room_no: 'R101',
          check_in: '2024-01-16',
          check_out: '2024-01-18',
          status: 'confirmed',
          total_amount: '400',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ];

      const mockRoomPricing = {
        base_price: 1000,
        seasonal_pricing: {}
      };

      // Set up mock responses for both calls
      mockSupabaseResponse
        .mockResolvedValueOnce({ data: mockBookings, error: null })  // getBookingsForRoom call
        .mockResolvedValueOnce({ data: mockRoomPricing, error: null }); // getRoomPricing call

      const dates = [createDate('2024-01-15'), createDate('2024-01-16'), createDate('2024-01-17')];
      const result = await roomBookingService.getRoomAvailability('R101', dates);

      expect(result).toHaveProperty('2024-01-15');
      expect(result).toHaveProperty('2024-01-16');
      expect(result).toHaveProperty('2024-01-17');
      expect(result['2024-01-15'].status).toBe('available');
      expect(result['2024-01-16'].status).toBe('checkin'); // Booked
    });

    it('should return empty object for empty dates array', async () => {
      const result = await roomBookingService.getRoomAvailability('R101', []);
      expect(result).toEqual({});
    });
  });

  describe('getRoomOccupancyStatus', () => {
    it('should return occupied status when room is booked', async () => {
      const mockBooking = {
        id: '1',
        property_id: 'prop1',
        guest_name: 'John Doe',
        room_no: 'R101',
        check_in: '2024-01-15',
        check_out: '2024-01-18',
        status: 'confirmed',
        total_amount: '300',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z'
      };

      mockSupabaseResponse.mockResolvedValue({ data: [mockBooking], error: null });

      const result = await roomBookingService.getRoomOccupancyStatus('R101', createDate('2024-01-16'));

      expect(result.isOccupied).toBe(true);
      expect(result.status).toBe('occupied');
      expect(result.booking).toMatchObject({
        id: '1',
        guestName: 'John Doe',
        roomNo: 'R101'
      });
    });

    it('should return available status when no bookings found', async () => {
      mockSupabaseResponse.mockResolvedValue({ data: [], error: null });

      const result = await roomBookingService.getRoomOccupancyStatus('R101', createDate('2024-01-16'));

      expect(result.isOccupied).toBe(false);
      expect(result.status).toBe('available');
      expect(result.booking).toBeUndefined();
    });

    it('should return checkin status on check-in day', async () => {
      const mockBooking = {
        id: '1',
        property_id: 'prop1',
        guest_name: 'John Doe',
        room_no: 'R101',
        check_in: '2024-01-16',
        check_out: '2024-01-18',
        status: 'confirmed',
        total_amount: '300',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z'
      };

      mockSupabaseResponse.mockResolvedValue({ data: [mockBooking], error: null });

      const result = await roomBookingService.getRoomOccupancyStatus('R101', createDate('2024-01-16'));

      expect(result.isOccupied).toBe(true);
      expect(result.status).toBe('checkin');
      expect(result.booking).toMatchObject({
        id: '1',
        guestName: 'John Doe',
        roomNo: 'R101'
      });
    });
  });

  describe('detectRoomConflicts', () => {
    it('should detect conflicts when bookings overlap', async () => {
      const mockBookings = [
        {
          id: '1',
          property_id: 'prop1',
          guest_name: 'John Doe',
          room_no: 'R101',
          check_in: '2024-01-15',
          check_out: '2024-01-18',
          status: 'confirmed',
          total_amount: '300',
          cancelled: false,
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ];

      mockSupabaseResponse.mockResolvedValue({ data: mockBookings, error: null });

      const result = await roomBookingService.detectRoomConflicts('R101', createDate('2024-01-16'), createDate('2024-01-19'));

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBookings).toHaveLength(1);
      expect(result.conflictingBookings[0]).toMatchObject({
        id: '1',
        guestName: 'John Doe',
        roomNo: 'R101'
      });
      expect(result.conflictType).toBe('overlap');
    });

    it('should return no conflicts when no overlapping bookings', async () => {
      mockSupabaseResponse.mockResolvedValue({ data: [], error: null });

      const result = await roomBookingService.detectRoomConflicts('R101', createDate('2024-01-16'), createDate('2024-01-20'));

      expect(result).toEqual({
        hasConflict: false,
        conflictingBookings: []
      });
    });
  });

  describe('getBatchRoomAvailability', () => {
    it('should return availability for multiple rooms', async () => {
      const mockBookingsR101 = [
        {
          id: '1',
          property_id: 'prop1',
          guest_name: 'John Doe',
          room_no: 'R101',
          check_in: '2024-01-16',
          check_out: '2024-01-19',
          status: 'confirmed',
          total_amount: '300',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ];

      // The 'rooms' table batch pricing query returns one row per room, keyed by
      // room_number, with base_price / seasonal_pricing / availability_overrides.
      const mockRoomPricing = [
        { room_number: 'R101', base_price: 1000, seasonal_pricing: {}, availability_overrides: {} },
        { room_number: 'R102', base_price: 1000, seasonal_pricing: {}, availability_overrides: {} }
      ];

      // getBatchRoomAvailability issues exactly two batched queries in order:
      //   1. getBatchRoomPricing -> from('rooms')...in('room_number')  (pricing)
      //   2. batch bookings      -> from('bookings')...gte(...)        (bookings)
      mockSupabaseResponse
        .mockResolvedValueOnce({ data: mockRoomPricing, error: null })   // batch pricing (rooms)
        .mockResolvedValueOnce({ data: mockBookingsR101, error: null }); // batch bookings

      const result = await roomBookingService.getBatchRoomAvailability(
        ['R101', 'R102'],
        [createDate('2024-01-16'), createDate('2024-01-17'), createDate('2024-01-18'), createDate('2024-01-19')]
      );

      expect(result).toHaveProperty('R101');
      expect(result).toHaveProperty('R102');
      expect(result.R101).toHaveProperty('2024-01-16');
      expect(result.R101).toHaveProperty('2024-01-17');
      expect(result.R101['2024-01-16']).toMatchObject({
        status: 'checkin',
        booking: expect.objectContaining({
          id: '1',
          guestName: 'John Doe',
          roomNo: 'R101'
        })
      });
    });

    it('should handle empty room list', async () => {
      const result = await roomBookingService.getBatchRoomAvailability(
        [],
        [createDate('2024-01-16'), createDate('2024-01-17')]
      );

      expect(result).toEqual({});
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseResponse.mockResolvedValue({ 
        data: null, 
        error: { message: 'Network error', code: 'NETWORK_ERROR' } 
      });

      const result = await roomBookingService.getBookingsForRoom(
        'R101',
        createDate('2024-01-15'),
        createDate('2024-01-20')
      );

      expect(result).toEqual([]);
    });

    it('should handle malformed data gracefully', async () => {
      mockSupabaseResponse.mockResolvedValue({ 
        data: [{ invalid: 'data' }], 
        error: null 
      });

      const result = await roomBookingService.getBookingsForRoom(
        'R101',
        createDate('2024-01-15'),
        createDate('2024-01-20')
      );

      // Should handle malformed data by returning what it can process
      expect(Array.isArray(result)).toBe(true);
    });
  });
});