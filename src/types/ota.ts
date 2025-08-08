// OTA Calendar Management Types
// Story 4.2: OTA Calendar Synchronization

export interface OTAPlatform {
  id: string;
  name: string;
  display_name?: string;
  type: 'airbnb' | 'vrbo' | 'booking_com' | 'gommt' | 'other';
  config: AirbnbConfig | VRBOConfig | BookingComConfig | GoMMTConfig | Record<string, any>;
  configuration?: AirbnbConfig | VRBOConfig | BookingComConfig | GoMMTConfig | Record<string, any>;
  ical_import_url?: string;
  ical_export_url?: string;
  last_sync: string | null;
  sync_status: 'success' | 'failed' | 'pending' | 'never';
  error_message?: string;
  created_at: string;
  updated_at: string;
  sync_method: 'ical' | 'api' | 'manual';
  sync_enabled: boolean;
  active: boolean;
  is_active?: boolean; // Database field name
  manual_update_required: boolean;
  color: string;
  sync_frequency_hours: number;
  sync_interval?: number; // Database field name
  property_id?: string; // For property-specific configurations
  credentials?: Record<string, any>; // Database field for API credentials
}

// Property-specific OTA platform view interface
export interface PropertyOTAPlatform {
  property_id: string;
  property_name: string;
  platform_id: string;
  platform_name: string;
  display_name: string;
  type: 'airbnb' | 'vrbo' | 'booking_com' | 'gommt' | 'other';
  manual_update_required: boolean;
  sync_enabled: boolean;
  is_active: boolean;
  configuration: Record<string, any>;
  ical_import_url?: string;
  ical_export_url?: string;
  config_type: 'property_specific' | 'global';
}

export interface OTASyncLog {
  id: string;
  platform_id: string;
  property_id: string;
  sync_type: 'export' | 'import' | 'full';
  status: 'success' | 'failed' | 'pending' | 'partial';
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_failed: number;
  error_message?: string;
  error_details?: Record<string, any>;
  sync_data?: Record<string, any>;
  created_at: string;
}

