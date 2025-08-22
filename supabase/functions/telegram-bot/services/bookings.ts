import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function getRoomMaxOccupancy(
  supabase: SupabaseClient,
  propertyId: string,
  roomNo: string
): Promise<number> {
  const { data, error } = await supabase
    .from('rooms')
    .select('max_occupancy')
    .eq('property_id', propertyId)
    .eq('room_number', roomNo)
    .maybeSingle();
  if (error) {
    console.warn('getRoomMaxOccupancy error:', error);
    return 6;
  }
  const cap = (data as any)?.max_occupancy;
  return Number.isFinite(cap) && cap > 0 ? cap : 6;
}

export async function loadBookingById(
  supabase: SupabaseClient,
  id: string
): Promise<any | null> {
  const { data } = await supabase
    .from('bookings')
    .select('id, property_id, guest_name, room_no, check_in, check_out, total_amount, status, cancelled, no_of_pax, adult_child, special_requests')
    .eq('id', id)
    .maybeSingle();
  return data || null;
}

export async function getAvailableRooms(
  supabase: SupabaseClient,
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
): Promise<{ roomNo: string; roomType?: string }[]> {
  // Get all active rooms for the property
  const { data: allRooms, error: roomsError } = await supabase
    .from('rooms')
    .select('room_number, room_type')
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .order('room_number');
  
  if (roomsError || !allRooms) {
    console.error('Error fetching rooms:', roomsError);
    return [];
  }
  
  // Get existing bookings that overlap with the requested dates
  let qb = supabase
    .from('bookings')
    .select('room_no')
    .eq('property_id', propertyId)
    .eq('cancelled', false)
    // Overlap condition: (check_in < requested_checkOut) AND (check_out > requested_checkIn)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn) as any;
  if (excludeBookingId) {
    qb = qb.neq('id', excludeBookingId);
  }
  const { data: existingBookings, error: bookingsError } = await qb;
  
  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return [];
  }
  
  const bookedRooms = new Set((existingBookings || []).map(b => b.room_no));
  
  // Filter out booked rooms
  const availableRooms = allRooms
    .filter(room => !bookedRooms.has(room.room_number))
    .map(room => ({ 
      roomNo: room.room_number, 
      roomType: room.room_type 
    }));
  
  return availableRooms;
}
