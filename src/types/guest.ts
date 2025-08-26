export interface GuestProfile {
  id: string;
  
  // Basic Information
  name: string;
  email?: string;
  phone?: string;
  
  // Contact Information
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  
  // Guest Statistics
  total_stays: number;
  total_spent: number;
  last_stay_date?: string;
  typical_group_size: number;
  
  // Aliases for backward compatibility
  total_bookings: number; // Alias for total_stays
  last_visit_date?: string; // Alias for last_stay_date
  
  // Privacy Preferences
  email_marketing_consent: boolean;
  sms_marketing_consent: boolean;
  data_retention_consent: boolean;
  
  // Staff Notes
  notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateGuestProfileData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
  data_retention_consent?: boolean;
  notes?: string;
}

export interface UpdateGuestProfileData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
  data_retention_consent?: boolean;
  notes?: string;
}

export interface GuestProfileFilters {
  search?: string; // Search by name, email, or phone
  city?: string;
  state?: string;
  country?: string;
  minStays?: number;
  minSpent?: number;
  lastStayAfter?: string;
  lastStayBefore?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  marketingConsent?: boolean;
  emailMarketingConsent?: boolean;
  smsMarketingConsent?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface GuestProfileStats {
  totalProfiles: number;
  totalStays: number;
  totalRevenue: number;
  averageStaysPerGuest: number;
  averageSpendPerGuest: number;
  repeatGuestPercentage: number;
  topCities: Array<{ city: string; count: number }>;
  topStates: Array<{ state: string; count: number }>;
}

export interface GuestBookingHistory {
  id: string;
  booking_id: string;
  guest_name: string;
  room_no: string;
  check_in: string;
  check_out: string;
  no_of_pax: number;
  additional_guest_names?: string;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  special_requests?: string;
  created_at: string;
  // Multi-property
  property_id?: string;
  property_name?: string;
}

export interface GuestProfileViewProps {
  guestId: string;
  onClose: () => void;
  onEdit?: (guest: GuestProfile) => void;
}

export interface GuestProfileFormProps {
  guest?: GuestProfile;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface GuestProfileListProps {
  filters?: GuestProfileFilters;
  onSelectGuest?: (guest: GuestProfile) => void;
  onEditGuest?: (guest: GuestProfile) => void;
  onDeleteGuest?: (guestId: string) => void;
  selectedGuestId?: string;
  showActions?: boolean;
  maxHeight?: string;
}

// Privacy and GDPR related types
export interface PrivacySettings {
  email_marketing_consent: boolean;
  sms_marketing_consent: boolean;
  data_retention_consent: boolean;
  consent_date: string;
  consent_ip?: string;
  consent_user_agent?: string;
}

export interface DataExportRequest {
  guest_id: string;
  request_date: string;
  export_format: 'json' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  expires_at?: string;
}

export interface DataDeletionRequest {
  guest_id: string;
  request_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  notes?: string;
}

// Lightweight communications type for recent emails
export interface GuestEmailMessage {
  id: string;
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  snippet: string | null;
  received_at: string | null;
}

// Duplicate detection & merge
export interface DuplicateCandidate {
  profile: GuestProfile;
  reasons: string[];
  score: number; // higher means more likely duplicate
}

export interface MergeResult {
  primary: GuestProfile;
  mergedIds: string[];
  bookingsReassigned: number;
  profileUpdated: boolean;
}