export interface CalendarConflict {
  id: string;
  property_id: string;
  conflict_date: string;
  conflict_date_start?: string;
  conflict_date_end?: string;
  conflict_end_date?: string;
  platforms?: string[];
  severity: 'low' | 'medium' | 'high';
  status: 'detected' | 'resolving' | 'resolved' | 'ignored';
  conflict_type: string;
  description?: string;
  details?: Record<string, any>;
  resolution?: string;
  resolution_action?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  booking_ids?: string[];
  booking_id_1?: string;
  booking_id_2?: string;
  room_no?: string;
  suggested_resolution?: {
    action: string;
    priority: string;
    steps: string[];
    estimated_cost?: number;
    auto_resolvable?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ManualUpdateChecklist {
  id: string;
  platform_id: string;
  property_id: string;
  booking_id?: string;
  checklist_type?: 'new_booking' | 'modification' | 'cancellation';
  checklist_data?: ChecklistData;
  checklist_date?: string;
  date_range_start?: string;
  date_range_end?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assigned_to?: string;
  completed_by?: string;
  completed_at?: string;
  due_date?: string;
  reminder_sent_at?: string;
  notes?: string;
  ota_platforms?: string[];
  total_items?: number;
  completed_items?: number;
  checklist_items?: ChecklistItem[];
  estimated_duration?: number;
  priority?: 'low' | 'medium' | 'high';
  instructions?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistData {
  items: ChecklistItem[];
  priority: 'low' | 'medium' | 'high';
  estimated_time: string;
  instructions?: string;
  platform_url?: string;
}

export interface ChecklistItem {
  id?: string;
  title?: string;
  description?: string;
  task?: string;
  completed?: boolean;
  url?: string;
  notes?: string;
  completed_at?: string;
  required: boolean;
  category: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_minutes?: number;
  instructions?: string[];
  verification_criteria?: string;
  booking_reference?: string;
}

// Extended Booking type with OTA fields
export interface OTABooking {
  id: string;
  guest_name: string;
  room_no: string;
  check_in: string;
  check_out: string;
  no_of_pax: number;
  adult_child: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  cancelled: boolean;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_amount?: number;
  payment_mode?: string;
  contact_phone?: string;
  contact_email?: string;
  special_requests?: string;
  booking_date?: string;
  invoice_date?: string;
  created_at: string;
  updated_at: string;
  // OTA-specific fields
  ota_platform_id?: string;
  ota_booking_id?: string;
  ota_sync_status: 'pending' | 'synced' | 'failed' | 'manual';
  ota_last_sync?: string;
  ota_sync_errors?: Record<string, any>;
  source: 'direct' | 'ota' | 'ical_import';
}

// iCal related types
export interface ICalEvent {
  id?: any;
  uid?: string;
  summary?: string;
  title?: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  created?: Date;
  lastModified?: Date;
  organizer?: string;
  attendees?: string[];
  recurrence?: string;
  timezone?: string;
  allDay?: boolean;
  url?: string;
  categories?: string[];
  priority?: number;
  transparency?: 'opaque' | 'transparent';
  sequence?: number;
  resource?: any;
  alarm?: {
    trigger: string;
    action: 'display' | 'email' | 'audio';
    description?: string;
  };
}

export interface ICalCalendar {
  prodId: string;
  version: string;
  calName: string;
  timezone: string;
  events: ICalEvent[];
}

// Sync operation types
export interface SyncOperation {
  id: string;
  platform: OTAPlatform;
  property_id: string;
  type: 'export' | 'import' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  started_at: Date;
  estimated_completion?: Date;
}

// Calendar dashboard types
export interface CalendarDashboardData {
  properties: Array<{
    id: string;
    name: string;
    total_rooms: number;
    active_bookings: number;
    conflicts: number;
    sync_status: Record<string, 'success' | 'failed' | 'pending'>;
  }>;
  platforms: OTAPlatform[];
  recent_syncs: OTASyncLog[];
  active_conflicts: CalendarConflict[];
  pending_checklists: ManualUpdateChecklist[];
  total_properties?: number;
  total_platforms?: number;
  active_syncs?: number;
  pending_conflicts?: number;
  manual_updates_pending?: number;
  sync_health_score?: number;
  last_sync_status?: string;
}

// Conflict resolution types
export interface ConflictResolution {
  conflict_id?: string;
  resolution_type?: 'cancel_booking' | 'move_booking' | 'split_booking' | 'ignore';
  target_booking_id?: string;
  new_dates?: {
    check_in: string;
    check_out: string;
  };
  new_room?: string;
  reason?: string;
  resolved_by?: string;
  action: string;
  priority: string;
  steps: string[];
  estimated_cost?: number;
  auto_resolvable?: boolean;
  notes?: string;
}

// Platform-specific configuration types
export interface AirbnbConfig {
  calendar_url: string;
  sync_interval: number;
  timezone: string;
  auto_block_buffer: number; // days before/after to block
  listing_id: string;
  property_id?: string;
  access_token?: string;
  refresh_token?: string;
  calendar_id?: string;
  calendar_export_url?: string;
  auto_accept_bookings?: boolean;
}

export interface VRBOConfig {
  calendar_url: string;
  sync_interval: number;
  timezone: string;
  auto_block_buffer: number;
  property_id: string;
  api_key?: string;
  ical_url?: string;
  property_manager_id?: string;
  listing_id?: string;
}

export interface BookingComConfig {
  extranet_url: string;
  property_id: string;
  update_method: 'extranet_calendar' | 'ical';
  bulk_editing: boolean;
  instructions: string;
  hotel_id: string;
  username?: string;
  password?: string;
  extranet_username?: string;
  update_frequency_hours?: number;
  email_notifications?: boolean;
  // iCal synchronization fields
  ical_url?: string;
  ical_export_url?: string;
  ical_import_url?: string;
  sync_interval?: number;
  timezone?: string;
}

export interface GoMMTConfig {
  app_name: string;
  property_id: string;
  update_method: 'connect_app';
  sync_feature: boolean;
  instructions: string;
  partner_id?: string;
  api_credentials?: Record<string, any>;
  connect_username?: string;
  property_code?: string;
  reminder_time?: string;
  mobile_notifications?: boolean;
}

// API response types
export interface OTAApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SyncResult {
  platform: string;
  property_id: string;
  success: boolean;
  records_processed: number;
  records_failed: number;
  conflicts_detected: number;
  errors: string[];
  warnings: string[];
  sync_duration: number; // milliseconds
}

// Notification types
export interface ConflictNotification {
  id: string;
  type: 'conflict_detected' | 'sync_failed' | 'checklist_overdue';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  property_id: string;
  platform?: string;
  action_required: boolean;
  action_url?: string;
  created_at: string;
  read: boolean;
}

// Filter and search types
export interface CalendarFilters {
  property_ids?: string[];
  platform_ids?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  conflict_status?: CalendarConflict['status'][];
  sync_status?: OTASyncLog['status'][];
  checklist_status?: ManualUpdateChecklist['status'][];
}

export interface CalendarSearchParams {
  query?: string;
  filters: CalendarFilters;
  sort_by: 'date' | 'property' | 'platform' | 'status';
  sort_order: 'asc' | 'desc';
  page: number;
  limit: number;
}

// Real-time update types
export interface RealtimeUpdate {
  type: 'booking_created' | 'booking_updated' | 'conflict_detected' | 'sync_completed' | 'checklist_updated';
  data: any;
  timestamp: string;
  property_id: string;
  platform?: string;
}

// Platform Configuration type
export type PlatformConfig = AirbnbConfig | VRBOConfig | BookingComConfig | GoMMTConfig | Record<string, any>;

// Export type aliases for convenience
export type PlatformType = 'airbnb' | 'vrbo' | 'booking_com' | 'gommt' | 'other';
export type SyncMethod = 'ical' | 'api' | 'manual';
export type ConflictType = 'double_booking' | 'ota_sync_conflict' | 'availability_mismatch' | 'pricing_conflict';
export type ConflictStatus = 'pending' | 'resolved' | 'ignored';
export type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Additional types for OTA Calendar
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type FilterOptions = {
  platform?: string;
  platforms?: string[];
  property?: string;
  status?: string;
  showResolved?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
};

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SyncHealthMetrics {
  overall_score: number;
  overallHealthScore?: number;
  syncSuccessRate?: number;
  conflictResolutionRate?: number;
  platform_scores: Record<string, number>;
  last_sync_times: Record<string, string>;
  error_rates: Record<string, number>;
  uptime_percentage: number;
}

export interface ConflictAnalytics {
  total_conflicts: number;
  resolved_conflicts: number;
  pending_conflicts: number;
  conflict_types: Record<string, number>;
  resolution_times: Record<string, number>;
  platform_conflicts: Record<string, number>;
}

export interface PlatformPerformance {
  platform_id: string;
  platform_name: string;
  sync_success_rate: number;
  average_sync_time: number;
  last_successful_sync: string;
  error_count: number;
  booking_count: number;
}

export interface SyncTrend {
  date: string;
  successful_syncs: number;
  failed_syncs: number;
  total_bookings: number;
  conflicts_detected: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  notification_channels: string[];
}

export interface MonitoringAlert {
  id: string;
  rule_id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  platform_id?: string;
  platformName?: string;
  property_id?: string;
  triggered_at: string;
  timestamp?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

// Export type aliases for convenience
export type Platform = OTAPlatform;
export type Conflict = CalendarConflict;
export type Checklist = ManualUpdateChecklist;
export type SyncLog = OTASyncLog;
export type CalendarEvent = ICalEvent;
export type Operation = SyncOperation;