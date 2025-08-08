import { supabase } from '../lib/supabase';
import { Booking } from '../types/booking';
import { formatDateLocal } from '../utils/dateUtils';

// Supporting types for room booking service
export interface RoomAvailabilityMap {
  [roomNo: string]: {
    [dateString: string]: {
      status: 'available' | 'occupied' | 'checkout' | 'checkin' | 'checkin-checkout' | 'unavailable';
      booking?: Booking;
      checkInBooking?: Booking;
      checkOutBooking?: Booking;
      price: number;
    }
  }
}

export interface OccupancyStatus {
  isOccupied: boolean;
  booking?: Booking;
  status: 'available' | 'occupied' | 'checkout' | 'checkin';
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings: Booking[];
  conflictType?: 'overlap' | 'same_day_conflict' | 'capacity_exceeded';
  message?: string;
}

export class RoomBookingService {
  /**
   * Get all bookings for a specific room within date range
   */
  async getBookingsForRoom(roomNo: string, startDate: Date, endDate: Date): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_no', roomNo)
        .eq('cancelled', false)
        .lte('check_in', formatDateLocal(endDate))  // check_in <= endDate
        .gte('check_out', formatDateLocal(startDate)) // check_out >= startDate
        .order('check_in', { ascending: true });

      if (error) {
        console.error('Error fetching room bookings:', error);
        return [];
      }

