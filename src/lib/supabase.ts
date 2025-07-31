import { createClient } from '@supabase/supabase-js'
import { Booking, BookingFilters } from '../types/booking'

// Replace these with your actual Supabase project credentials
// You'll get these after creating your Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database functions for invoice counter
export const invoiceCounterService = {
  // Get current counter value
  async getCounter(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('invoice_counter')
        .select('value')
        .eq('id', 1)
        .single()

      if (error) {
        // If counter doesn't exist, create it with default value
        if (error.code === 'PGRST116') {
          await this.initializeCounter()
          return 391
        }
        console.error('Error fetching counter:', error)
        return 391
      }

      return data?.value || 391
    } catch (error) {
      console.error('Error in getCounter:', error)
      return 391
    }
  },

  // Update counter value
  async updateCounter(newValue: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoice_counter')
        .upsert({ id: 1, value: newValue })

      if (error) {
        console.error('Error updating counter:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateCounter:', error)
      return false
    }
  },

  // Initialize counter with default value
  async initializeCounter(): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoice_counter')
        .insert({ id: 1, value: 391 })

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error initializing counter:', error)
      }
    } catch (error) {
      console.error('Error in initializeCounter:', error)
    }
  },

  // Real-time subscription to counter changes
  subscribeToCounter(callback: (value: number) => void) {
    return supabase
      .channel('invoice_counter_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'invoice_counter' 
        }, 
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            callback(payload.new.value as number)
          }
        }
      )
      .subscribe()
  }
}

