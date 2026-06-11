import { supabase } from '../lib/supabase';

function normalizeType(rt: string): string {
  return rt.toLowerCase().replace(/\broom\b/gi, '').replace(/\s+/g, ' ').trim();
}

export interface RoomsWithBookings {
  rooms: string[];
  bookings: Array<{ room_no: string; check_in: string; check_out: string }>;
}

export class AvailabilityService {
  // Fetch a property's active rooms and its non-cancelled bookings ONCE, so the
  // caller can compute availability for any date range client-side (no query per
  // date change). For a small property this is a tiny payload.
  static async getRoomsWithBookings(propertyId: string): Promise<RoomsWithBookings> {
    const [roomsRes, bookingsRes] = await Promise.all([
      supabase
        .from('rooms')
        .select('room_number')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('room_number'),
      supabase
        .from('bookings')
        .select('room_no, check_in, check_out')
        .eq('property_id', propertyId)
        .eq('cancelled', false),
    ]);
    if (roomsRes.error) {
      console.error('Error fetching rooms:', roomsRes.error);
      return { rooms: [], bookings: [] };
    }
    return {
      rooms: (roomsRes.data || []).map((r: any) => String(r.room_number)),
      bookings: (bookingsRes.data || []) as RoomsWithBookings['bookings'],
    };
  }

  // Pure client-side availability for a date range, given pre-fetched data.
  // Overlap = check_in < end && check_out > start (check-out exclusive).
  static computeAvailableRooms(data: RoomsWithBookings, checkIn: string, checkOut: string): string[] {
    if (!checkIn || !checkOut || checkIn >= checkOut) return data.rooms;
    const occupied = new Set<string>();
    for (const b of data.bookings) {
      if (b.check_in < checkOut && b.check_out > checkIn) {
        String(b.room_no || '').split(',').forEach((rn) => occupied.add(rn.trim()));
      }
    }
    return data.rooms.filter((rn) => !occupied.has(rn));
  }

  // All active rooms for a property that are free for [checkIn, checkOut)
  // (check-out exclusive). Handles comma-separated room_no on multi-room bookings.
  static async getAvailableRooms(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<string[]> {
    // Rooms and overlapping bookings are independent — fetch them in parallel
    // (one round-trip instead of two) so the dropdown populates quickly.
    const [roomsRes, bookingsRes] = await Promise.all([
      supabase
        .from('rooms')
        .select('room_number')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('room_number'),
      supabase
        .from('bookings')
        .select('room_no')
        .eq('property_id', propertyId)
        .eq('cancelled', false)
        .lt('check_in', checkOut)
        .gt('check_out', checkIn),
    ]);

    if (roomsRes.error) {
      console.error('Error fetching rooms for availability:', roomsRes.error);
      return [];
    }
    const allRoomNumbers = (roomsRes.data || []).map((r: any) => String(r.room_number));
    if (allRoomNumbers.length === 0) return [];

    const bookings = bookingsRes.data;
    if (bookingsRes.error) {
      console.error('Error fetching bookings for availability:', bookingsRes.error);
      return allRoomNumbers; // fail open rather than block all rooms
    }

    const occupied = new Set<string>();
    (bookings || []).forEach((b: any) =>
      String(b.room_no || '')
        .split(',')
        .forEach((rn: string) => occupied.add(rn.trim()))
    );
    return allRoomNumbers.filter((rn) => !occupied.has(rn));
  }

  static async getAvailableRoomsByType(
    propertyId: string,
    roomType: string,
    checkIn: string,
    checkOut: string
  ): Promise<string[]> {
    const tryFetch = async (pattern: string): Promise<string[]> => {
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .ilike('room_type', pattern);

      if (roomsError) {
        console.error('Error fetching rooms for availability:', roomsError);
        return [];
      }
      return (rooms || []).map((r: any) => r.room_number);
    };

    // First attempt: raw text contains match
    let allRoomNumbers = await tryFetch(`%${roomType}%`);

    // Second attempt: normalized type contains match
    if (allRoomNumbers.length === 0) {
      const norm = normalizeType(roomType);
      if (norm) {
        allRoomNumbers = await tryFetch(`%${norm}%`);
      }
    }

    if (allRoomNumbers.length === 0) return [];

    // Fetch overlapping bookings with chained conditions (AND)
    let overlapping: any[] = [];
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('room_no')
        .eq('property_id', propertyId)
        .eq('cancelled', false)
        .in('room_no', allRoomNumbers)
        .lt('check_in', checkOut)
        .gt('check_out', checkIn);

      if (bookingsError) {
        console.error('Error fetching bookings for availability:', bookingsError);
      } else {
        overlapping = bookings || [];
      }
    } catch (e) {
      console.error('Error computing overlaps:', e);
    }

    const occupied = new Set(overlapping.map((b: any) => b.room_no));
    const available = allRoomNumbers.filter((rn: string) => !occupied.has(rn));
    return available;
  }
}

export default AvailabilityService;