      // Transform database fields to match interface
      return (data || []).map(booking => ({
        id: booking.id,
        propertyId: booking.property_id,
        guestName: booking.guest_name,
        roomNo: booking.room_no,
        numberOfRooms: booking.number_of_rooms || 1,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        noOfPax: booking.no_of_pax,
        adultChild: booking.adult_child,
        status: booking.status,
        cancelled: booking.cancelled,
        totalAmount: parseFloat(booking.total_amount),
        paymentStatus: booking.payment_status,
        paymentAmount: booking.payment_amount ? parseFloat(booking.payment_amount) : undefined,
        paymentMode: booking.payment_mode,
        contactPhone: booking.contact_phone,
        contactEmail: booking.contact_email,
        specialRequests: booking.special_requests,
        bookingDate: booking.booking_date,
        folioNumber: booking.folio_number,
        guestProfileId: booking.guest_profile_id,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      }));
    } catch (error) {
      console.error('Error in getBookingsForRoom:', error);
      return [];
    }
  }

  /**
   * Calculate availability for room grid display
   */
  async getRoomAvailability(roomNo: string, dates: Date[]): Promise<RoomAvailabilityMap[string]> {
    try {
      if (dates.length === 0) return {};

      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Get bookings for the room in the date range
      const bookings = await this.getBookingsForRoom(roomNo, startDate, endDate);

      // Get room pricing information
      const roomPricing = await this.getRoomPricing(roomNo);
      // Also fetch availability overrides for single-room path
      const { data: roomRow } = await supabase
        .from('rooms')
        .select('availability_overrides')
        .or(`room_no.eq.${roomNo},room_number.eq.${roomNo}`)
        .maybeSingle();
      const availabilityOverrides: Record<string, boolean> = roomRow?.availability_overrides || {};

      const availability: RoomAvailabilityMap[string] = {};

      // Initialize all dates as available
      dates.forEach(date => {
        const dateString = formatDateLocal(date);
        availability[dateString] = {
          status: 'available',
          price: roomPricing.basePrice
        };
      });

      // First pass: mark occupied dates and collect check-in/out dates
      const checkInDates = new Map<string, Booking[]>();
      const checkOutDates = new Map<string, Booking[]>();
      
      bookings.forEach(booking => {
        const checkInDateString = booking.checkIn;
        const checkOutDateString = booking.checkOut;
        
        // Collect check-ins and check-outs by date
        if (!checkInDates.has(checkInDateString)) {
          checkInDates.set(checkInDateString, []);
        }
        checkInDates.get(checkInDateString)!.push(booking);
        
        if (!checkOutDates.has(checkOutDateString)) {
          checkOutDates.set(checkOutDateString, []);
        }
        checkOutDates.get(checkOutDateString)!.push(booking);
        
        // Mark occupied dates
        dates.forEach(date => {
          const dateString = formatDateLocal(date);
          
          // Mark dates between check-in and check-out as occupied
          if (dateString > checkInDateString && dateString < checkOutDateString) {
            availability[dateString] = {
              status: 'occupied',
              booking,
              price: roomPricing.basePrice
            };
          }
        });
      });

      // Second pass: handle check-in and check-out dates
      dates.forEach(date => {
        const dateString = formatDateLocal(date);
        const hasCheckIn = checkInDates.has(dateString);
        const hasCheckOut = checkOutDates.has(dateString);
        
        if (hasCheckIn && hasCheckOut) {
          // Same day transition - both check-out and check-in
          const checkInBooking = checkInDates.get(dateString)![0];
          const checkOutBooking = checkOutDates.get(dateString)![0];
          
          availability[dateString] = {
            status: 'checkin-checkout' as any, // Same day transition
            booking: checkOutBooking, // Primary booking is the one checking out
            checkInBooking,
            checkOutBooking,
            price: roomPricing.basePrice
          };
        } else if (hasCheckIn) {
          // Check-in only
          const booking = checkInDates.get(dateString)![0];
          availability[dateString] = {
            status: 'checkin',
            booking,
            price: roomPricing.basePrice
          };
        } else if (hasCheckOut) {
          // Check-out only
          const booking = checkOutDates.get(dateString)![0];
          availability[dateString] = {
            status: 'checkout',
            booking,
            price: roomPricing.basePrice
          };
        } else {
          // Apply explicit unavailability overrides only when not occupied
          if (availabilityOverrides[dateString] === false) {
            availability[dateString] = {
              status: 'unavailable' as any,
              price: roomPricing.basePrice
            };
          }
        }
      });

      return availability;
    } catch (error) {
      console.error('Error in getRoomAvailability:', error);
      return {};
    }
  }

  /**
   * Get occupancy status for specific date
   */
  async getRoomOccupancyStatus(roomNo: string, date: Date): Promise<OccupancyStatus> {
    try {
      const dateString = formatDateLocal(date);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_no', roomNo)
        .eq('cancelled', false)
        .lte('check_in', dateString)
        .gt('check_out', dateString)
        .limit(1);

      if (error) {
        console.error('Error fetching room occupancy:', error);
        return { isOccupied: false, status: 'available' };
      }

      if (!data || data.length === 0) {
        return { isOccupied: false, status: 'available' };
      }

      const booking = data[0];
      const checkInDate = new Date(booking.check_in);
      const checkOutDate = new Date(booking.check_out);

      // Transform booking data
      const transformedBooking: Booking = {
        id: booking.id,
        propertyId: booking.property_id,
        guestName: booking.guest_name,
        roomNo: booking.room_no,
        numberOfRooms: booking.number_of_rooms || 1,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        noOfPax: booking.no_of_pax,
        adultChild: booking.adult_child,
        status: booking.status,
        cancelled: booking.cancelled,
        totalAmount: parseFloat(booking.total_amount),
        paymentStatus: booking.payment_status,
        paymentAmount: booking.payment_amount ? parseFloat(booking.payment_amount) : undefined,
        paymentMode: booking.payment_mode,
        contactPhone: booking.contact_phone,
        contactEmail: booking.contact_email,
        specialRequests: booking.special_requests,
        bookingDate: booking.booking_date,
        folioNumber: booking.folio_number,
        guestProfileId: booking.guest_profile_id,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      };

      // Determine status based on date
      let status: OccupancyStatus['status'] = 'occupied';
      if (date.toDateString() === checkInDate.toDateString()) {
        status = 'checkin';
      } else if (date.toDateString() === checkOutDate.toDateString()) {
        status = 'checkout';
      }

      return {
        isOccupied: true,
        booking: transformedBooking,
        status
      };
    } catch (error) {
      console.error('Error in getRoomOccupancyStatus:', error);
      return { isOccupied: false, status: 'available' };
    }
  }

  /**
   * Detect conflicts when creating new bookings
   */
  async detectRoomConflicts(roomNo: string, checkIn: Date, checkOut: Date): Promise<ConflictResult> {
    try {
      const checkInString = formatDateLocal(checkIn);
      const checkOutString = formatDateLocal(checkOut);

      // Find overlapping bookings
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('room_no', roomNo)
        .eq('cancelled', false)
        .or(`and(check_in.lt.${checkOutString},check_out.gt.${checkInString})`);

      if (error) {
        console.error('Error detecting conflicts:', error);
        return { hasConflict: false, conflictingBookings: [] };
      }

      if (!data || data.length === 0) {
        return { hasConflict: false, conflictingBookings: [] };
      }

      // Transform conflicting bookings
      const conflictingBookings: Booking[] = data.map(booking => ({
        id: booking.id,
        propertyId: booking.property_id,
        guestName: booking.guest_name,
        roomNo: booking.room_no,
        numberOfRooms: booking.number_of_rooms || 1,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        noOfPax: booking.no_of_pax,
        adultChild: booking.adult_child,
        status: booking.status,
        cancelled: booking.cancelled,
        totalAmount: parseFloat(booking.total_amount),
        paymentStatus: booking.payment_status,
        paymentAmount: booking.payment_amount ? parseFloat(booking.payment_amount) : undefined,
        paymentMode: booking.payment_mode,
        contactPhone: booking.contact_phone,
        contactEmail: booking.contact_email,
        specialRequests: booking.special_requests,
        bookingDate: booking.booking_date,
        folioNumber: booking.folio_number,
        guestProfileId: booking.guest_profile_id,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      }));

      // Determine conflict type
      let conflictType: ConflictResult['conflictType'] = 'overlap';
      let message = `Room ${roomNo} has ${conflictingBookings.length} conflicting booking(s)`;

      // Check for same-day conflicts (checkout/checkin on same day)
      const sameDayConflicts = conflictingBookings.filter(booking => 
        booking.checkOut === checkInString || booking.checkIn === checkOutString
      );

      if (sameDayConflicts.length > 0 && conflictingBookings.length === sameDayConflicts.length) {
        conflictType = 'same_day_conflict';
        message = `Room ${roomNo} has same-day checkout/checkin conflicts`;
      }

      return {
        hasConflict: true,
        conflictingBookings,
        conflictType,
        message
      };
    } catch (error) {
      console.error('Error in detectRoomConflicts:', error);
      return { hasConflict: false, conflictingBookings: [] };
    }
  }

  /**
   * Get room pricing information (helper method)
   */
  private async getRoomPricing(roomNo: string): Promise<{ basePrice: number; seasonalPricing: Record<string, number> }> {
    try {
      // Try with room_no first
      let query = supabase
        .from('rooms')
        .select('base_price, seasonal_pricing')
        .eq('room_no', roomNo);

      let { data, error } = await query.single();

      // If that fails, try with room_number
      if (error && error.code === 'PGRST116') {
        query = supabase
          .from('rooms')
          .select('base_price, seasonal_pricing')
          .eq('room_number', roomNo);
        
        ({ data, error } = await query.single());
      }

      // If still no data found, return default silently
      if (error || !data) {
        if (error && error.code !== 'PGRST116') {
          console.warn(`Room pricing query failed for room ${roomNo}:`, error.message);
        }
        return { basePrice: 1000, seasonalPricing: {} };
      }

      return {
        basePrice: data.base_price || 1000,
        seasonalPricing: data.seasonal_pricing || {}
      };
    } catch (error) {
      // Don't log errors for missing rooms - it's expected in some cases
      return { basePrice: 1000, seasonalPricing: {} };
    }
  }

  /**
   * Get pricing for multiple rooms at once
   */
  private async getBatchRoomPricing(roomNumbers: string[]): Promise<Map<string, { basePrice: number; seasonalPricing: Record<string, number>, availabilityOverrides: Record<string, boolean> }>> {
    const pricingMap = new Map<string, { basePrice: number; seasonalPricing: Record<string, number>, availabilityOverrides: Record<string, boolean> }>();
    
    try {
      // Try to get all room pricing in one query - fix column name issue
      const { data, error } = await supabase
        .from('rooms')
        .select('room_number, base_price, seasonal_pricing, availability_overrides')
        .in('room_number', roomNumbers);

      if (data) {
        data.forEach(room => {
          const roomNo = room.room_number;
          if (roomNo) {
            pricingMap.set(roomNo, {
              basePrice: room.base_price || 1000,
              seasonalPricing: room.seasonal_pricing || {},
              availabilityOverrides: room.availability_overrides || {}
            });
          }
        });
      }

      // Fill in missing rooms with defaults
      roomNumbers.forEach(roomNo => {
        if (!pricingMap.has(roomNo)) {
          pricingMap.set(roomNo, { basePrice: 1000, seasonalPricing: {}, availabilityOverrides: {} });
        }
      });

    } catch (error) {
      // If batch query fails, set defaults for all rooms
      roomNumbers.forEach(roomNo => {
        pricingMap.set(roomNo, { basePrice: 1000, seasonalPricing: {}, availabilityOverrides: {} });
      });
    }

    return pricingMap;
  }

  /**
   * Batch process multiple room queries for performance
   */
  async getBatchRoomAvailability(roomNumbers: string[], dates: Date[]): Promise<RoomAvailabilityMap> {
    try {
      if (roomNumbers.length === 0 || dates.length === 0) return {};

      const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Get all pricing data in one batch
      const pricingMap = await this.getBatchRoomPricing(roomNumbers);

      // Get all bookings for all rooms in one query - use correct field names
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('room_no', roomNumbers)  // bookings table uses room_no
        .eq('cancelled', false)
        .lte('check_in', formatDateLocal(endDate))  // check_in <= endDate
        .gte('check_out', formatDateLocal(startDate)); // check_out >= startDate

      if (bookingsError) {
        console.error('Error fetching batch bookings:', bookingsError);
      }

      // Group bookings by room
      const bookingsByRoom = new Map<string, Booking[]>();
      if (bookingsData) {
        bookingsData.forEach(bookingRow => {
          const booking: Booking = {
            id: bookingRow.id,
            propertyId: bookingRow.property_id,
            guestName: bookingRow.guest_name,
            roomNo: bookingRow.room_no,
            numberOfRooms: bookingRow.number_of_rooms || 1,
            checkIn: bookingRow.check_in,
            checkOut: bookingRow.check_out,
            noOfPax: bookingRow.no_of_pax,
            adultChild: bookingRow.adult_child,
            status: bookingRow.status,
            cancelled: bookingRow.cancelled,
            totalAmount: parseFloat(bookingRow.total_amount),
            paymentStatus: bookingRow.payment_status,
            paymentAmount: bookingRow.payment_amount ? parseFloat(bookingRow.payment_amount) : undefined,
            paymentMode: bookingRow.payment_mode,
            contactPhone: bookingRow.contact_phone,
            contactEmail: bookingRow.contact_email,
            specialRequests: bookingRow.special_requests,
            bookingDate: bookingRow.booking_date,
            folioNumber: bookingRow.folio_number,
            guestProfileId: bookingRow.guest_profile_id,
            createdAt: bookingRow.created_at,
            updatedAt: bookingRow.updated_at
          };

          if (!bookingsByRoom.has(booking.roomNo)) {
            bookingsByRoom.set(booking.roomNo, []);
          }
          bookingsByRoom.get(booking.roomNo)!.push(booking);
        });
      }

      // Build availability map
      const batchResult: RoomAvailabilityMap = {};
      
      roomNumbers.forEach(roomNo => {
        const roomBookings = bookingsByRoom.get(roomNo) || [];
        const roomPricing = pricingMap.get(roomNo) || { basePrice: 1000, seasonalPricing: {}, availabilityOverrides: {} };
        const availabilityOverrides = roomPricing.availabilityOverrides || {};
        
        const availability: RoomAvailabilityMap[string] = {};
        
        // Initialize all dates as available
        dates.forEach(date => {
          const dateString = formatDateLocal(date);
          availability[dateString] = {
            status: 'available',
            price: roomPricing.basePrice
          };
        });

        // First pass: mark occupied dates and collect check-in/out dates
        const checkInDates = new Map<string, Booking[]>();
        const checkOutDates = new Map<string, Booking[]>();
        
        roomBookings.forEach(booking => {
          const checkInDateString = booking.checkIn;
          const checkOutDateString = booking.checkOut;
          
          // Collect check-ins and check-outs by date
          if (!checkInDates.has(checkInDateString)) {
            checkInDates.set(checkInDateString, []);
          }
          checkInDates.get(checkInDateString)!.push(booking);
          
          if (!checkOutDates.has(checkOutDateString)) {
            checkOutDates.set(checkOutDateString, []);
          }
          checkOutDates.get(checkOutDateString)!.push(booking);
          
          // Mark occupied dates
          dates.forEach(date => {
            const dateString = formatDateLocal(date);
            
            // Mark dates between check-in and check-out as occupied
            if (dateString > checkInDateString && dateString < checkOutDateString) {
              availability[dateString] = {
                status: 'occupied',
                booking,
                price: roomPricing.basePrice
              };
            }
          });
        });

        // Second pass: handle check-in and check-out dates
        dates.forEach(date => {
          const dateString = formatDateLocal(date);
          const hasCheckIn = checkInDates.has(dateString);
          const hasCheckOut = checkOutDates.has(dateString);
          
          if (hasCheckIn && hasCheckOut) {
            // Same day transition - both check-out and check-in
            const checkInBooking = checkInDates.get(dateString)![0];
            const checkOutBooking = checkOutDates.get(dateString)![0];
            
            availability[dateString] = {
              status: 'checkin-checkout',
              booking: checkOutBooking, // Primary booking is the one checking out
              checkInBooking,
              checkOutBooking,
              price: roomPricing.basePrice
            };
          } else if (hasCheckIn) {
            // Check-in only
            const booking = checkInDates.get(dateString)![0];
            availability[dateString] = {
              status: 'checkin',
              booking,
              price: roomPricing.basePrice
            };
          } else if (hasCheckOut) {
            // Check-out only
            const booking = checkOutDates.get(dateString)![0];
            availability[dateString] = {
              status: 'checkout',
              booking,
              price: roomPricing.basePrice
            };
          } else {
            // Apply explicit unavailability overrides only when not occupied
            if (availabilityOverrides[dateString] === false) {
              availability[dateString] = {
                status: 'unavailable',
                price: roomPricing.basePrice
              } as any;
            }
          }
        });

        batchResult[roomNo] = availability;
      });

      return batchResult;
    } catch (error) {
      console.error('Error in getBatchRoomAvailability:', error);
      return {};
    }
  }
}

// Export singleton instance
export const roomBookingService = new RoomBookingService();