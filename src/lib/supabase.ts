// Re-export unified Supabase client and services
// This file maintains backward compatibility while using the new unified client architecture
export { 
  supabase as default,
  supabase,
  api,
  auth,
  withErrorHandling,
  type SupabaseClient,
  type Database,
  type User,
  type Session,
  type AuthError
} from './supabase/index'

export {
  bookingService,
  invoiceCounterService,
  checkInService,
  expenseService
} from './supabase/services'

export {
  performanceMonitor,
  withPerformanceMonitoring,
  withEnhancedErrorHandling,
  healthChecker,
  SupabaseError
} from './supabase/monitoring'

export { bookingChargesService } from '../services/bookingChargesService'
export { bookingPaymentsService } from '../services/bookingPaymentsService'

import { supabase } from './supabase/index'
import { bookingService, invoiceCounterService } from './supabase/services'
import { withEnhancedErrorHandling } from './supabase/monitoring'
import { Booking, BookingFilters } from '../types/booking'
import { CheckInData, CheckInFormData } from '../types/checkin'

// Legacy compatibility exports with enhanced error handling
export const getAdminClient = async () => {
  // Device token validation using unified client
  const deviceToken = localStorage.getItem('admin_device_token');
  
  if (deviceToken) {
    const { data: tokenData, error } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('device_token', deviceToken)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!error && tokenData) {
      return supabase;
    }
  }
  
  return supabase;
}

// Legacy admin client export (now uses unified client)
export const supabaseAdmin = supabase

// Note: invoiceCounterService now comes from unified client (./supabase/services)

// Note: bookingService now comes from unified client (./supabase/services)

