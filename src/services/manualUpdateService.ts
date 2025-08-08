// Manual Update Checklist Service
// Story 4.2: Task 4 - Manual Update Checklist System

import { format, addDays, subDays, parseISO, differenceInDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { bulkFormatService, BulkUpdateFormat } from './bulkFormatService';
import type { 
  ManualUpdateChecklist, 
  OTAPlatform, 
  OTABooking,
  ChecklistItem,
  ChecklistStatus 
} from '../types/ota';

export class ManualUpdateService {
  /**
   * Generate manual update checklist for a platform and property
   */
  static async generateChecklist(
    platformId: string,
    propertyId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ManualUpdateChecklist> {
    try {
      // Get platform configuration
      const { data: platform, error: platformError } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('id', platformId)
        .single();

      if (platformError || !platform) {
        throw new Error('Platform not found');
      }

      // Set default date range (next 7 days)
      const start = dateRange?.start || new Date();
      const end = dateRange?.end || addDays(new Date(), 7);

      // Get bookings that need manual updates
      const bookingsToUpdate = await this.getBookingsForManualUpdate(
        platformId, 
        propertyId, 
        start, 
        end
      );

      // Generate checklist items based on platform type
      const checklistItems = await this.generateChecklistItems(
        platform, 
        bookingsToUpdate
      );

      // Prepare mapped label
      const platformNameLower = (platform.name || platform.display_name || '').toLowerCase();
      const otaPlatforms = platformNameLower.includes('booking') ? ['booking.com'] : (platformNameLower.includes('gommt') || platformNameLower.includes('makemytrip') ? ['gommt'] : []);

      // Upsert behavior: update existing pending/in_progress checklist if present
      const { data: existing } = await supabase
        .from('manual_update_checklists')
        .select('id, checklist_data, status')
        .eq('platform_id', platformId)
        .eq('property_id', propertyId)
        .eq('checklist_type', 'modification')
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const baseData = {
        ota_platforms: otaPlatforms,
        total_items: checklistItems.length,
        completed_items: 0,
        checklist_items: checklistItems,
        estimated_duration: this.calculateEstimatedDuration(checklistItems),
        priority: this.calculatePriority(bookingsToUpdate),
        instructions: this.getPlatformInstructions(platform as any),
        checklist_date: format(new Date(), 'yyyy-MM-dd'),
        date_range_start: format(start, 'yyyy-MM-dd'),
        date_range_end: format(end, 'yyyy-MM-dd')
      };

      if (existing && existing.id) {
        // Merge new checklist items into existing without resetting completion
        const existingData: any = existing.checklist_data || {};
        const existingItems: ChecklistItem[] = Array.isArray(existingData.checklist_items) ? existingData.checklist_items : [];

        const existingById = new Map<string, ChecklistItem>();
        existingItems.forEach((it: any, idx) => {
          const key = it.id || String(idx);
          existingById.set(key, it);
        });

        const mergedItems: ChecklistItem[] = [];
        // Prefer existing items (keep their completed/status), then add new ones not present
        // First, carry over existing with their state
        for (const [key, item] of existingById.entries()) {
          mergedItems.push(item);
        }
        // Then append new ones if absent by id
        checklistItems.forEach((item, idx) => {
          const key = (item as any).id || String(idx);
          if (!existingById.has(key)) {
            mergedItems.push({ ...item, status: 'pending', completed: false } as any);
          }
        });

        // Consolidate similar availability items (multi-room grouping)
        const consolidatedItems = this.consolidateAvailabilityItems(mergedItems);

        // Recompute completion stats and status
        const completedCount = consolidatedItems.filter((it: any) => it && (it.completed === true || it.status === 'completed')).length;
        const newStatus: ChecklistStatus = 
          completedCount === consolidatedItems.length && consolidatedItems.length > 0 ? 'completed' :
          completedCount > 0 ? 'in_progress' : 'pending';

        const mergedData = {
          ota_platforms: otaPlatforms.length > 0 ? otaPlatforms : existingData.ota_platforms,
          total_items: consolidatedItems.length,
          completed_items: completedCount,
          checklist_items: consolidatedItems,
          estimated_duration: this.calculateEstimatedDuration(consolidatedItems),
          priority: baseData.priority,
          instructions: baseData.instructions,
          checklist_date: baseData.checklist_date,
          date_range_start: baseData.date_range_start,
          date_range_end: baseData.date_range_end
        };

        const { error: updateError } = await supabase
          .from('manual_update_checklists')
          .update({
            checklist_data: mergedData,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        return {
          id: existing.id,
          platform_id: platformId,
          property_id: propertyId,
          status: newStatus,
          checklist_type: 'modification',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...mergedData
        } as unknown as ManualUpdateChecklist;
      }

      // Create checklist record (new)
      const checklist: ManualUpdateChecklist = {
        id: `manual-${platformId}-${propertyId}-${Date.now()}`,
        platform_id: platformId,
        property_id: propertyId,
        checklist_date: format(new Date(), 'yyyy-MM-dd'),
        date_range_start: format(start, 'yyyy-MM-dd'),
        date_range_end: format(end, 'yyyy-MM-dd'),
        status: 'pending',
        total_items: checklistItems.length,
        completed_items: 0,
        checklist_items: checklistItems,
        estimated_duration: this.calculateEstimatedDuration(checklistItems),
        priority: this.calculatePriority(bookingsToUpdate),
        instructions: this.getPlatformInstructions(platform),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ota_platforms: otaPlatforms,
        checklist_type: 'modification'
      };

      // Save to database
      await this.saveChecklist(checklist);

      return checklist;
    } catch (error) {
      console.error('Error generating manual checklist:', error);
      throw error;
    }
  }

  /**
   * Get bookings that need manual updates
   */
  private static async getBookingsForManualUpdate(
    platformId: string,
    propertyId: string,
    start: Date,
    end: Date
  ): Promise<OTABooking[]> {
    // Get recent bookings that might need OTA updates
    const { data: recentBookings, error: recentError } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .gte('created_at', format(subDays(new Date(), 1), 'yyyy-MM-dd'))
      .eq('cancelled', false);

    if (recentError) throw recentError;

    // Get upcoming bookings in date range
    const { data: upcomingBookings, error: upcomingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .gte('check_in', format(start, 'yyyy-MM-dd'))
      .lte('check_in', format(end, 'yyyy-MM-dd'))
      .eq('cancelled', false);

    if (upcomingError) throw upcomingError;

    // Get cancelled bookings that need OTA updates
    const { data: cancelledBookings, error: cancelledError } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('cancelled', true)
      .gte('updated_at', format(subDays(new Date(), 1), 'yyyy-MM-dd'));

    if (cancelledError) throw cancelledError;

    // Combine and deduplicate
    const allBookings = [
      ...(recentBookings || []),
      ...(upcomingBookings || []),
      ...(cancelledBookings || [])
    ];

    // Remove duplicates
    const uniqueBookings = allBookings.filter((booking, index, self) =>
      index === self.findIndex(b => b.id === booking.id)
    );

    return uniqueBookings;
  }

  /**
   * Generate checklist items based on platform and bookings
   */
  private static async generateChecklistItems(
    platform: OTAPlatform,
    bookings: OTABooking[]
  ): Promise<ChecklistItem[]> {
    const items: ChecklistItem[] = [];

    // Platform-specific checklist generation
    const p = (platform.name || '').toLowerCase();
    if (p.includes('booking')) {
      items.push(...this.generateBookingComItems(bookings));
    } else if (p.includes('gommt') || p.includes('makemytrip')) {
      items.push(...this.generateGoMMTItems(bookings));
    } else {
      items.push(...this.generateGenericItems(bookings));
    }

    // Add common verification items
    items.push(...this.generateVerificationItems(platform, bookings));

    return items;
  }

  /**
   * Generate Booking.com specific checklist items
   */
  private static generateBookingComItems(bookings: OTABooking[]): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    // Login and navigation
    items.push({
      id: 'booking-login',
      title: 'Login to Booking.com Extranet',
      description: 'Access your property management dashboard',
      category: 'setup',
      required: true,
      estimated_minutes: 2,
      instructions: [
        'Go to admin.booking.com',
        'Login with your credentials',
        'Navigate to your property dashboard'
      ],
      verification_criteria: 'Property dashboard is visible',
      status: 'pending'
    });

    items.push({
      id: 'booking-calendar',
      title: 'Open Calendar Management',
      description: 'Navigate to the calendar grid view',
      category: 'navigation',
      required: true,
      estimated_minutes: 1,
      instructions: [
        'Click on "Calendar" in the main menu',
        'Select "Calendar Grid" view',
        'Ensure correct property is selected'
      ],
      verification_criteria: 'Calendar grid is displayed',
      status: 'pending'
    });

    // Update availability for each booking
    bookings.forEach((booking, index) => {
      if (!booking.cancelled) {
        items.push({
          id: `booking-block-${booking.id}`,
          title: `Availability: Block ${booking.room_no}`,
          description: `Room: ${booking.room_no} | Dates: ${booking.check_in} → ${booking.check_out} | Set: Not available`,
          category: 'availability',
          required: true,
          estimated_minutes: 3,
          instructions: [
            'Open Calendar grid',
            `Select ${booking.check_in} → ${booking.check_out}`,
            'Set availability = Not available',
            'Save'
          ],
          verification_criteria: `Room ${booking.room_no} is Not available on all selected dates`,
          status: 'pending',
          booking_reference: booking.id
        });
      } else {
        items.push({
          id: `booking-unblock-${booking.id}`,
          title: `Availability: Release ${booking.room_no}`,
          description: `Room: ${booking.room_no} | Dates: ${booking.check_in} → ${booking.check_out} | Set: Available`,
          category: 'availability',
          required: true,
          estimated_minutes: 2,
          instructions: [
            'Open Calendar grid',
            `Select ${booking.check_in} → ${booking.check_out}`,
            'Set availability = Available',
            'Save'
          ],
          verification_criteria: `Room ${booking.room_no} is Available on all selected dates`,
          status: 'pending',
          booking_reference: booking.id
        });
      }
    });

    return items;
  }

  /**
   * Generate GoMMT/MakeMyTrip specific checklist items
   */
  private static generateGoMMTItems(bookings: OTABooking[]): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    // Mobile app setup
    items.push({
      id: 'gommt-app',
      title: 'Open GoMMT Connect Mobile App',
      description: 'Launch the property management mobile application',
      category: 'setup',
      required: true,
      estimated_minutes: 1,
      instructions: [
        'Open GoMMT Connect app on your mobile device',
        'Login with your property credentials',
        'Select your property from the list'
      ],
      verification_criteria: 'Property dashboard is visible in app',
      status: 'pending'
    });

    items.push({
      id: 'gommt-inventory',
      title: 'Navigate to Inventory Management',
      description: 'Access room inventory and calendar',
      category: 'navigation',
      required: true,
      estimated_minutes: 1,
      instructions: [
        'Tap on "Inventory" or "Calendar" tab',
        'Select current month view',
        'Ensure all room types are visible'
      ],
      verification_criteria: 'Room inventory calendar is displayed',
      status: 'pending'
    });

    // Update inventory for each booking
    bookings.forEach((booking) => {
      if (!booking.cancelled) {
        items.push({
          id: `gommt-reduce-${booking.id}`,
          title: `Availability: Block ${booking.room_no}`,
          description: `Room: ${booking.room_no} | Dates: ${booking.check_in} → ${booking.check_out} | Set: Not available`,
          category: 'availability',
          required: true,
          estimated_minutes: 3,
          instructions: [
            'Open Inventory/Calendar',
            `Select ${booking.check_in} → ${booking.check_out}`,
            'Set availability = Not available',
            'Save'
          ],
          verification_criteria: `Room ${booking.room_no} is Not available on all selected dates`,
          status: 'pending',
          booking_reference: booking.id
        });
      } else {
        items.push({
          id: `gommt-restore-${booking.id}`,
          title: `Availability: Release ${booking.room_no}`,
          description: `Room: ${booking.room_no} | Dates: ${booking.check_in} → ${booking.check_out} | Set: Available`,
          category: 'availability',
          required: true,
          estimated_minutes: 2,
          instructions: [
            'Open Inventory/Calendar',
            `Select ${booking.check_in} → ${booking.check_out}`,
            'Set availability = Available',
            'Save'
          ],
          verification_criteria: `Room ${booking.room_no} is Available on all selected dates`,
          status: 'pending',
          booking_reference: booking.id
        });
      }
    });

    return items;
  }

  /**
   * Generate generic checklist items for other platforms
   */
  private static generateGenericItems(bookings: OTABooking[]): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    items.push({
      id: 'generic-login',
      title: 'Login to OTA Platform',
      description: 'Access your property management dashboard',
      category: 'setup',
      required: true,
      estimated_minutes: 2,
      instructions: [
        'Navigate to the OTA partner portal',
        'Login with your credentials',
        'Access property management section'
      ],
      verification_criteria: 'Successfully logged in',
      status: 'pending'
    });

    bookings.forEach((booking) => {
      items.push({
        id: `generic-update-${booking.id}`,
        title: `Update availability for ${booking.room_no}`,
        description: `Manually update calendar for booking ${booking.id}`,
        category: 'availability',
        required: true,
        estimated_minutes: 5,
        instructions: [
          'Navigate to calendar/inventory management',
          `Find room ${booking.room_no}`,
          `Update dates ${booking.check_in} to ${booking.check_out}`,
          booking.cancelled ? 'Mark as available' : 'Mark as unavailable',
          'Save changes'
        ],
        verification_criteria: 'Calendar updated successfully',
        status: 'pending',
        booking_reference: booking.id
      });
    });

    return items;
  }

  /**
   * Generate verification items
   */
  private static generateVerificationItems(
    platform: OTAPlatform,
    bookings: OTABooking[]
  ): ChecklistItem[] {
    return [
      {
        id: 'verify-updates',
        title: 'Verify All Updates',
        description: 'Double-check that all changes were applied correctly',
        category: 'verification',
        required: true,
        estimated_minutes: 5,
        instructions: [
          'Review all updated dates in the calendar',
          'Verify room availability matches your local system',
          'Check for any error messages or warnings',
          'Take screenshots for record keeping'
        ],
        verification_criteria: 'All updates verified and documented',
        status: 'pending'
      },
      {
        id: 'logout-secure',
        title: 'Logout Securely',
        description: 'Properly logout from the OTA platform',
        category: 'cleanup',
        required: true,
        estimated_minutes: 1,
        instructions: [
          'Save any pending changes',
          'Logout from the platform',
          'Clear browser cache if using shared computer'
        ],
        verification_criteria: 'Successfully logged out',
        status: 'pending'
      }
    ];
  }

  /**
   * Calculate estimated duration for checklist
   */
  private static calculateEstimatedDuration(items: ChecklistItem[]): number {
    return items.reduce((total, item) => total + (item.estimated_minutes || 0), 0);
  }

  /**
   * Calculate priority based on bookings
   */
  private static calculatePriority(bookings: OTABooking[]): 'low' | 'medium' | 'high' {
    const now = new Date();
    const urgentBookings = bookings.filter(booking => {
      const checkIn = parseISO(booking.check_in);
      const daysUntilCheckIn = differenceInDays(checkIn, now);
      return daysUntilCheckIn <= 2; // Check-in within 2 days
    });

    if (urgentBookings.length > 0) return 'high';
    if (bookings.length > 5) return 'medium';
    return 'low';
  }

  /**
   * Get platform-specific instructions
   */
  private static getPlatformInstructions(platform: OTAPlatform): string[] {
    const instructions: Record<string, string[]> = {
      'booking.com': [
        'Use the Extranet calendar grid for bulk updates',
        'Always verify changes are saved before moving to next room',
        'Use "Not Available" status for blocked dates',
        'Add descriptive notes for tracking'
      ],
      'gommt': [
        'Use the mobile app for real-time inventory updates',
        'Update inventory counts rather than blocking dates',
        'Process each night individually',
        'Sync changes immediately'
      ],
      'makemytrip': [
        'Use the mobile app for real-time inventory updates',
        'Update inventory counts rather than blocking dates',
        'Process each night individually',
        'Sync changes immediately'
      ]
    };

    return instructions[platform.name.toLowerCase()] || [
      'Follow platform-specific procedures',
      'Verify all changes before saving',
      'Document any issues encountered',
      'Contact platform support if needed'
    ];
  }

  /**
   * Save checklist to database
   */
  private static async saveChecklist(checklist: ManualUpdateChecklist): Promise<void> {
    try {
      const payload = {
        platform_id: checklist.platform_id,
        property_id: checklist.property_id,
        checklist_type: checklist.checklist_type || 'modification',
        status: checklist.status || 'pending',
        checklist_data: {
          ota_platforms: (checklist as any).ota_platforms,
          total_items: checklist.total_items || (checklist.checklist_items?.length || 0),
          completed_items: checklist.completed_items || 0,
          checklist_items: checklist.checklist_items || [],
          estimated_duration: checklist.estimated_duration || 0,
          priority: checklist.priority || 'low',
          instructions: checklist.instructions || [],
          checklist_date: (checklist as any).checklist_date,
          date_range_start: (checklist as any).date_range_start,
          date_range_end: (checklist as any).date_range_end
        },
        created_at: checklist.created_at || new Date().toISOString(),
        updated_at: checklist.updated_at || new Date().toISOString()
      };

      await supabase
        .from('manual_update_checklists')
        .insert(payload);
    } catch (error) {
      console.error('Error saving checklist:', error);
      throw error;
    }
  }

  /**
   * Update checklist item status
   */
  static async updateChecklistItem(
    checklistId: string,
    itemId: string,
    status: ChecklistStatus,
    notes?: string
  ): Promise<void> {
    try {
      // Get current checklist
      const { data: row, error } = await supabase
        .from('manual_update_checklists')
        .select('*')
        .eq('id', checklistId)
        .single();

      if (error || !row) throw new Error('Checklist not found');

      const data = (row as any).checklist_data || {};
      const items: ChecklistItem[] = Array.isArray(data.checklist_items) ? data.checklist_items : [];

      // Update the specific item (support both "status" and "completed" semantics)
      const updatedItems = items.map((item: ChecklistItem) => {
        if (item.id === itemId) {
          const isCompleted = status === 'completed';
          return {
            ...item,
            status,
            completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : undefined,
            notes: notes || item.notes
          };
        }
        return item;
      });

      // Calculate completion stats
      const completedCount = updatedItems.filter((item: any) => item && (item.completed === true || item.status === 'completed')).length;
      const newStatus: ChecklistStatus = 
        completedCount === updatedItems.length && updatedItems.length > 0 ? 'completed' :
        completedCount > 0 ? 'in_progress' : 'pending';

      // Update checklist row JSON and status
      const newData = {
        ...data,
        checklist_items: updatedItems,
        completed_items: completedCount
      };

      await supabase
        .from('manual_update_checklists')
        .update({
          checklist_data: newData,
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', checklistId);

    } catch (error) {
      console.error('Error updating checklist item:', error);
      throw error;
    }
  }

  /**
   * Get checklist by ID
   */
  static async getChecklist(checklistId: string): Promise<ManualUpdateChecklist | null> {
    const { data, error } = await supabase
      .from('manual_update_checklists')
      .select('*')
      .eq('id', checklistId)
      .single();

    if (error) {
      console.error('Error fetching checklist:', error);
      return null;
    }
    const row: any = data;
    const cd: any = row.checklist_data || {};
    const mapped: ManualUpdateChecklist = {
      id: row.id,
      platform_id: row.platform_id,
      property_id: row.property_id,
      status: row.status,
      checklist_type: row.checklist_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ota_platforms: cd.ota_platforms,
      total_items: cd.total_items ?? (cd.checklist_items?.length || 0),
      completed_items: cd.completed_items ?? 0,
      checklist_items: cd.checklist_items || [],
      estimated_duration: cd.estimated_duration ?? 0,
      priority: cd.priority,
      instructions: cd.instructions,
      checklist_date: cd.checklist_date,
      date_range_start: cd.date_range_start,
      date_range_end: cd.date_range_end
    } as ManualUpdateChecklist;

    return mapped;
  }

  /**
   * Get checklists for a property
   */
  static async getChecklistsForProperty(
    propertyId: string,
    status?: ChecklistStatus
  ): Promise<ManualUpdateChecklist[]> {
    let query = supabase
      .from('manual_update_checklists')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows: any[] = data || [];
    return rows.map((row) => {
      const cd: any = row.checklist_data || {};
      return {
        id: row.id,
        platform_id: row.platform_id,
        property_id: row.property_id,
        status: row.status,
        checklist_type: row.checklist_type,
        created_at: row.created_at,
        updated_at: row.updated_at,
        ota_platforms: cd.ota_platforms,
        total_items: cd.total_items ?? (cd.checklist_items?.length || 0),
        completed_items: cd.completed_items ?? 0,
        checklist_items: cd.checklist_items || [],
        estimated_duration: cd.estimated_duration ?? 0,
        priority: cd.priority,
        instructions: cd.instructions,
        checklist_date: cd.checklist_date,
        date_range_start: cd.date_range_start,
        date_range_end: cd.date_range_end
      } as ManualUpdateChecklist;
    });
  }

  /**
   * Get pending checklists across all properties
   */
  static async getPendingChecklists(): Promise<ManualUpdateChecklist[]> {
    const { data, error } = await supabase
      .from('manual_update_checklists')
      .select('*')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    const rows: any[] = data || [];
    return rows.map((row) => {
      const cd: any = row.checklist_data || {};
      return {
        id: row.id,
        platform_id: row.platform_id,
        property_id: row.property_id,
        status: row.status,
        checklist_type: row.checklist_type,
        created_at: row.created_at,
        updated_at: row.updated_at,
        ota_platforms: cd.ota_platforms,
        total_items: cd.total_items ?? (cd.checklist_items?.length || 0),
        completed_items: cd.completed_items ?? 0,
        checklist_items: cd.checklist_items || [],
        estimated_duration: cd.estimated_duration ?? 0,
        priority: cd.priority,
        instructions: cd.instructions,
        checklist_date: cd.checklist_date,
        date_range_start: cd.date_range_start,
        date_range_end: cd.date_range_end
      } as ManualUpdateChecklist;
    });
  }

  /**
   * Append items into an existing pending/in_progress checklist or create a new one if absent
   */
  static async appendChecklistItems(
    platformId: string,
    propertyId: string,
    itemsToAppend: ChecklistItem[],
    meta?: { dateRange?: { start: Date; end: Date } }
  ): Promise<ManualUpdateChecklist> {
    // Fetch platform for labels/instructions
    const { data: platform } = await supabase
      .from('ota_platforms')
      .select('*')
      .eq('id', platformId)
      .single();

    if (!platform) throw new Error('Platform not found');

    const platformNameLower = (platform.name || platform.display_name || '').toLowerCase();
    const otaPlatforms = platformNameLower.includes('booking') ? ['booking.com'] : (platformNameLower.includes('gommt') || platformNameLower.includes('makemytrip') ? ['gommt'] : []);

    const { data: existing } = await supabase
      .from('manual_update_checklists')
      .select('id, checklist_data, status, created_at, updated_at')
      .eq('platform_id', platformId)
      .eq('property_id', propertyId)
      .eq('checklist_type', 'modification')
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.id) {
      const data: any = existing.checklist_data || {};
      const currentItems: ChecklistItem[] = Array.isArray(data.checklist_items) ? data.checklist_items : [];
      const byId = new Map<string, ChecklistItem>();
      currentItems.forEach((it: any, idx) => byId.set(it.id || String(idx), it));

      itemsToAppend.forEach((it: any, idx) => {
        const key = it.id || String(idx);
        if (!byId.has(key)) {
          byId.set(key, { ...it, status: 'pending', completed: false } as any);
        }
      });

      // Consolidate similar availability items (multi-room grouping)
      const mergedItems = this.consolidateAvailabilityItems(Array.from(byId.values()));
      const completedCount = mergedItems.filter((it: any) => it && (it.completed === true || it.status === 'completed')).length;
      const newStatus: ChecklistStatus = 
        completedCount === mergedItems.length && mergedItems.length > 0 ? 'completed' :
        completedCount > 0 ? 'in_progress' : 'pending';

      const updatedData = {
        ota_platforms: data.ota_platforms || otaPlatforms,
        total_items: mergedItems.length,
        completed_items: completedCount,
        checklist_items: mergedItems,
        estimated_duration: this.calculateEstimatedDuration(mergedItems),
        priority: data.priority || 'medium',
        instructions: data.instructions || this.getPlatformInstructions(platform as any),
        checklist_date: format(new Date(), 'yyyy-MM-dd'),
        date_range_start: meta?.dateRange?.start ? format(meta.dateRange.start, 'yyyy-MM-dd') : data.date_range_start,
        date_range_end: meta?.dateRange?.end ? format(meta.dateRange.end, 'yyyy-MM-dd') : data.date_range_end
      };

      const { error: updateError } = await supabase
        .from('manual_update_checklists')
        .update({ checklist_data: updatedData, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) throw updateError;

      return {
        id: existing.id,
        platform_id: platformId,
        property_id: propertyId,
        status: newStatus,
        checklist_type: 'modification',
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
        ...updatedData
      } as any;
    }

    // Otherwise create a new checklist with these items
    const items = itemsToAppend.map((it: any) => ({ ...it, status: it.status || 'pending', completed: it.completed || false }));
    const checklist: ManualUpdateChecklist = {
      id: `manual-${platformId}-${propertyId}-${Date.now()}`,
      platform_id: platformId,
      property_id: propertyId,
      checklist_type: 'modification',
      status: 'pending',
      ota_platforms: otaPlatforms,
      total_items: items.length,
      completed_items: 0,
      checklist_items: items as any,
      estimated_duration: this.calculateEstimatedDuration(items as any),
      priority: 'medium',
      instructions: this.getPlatformInstructions(platform as any),
      checklist_date: format(new Date(), 'yyyy-MM-dd'),
      date_range_start: meta?.dateRange?.start ? format(meta.dateRange.start, 'yyyy-MM-dd') : undefined as any,
      date_range_end: meta?.dateRange?.end ? format(meta.dateRange.end, 'yyyy-MM-dd') : undefined as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;
    await this.saveChecklist(checklist);
    return checklist;
  }

  /**
   * Create/append delta checklist items for booking changes (create/update/cancel)
   */
  static async createDeltaChecklistsForBookingChange(
    propertyId: string,
    change: 'created' | 'updated' | 'cancelled',
    booking: { id: string; room_no?: string; roomNo?: string; check_in?: string; check_out?: string; total_amount?: number; ota_platform_id?: string }
  ): Promise<void> {
    // Determine affected date range and room from booking
    const roomNo = (booking as any).roomNo || (booking as any).room_no;
    const startStr = (booking as any).check_in;
    const endStr = (booking as any).check_out;
    const start = startStr ? parseISO(startStr) : new Date();
    const end = endStr ? parseISO(endStr) : addDays(start, 1);

    // Build bulk-edit-like items optimized for manual OTAs
    const availabilityRequired = true; // Always reflect availability after booking changes
    const isAvailable = change === 'cancelled';

    // Create high-signal items for both platforms (we will adapt wording per platform later)
    const baseItems: ChecklistItem[] = [
      {
        id: `delta-${change}-availability-${roomNo}-${format(start, 'yyyyMMdd')}-${format(end, 'yyyyMMdd')}`,
        title: `Availability: ${isAvailable ? 'Release' : 'Block'} ${roomNo}`,
        description: `Room: ${roomNo} | Dates: ${format(start, 'yyyy-MM-dd')} → ${format(end, 'yyyy-MM-dd')} | Set: ${isAvailable ? 'Available' : 'Not available'}`,
        category: 'availability',
        required: true,
        estimated_minutes: 3,
        verification_criteria: `Room ${roomNo} ${isAvailable ? 'Available' : 'Not available'} on all selected dates`,
        status: 'pending'
      },
      {
        id: `delta-verify-${booking.id}-${format(start, 'yyyyMMdd')}`,
        title: 'Verify on OTA',
        description: `Room: ${roomNo} | Dates: ${format(start, 'yyyy-MM-dd')} → ${format(end, 'yyyy-MM-dd')} | Check: state reflects above`,
        category: 'verification',
        required: true,
        estimated_minutes: 2,
        verification_criteria: 'Spot checks pass',
        status: 'pending'
      }
    ];

    // Resolve platforms requiring manual updates for this property (property-specific first, then global)
    const { data: propPlatforms } = await supabase
      .from('ota_platforms')
      .select('id, name, display_name, is_active, manual_update_required, property_id')
      .eq('is_active', true)
      .eq('manual_update_required', true)
      .eq('property_id', propertyId);

    const { data: globalPlatforms } = await supabase
      .from('ota_platforms')
      .select('id, name, display_name, is_active, manual_update_required, property_id')
      .eq('is_active', true)
      .eq('manual_update_required', true)
      .is('property_id', null);

    const allPlatforms = [...(propPlatforms || []), ...(globalPlatforms || [])];

    for (const platform of allPlatforms) {
      const name = ((platform.display_name || platform.name) || '').toLowerCase();
      if (!(name.includes('booking') || name.includes('gommt') || name.includes('makemytrip'))) continue;
      await this.appendChecklistItems(
        platform.id as unknown as string,
        propertyId,
        baseItems,
        { dateRange: { start, end } }
      );
    }
  }

  /**
   * Danger: Delete checklists for testing or cleanup.
   * If no filters provided, deletes all rows.
   */
  static async deleteChecklists(options?: { propertyId?: string; platformId?: string; status?: ChecklistStatus }): Promise<number> {
    // Count first
    let countQuery = supabase.from('manual_update_checklists').select('*', { count: 'exact', head: true });
    if (options?.propertyId) {
      // @ts-ignore chaining
      countQuery = countQuery.eq('property_id', options.propertyId);
    }
    if (options?.platformId) {
      // @ts-ignore chaining
      countQuery = countQuery.eq('platform_id', options.platformId);
    }
    if (options?.status) {
      // @ts-ignore chaining
      countQuery = countQuery.eq('status', options.status);
    }
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Then delete
    let deleteQuery = supabase.from('manual_update_checklists').delete();
    if (options?.propertyId) {
      // @ts-ignore chaining
      deleteQuery = deleteQuery.eq('property_id', options.propertyId);
    }
    if (options?.platformId) {
      // @ts-ignore chaining
      deleteQuery = deleteQuery.eq('platform_id', options.platformId);
    }
    if (options?.status) {
      // @ts-ignore chaining
      deleteQuery = deleteQuery.eq('status', options.status);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;
    return count || 0;
  }

  /**
   * Generate bulk format for manual updates
   */
  static generateBulkFormat(
    platform: 'booking.com' | 'gommt',
    format: 'csv' | 'excel' | 'json' | 'calendar-grid',
    bookings: OTABooking[]
  ): BulkUpdateFormat {
    return bulkFormatService.generateBulkUpdate(platform, format, bookings);
  }

  /**
   * Get supported bulk formats for a platform
   */
  static getSupportedBulkFormats(platform: 'booking.com' | 'gommt'): string[] {
    return bulkFormatService.getSupportedFormats(platform);
  }

  /**
   * Validate bulk format data
   */
  static validateBulkFormat(
    platform: 'booking.com' | 'gommt',
    format: 'csv' | 'excel' | 'json' | 'calendar-grid',
    data: any
  ) {
    return bulkFormatService.validateFormat(platform, format, data);
  }

  /**
   * Generate enhanced checklist with bulk format options
   */
  static async generateEnhancedChecklist(
    platformId: string,
    propertyId: string,
    dateRange: { start: Date; end: Date },
    includeBulkFormats: boolean = true
  ): Promise<ManualUpdateChecklist & { bulkFormats?: BulkUpdateFormat[] }> {
    // Generate standard checklist
    const checklist = await this.generateChecklist(platformId, propertyId, dateRange);
    
    if (!includeBulkFormats) {
      return checklist;
    }

    // Get platform info
    const { data: platform } = await supabase
      .from('ota_platforms')
      .select('*')
      .eq('id', platformId)
      .single();

    if (!platform) {
      return checklist;
    }

    // Get bookings for bulk format generation
    const bookings = await this.getBookingsForManualUpdate(
      platformId,
      propertyId,
      dateRange.start,
      dateRange.end
    );

    // Generate bulk formats for supported platforms
    const bulkFormats: BulkUpdateFormat[] = [];
    const platformName = platform.name.toLowerCase();

    if (platformName.includes('booking.com') || platformName.includes('booking')) {
      try {
        const csvFormat = this.generateBulkFormat('booking.com', 'csv', bookings);
        const gridFormat = this.generateBulkFormat('booking.com', 'calendar-grid', bookings);
        bulkFormats.push(csvFormat, gridFormat);
      } catch (error) {
        console.error('Error generating Booking.com bulk formats:', error);
      }
    }

    if (platformName.includes('gommt') || platformName.includes('makemytrip')) {
      try {
        const jsonFormat = this.generateBulkFormat('gommt', 'json', bookings);
        bulkFormats.push(jsonFormat);
      } catch (error) {
        console.error('Error generating GoMMT bulk formats:', error);
      }
    }

    return {
      ...checklist,
      bulkFormats
    };
  }

  /**
   * Generate daily checklists for all manual platforms
   */
  static async generateDailyChecklists(): Promise<ManualUpdateChecklist[]> {
    const checklists: ManualUpdateChecklist[] = [];

    try {
      // Get all manual platforms
      const { data: manualPlatforms, error: platformError } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('manual_update_required', true)
        .eq('is_active', true);

      if (platformError) throw platformError;

      // Get all properties
      const { data: properties, error: propertyError } = await supabase
        .from('properties')
        .select('id');

      if (propertyError) throw propertyError;

      // Generate checklist for each platform-property combination
      for (const platform of manualPlatforms || []) {
        for (const property of properties || []) {
          try {
            const checklist = await this.generateChecklist(
              platform.id,
              property.id,
              {
                start: new Date(),
                end: addDays(new Date(), 7)
              }
            );
            checklists.push(checklist);
          } catch (error) {
            console.error(`Error generating checklist for ${platform.name} - ${property.id}:`, error);
          }
        }
      }

      return checklists;
    } catch (error) {
      console.error('Error generating daily checklists:', error);
      throw error;
    }
  }

  /**
   * Create platform-specific manual update checklists based on a Bulk Edit operation
   * This is optimized for fast manual replication on Booking.com Extranet and GoMMT Connect
   */
  static async createBulkEditChecklistsForProperty(
    propertyId: string,
    options: import('../types/bulkEdit').BulkEditOptions,
    platformFilter?: Array<'booking.com' | 'gommt'>
  ): Promise<ManualUpdateChecklist[]> {
    try {
      const created: ManualUpdateChecklist[] = [];

      // Find manual-update-required platforms for this property (fallback to global)
      const { data: platforms, error } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('is_active', true)
        .eq('manual_update_required', true);

      if (error) throw error;

      // Filter to property-specific first, otherwise include globals
      const targetPlatforms = (platforms || []).filter(p => {
        const name = (p.name || '').toLowerCase();
        const matchesKnown = name.includes('booking') || name.includes('gommt') || name.includes('makemytrip');
        const matchesFilter = !platformFilter || platformFilter.some(f => (
          (f === 'booking.com' && name.includes('booking')) ||
          (f === 'gommt' && (name.includes('gommt') || name.includes('makemytrip'))) 
        ));
        return matchesFilter && matchesKnown && (!p.property_id || p.property_id === propertyId);
      });

      // Generate consolidated items and append to existing checklist per platform
      for (const platform of targetPlatforms) {
        const items = this.generateBulkEditItemsForPlatform(platform, options);

        // Append or create if absent, using date range from options
        const start = options.dateRange?.startDate ? parseISO(options.dateRange.startDate) : new Date();
        const end = options.dateRange?.endDate ? parseISO(options.dateRange.endDate) : addDays(start, 7);
        const appended = await this.appendChecklistItems(
          platform.id as unknown as string,
          propertyId,
          items,
          { dateRange: { start, end } }
        );
        created.push(appended);
      }

      return created;
    } catch (e) {
      console.error('Error creating bulk edit manual update checklists:', e);
      throw e;
    }
  }

  /**
   * Build concise, platform-optimized checklist items to replicate Bulk Edit changes
   */
  private static generateBulkEditItemsForPlatform(
    platform: OTAPlatform,
    options: import('../types/bulkEdit').BulkEditOptions
  ): ChecklistItem[] {
    const platformName = (platform.name || platform.display_name || '').toLowerCase();
    if (platformName.includes('booking')) {
      return this.generateBookingComBulkEditItems(options);
    }
    if (platformName.includes('gommt') || platformName.includes('makemytrip')) {
      return this.generateGoMMTBulkEditItems(options);
    }
    return this.generateGenericBulkEditItems(options);
  }

  /**
   * Booking.com Bulk Edit items (calendar grid / rates & availability)
   */
  private static generateBookingComBulkEditItems(
    options: import('../types/bulkEdit').BulkEditOptions
  ): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    items.push({
      id: 'bk-login',
      title: 'Login to Booking.com Extranet',
      description: 'Open admin.booking.com and access Rates & Availability',
      category: 'setup',
      required: true,
      estimated_minutes: 2,
      instructions: ['Go to admin.booking.com', 'Login and select your property', 'Open Rates & Availability > Calendar'],
      verification_criteria: 'Calendar page visible',
      status: 'pending',
      completed: false
    });

    const selectionLabel = options.selectionType === 'roomType'
      ? `Room type: ${options.selectedRoomType || ''}`
      : `Rooms: ${(options.selectedRoomNumbers || []).join(', ')}`;

    // Availability change
    if (options.updateAvailability && options.availabilityUpdate) {
      const setText = options.availabilityUpdate.isAvailable ? 'Available' : 'Not available';
      items.push({
        id: 'bk-availability',
        title: 'Availability update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${setText}`,
        category: 'availability',
        required: true,
        estimated_minutes: 4,
        instructions: [
          'Bulk edit → Date range & rooms',
          `Set availability = ${setText}`,
          'Apply & Save'
        ],
        verification_criteria: 'Calendar shows intended availability across dates',
        status: 'pending',
        completed: false
      });
    }

    // Pricing change
    if (options.updatePricing && options.pricingUpdate) {
      const pr = options.pricingUpdate;
      const pricingText = pr.basePrice != null
        ? `₹${pr.basePrice}`
        : pr.type === 'percentage'
          ? `${pr.value >= 0 ? '+' : '-'}${Math.abs(pr.value)}%`
          : `${pr.value >= 0 ? '+' : '-'}₹${Math.abs(pr.value)}`;

      items.push({
        id: 'bk-pricing',
        title: 'Rate update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${pricingText}`,
        category: 'pricing',
        required: true,
        estimated_minutes: 6,
        instructions: [
          'Bulk edit → Date range & rooms',
          `Set rate = ${pricingText}`,
          'Review & Save'
        ],
        verification_criteria: 'Rates reflect intended changes on the calendar',
        status: 'pending',
        completed: false
      });
    }

    items.push({
      id: 'bk-verify',
      title: 'Verify & document changes',
      description: 'Spot check random dates and take screenshots for records',
      category: 'verification',
      required: true,
      estimated_minutes: 3,
      instructions: ['Refresh calendar', 'Verify a few dates across the range', 'Take screenshots and file them'],
      verification_criteria: 'Screenshots captured; random checks match',
      status: 'pending',
      completed: false
    });

    return items;
  }

  /**
   * GoMMT Bulk Edit items (Connect app)
   */
  private static generateGoMMTBulkEditItems(
    options: import('../types/bulkEdit').BulkEditOptions
  ): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    const selectionLabel = options.selectionType === 'roomType'
      ? `Room type: ${options.selectedRoomType || ''}`
      : `Rooms: ${(options.selectedRoomNumbers || []).join(', ')}`;

    items.push({
      id: 'mmt-open-app',
      title: 'Open GoMMT Connect app',
      description: 'Login and open Rate & Availability section',
      category: 'setup',
      required: true,
      estimated_minutes: 1,
      instructions: ['Open GoMMT Connect', 'Login', 'Navigate to Rate & Availability'],
      verification_criteria: 'Inventory screen visible',
      status: 'pending',
      completed: false
    });

    if (options.updateAvailability && options.availabilityUpdate) {
      items.push({
        id: 'mmt-availability',
        title: 'Availability update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${options.availabilityUpdate.isAvailable ? 'Available' : 'Not available'}`,
        category: 'availability',
        required: true,
        estimated_minutes: 4,
        instructions: [
          'Range picker → dates & rooms',
          `Set availability = ${options.availabilityUpdate.isAvailable ? 'Available' : 'Not available'}`,
          'Apply & Save'
        ],
        verification_criteria: 'Dates reflect intended availability state',
        status: 'pending',
        completed: false
      });
    }

    if (options.updatePricing && options.pricingUpdate) {
      const pr = options.pricingUpdate;
      const pricingText = pr.basePrice != null
        ? `₹${pr.basePrice}`
        : pr.type === 'percentage'
          ? `${pr.value >= 0 ? '+' : '-'}${Math.abs(pr.value)}%`
          : `${pr.value >= 0 ? '+' : '-'}₹${Math.abs(pr.value)}`;

      items.push({
        id: 'mmt-pricing',
        title: 'Rate update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${pricingText}`,
        category: 'pricing',
        required: true,
        estimated_minutes: 5,
        instructions: ['Choose room type(s) & dates', `Set rate = ${pricingText}`, 'Save'],
        verification_criteria: 'Rates reflect intended change',
        status: 'pending',
        completed: false
      });
    }

    items.push({
      id: 'mmt-verify',
      title: 'Verify & sync',
      description: 'Confirm visible inventory/rates and force sync if available',
      category: 'verification',
      required: true,
      estimated_minutes: 2,
      instructions: ['Refresh the screen', 'Verify random dates', 'If available, run sync'],
      verification_criteria: 'Spot checks pass',
      status: 'pending',
      completed: false
    });

    return items;
  }

  /**
   * Generic fallback bulk edit items
   */
  private static generateGenericBulkEditItems(
    options: import('../types/bulkEdit').BulkEditOptions
  ): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    const selectionLabel = options.selectionType === 'roomType'
      ? `Room type: ${options.selectedRoomType || ''}`
      : `Rooms: ${(options.selectedRoomNumbers || []).join(', ')}`;

    items.push({
      id: 'generic-login',
      title: 'Login to OTA portal',
      description: 'Open partner portal and navigate to calendar/inventory',
      category: 'setup',
      required: true,
      estimated_minutes: 2,
      instructions: ['Login to OTA portal', 'Open Calendar/Inventory'],
      verification_criteria: 'Calendar visible',
      status: 'pending',
      completed: false
    });

    if (options.updateAvailability && options.availabilityUpdate) {
      items.push({
        id: 'generic-availability',
        title: 'Availability update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${options.availabilityUpdate.isAvailable ? 'Available' : 'Not available'}`,
        category: 'availability',
        required: true,
        estimated_minutes: 4,
        instructions: [
          'Select date range & rooms',
          `Set availability = ${options.availabilityUpdate.isAvailable ? 'Available' : 'Not available'}`,
          'Save'
        ],
        verification_criteria: 'Availability updated',
        status: 'pending',
        completed: false
      });
    }

    if (options.updatePricing && options.pricingUpdate) {
      const pr = options.pricingUpdate;
      const pricingText = pr.basePrice != null
        ? `₹${pr.basePrice}`
        : pr.type === 'percentage'
          ? `${pr.value >= 0 ? '+' : '-'}${Math.abs(pr.value)}%`
          : `${pr.value >= 0 ? '+' : '-'}₹${Math.abs(pr.value)}`;

      items.push({
        id: 'generic-pricing',
        title: 'Rate update',
        description: `${selectionLabel} | Dates: ${options.dateRange.startDate} → ${options.dateRange.endDate} | Set: ${pricingText}`,
        category: 'pricing',
        required: true,
        estimated_minutes: 5,
        instructions: ['Select date range & rooms', `Set rate = ${pricingText}`, 'Save'],
        verification_criteria: 'Rates updated',
        status: 'pending',
        completed: false
      });
    }

    return items;
  }

  /**
   * Group multiple single-room availability items with same dates and target into one multi-room item.
   * Recognizes descriptions in the form:
   *  - "Room: D101 | Dates: 2025-08-10 → 2025-08-15 | Set: Not available"
   *  - "Rooms: D101, D102 | Dates: ... | Set: Available"
   */
  private static consolidateAvailabilityItems(items: ChecklistItem[]): ChecklistItem[] {
    const result: ChecklistItem[] = [];
    const groups = new Map<string, { rooms: Set<string>; set: string; start: string; end: string; items: ChecklistItem[] }>();

    const parse = (desc?: string) => {
      if (!desc) return null as any;
      const roomMatch = desc.match(/\bRoom[s]?:\s*([^|]+)/i);
      const datesMatch = desc.match(/Dates:\s*(\d{4}-\d{2}-\d{2})\s*[→\-to]+\s*(\d{4}-\d{2}-\d{2})/i);
      const setMatch = desc.match(/Set:\s*([^|]+)/i);
      if (!datesMatch || !setMatch) return null;
      const roomsStr = roomMatch ? roomMatch[1].trim() : '';
      const rooms = roomsStr.split(',').map(r => r.trim()).filter(Boolean);
      return { rooms, start: datesMatch[1], end: datesMatch[2], set: setMatch[1].trim() };
    };

    for (const item of items) {
      if ((item.category !== 'availability')) { result.push(item); continue; }
      const parsed = parse(item.description);
      if (!parsed) { result.push(item); continue; }
      const key = `${parsed.start}|${parsed.end}|${parsed.set}`;
      if (!groups.has(key)) {
        groups.set(key, { rooms: new Set<string>(), set: parsed.set, start: parsed.start, end: parsed.end, items: [] });
      }
      const g = groups.get(key)!;
      parsed.rooms.forEach((r: string) => g.rooms.add(r));
      g.items.push(item);
    }

    // Emit grouped availability items and keep non-availability as is
    // First, push non-availability already collected in result
    const nonAvailability = result.slice();
    const grouped: ChecklistItem[] = [];
    groups.forEach((g) => {
      const completedAll = g.items.length > 0 && g.items.every((it: any) => it.completed === true || it.status === 'completed');
      const est = g.items.reduce((sum, it) => sum + (it.estimated_minutes || 0), 0) || (2 + g.rooms.size);
      grouped.push({
        id: `group-avail-${g.start}-${g.end}-${Array.from(g.rooms).join('-')}`,
        title: 'Availability update',
        description: `Rooms: ${Array.from(g.rooms).join(', ')} | Dates: ${g.start} → ${g.end} | Set: ${g.set}`,
        category: 'availability',
        required: true,
        estimated_minutes: est,
        status: completedAll ? 'completed' : 'pending',
        completed: completedAll
      } as any);
    });

    return [...nonAvailability, ...grouped];
  }
}