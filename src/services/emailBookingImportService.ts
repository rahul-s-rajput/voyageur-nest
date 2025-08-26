import { supabase } from '../lib/supabase';
import type { EmailBookingImport } from '../types/ota';
import type { ParsedBookingEmail } from './aiEmailParserService';
import { propertyService } from './propertyService';
import { bookingService } from '../lib/supabase';
import type { Booking } from '../types/booking';
import { notificationService } from './notificationService';
import { GuestProfileService } from './guestProfileService';

export class EmailBookingImportService {
  /**
   * Find a booking linked to any prior email in the same Gmail thread.
   */
  static async getBookingFromThread(emailMessageId: string): Promise<Booking | null> {
    try {
      // 1) Find the thread id for this email
      const { data: msg, error: msgErr } = await supabase
        .from('email_messages')
        .select('thread_id')
        .eq('id', emailMessageId)
        .single();
      if (msgErr || !msg?.thread_id) return null;

      // 2) Get all email ids in the same thread
      const { data: msgs, error: listErr } = await supabase
        .from('email_messages')
        .select('id')
        .eq('thread_id', msg.thread_id);
      if (listErr || !msgs || msgs.length === 0) return null;
      const ids = msgs.map((r: any) => r.id);

      // 3) Find latest import with a booking_id from those emails
      const { data: imports, error: impErr } = await supabase
        .from('email_booking_imports')
        .select('booking_id, processed_at')
        .in('email_message_id', ids)
        .not('booking_id', 'is', null)
        .order('processed_at', { ascending: false })
        .limit(1);
      if (impErr || !imports || imports.length === 0) return null;
      const bookingId = imports[0].booking_id as string | null;
      if (!bookingId) return null;

      // 4) Load the booking
      const booking = await bookingService.getBookingById(bookingId);
      return booking;
    } catch {
      return null;
    }
  }
  static async resolvePropertyId(parsed: ParsedBookingEmail): Promise<string | undefined> {
    try {
      const properties = await propertyService.getAllProperties();
      if (parsed.property_hint) {
        const byHint = properties.find(p =>
          (p.name || '').toLowerCase().includes(parsed.property_hint!.toLowerCase()) ||
          (p.address || '').toLowerCase().includes(parsed.property_hint!.toLowerCase())
        );
        if (byHint) return byHint.id;
      }
      const hint = (parsed.property_hint || '').toLowerCase();
      if (hint.includes('old manali')) {
        const om = properties.find(p => (p.name || '').toLowerCase().includes('old manali') || (p.address || '').toLowerCase().includes('old manali'));
        if (om) return om.id;
      }
      if (hint.includes('baror')) {
        const baror = properties.find(p => (p.name || '').toLowerCase().includes('baror') || (p.address || '').toLowerCase().includes('baror'));
        if (baror) return baror.id;
      }
      return properties[0]?.id;
    } catch (e) {
      console.warn('Property resolution failed:', e);
      return undefined;
    }
  }

