import { supabase } from '../lib/supabase';

function normalizeType(rt: string): string {
  return rt.toLowerCase().replace(/\broom\b/gi, '').replace(/\s+/g, ' ').trim();
}

export class AvailabilityService {
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