// Database functions for booking management
export const bookingService = {
  // Get all bookings with optional filters
  async getBookings(filters?: BookingFilters): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.dateRange) {
        query = query
          .gte('check_in', filters.dateRange.start)
          .lte('check_out', filters.dateRange.end)
      }

      if (filters?.guestName) {
        query = query.ilike('guest_name', `%${filters.guestName}%`)
      }

      if (filters?.roomNo) {
        query = query.ilike('room_no', `%${filters.roomNo}%`)
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.paymentStatus && filters.paymentStatus.length > 0) {
        query = query.in('payment_status', filters.paymentStatus)
      }

      // Filter cancelled bookings based on preference
      if (filters?.showCancelled === false) {
        query = query.eq('cancelled', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        return []
      }

      // Transform database fields to match interface
      return (data || []).map(booking => ({
        id: booking.id,
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
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      }))
    } catch (error) {
      console.error('Error in getBookings:', error)
      return []
    }
  },

  // Create a new booking
  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking | null> {
    try {
      // Generate folio number if not provided
      let folioNumber = booking.folioNumber;
      if (!folioNumber) {
        const counter = await invoiceCounterService.getCounter();
        folioNumber = `520/${counter}`;
        // Increment counter for next booking
        await invoiceCounterService.updateCounter(counter + 1);
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          guest_name: booking.guestName,
          room_no: booking.roomNo,
          number_of_rooms: booking.numberOfRooms || 1,
          check_in: booking.checkIn,
          check_out: booking.checkOut,
          no_of_pax: booking.noOfPax,
          adult_child: booking.adultChild,
          status: booking.status,
          cancelled: booking.cancelled,
          total_amount: booking.totalAmount,
          payment_status: booking.paymentStatus,
          payment_amount: booking.paymentAmount || null,
          payment_mode: booking.paymentMode || null,
          contact_phone: booking.contactPhone,
          contact_email: booking.contactEmail,
          special_requests: booking.specialRequests,
          booking_date: booking.bookingDate || null,
          folio_number: folioNumber
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating booking:', error)
        return null
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        guestName: data.guest_name,
        roomNo: data.room_no,
        numberOfRooms: data.number_of_rooms || 1,
        checkIn: data.check_in,
        checkOut: data.check_out,
        noOfPax: data.no_of_pax,
        adultChild: data.adult_child,
        status: data.status,
        cancelled: data.cancelled,
        totalAmount: parseFloat(data.total_amount),
        paymentStatus: data.payment_status,
        paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
        paymentMode: data.payment_mode,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        specialRequests: data.special_requests,
        bookingDate: data.booking_date,
        folioNumber: data.folio_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in createBooking:', error)
      return null
    }
  },

  // Update an existing booking
  async updateBooking(id: string, updates: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Booking | null> {
    try {
      const updateData: any = {}
      
      if (updates.guestName !== undefined) updateData.guest_name = updates.guestName
      if (updates.roomNo !== undefined) updateData.room_no = updates.roomNo
      if (updates.numberOfRooms !== undefined) updateData.number_of_rooms = updates.numberOfRooms
      if (updates.checkIn !== undefined) updateData.check_in = updates.checkIn || null
      if (updates.checkOut !== undefined) updateData.check_out = updates.checkOut || null
      if (updates.noOfPax !== undefined) updateData.no_of_pax = updates.noOfPax
      if (updates.adultChild !== undefined) updateData.adult_child = updates.adultChild
      if (updates.status !== undefined) updateData.status = updates.status
      if (updates.cancelled !== undefined) updateData.cancelled = updates.cancelled
      if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount
      if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus
      if (updates.paymentAmount !== undefined) updateData.payment_amount = updates.paymentAmount || null
      if (updates.paymentMode !== undefined) updateData.payment_mode = updates.paymentMode || null
      if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone
      if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail
      if (updates.specialRequests !== undefined) updateData.special_requests = updates.specialRequests
      if (updates.bookingDate !== undefined) updateData.booking_date = updates.bookingDate || null
      if (updates.folioNumber !== undefined) updateData.folio_number = updates.folioNumber

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating booking:', error)
        return null
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        guestName: data.guest_name,
        roomNo: data.room_no,
        numberOfRooms: data.number_of_rooms || 1,
        checkIn: data.check_in,
        checkOut: data.check_out,
        noOfPax: data.no_of_pax,
        adultChild: data.adult_child,
        status: data.status,
        cancelled: data.cancelled,
        totalAmount: parseFloat(data.total_amount),
        paymentStatus: data.payment_status,
        paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
        paymentMode: data.payment_mode,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        specialRequests: data.special_requests,
        bookingDate: data.booking_date,
        folioNumber: data.folio_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in updateBooking:', error)
      return null
    }
  },

  // Cancel a booking (sets cancelled to true)
  async cancelBooking(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ cancelled: true })
        .eq('id', id)

      if (error) {
        console.error('Error cancelling booking:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in cancelBooking:', error)
      return false
    }
  },

  // Delete a booking
  async deleteBooking(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting booking:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteBooking:', error)
      return false
    }
  },

  // Get a single booking by ID
  async getBookingById(id: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching booking:', error)
        return null
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        guestName: data.guest_name,
        roomNo: data.room_no,
        numberOfRooms: data.number_of_rooms || 1,
        checkIn: data.check_in,
        checkOut: data.check_out,
        noOfPax: data.no_of_pax,
        adultChild: data.adult_child,
        status: data.status,
        cancelled: data.cancelled,
        totalAmount: parseFloat(data.total_amount),
        paymentStatus: data.payment_status,
        paymentAmount: data.payment_amount ? parseFloat(data.payment_amount) : undefined,
        paymentMode: data.payment_mode,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        specialRequests: data.special_requests,
        bookingDate: data.booking_date,
        folioNumber: data.folio_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error in getBookingById:', error)
      return null
    }
  },

  // Real-time subscription to booking changes
  subscribeToBookings(callback: (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
    return supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings' 
        }, 
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          
          if (payload.new && typeof payload.new === 'object') {
            const bookingData = payload.new as any
            const booking: Booking = {
              id: bookingData.id,
              guestName: bookingData.guest_name,
              roomNo: bookingData.room_no,
              numberOfRooms: bookingData.number_of_rooms || 1,
              checkIn: bookingData.check_in,
              checkOut: bookingData.check_out,
              noOfPax: bookingData.no_of_pax,
              adultChild: bookingData.adult_child,
              status: bookingData.status,
              cancelled: bookingData.cancelled,
              totalAmount: parseFloat(bookingData.total_amount),
              paymentStatus: bookingData.payment_status,
              paymentAmount: bookingData.payment_amount ? parseFloat(bookingData.payment_amount) : undefined,
              paymentMode: bookingData.payment_mode,
              contactPhone: bookingData.contact_phone,
              contactEmail: bookingData.contact_email,
              specialRequests: bookingData.special_requests,
              bookingDate: bookingData.booking_date,
              folioNumber: bookingData.folio_number,
              createdAt: bookingData.created_at,
              updatedAt: bookingData.updated_at
            }
            callback(booking, eventType)
          }
        }
      )
      .subscribe()
  }
}