// Legacy booking service (kept for backward compatibility)
export const legacyBookingService = {
  // Get all bookings with optional filters
  async getBookings(filters?: BookingFilters): Promise<Booking[]> {
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

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

      // Filter by booking source if provided
      if (filters?.source && filters.source !== 'all') {
        query = query.eq('source', filters.source)
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
        source: (booking as any).source,
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
          property_id: booking.propertyId,
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
          folio_number: folioNumber,
          source: (booking as any).source || null,
          source_details: (booking as any).source_details || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating booking:', error)
        return null
      }

      // Transform database fields to match interface
      const created: Booking = {
        id: data.id,
        propertyId: data.property_id,
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
        source: (data as any).source,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        specialRequests: data.special_requests,
        bookingDate: data.booking_date,
        folioNumber: data.folio_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      // Auto-append manual update checklist items for manual OTAs
      try {
        const { ManualUpdateService } = await import('../services/manualUpdateService');
        await ManualUpdateService.createDeltaChecklistsForBookingChange(
           created.propertyId || '',
           'created',
           { id: created.id, roomNo: created.roomNo, check_in: created.checkIn, check_out: created.checkOut }
         );
      } catch (e) {
        console.warn('ManualUpdateService delta generation failed on createBooking:', e);
      }

      return created
    } catch (error) {
      console.error('Error in createBooking:', error)
      return null
    }
  },

  // Update an existing booking
  async updateBooking(id: string, updates: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Booking | null> {
    try {
      const updateData: any = {}
      
      if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId
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
      // Optional OTA source fields
      if ((updates as any).source !== undefined) (updateData as any).source = (updates as any).source
      if ((updates as any).source_details !== undefined) (updateData as any).source_details = (updates as any).source_details

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
      const updated: Booking = {
        id: data.id,
        propertyId: data.property_id,
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
        source: (data as any).source,
        contactPhone: data.contact_phone,
        contactEmail: data.contact_email,
        specialRequests: data.special_requests,
        bookingDate: data.booking_date,
        folioNumber: data.folio_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      // Auto-append manual update checklist items for manual OTAs
      try {
        const { ManualUpdateService } = await import('../services/manualUpdateService');
        await ManualUpdateService.createDeltaChecklistsForBookingChange(
           updated.propertyId || '',
           'updated',
           { id: updated.id, roomNo: updated.roomNo, check_in: updated.checkIn, check_out: updated.checkOut }
         );
      } catch (e) {
        console.warn('ManualUpdateService delta generation failed on updateBooking:', e);
      }

      return updated
    } catch (error) {
      console.error('Error in updateBooking:', error)
      return null
    }
  },

  // Cancel a booking (sets cancelled to true)
  async cancelBooking(id: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ cancelled: true })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error cancelling booking:', error)
        return false
      }

      // Auto-append manual update checklist items for manual OTAs
      try {
        const { ManualUpdateService } = await import('../services/manualUpdateService');
        await ManualUpdateService.createDeltaChecklistsForBookingChange(
           data.property_id || '',
           'cancelled',
           { id: data.id, room_no: data.room_no, check_in: data.check_in, check_out: data.check_out }
         );
      } catch (e) {
        console.warn('ManualUpdateService delta generation failed on cancelBooking:', e);
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
        propertyId: data.property_id,
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
        source: (data as any).source,
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
  subscribeToBookings(callback: (booking: Booking, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void, propertyId?: string) {
    return supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'bookings',
          filter: propertyId ? `property_id=eq.${propertyId}` : undefined
        }, 
        (payload: any) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          
          if (payload.new && typeof payload.new === 'object') {
            const bookingData = payload.new as any
            const booking: Booking = {
              id: bookingData.id,
              propertyId: bookingData.property_id,
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
              source: (bookingData as any).source,
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
    if ((bookingData.noOfPax ?? 0) < 1) {
      errors.push('Number of guests must be at least 1');
    }

    if ((bookingData.noOfPax ?? 0) > 10) {
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

// Note: checkInService now comes from unified client (./supabase/services)

// Legacy check-in service (kept for backward compatibility)
export const legacyCheckInService = {
  // Create check-in data for a booking
  async createCheckInData(bookingId: string, formData: CheckInFormData): Promise<CheckInData | null> {
    try {
      // Transform camelCase to snake_case for database compatibility
      const checkInData = {
        booking_id: bookingId,
        // Personal Details
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        nationality: formData.nationality,
        id_type: formData.idType,
        id_number: formData.idNumber,
        // Address
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        zip_code: formData.zipCode,
        // Emergency Contact
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relation: formData.emergencyContactRelation,
        // Visit Details
        purpose_of_visit: formData.purposeOfVisit,
        arrival_date: formData.arrivalDate,
        departure_date: formData.departureDate,
        room_number: formData.roomNumber,
        number_of_guests: formData.numberOfGuests,
        // Additional Guests (use snake_case)
        additional_guests: formData.additionalGuests,
        // Special Requests
        special_requests: formData.specialRequests,
        // Preferences
        preferences: formData.preferences,
        // Agreement
        terms_accepted: formData.termsAccepted,
        marketing_consent: formData.marketingConsent,
        // ID Verification
        id_photo_urls: formData.id_photo_urls || [],
        id_verification_status: 'pending',
        // Metadata
        form_completed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('checkin_data')
        .insert(checkInData)
        .select()
        .single();

      if (error) {
        console.error('Error creating check-in data:', error);
        return null;
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        booking_id: data.booking_id,
        guest_profile_id: data.guest_profile_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        nationality: data.nationality,
        idType: data.id_type,
        idNumber: data.id_number,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zip_code,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        emergencyContactRelation: data.emergency_contact_relation,
        purposeOfVisit: data.purpose_of_visit,
        arrivalDate: data.arrival_date,
        departureDate: data.departure_date,
        roomNumber: data.room_number,
        numberOfGuests: data.number_of_guests,
        additionalGuests: data.additional_guests || [],
        specialRequests: data.special_requests,
        preferences: data.preferences || {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: data.terms_accepted || false,
        marketingConsent: data.marketing_consent || false,
        id_document_urls: data.id_document_urls,
        id_photo_urls: data.id_photo_urls || [],
        id_verification_status: data.id_verification_status || 'pending',
        verification_notes: data.verification_notes,
        verified_by: data.verified_by,
        verified_at: data.verified_at,
        extracted_id_data: data.extracted_id_data,
        form_completed_at: data.form_completed_at,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error in createCheckInData:', error);
      return null;
    }
  },

  // Get check-in data by booking ID
  async getCheckInDataByBookingId(bookingId: string): Promise<CheckInData | null> {
    try {
      const { data, error } = await supabase
        .from('checkin_data')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (error) {
        // For not-found or non-matching rows maybeSingle avoids 406; any other error: log once and return null
        console.warn('Error fetching check-in data:', error);
        return null;
      }

      if (!data) {
        // No row found for this booking
        return null;
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        booking_id: data.booking_id,
        guest_profile_id: data.guest_profile_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        nationality: data.nationality,
        idType: data.id_type,
        idNumber: data.id_number,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zip_code,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        emergencyContactRelation: data.emergency_contact_relation,
        purposeOfVisit: data.purpose_of_visit,
        arrivalDate: data.arrival_date,
        departureDate: data.departure_date,
        roomNumber: data.room_number,
        numberOfGuests: data.number_of_guests,
        additionalGuests: data.additional_guests || [],
        specialRequests: data.special_requests,
        preferences: data.preferences || {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: data.terms_accepted || false,
        marketingConsent: data.marketing_consent || false,
        id_document_urls: data.id_document_urls,
        id_photo_urls: data.id_photo_urls || [],
        id_verification_status: data.id_verification_status || 'pending',
        verification_notes: data.verification_notes,
        verified_by: data.verified_by,
        verified_at: data.verified_at,
        extracted_id_data: data.extracted_id_data,
        form_completed_at: data.form_completed_at,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error in getCheckInDataByBookingId:', error);
      return null;
    }
  },

  // Update check-in data
  async updateCheckInData(id: string, updates: Partial<CheckInFormData>): Promise<CheckInData | null> {
    try {
      // Transform camelCase to snake_case for database compatibility
      const updateData: any = {
        form_completed_at: new Date().toISOString()
      };

      // Transform each field if it exists in updates
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth;
      if (updates.nationality !== undefined) updateData.nationality = updates.nationality;
      if (updates.idType !== undefined) updateData.id_type = updates.idType;
      if (updates.idNumber !== undefined) updateData.id_number = updates.idNumber;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.zipCode !== undefined) updateData.zip_code = updates.zipCode;
      if (updates.emergencyContactName !== undefined) updateData.emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactRelation !== undefined) updateData.emergency_contact_relation = updates.emergencyContactRelation;
      if (updates.purposeOfVisit !== undefined) updateData.purpose_of_visit = updates.purposeOfVisit;
      if (updates.arrivalDate !== undefined) updateData.arrival_date = updates.arrivalDate;
      if (updates.departureDate !== undefined) updateData.departure_date = updates.departureDate;
      if (updates.roomNumber !== undefined) updateData.room_number = updates.roomNumber;
      if (updates.numberOfGuests !== undefined) updateData.number_of_guests = updates.numberOfGuests;
      if (updates.additionalGuests !== undefined) updateData.additional_guests = updates.additionalGuests;
      if (updates.specialRequests !== undefined) updateData.special_requests = updates.specialRequests;
      if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
      if (updates.termsAccepted !== undefined) updateData.terms_accepted = updates.termsAccepted;
      if (updates.marketingConsent !== undefined) updateData.marketing_consent = updates.marketingConsent;
      if (updates.id_photo_urls !== undefined) updateData.id_photo_urls = updates.id_photo_urls;

      const { data, error } = await supabase
        .from('checkin_data')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating check-in data:', error);
        return null;
      }

      // Transform database fields to match interface
      return {
        id: data.id,
        booking_id: data.booking_id,
        guest_profile_id: data.guest_profile_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        nationality: data.nationality,
        idType: data.id_type,
        idNumber: data.id_number,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zip_code,
        emergencyContactName: data.emergency_contact_name,
        emergencyContactPhone: data.emergency_contact_phone,
        emergencyContactRelation: data.emergency_contact_relation,
        purposeOfVisit: data.purpose_of_visit,
        arrivalDate: data.arrival_date,
        departureDate: data.departure_date,
        roomNumber: data.room_number,
        numberOfGuests: data.number_of_guests,
        additionalGuests: data.additional_guests || [],
        specialRequests: data.special_requests,
        preferences: data.preferences || {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: data.terms_accepted || false,
        marketingConsent: data.marketing_consent || false,
        id_document_urls: data.id_document_urls,
        id_photo_urls: data.id_photo_urls || [],
        id_verification_status: data.id_verification_status || 'pending',
        verification_notes: data.verification_notes,
        verified_by: data.verified_by,
        verified_at: data.verified_at,
        extracted_id_data: data.extracted_id_data,
        form_completed_at: data.form_completed_at,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error in updateCheckInData:', error);
      return null;
    }
  },

  // Get all check-in data with optional filters
  async getAllCheckInData(filters?: { 
    dateRange?: { start: string; end: string };
    completed?: boolean;
  }): Promise<CheckInData[]> {
    try {
      let query = supabase
        .from('checkin_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching check-in data:', error);
        return [];
      }

      // Transform database fields to match interface
      return (data || []).map((item: any) => ({
        id: item.id,
        booking_id: item.booking_id,
        guest_profile_id: item.guest_profile_id,
        firstName: item.firstName || item.first_name || '',
        lastName: item.lastName || item.last_name || '',
        email: item.email || '',
        phone: item.phone || '',
        dateOfBirth: item.dateOfBirth || item.date_of_birth,
        nationality: item.nationality,
        idType: item.idType || item.id_type || 'passport',
        idNumber: item.idNumber || item.id_number || '',
        address: item.address || '',
        city: item.city,
        state: item.state,
        country: item.country,
        zipCode: item.zipCode || item.zip_code,
        emergencyContactName: item.emergencyContactName || item.emergency_contact_name || '',
        emergencyContactPhone: item.emergencyContactPhone || item.emergency_contact_phone || '',
        emergencyContactRelation: item.emergencyContactRelation || item.emergency_contact_relation || '',
        purposeOfVisit: item.purposeOfVisit || item.purpose_of_visit || 'leisure',
        arrivalDate: item.arrivalDate || item.arrival_date || '',
        departureDate: item.departureDate || item.departure_date || '',
        roomNumber: item.roomNumber || item.room_number || '',
        numberOfGuests: item.numberOfGuests || item.number_of_guests || 1,
        additionalGuests: item.additionalGuests || item.additional_guests || [],
        specialRequests: item.specialRequests || item.special_requests,
        preferences: item.preferences || {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: item.termsAccepted || item.terms_accepted || false,
        marketingConsent: item.marketingConsent || item.marketing_consent || false,
        id_document_urls: item.id_document_urls,
        id_photo_urls: item.id_photo_urls || [],
        id_verification_status: item.id_verification_status || 'pending',
        verification_notes: item.verification_notes,
        verified_by: item.verified_by,
        verified_at: item.verified_at,
        extracted_id_data: item.extracted_id_data,
        form_completed_at: item.form_completed_at,
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error in getAllCheckInData:', error);
      return [];
    }
  },

  // Auto-populate form data from booking
  async getBookingDataForCheckIn(bookingId: string): Promise<Partial<CheckInFormData> | null> {
    try {
      const booking = await bookingService.getBookingById(bookingId);
      if (!booking) {
        return null;
      }

      // Auto-populate what we can from booking data
      return {
        firstName: booking.guestName?.split(' ')[0] || '',
        lastName: booking.guestName?.split(' ').slice(1).join(' ') || '',
        email: booking.contactEmail || '',
        phone: booking.contactPhone || '',
        dateOfBirth: '',
        nationality: '',
        idType: 'passport',
        idNumber: '',
        address: '', // This will need to be filled by guest
        city: '',
        state: '',
        country: '',
        zipCode: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        purposeOfVisit: 'leisure',
        arrivalDate: booking.checkIn || '',
        departureDate: booking.checkOut || '',
        roomNumber: booking.roomNo || '',
        numberOfGuests: booking.noOfPax || 1,
        additionalGuests: [],
        specialRequests: booking.specialRequests || '',
        preferences: {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: false,
        marketingConsent: false
      };
    } catch (error) {
      console.error('Error in getBookingDataForCheckIn:', error);
      return null;
    }
  },

  // Get default form data structure
  getDefaultCheckInFormData(): CheckInFormData {
    try {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        nationality: '',
        idType: 'passport',
        idNumber: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        purposeOfVisit: 'leisure',
        arrivalDate: '',
        departureDate: '',
        roomNumber: '',
        numberOfGuests: 1,
        additionalGuests: [],
        specialRequests: '',
        preferences: {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: false,
        marketingConsent: false
      };
    } catch (error) {
      console.error('Error in getDefaultCheckInFormData:', error);
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        idType: 'passport',
        idNumber: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        purposeOfVisit: 'leisure',
        arrivalDate: '',
        departureDate: '',
        roomNumber: '',
        numberOfGuests: 1,
        additionalGuests: [],
        preferences: {
          wakeUpCall: false,
          newspaper: false,
          extraTowels: false,
          extraPillows: false,
          roomService: false,
          doNotDisturb: false
        },
        termsAccepted: false,
        marketingConsent: false
      };
    }
  },

  // Real-time subscription to check-in data changes
  subscribeToCheckInData(callback: (checkInData: CheckInData, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
    return supabase
      .channel('checkin_data_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'checkin_data' 
        }, 
        (payload: any) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          
          if (payload.new && typeof payload.new === 'object') {
            const checkInData = payload.new as any;
            const transformedData: CheckInData = {
              id: checkInData.id,
              booking_id: checkInData.booking_id,
              guest_profile_id: checkInData.guest_profile_id,
              firstName: checkInData.firstName || checkInData.first_name,
              lastName: checkInData.lastName || checkInData.last_name,
              email: checkInData.email,
              phone: checkInData.phone,
              dateOfBirth: checkInData.dateOfBirth || checkInData.date_of_birth,
              nationality: checkInData.nationality,
              idType: checkInData.idType || checkInData.id_type,
              idNumber: checkInData.idNumber || checkInData.id_number,
              address: checkInData.address,
              city: checkInData.city,
              state: checkInData.state,
              country: checkInData.country,
              zipCode: checkInData.zipCode || checkInData.zip_code,
              emergencyContactName: checkInData.emergencyContactName || checkInData.emergency_contact_name,
              emergencyContactPhone: checkInData.emergencyContactPhone || checkInData.emergency_contact_phone,
              emergencyContactRelation: checkInData.emergencyContactRelation || checkInData.emergency_contact_relation,
              purposeOfVisit: checkInData.purposeOfVisit || checkInData.purpose_of_visit,
              arrivalDate: checkInData.arrivalDate || checkInData.arrival_date,
              departureDate: checkInData.departureDate || checkInData.departure_date,
              roomNumber: checkInData.roomNumber || checkInData.room_number,
              numberOfGuests: checkInData.numberOfGuests || checkInData.number_of_guests,
              additionalGuests: checkInData.additionalGuests || checkInData.additional_guests || [],
              specialRequests: checkInData.specialRequests || checkInData.special_requests,
              preferences: checkInData.preferences || {
                wakeUpCall: false,
                newspaper: false,
                extraTowels: false,
                extraPillows: false,
                roomService: false,
                doNotDisturb: false
              },
              termsAccepted: checkInData.termsAccepted || checkInData.terms_accepted || false,
              marketingConsent: checkInData.marketingConsent || checkInData.marketing_consent || false,
              id_document_urls: checkInData.id_document_urls,
              form_completed_at: checkInData.form_completed_at,
              created_at: checkInData.created_at
            };
            callback(transformedData, eventType);
          }
        }
      )
      .subscribe();
  }
};

export const emailMessageService = {
  async getRecent(limit: number = 5): Promise<Array<{ id: string; subject: string; receivedAt?: string }>> {
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('id, subject, received_at, processed')
        .eq('processed', false)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching email messages:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        subject: row.subject || '(no subject)',
        receivedAt: row.received_at || undefined
      }));
    } catch (e) {
      console.error('Error in getRecent email messages:', e);
      return [];
    }
  },
  async getUnprocessedAll(): Promise<Array<{ id: string; subject: string; receivedAt?: string }>> {
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('id, subject, received_at, processed')
        .eq('processed', false)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('Error fetching all unprocessed email messages:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        subject: row.subject || '(no subject)',
        receivedAt: row.received_at || undefined
      }));
    } catch (e) {
      console.error('Error in getUnprocessedAll email messages:', e);
      return [];
    }
  },
  async getById(id: string): Promise<{ id: string; subject: string; snippet?: string; sender?: string; receivedAt?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('id, subject, snippet, sender, received_at')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching email message by id:', error);
        return null;
      }

      return {
        id: data.id,
        subject: data.subject || '(no subject)',
        snippet: data.snippet || undefined,
        sender: data.sender || undefined,
        receivedAt: data.received_at || undefined
      };
    } catch (e) {
      console.error('Error in getById email message:', e);
      return null;
    }
  }
};

export const emailImportService = {
  async getByEmailMessageId(emailMessageId: string): Promise<{ id: string; email_message_id: string; booking_id?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('email_booking_imports')
        .select('id, email_message_id, booking_id')
        .eq('email_message_id', emailMessageId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching email booking import:', error);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Error in getByEmailMessageId:', e);
      return null;
    }
  }
};

export const emailParseQueueService = {
  async requeue(emailMessageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('email_parse_queue')
        .upsert({
          email_message_id: emailMessageId,
          status: 'pending',
          attempts: 0,
          last_error: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email_message_id' });
      if (error) {
        console.error('Error re-queuing email for parse:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error in emailParseQueueService.requeue:', e);
      return false;
    }
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