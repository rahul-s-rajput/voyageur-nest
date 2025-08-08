// iCal Export/Import Service
// Story 4.2: Task 2 - iCal Export/Import Service

import ICAL from 'ical.js';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { 
  OTABooking, 
  ICalEvent, 
  ICalCalendar, 
  OTAPlatform, 
  SyncResult,
  OTASyncLog 
} from '../types/ota';

export class ICalService {
  private static readonly TIMEZONE = 'Asia/Kolkata';
  private static readonly PROD_ID = '-//Voyageur Nest//Calendar Sync//EN';
  
  /**
   * Generate iCal format for property availability export
   */
  static async generatePropertyCalendar(
    propertyId: string, 
    platformId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      // Set default date range (1 year from now)
      const start = startDate || new Date();
      const end = endDate || addDays(new Date(), 365);

      // Fetch bookings for the property within date range
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('cancelled', false)
        .gte('check_in', format(start, 'yyyy-MM-dd'))
        .lte('check_out', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      // Create iCal calendar
      const calendar = new ICAL.Component(['vcalendar', [], []]);
      calendar.updatePropertyWithValue('version', '2.0');
      calendar.updatePropertyWithValue('prodid', this.PROD_ID);
      calendar.updatePropertyWithValue('calscale', 'GREGORIAN');
      calendar.updatePropertyWithValue('method', 'PUBLISH');
      
      // Add timezone component
      const timezone = new ICAL.Component('vtimezone');
      timezone.updatePropertyWithValue('tzid', this.TIMEZONE);
      calendar.addSubcomponent(timezone);

      // Convert bookings to iCal events
      bookings?.forEach((booking: any) => {
        const event = this.createEventFromBooking(booking);
        calendar.addSubcomponent(event);
      });

      // Log the export operation
      await this.logSyncOperation(platformId, propertyId, 'export', 'success', {
        records_processed: bookings?.length || 0,
        date_range: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
      });

      return calendar.toString();
    } catch (error) {
      console.error('Error generating iCal calendar:', error);
      
      // Log the failed operation
      await this.logSyncOperation(platformId, propertyId, 'export', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Parse incoming iCal data from OTA platforms
   */
  static async parseOTACalendar(
    icalData: string,
    platformId: string,
    propertyId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      platform: platformId,
      property_id: propertyId,
      success: false,
      records_processed: 0,
      records_failed: 0,
      conflicts_detected: 0,
      errors: [],
      warnings: [],
      sync_duration: 0
    };

    const startTime = Date.now();

    try {
      // Parse iCal data
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      result.records_processed = vevents.length;

      // Process each event
      for (const vevent of vevents) {
        try {
          const event = new ICAL.Event(vevent);
          await this.processOTAEvent(event, platformId, propertyId);
        } catch (error) {
          result.records_failed++;
          result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Check for conflicts after import
      result.conflicts_detected = await this.detectConflictsAfterImport(propertyId);

      result.success = result.records_failed === 0;
      result.sync_duration = Date.now() - startTime;

      // Log the import operation
      await this.logSyncOperation(platformId, propertyId, 'import', 
        result.success ? 'success' : 'partial', {
          records_processed: result.records_processed,
          records_failed: result.records_failed,
          conflicts_detected: result.conflicts_detected,
          sync_duration: result.sync_duration
        });

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.sync_duration = Date.now() - startTime;
      
      await this.logSyncOperation(platformId, propertyId, 'import', 'failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        sync_duration: result.sync_duration
      });
      
      return result;
    }
  }

  /**
   * Create iCal event from booking data
   */
  private static createEventFromBooking(booking: any): ICAL.Component {
    const event = new ICAL.Component('vevent');
    
    // Generate unique ID
    const uid = `booking-${booking.id}@voyageurnest.com`;
    event.updatePropertyWithValue('uid', uid);
    
    // Set dates (all-day events for room bookings)
    const startDate = ICAL.Time.fromDateString(booking.check_in);
    const endDate = ICAL.Time.fromDateString(booking.check_out);
    
    event.updatePropertyWithValue('dtstart', startDate);
    event.updatePropertyWithValue('dtend', endDate);
    
    // Set event details
    event.updatePropertyWithValue('summary', `Booked - Room ${booking.room_no}`);
    event.updatePropertyWithValue('description', 
      `Guest: ${booking.guest_name}\nRoom: ${booking.room_no}\nPax: ${booking.no_of_pax}\nStatus: ${booking.status}`
    );
    
    // Set status
    event.updatePropertyWithValue('status', 'CONFIRMED');
    event.updatePropertyWithValue('transp', 'OPAQUE'); // Busy time
    
    // Set timestamps
    const now = ICAL.Time.now();
    event.updatePropertyWithValue('created', now);
    event.updatePropertyWithValue('dtstamp', now);
    event.updatePropertyWithValue('last-modified', 
      ICAL.Time.fromDateString(booking.updated_at.split('T')[0])
    );

    return event;
  }

  /**
   * Process individual OTA event and create/update booking
   */
  private static async processOTAEvent(
    event: ICAL.Event,
    platformId: string,
    propertyId: string
  ): Promise<void> {
    const eventData = {
      uid: event.uid,
      summary: event.summary,
      description: event.description,
      startDate: event.startDate.toJSDate(),
      endDate: event.endDate.toJSDate(),
      status: event.component.getFirstPropertyValue('status') || 'CONFIRMED'
    };

    // Extract booking information from event
    const bookingData = this.extractBookingFromEvent(eventData, platformId, propertyId);

    // Check if booking already exists
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('ota_booking_id', eventData.uid)
      .eq('ota_platform_id', platformId)
      .single();

    if (existingBooking) {
      // Update existing booking
      await supabase
        .from('bookings')
        .update({
          ...bookingData,
          ota_sync_status: 'synced',
          ota_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBooking.id);
    } else {
      // Create new booking
      await supabase
        .from('bookings')
        .insert({
          ...bookingData,
          ota_platform_id: platformId,
          ota_booking_id: eventData.uid,
          ota_sync_status: 'synced',
          ota_last_sync: new Date().toISOString(),
          source: 'ical_import'
        });
    }
  }

  /**
   * Extract booking data from iCal event
   */
  private static extractBookingFromEvent(
    eventData: any,
    platformId: string,
    propertyId: string
  ): Partial<OTABooking> {
    // Parse guest name and room from summary/description
    const guestName = this.extractGuestName(eventData.summary, eventData.description);
    const roomNo = this.extractRoomNumber(eventData.summary, eventData.description);

    return {
      guest_name: guestName || 'OTA Guest',
      room_no: roomNo || 'TBD',
      check_in: format(eventData.startDate, 'yyyy-MM-dd'),
      check_out: format(eventData.endDate, 'yyyy-MM-dd'),
      no_of_pax: 1, // Default, can be updated manually
      adult_child: '1/0',
      status: eventData.status === 'CANCELLED' ? 'pending' : 'confirmed',
      cancelled: eventData.status === 'CANCELLED',
      total_amount: 0, // To be updated manually
      payment_status: 'unpaid',
      booking_date: format(new Date(), 'yyyy-MM-dd')
    };
  }

  /**
   * Extract guest name from event data
   */
  private static extractGuestName(summary: string, description?: string): string | null {
    // Try to extract from summary first
    const summaryMatch = summary.match(/Guest:\s*([^,\n]+)/i);
    if (summaryMatch) return summaryMatch[1].trim();

    // Try to extract from description
    if (description) {
      const descMatch = description.match(/Guest:\s*([^,\n]+)/i);
      if (descMatch) return descMatch[1].trim();
    }

    // Fallback: use summary if it looks like a name
    if (summary && !summary.toLowerCase().includes('blocked') && !summary.toLowerCase().includes('unavailable')) {
      return summary.trim();
    }

    return null;
  }

  /**
   * Extract room number from event data
   */
  private static extractRoomNumber(summary: string, description?: string): string | null {
    // Try to extract from summary
    const summaryMatch = summary.match(/Room\s*([A-Za-z0-9]+)/i);
    if (summaryMatch) return summaryMatch[1];

    // Try to extract from description
    if (description) {
      const descMatch = description.match(/Room:\s*([A-Za-z0-9]+)/i);
      if (descMatch) return descMatch[1];
    }

    return null;
  }

  /**
   * Detect conflicts after importing OTA data
   */
  private static async detectConflictsAfterImport(propertyId: string): Promise<number> {
    const { data: conflicts } = await supabase
      .from('calendar_conflicts')
      .select('id')
      .eq('property_id', propertyId)
      .eq('status', 'detected');

    return conflicts?.length || 0;
  }

  /**
   * Log sync operation to database
   */
  private static async logSyncOperation(
    platformId: string,
    propertyId: string,
    syncType: 'export' | 'import' | 'full',
    status: 'success' | 'failed' | 'pending' | 'partial',
    data: any
  ): Promise<void> {
    try {
      await supabase
        .from('ota_sync_logs')
        .insert({
          platform_id: platformId,
          property_id: propertyId,
          sync_type: syncType,
          status,
          records_processed: data.records_processed || 0,
          records_failed: data.records_failed || 0,
          error_message: data.error_message,
          sync_data: data,
          completed_at: status !== 'pending' ? new Date().toISOString() : null
        });
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }

  /**
   * Fetch iCal data from external URL
   */
  static async fetchICalFromURL(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Voyageur Nest Calendar Sync/1.0',
          'Accept': 'text/calendar, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('calendar') && !contentType.includes('text')) {
        console.warn('Unexpected content type:', contentType);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching iCal data:', error);
      throw error;
    }
  }

  /**
   * Validate iCal data format
   */
  static validateICalData(icalData: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Basic format validation
      if (!icalData.includes('BEGIN:VCALENDAR')) {
        errors.push('Missing VCALENDAR component');
      }

      if (!icalData.includes('END:VCALENDAR')) {
        errors.push('Incomplete VCALENDAR component');
      }

      // Try to parse
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);

      // Validate required properties
      if (!comp.getFirstPropertyValue('version')) {
        errors.push('Missing VERSION property');
      }

      if (!comp.getFirstPropertyValue('prodid')) {
        errors.push('Missing PRODID property');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Parse error');
      return { valid: false, errors };
    }
  }

  /**
   * Get sync status for a platform and property
   */
  static async getSyncStatus(platformId: string, propertyId: string): Promise<OTASyncLog | null> {
    const { data } = await supabase
      .from('ota_sync_logs')
      .select('*')
      .eq('platform_id', platformId)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * Schedule automatic sync for iCal platforms
   */
  static async scheduleSync(platformId: string, propertyId: string): Promise<void> {
    // This would integrate with a job scheduler in production
    // For now, we'll just log the intent
    console.log(`Scheduling sync for platform ${platformId}, property ${propertyId}`);
    
    // In a real implementation, this would:
    // 1. Add job to queue (Redis/Bull)
    // 2. Set up cron job
    // 3. Use Supabase Edge Functions for serverless execution
  }
}