// Validation functions
export const validateBooking = async (
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
  excludeBookingId?: string,
  skipConflictValidation?: boolean
): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    // Skip room conflict and date validations for cancelled bookings
    if (!skipConflictValidation) {
      // Check for room conflicts
      const roomConflict = await checkRoomConflict(
        bookingData.roomNo,
        bookingData.checkIn,
        bookingData.checkOut,
        excludeBookingId
      );

      if (roomConflict.hasConflict) {
        errors.push(`Room ${bookingData.roomNo} is already booked from ${roomConflict.conflictDetails?.checkIn} to ${roomConflict.conflictDetails?.checkOut} by ${roomConflict.conflictDetails?.guestName}`);
      }

      // Check date validity (only if both dates are provided)
      if (bookingData.checkIn?.trim() && bookingData.checkOut?.trim()) {
        const checkInDate = new Date(bookingData.checkIn);
        const checkOutDate = new Date(bookingData.checkOut);

        if (checkInDate >= checkOutDate) {
          errors.push('Check-out date must be after check-in date');
        }
      }
    }

    // Check guest capacity
    if (bookingData.noOfPax < 1) {
      errors.push('Number of guests must be at least 1');
    }

    if (bookingData.noOfPax > 10) {
      errors.push('Number of guests cannot exceed 10 per room');
    }

    // Check amount validity
    if (bookingData.totalAmount < 0) {
      errors.push('Total amount cannot be negative');
    }

    // Check required fields
    if (!bookingData.guestName?.trim()) {
      errors.push('Guest name is required');
    }

    if (!bookingData.roomNo?.trim()) {
      errors.push('Room number is required');
    }

    if (!bookingData.checkIn?.trim()) {
      errors.push('Check-in date is required');
    }

    if (!bookingData.checkOut?.trim()) {
      errors.push('Check-out date is required');
    }

    // Check email format if provided
    if (bookingData.contactEmail && !isValidEmail(bookingData.contactEmail)) {
      errors.push('Please enter a valid email address');
    }

    // Check phone format if provided
    if (bookingData.contactPhone && !isValidPhone(bookingData.contactPhone)) {
      errors.push('Please enter a valid phone number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Error validating booking:', error);
    return {
      isValid: false,
      errors: ['An error occurred while validating the booking']
    };
  }
};

export const checkRoomConflict = async (
  roomNo: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<{
  hasConflict: boolean;
  conflictDetails?: {
    bookingId: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
  };
}> => {
  try {
    let query = supabase
      .from('bookings')
      .select('id, guest_name, check_in, check_out')
      .eq('room_no', roomNo)
      .eq('cancelled', false);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: allBookings, error } = await query;

    if (error) {
      console.error('Error checking room conflict:', error);
      return { hasConflict: false };
    }

    // Check for overlapping bookings manually
    const conflictingBookings = allBookings?.filter(booking => {
      const existingCheckIn = new Date(booking.check_in);
      const existingCheckOut = new Date(booking.check_out);
      const newCheckIn = new Date(checkIn);
      const newCheckOut = new Date(checkOut);

      // Check if the date ranges overlap
      // Two date ranges overlap if: start1 < end2 && start2 < end1
      return newCheckIn < existingCheckOut && existingCheckIn < newCheckOut;
    });

    if (conflictingBookings && conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0];
      return {
        hasConflict: true,
        conflictDetails: {
          bookingId: conflict.id,
          guestName: conflict.guest_name,
          checkIn: conflict.check_in,
          checkOut: conflict.check_out
        }
      };
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking room conflict:', error);
    return { hasConflict: false };
  }
};