  static normalizeAmount(value?: number | null): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  }

  static async upsertEmailImport(row: Partial<EmailBookingImport> & { email_message_id: string }): Promise<EmailBookingImport> {
    const { data, error } = await supabase
      .from('email_booking_imports')
      .upsert(row, { onConflict: 'email_message_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data as EmailBookingImport;
  }

  static async importFromParsed(emailMessageId: string, parsed: ParsedBookingEmail, propertyId?: string): Promise<EmailBookingImport> {
    const resolvedPropertyId = propertyId || (await this.resolvePropertyId(parsed));
    const eventType = parsed.event_type;
    const decision: EmailBookingImport['decision'] = parsed.confidence >= 0.8 ? 'auto' : 'manual-approved';

    // If sender was Booking.com notification-only and we lack actionable fields, mark processed without creating bookings
    if (parsed.ota_platform === 'booking_com' && (!parsed.check_in || !parsed.check_out)) {
      const result = await this.upsertEmailImport({
        email_message_id: emailMessageId,
        extraction_id: null,
        property_id: resolvedPropertyId || null,
        event_type: parsed.event_type,
        decision,
        booking_id: null,
        import_errors: { reason: 'booking_com_notification_only' },
        processed_at: new Date().toISOString(),
        processed_by: 'system'
      } as any);
      try {
        await supabase.from('email_messages').update({ processed: true }).eq('id', emailMessageId);
      } catch {}
      return result;
    }

    const provider = parsed.ota_platform === 'booking_com' ? 'booking_com' : parsed.ota_platform === 'gommt' ? 'gommt' : 'other';

    // Guest Profile Creation/Linking Logic
    let guestProfileId: string | undefined;
    if (parsed.guest_name || parsed.contact_email || parsed.contact_phone) {
      try {
        const existingGuest = await GuestProfileService.findGuestByContact(
          parsed.contact_email || undefined,
          parsed.contact_phone || undefined
        );

        if (existingGuest) {
          guestProfileId = existingGuest.id;
          await GuestProfileService.updateGuestProfile({
            id: existingGuest.id,
            name: parsed.guest_name || (existingGuest as any).name,
            email: parsed.contact_email || (existingGuest as any).email,
            phone: parsed.contact_phone || (existingGuest as any).phone,
          });
          console.log(`Linked OTA booking to existing guest profile: ${existingGuest.id}`);
        } else {
          const newGuest = await GuestProfileService.createGuestProfile({
            name: parsed.guest_name || 'Guest',
            email: parsed.contact_email,
            phone: parsed.contact_phone,
          } as any);
          guestProfileId = newGuest.id;
          console.log(`Created new guest profile for OTA booking: ${newGuest.id}`);
        }
      } catch (error) {
        console.error('Failed to create/link guest profile for email import:', error);
        // Continue without blocking booking creation
      }
    }

    const bookingPayload = {
      propertyId: resolvedPropertyId,
      guestName: parsed.guest_name || 'Guest',
      roomNo: parsed.room_no || '',
      numberOfRooms: 1,
      checkIn: parsed.check_in || undefined,
      checkOut: parsed.check_out || undefined,
      noOfPax: parsed.no_of_pax ?? undefined,
      adultChild: parsed.adult_child || undefined,
      status: 'confirmed' as const,
      cancelled: false,
      totalAmount: this.normalizeAmount(parsed.total_amount),
      paymentStatus: parsed.payment_status || undefined,
      contactPhone: parsed.contact_phone || undefined,
      contactEmail: parsed.contact_email || undefined,
      specialRequests: parsed.special_requests || undefined,
      // Persist source context (respect bookings.source CHECK constraint)
      guest_profile_id: guestProfileId,
      source: 'ota',
      source_details: parsed.booking_reference ? { provider, ota_ref: parsed.booking_reference } : { provider },
    } as const;

    let bookingId: string | undefined = undefined;
    let importErrors: Record<string, any> | null = null;

    if (eventType === 'new') {
      if (bookingPayload.checkIn && bookingPayload.checkOut) {
        const created = await bookingService.createBooking(bookingPayload as any);
        bookingId = created?.id;
      } else {
        importErrors = { reason: 'missing_required_fields', fields: { check_in: !!bookingPayload.checkIn, check_out: !!bookingPayload.checkOut } };
      }
    } else if (eventType === 'modified') {
      // Prefer thread-linked booking
      let candidate: Booking | null = await this.getBookingFromThread(emailMessageId);
      if (!candidate) {
        // Stronger matching: booking_reference + dates
        const all = await bookingService.getBookings({ propertyId: resolvedPropertyId });
        if (parsed.booking_reference && parsed.check_in && parsed.check_out) {
          candidate = all.find(b => (b as any).source_details?.ota_ref === parsed.booking_reference && b.checkIn === parsed.check_in && b.checkOut === parsed.check_out) || null;
        }
        if (!candidate) {
          candidate = all.find(b => b.guestName?.toLowerCase() === (parsed.guest_name || '').toLowerCase()) || null;
        }
      }
      if (candidate) {
        const updatePayload: Partial<Booking> = {
          checkIn: bookingPayload.checkIn || candidate.checkIn,
          checkOut: bookingPayload.checkOut || candidate.checkOut,
          noOfPax: bookingPayload.noOfPax,
          adultChild: bookingPayload.adultChild,
          totalAmount: bookingPayload.totalAmount,
          paymentStatus: bookingPayload.paymentStatus,
          contactPhone: bookingPayload.contactPhone,
          contactEmail: bookingPayload.contactEmail,
          specialRequests: bookingPayload.specialRequests
        };
        // Only modify room number if a specific room number is provided in the email
        if (parsed.room_no && String(parsed.room_no).trim().length > 0) {
          updatePayload.roomNo = String(parsed.room_no).trim();
        }
        // Update source info if present
        (updatePayload as any).source = (bookingPayload as any).source;
        (updatePayload as any).source_details = (bookingPayload as any).source_details;
        // Attach guest profile link if resolved
        if (guestProfileId) {
          (updatePayload as any).guest_profile_id = guestProfileId;
        }
        const updated = await bookingService.updateBooking(candidate.id, updatePayload);
        bookingId = updated?.id;
      } else {
        importErrors = { reason: 'booking_not_found_for_modify' };
      }
    } else if (eventType === 'cancelled') {
      // Prefer thread-linked booking
      let candidate: Booking | null = await this.getBookingFromThread(emailMessageId);
      if (!candidate) {
        // Stronger matching: booking_reference + dates
        const all = await bookingService.getBookings({ propertyId: resolvedPropertyId });
        if (parsed.booking_reference && parsed.check_in && parsed.check_out) {
          candidate = all.find(b => (b as any).source_details?.ota_ref === parsed.booking_reference && b.checkIn === parsed.check_in && b.checkOut === parsed.check_out) || null;
        }
        if (!candidate) {
          candidate = all.find(b => b.guestName?.toLowerCase() === (parsed.guest_name || '').toLowerCase()) || null;
        }
      }
      if (candidate) {
        const success = await bookingService.cancelBooking(candidate.id);
        if (success) bookingId = candidate.id;
      } else {
        importErrors = { reason: 'booking_not_found_for_cancel' };
      }
    }

    const result = await this.upsertEmailImport({
      email_message_id: emailMessageId,
      extraction_id: null,
      property_id: resolvedPropertyId || null,
      event_type: eventType,
      decision,
      booking_id: bookingId || null,
      import_errors: importErrors,
      processed_at: new Date().toISOString(),
      processed_by: 'system'
    } as any);

    // Emit a booking notification
    try {
      if (resolvedPropertyId) {
        await notificationService.sendEvent({
          propertyId: resolvedPropertyId,
          type: 'update' as any,
          title: eventType === 'new' ? 'New OTA booking' : eventType === 'modified' ? 'Booking modified' : 'Booking cancelled',
          message: `${parsed.guest_name || 'Guest'} • ${parsed.check_in || ''} → ${parsed.check_out || ''}${parsed.booking_reference ? ' • Ref ' + parsed.booking_reference : ''}`,
          priority: eventType === 'cancelled' ? 'high' : 'medium',
          platform: parsed.ota_platform || 'other',
          data: { bookingId: bookingId || null, emailMessageId, eventType }
        });
      }
    } catch {}

    // Mark the email as processed so it doesn't show up again in the inbox panel
    try {
      await supabase
        .from('email_messages')
        .update({ processed: true })
        .eq('id', emailMessageId);
    } catch (e) {
      // non-fatal
    }

    return result;
  }

  static diffBooking(candidate: Booking | null, parsed: ParsedBookingEmail) {
    const proposed: Partial<Booking> = {};
    const changes: Array<{ field: string; from?: any; to?: any }> = [];

    const consider = (
      field: keyof Booking,
      toVal: any,
      fromVal?: any
    ) => {
      if (toVal === undefined) return;
      proposed[field] = toVal as any;
      if (candidate && fromVal !== toVal) {
        changes.push({ field: field as string, from: fromVal, to: toVal });
      }
    };

    consider('guestName', parsed.guest_name, candidate?.guestName);
    // Only propose room number change if email specifies a concrete room number
    if (parsed.room_no && String(parsed.room_no).trim().length > 0) {
      consider('roomNo', String(parsed.room_no).trim(), candidate?.roomNo);
    }
    consider('checkIn', parsed.check_in, candidate?.checkIn);
    consider('checkOut', parsed.check_out, candidate?.checkOut);
    consider('noOfPax', parsed.no_of_pax ?? undefined, candidate?.noOfPax);
    consider('adultChild', parsed.adult_child ?? undefined, candidate?.adultChild);
    consider('totalAmount', this.normalizeAmount(parsed.total_amount), candidate?.totalAmount);
    consider('paymentStatus', parsed.payment_status ?? undefined, candidate?.paymentStatus);
    consider('contactPhone', parsed.contact_phone ?? undefined, candidate?.contactPhone);
    consider('contactEmail', parsed.contact_email ?? undefined, candidate?.contactEmail);
    consider('specialRequests', parsed.special_requests ?? undefined, candidate?.specialRequests);

    return { proposed, changes };
  }

  static async computePreview(parsed: ParsedBookingEmail, propertyId?: string, emailMessageId?: string): Promise<{
    action: 'create' | 'update' | 'cancel' | 'ignore';
    candidateBooking?: Booking | null;
    proposed?: Partial<Booking>;
    changes?: Array<{ field: string; from?: any; to?: any }>;
    missingFields?: string[];
    reason?: string;
    ota_platform?: ParsedBookingEmail['ota_platform'];
    room_type?: string | null;
    property_hint?: string | null;
    resolved_property_id?: string | null;
  }> {
    const resolvedPropertyId = propertyId || (await this.resolvePropertyId(parsed));
    const eventType = parsed.event_type;

    // Find candidate booking for modify/cancel based on (ota_ref+dates) → thread → guest name
    let candidate: Booking | null = null;
    // 1) Try by OTA reference + dates within resolved property
    if (parsed.booking_reference && parsed.check_in && parsed.check_out) {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('property_id', resolvedPropertyId || '')
          .eq('check_in', parsed.check_in)
          .eq('check_out', parsed.check_out)
          .contains('source_details', { ota_ref: parsed.booking_reference } as any);
        const row = (data || [])[0];
        if (row) {
          candidate = {
            id: row.id,
            propertyId: row.property_id,
            guestName: row.guest_name,
            roomNo: row.room_no,
            numberOfRooms: row.number_of_rooms || 1,
            checkIn: row.check_in,
            checkOut: row.check_out,
            noOfPax: row.no_of_pax,
            adultChild: row.adult_child,
            status: row.status,
            cancelled: row.cancelled,
            totalAmount: parseFloat(row.total_amount),
            paymentStatus: row.payment_status,
            paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : undefined,
            paymentMode: row.payment_mode,
            contactPhone: row.contact_phone,
            contactEmail: row.contact_email,
            specialRequests: row.special_requests,
            bookingDate: row.booking_date,
            folioNumber: row.folio_number,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          } as Booking;
        }
      } catch {}
    }

    // 2) Try thread linkage
    if (!candidate && emailMessageId) {
      candidate = await this.getBookingFromThread(emailMessageId);
    }
    // 3) Fallbacks by guest name
    if (!candidate) {
      try {
        const bookings = await bookingService.getBookings({ propertyId: resolvedPropertyId });
        candidate = bookings.find(b => b.guestName?.toLowerCase() === (parsed.guest_name || '').toLowerCase()) || null;
        if (!candidate && parsed.guest_name) {
          const all = await bookingService.getBookings({});
          candidate = all.find(b => b.guestName?.toLowerCase() === parsed.guest_name!.toLowerCase()) || null;
        }
      } catch {
        // ignore
      }
    }

    const meta = {
      ota_platform: parsed.ota_platform,
      room_type: parsed.room_type || null,
      property_hint: parsed.property_hint || null,
      resolved_property_id: resolvedPropertyId || null,
    } as const;

    if (eventType === 'new') {
      const missing: string[] = [];
      if (!parsed.check_in) missing.push('check_in');
      if (!parsed.check_out) missing.push('check_out');
      const { proposed } = this.diffBooking(null, parsed);
      return {
        action: 'create',
        candidateBooking: null,
        proposed,
        changes: [],
        missingFields: missing.length ? missing : undefined,
        ...meta
      };
    }

    if (eventType === 'modified') {
      if (!candidate) return { action: 'update', candidateBooking: null, proposed: {}, changes: [], reason: 'No matching booking found', ...meta };
      const { proposed, changes } = this.diffBooking(candidate, parsed);
      return { action: 'update', candidateBooking: candidate, proposed, changes, ...meta };
    }

    if (eventType === 'cancelled') {
      if (!candidate) return { action: 'cancel', candidateBooking: null, reason: 'No matching booking found', ...meta };
      return { action: 'cancel', candidateBooking: candidate, ...meta };
    }

    return { action: 'ignore', candidateBooking: null, reason: 'Not booking-related', ...meta };
  }
}

export default EmailBookingImportService; 