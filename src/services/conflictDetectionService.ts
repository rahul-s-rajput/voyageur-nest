// Conflict Detection Engine
// Story 4.2: Task 3 - Conflict Detection Engine

import { format, parseISO, isWithinInterval, isSameDay, addDays, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { 
  CalendarConflict, 
  ConflictResolution, 
  OTABooking,
  ConflictType,
  ConflictSeverity 
} from '../types/ota';

export class ConflictDetectionService {
  /**
   * Detect all types of calendar conflicts for a property
   */
  static async detectConflicts(propertyId: string): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    try {
      // Detect double bookings
      const doubleBookings = await this.detectDoubleBookings(propertyId);
      conflicts.push(...doubleBookings);

      // Detect OTA sync conflicts
      const syncConflicts = await this.detectOTASyncConflicts(propertyId);
      conflicts.push(...syncConflicts);

      // Detect availability conflicts
      const availabilityConflicts = await this.detectAvailabilityConflicts(propertyId);
      conflicts.push(...availabilityConflicts);

      // Detect pricing conflicts
      const pricingConflicts = await this.detectPricingConflicts(propertyId);
      conflicts.push(...pricingConflicts);

      // Save detected conflicts to database
      for (const conflict of conflicts) {
        await this.saveConflict(conflict);
      }

      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  /**
   * Detect double bookings (same room, overlapping dates)
   */
  private static async detectDoubleBookings(propertyId: string): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    // Get all active bookings for the property
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('cancelled', false)
      .gte('check_out', format(new Date(), 'yyyy-MM-dd'))
      .order('check_in');

    if (error) throw error;

    // Group bookings by room
    const roomBookings = new Map<string, any[]>();
    bookings?.forEach(booking => {
      const roomKey = booking.room_no;
      if (!roomBookings.has(roomKey)) {
        roomBookings.set(roomKey, []);
      }
      roomBookings.get(roomKey)!.push(booking);
    });

    // Check for overlaps within each room
    for (const [roomNo, roomBookingList] of roomBookings) {
      for (let i = 0; i < roomBookingList.length; i++) {
        for (let j = i + 1; j < roomBookingList.length; j++) {
          const booking1 = roomBookingList[i];
          const booking2 = roomBookingList[j];

          if (this.datesOverlap(booking1.check_in, booking1.check_out, booking2.check_in, booking2.check_out)) {
            conflicts.push({
              id: `double-${booking1.id}-${booking2.id}`,
              property_id: propertyId,
              conflict_type: 'double_booking',
              severity: 'high',
              status: 'detected',
              conflict_date: this.getOverlapStart(booking1.check_in, booking1.check_out, booking2.check_in, booking2.check_out),
              booking_id_1: booking1.id,
              booking_id_2: booking2.id,
              room_no: roomNo,
              conflict_date_start: this.getOverlapStart(booking1.check_in, booking1.check_out, booking2.check_in, booking2.check_out),
              conflict_date_end: this.getOverlapEnd(booking1.check_in, booking1.check_out, booking2.check_in, booking2.check_out),
              description: `Double booking detected for Room ${roomNo}`,
              details: {
                booking1: {
                  id: booking1.id,
                  guest: booking1.guest_name,
                  dates: `${booking1.check_in} to ${booking1.check_out}`,
                  platform: booking1.ota_platform_id || 'direct'
                },
                booking2: {
                  id: booking2.id,
                  guest: booking2.guest_name,
                  dates: `${booking2.check_in} to ${booking2.check_out}`,
                  platform: booking2.ota_platform_id || 'direct'
                }
              },
              suggested_resolution: this.suggestDoubleBookingResolution(booking1, booking2),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect OTA synchronization conflicts
   */
  private static async detectOTASyncConflicts(propertyId: string): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    // Get bookings with sync issues
    const { data: syncIssues, error } = await supabase
      .from('bookings')
      .select(`
        *,
        ota_platforms(name, sync_enabled)
      `)
      .eq('property_id', propertyId)
      .eq('cancelled', false)
      .or('ota_sync_status.eq.failed,ota_sync_status.eq.pending')
      .gte('check_out', format(new Date(), 'yyyy-MM-dd'));

    if (error) throw error;

    syncIssues?.forEach(booking => {
      conflicts.push({
        id: `sync-${booking.id}`,
        property_id: propertyId,
        conflict_type: 'sync_failed',
        severity: booking.ota_sync_status === 'failed' ? 'medium' : 'low',
        status: 'detected',
        conflict_date: booking.check_in,
        booking_id_1: booking.id,
        room_no: booking.room_no,
        conflict_date_start: booking.check_in,
        conflict_date_end: booking.check_out,
        description: `OTA sync ${booking.ota_sync_status} for booking`,
        details: {
          platform: booking.ota_platform_id,
          sync_status: booking.ota_sync_status,
          last_sync: booking.ota_last_sync,
          error_message: booking.ota_sync_error
        },
        suggested_resolution: {
          action: 'retry_sync',
          priority: booking.ota_sync_status === 'failed' ? 'high' : 'medium',
          steps: [
            'Check OTA platform connectivity',
            'Verify booking details',
            'Retry synchronization',
            'Update booking status'
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    return conflicts;
  }

  /**
   * Detect availability conflicts (bookings without room assignments)
   */
  private static async detectAvailabilityConflicts(propertyId: string): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    // Get bookings without proper room assignments
    const { data: unassignedBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('cancelled', false)
      .or('room_no.is.null,room_no.eq.TBD,room_no.eq.')
      .gte('check_in', format(new Date(), 'yyyy-MM-dd'));

    if (error) throw error;

    unassignedBookings?.forEach(booking => {
      conflicts.push({
        id: `availability-${booking.id}`,
        property_id: propertyId,
        conflict_type: 'availability_mismatch',
        severity: 'medium',
        status: 'detected',
        conflict_date: booking.check_in,
        booking_id_1: booking.id,
        room_no: booking.room_no || 'Unassigned',
        conflict_date_start: booking.check_in,
        conflict_date_end: booking.check_out,
        description: 'Booking without room assignment',
        details: {
          guest: booking.guest_name,
          pax: booking.no_of_pax,
          platform: booking.ota_platform_id || 'direct',
          booking_date: booking.booking_date
        },
        suggested_resolution: {
          action: 'assign_room',
          priority: 'high',
          steps: [
            'Check room availability',
            'Assign appropriate room',
            'Update booking record',
            'Notify guest if needed'
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    return conflicts;
  }

  /**
   * Detect pricing conflicts (missing or inconsistent pricing)
   */
  private static async detectPricingConflicts(propertyId: string): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    // Get bookings with pricing issues
    const { data: pricingIssues, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('cancelled', false)
      .or('total_amount.eq.0,total_amount.is.null')
      .gte('check_in', format(new Date(), 'yyyy-MM-dd'));

    if (error) throw error;

    pricingIssues?.forEach(booking => {
      conflicts.push({
        id: `pricing-${booking.id}`,
        property_id: propertyId,
        conflict_type: 'pricing_mismatch',
        severity: 'low',
        status: 'detected',
        conflict_date: booking.check_in,
        booking_id_1: booking.id,
        room_no: booking.room_no,
        conflict_date_start: booking.check_in,
        conflict_date_end: booking.check_out,
        description: 'Missing or zero pricing information',
        details: {
          guest: booking.guest_name,
          current_amount: booking.total_amount,
          room_rate: booking.rooms?.price_per_night,
          platform: booking.ota_platform_id || 'direct'
        },
        suggested_resolution: {
          action: 'update_pricing',
          priority: 'medium',
          steps: [
            'Calculate correct pricing',
            'Update booking amount',
            'Verify payment status',
            'Send invoice if needed'
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    return conflicts;
  }

  /**
   * Check if two date ranges overlap
   */
  private static datesOverlap(
    start1: string, 
    end1: string, 
    start2: string, 
    end2: string
  ): boolean {
    const s1 = parseISO(start1);
    const e1 = parseISO(end1);
    const s2 = parseISO(start2);
    const e2 = parseISO(end2);

    // Check if ranges overlap (exclusive end dates for hotel bookings)
    return s1 < e2 && s2 < e1;
  }

  /**
   * Get overlap start date
   */
  private static getOverlapStart(
    start1: string, 
    end1: string, 
    start2: string, 
    end2: string
  ): string {
    const s1 = parseISO(start1);
    const s2 = parseISO(start2);
    return format(s1 > s2 ? s1 : s2, 'yyyy-MM-dd');
  }

  /**
   * Get overlap end date
   */
  private static getOverlapEnd(
    start1: string, 
    end1: string, 
    start2: string, 
    end2: string
  ): string {
    const e1 = parseISO(end1);
    const e2 = parseISO(end2);
    return format(e1 < e2 ? e1 : e2, 'yyyy-MM-dd');
  }

  /**
   * Suggest resolution for double booking conflicts
   */
  private static suggestDoubleBookingResolution(booking1: any, booking2: any): ConflictResolution {
    // Prioritize based on booking source and date
    const isOTA1 = !!booking1.ota_platform_id;
    const isOTA2 = !!booking2.ota_platform_id;
    const booking1Date = parseISO(booking1.booking_date);
    const booking2Date = parseISO(booking2.booking_date);

    let priority = 'high';
    let action = 'manual_review';
    let steps = [
      'Review both bookings carefully',
      'Contact guests to verify dates',
      'Check for alternative rooms',
      'Relocate one booking if possible',
      'Cancel and compensate if necessary'
    ];

    // If one is OTA and one is direct, prioritize based on policy
    if (isOTA1 && !isOTA2) {
      action = 'relocate_direct';
      steps = [
        'Try to relocate direct booking',
        'Offer room upgrade if available',
        'Contact direct guest first',
        'Update OTA calendar'
      ];
    } else if (!isOTA1 && isOTA2) {
      action = 'relocate_ota';
      steps = [
        'Check OTA cancellation policy',
        'Try to relocate OTA booking',
        'Contact OTA support',
        'Update local calendar'
      ];
    } else if (booking1Date < booking2Date) {
      action = 'honor_first';
      steps = [
        'Honor first booking (earlier booking date)',
        'Relocate or cancel second booking',
        'Provide compensation',
        'Update all calendars'
      ];
    }

    return {
      action,
      priority,
      steps,
      estimated_cost: this.estimateResolutionCost(action),
      auto_resolvable: false
    };
  }

  /**
   * Estimate cost of conflict resolution
   */
  private static estimateResolutionCost(action: string): number {
    const costs: Record<string, number> = {
      'manual_review': 0,
      'relocate_direct': 500,
      'relocate_ota': 1000,
      'honor_first': 1500,
      'retry_sync': 0,
      'assign_room': 0,
      'update_pricing': 0
    };

    return costs[action] || 0;
  }

  /**
   * Save conflict to database
   */
  private static async saveConflict(conflict: CalendarConflict): Promise<void> {
    try {
      // Check if conflict already exists
      const { data: existing } = await supabase
        .from('calendar_conflicts')
        .select('id')
        .eq('id', conflict.id)
        .single();

      if (existing) {
        // Update existing conflict
        await supabase
          .from('calendar_conflicts')
          .update({
            ...conflict,
            updated_at: new Date().toISOString()
          })
          .eq('id', conflict.id);
      } else {
        // Insert new conflict
        await supabase
          .from('calendar_conflicts')
          .insert(conflict);
      }
    } catch (error) {
      console.error('Error saving conflict:', error);
    }
  }

  /**
   * Resolve a conflict
   */
  static async resolveConflict(
    conflictId: string, 
    resolution: ConflictResolution,
    resolvedBy: string
  ): Promise<void> {
    try {
      await supabase
        .from('calendar_conflicts')
        .update({
          status: 'resolved',
          resolution_action: resolution.action,
          resolution_notes: resolution.notes,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conflictId);

      // Log resolution action
      console.log(`Conflict ${conflictId} resolved with action: ${resolution.action}`);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get conflicts for a property
   */
  static async getConflicts(
    propertyId: string,
    status?: 'detected' | 'resolved' | 'ignored'
  ): Promise<CalendarConflict[]> {
    let query = supabase
      .from('calendar_conflicts')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get conflict statistics
   */
  static async getConflictStats(propertyId: string): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const { data: conflicts, error } = await supabase
      .from('calendar_conflicts')
      .select('conflict_type, severity, status')
      .eq('property_id', propertyId);

    if (error) throw error;

    const stats = {
      total: conflicts?.length || 0,
      by_type: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      by_status: {} as Record<string, number>
    };

    conflicts?.forEach(conflict => {
      // Count by type
      const conflictType = conflict.conflict_type as string;
      stats.by_type[conflictType] = (stats.by_type[conflictType] || 0) + 1;
      
      // Count by severity
      const severity = conflict.severity as string;
      stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
      
      // Count by status
      const status = conflict.status as string;
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Auto-resolve simple conflicts
   */
  static async autoResolveConflicts(propertyId: string): Promise<number> {
    const conflicts = await this.getConflicts(propertyId, 'detected');
    let resolvedCount = 0;

    for (const conflict of conflicts) {
      if (conflict.suggested_resolution?.auto_resolvable) {
        try {
          await this.executeAutoResolution(conflict);
          await this.resolveConflict(conflict.id, conflict.suggested_resolution, 'system');
          resolvedCount++;
        } catch (error) {
          console.error(`Failed to auto-resolve conflict ${conflict.id}:`, error);
        }
      }
    }

    return resolvedCount;
  }

  /**
   * Execute automatic resolution
   */
  private static async executeAutoResolution(conflict: CalendarConflict): Promise<void> {
    switch (conflict.suggested_resolution?.action) {
      case 'retry_sync':
        // Retry OTA synchronization
        // This would trigger the iCal service
        break;
      
      case 'update_pricing':
        // Auto-calculate and update pricing
        if (conflict.booking_id_1) {
          await this.autoUpdatePricing(conflict.booking_id_1);
        }
        break;
      
      default:
        throw new Error(`Auto-resolution not supported for action: ${conflict.suggested_resolution?.action}`);
    }
  }

  /**
   * Auto-update pricing for a booking
   */
  private static async autoUpdatePricing(bookingId: string): Promise<void> {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms(price_per_night)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) throw new Error('Booking not found');

    // Calculate nights
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate total amount
    const roomRate = booking.rooms?.price_per_night || 0;
    const totalAmount = nights * roomRate;

    // Update booking
    await supabase
      .from('bookings')
      .update({
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);
  }
}