// Helper validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Enhanced create booking with validation
export const createBookingWithValidation = async (
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; booking?: Booking; errors?: string[] }> => {
  // Validate booking data
  const validation = await validateBooking(bookingData);
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  // If validation passes, create the booking
  try {
    const booking = await bookingService.createBooking(bookingData);
    if (!booking) {
      return {
        success: false,
        errors: ['Failed to create booking. Please try again.']
      };
    }
    return {
      success: true,
      booking
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      errors: ['Failed to create booking. Please try again.']
    };
  }
};

// Enhanced update booking with validation
export const updateBookingWithValidation = async (
  id: string,
  updates: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; booking?: Booking; errors?: string[] }> => {
  try {
    // Get current booking data
    const currentBooking = await bookingService.getBookingById(id);
    if (!currentBooking) {
      return {
        success: false,
        errors: ['Booking not found']
      };
    }

    // Merge current data with updates
    const updatedBookingData = {
      ...currentBooking,
      ...updates
    };

    // Remove fields that shouldn't be validated
    const { id: _, createdAt: __, updatedAt: ___, ...validationData } = updatedBookingData;

    // Skip conflict validation for cancelled bookings
    const skipConflictValidation = currentBooking.cancelled || updatedBookingData.cancelled;

    // Validate the updated booking data
    const validation = await validateBooking(validationData, id, skipConflictValidation);
    
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // If validation passes, update the booking
    const booking = await bookingService.updateBooking(id, updates);
    if (!booking) {
      return {
        success: false,
        errors: ['Failed to update booking. Please try again.']
      };
    }
    return {
      success: true,
      booking
    };
  } catch (error) {
    console.error('Error updating booking:', error);
    return {
      success: false,
      errors: ['Failed to update booking. Please try again.']
    };
  }
};

// Check for potential scheduling conflicts
export const getSchedulingConflicts = async (
  roomNo?: string,
  dateRange?: { start: string; end: string }
): Promise<{
  conflicts: Array<{
    date: string;
    room: string;
    bookings: Array<{
      id: string;
      guestName: string;
      checkIn: string;
      checkOut: string;
    }>;
  }>;
}> => {
  try {
    let query = supabase
      .from('bookings')
      .select('id, guest_name, room_no, check_in, check_out')
      .eq('cancelled', false)
      .order('check_in');

    if (roomNo) {
      query = query.eq('room_no', roomNo);
    }

    if (dateRange) {
      query = query
        .gte('check_in', dateRange.start)
        .lte('check_out', dateRange.end);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error getting scheduling conflicts:', error);
      return { conflicts: [] };
    }

    // Group bookings by room and find overlaps
    const roomBookings: { [room: string]: any[] } = {};
    bookings?.forEach(booking => {
      if (!roomBookings[booking.room_no]) {
        roomBookings[booking.room_no] = [];
      }
      roomBookings[booking.room_no].push(booking);
    });

    const conflicts: any[] = [];

    Object.entries(roomBookings).forEach(([room, bookings]) => {
      // Check for overlapping bookings in the same room
      for (let i = 0; i < bookings.length; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
          const booking1 = bookings[i];
          const booking2 = bookings[j];

          const start1 = new Date(booking1.check_in);
          const end1 = new Date(booking1.check_out);
          const start2 = new Date(booking2.check_in);
          const end2 = new Date(booking2.check_out);

          // Check if bookings overlap
          if (start1 < end2 && start2 < end1) {
            const conflictDate = start1 > start2 ? booking1.check_in : booking2.check_in;
            
            conflicts.push({
              date: conflictDate,
              room,
              bookings: [
                {
                  id: booking1.id,
                  guestName: booking1.guest_name,
                  checkIn: booking1.check_in,
                  checkOut: booking1.check_out
                },
                {
                  id: booking2.id,
                  guestName: booking2.guest_name,
                  checkIn: booking2.check_in,
                  checkOut: booking2.check_out
                }
              ]
            });
          }
        }
      }
    });

    return { conflicts };
  } catch (error) {
    console.error('Error getting scheduling conflicts:', error);
    return { conflicts: [] };
  }
}; 