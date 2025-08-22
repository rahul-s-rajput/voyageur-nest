import { supabase, withErrorHandling } from './index'
import { Booking, BookingFilters } from '../../types/booking'
import { CheckInData, CheckInFormData } from '../../types/checkin'

// Enhanced booking service with unified client and RLS policies
export const bookingService = {
  // Get all bookings with optional filters (admin only via RLS)
  getBookings: withErrorHandling(async (filters?: BookingFilters): Promise<Booking[]> => {
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

    if (filters?.source && filters.source !== 'all') {
      query = query.eq('source', filters.source)
    }

    if (filters?.showCancelled === false) {
      query = query.eq('cancelled', false)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to load bookings: ${error.message}`)
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
  }),

  // Create a new booking (public access allowed via RLS)
  createBooking: withErrorHandling(async (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking | null> => {
    // Generate folio number if not provided
    let folioNumber = booking.folioNumber;
    if (!folioNumber) {
      const counter = await invoiceCounterService.getCounter();
      folioNumber = `520/${counter}`;
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
        total_amount: booking.totalAmount.toString(),
        payment_status: booking.paymentStatus,
        payment_amount: booking.paymentAmount?.toString() || null,
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
      throw new Error(`Failed to create booking: ${error.message}`)
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
  }),

  // Update booking (admin only via RLS)
  updateBooking: withErrorHandling(async (id: string, updates: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Booking | null> => {
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
    if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount.toString()
    if (updates.paymentStatus !== undefined) updateData.payment_status = updates.paymentStatus
    if (updates.paymentAmount !== undefined) updateData.payment_amount = updates.paymentAmount?.toString() || null
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
      throw new Error(`Failed to update booking: ${error.message}`)
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
  }),

  // Get booking by ID (access controlled by RLS)
  getBookingById: withErrorHandling(async (id: string): Promise<Booking | null> => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch booking: ${error.message}`)
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
  }),

  // Cancel booking (admin only via RLS)
  cancelBooking: withErrorHandling(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('bookings')
      .update({ cancelled: true })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`)
    }

    return true
  }),

  // Delete booking (admin only via RLS)
  deleteBooking: withErrorHandling(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete booking: ${error.message}`)
    }

    return true
  })
}

// Invoice counter service (admin access only)
export const invoiceCounterService = {
  getCounter: withErrorHandling(async (): Promise<number> => {
    const { data, error } = await supabase
      .from('invoice_counter')
      .select('value')
      .eq('id', 1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        await invoiceCounterService.initializeCounter()
        return 391
      }
      throw new Error(`Failed to fetch counter: ${error.message}`)
    }

    return data?.value || 391
  }),

  updateCounter: withErrorHandling(async (newValue: number): Promise<boolean> => {
    const { error } = await supabase
      .from('invoice_counter')
      .upsert({ id: 1, value: newValue })

    if (error) {
      throw new Error(`Failed to update counter: ${error.message}`)
    }

    return true
  }),

  initializeCounter: withErrorHandling(async (): Promise<void> => {
    const { error } = await supabase
      .from('invoice_counter')
      .insert({ id: 1, value: 391 })

    if (error && error.code !== '23505') {
      throw new Error(`Failed to initialize counter: ${error.message}`)
    }
  })
}

// Check-in service with RLS-based access control
export const checkInService = {
  createCheckInData: withErrorHandling(async (bookingId: string, formData: CheckInFormData): Promise<CheckInData | null> => {
    const checkInData = {
      booking_id: bookingId,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      date_of_birth: formData.dateOfBirth,
      nationality: formData.nationality,
      id_type: formData.idType,
      id_number: formData.idNumber,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      zip_code: formData.zipCode,
      emergency_contact_name: formData.emergencyContactName,
      emergency_contact_phone: formData.emergencyContactPhone,
      emergency_contact_relation: formData.emergencyContactRelation,
      purpose_of_visit: formData.purposeOfVisit,
      arrival_date: formData.arrivalDate,
      departure_date: formData.departureDate,
      room_number: formData.roomNumber,
      number_of_guests: formData.numberOfGuests,
      additional_guests: formData.additionalGuests,
      special_requests: formData.specialRequests,
      preferences: formData.preferences,
      terms_accepted: formData.termsAccepted,
      marketing_consent: formData.marketingConsent,
      id_photo_urls: formData.id_photo_urls || [],
      id_verification_status: 'pending',
      form_completed_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('checkin_data')
      .insert(checkInData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create check-in data: ${error.message}`)
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
    }
  }),

  getCheckInDataByBookingId: withErrorHandling(async (bookingId: string): Promise<CheckInData | null> => {
    const { data, error } = await supabase
      .from('checkin_data')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch check-in data: ${error.message}`)
    }

    if (!data) return null

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
    }
  })
}

// Expense management (admin only via RLS)
export const expenseService = {
  getAllExpenses: withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to load expenses: ${error.message}`)
    }
    
    return data
  }),

  createExpense: withErrorHandling(async (expenseData: any) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`)
    }
    
    return data
  })
}
