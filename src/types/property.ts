// Re-export types from booking.ts for convenience
export interface Property {
  id: string;
  name: string;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  contactPhone?: string;
  contactEmail?: string;
  description?: string;
  websiteUrl?: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalRooms: number;
  amenities?: string[];
  policies?: PropertyPolicies;
  branding?: PropertyBranding;
  settings?: PropertySettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyBranding {
  themeColor: string;
  secondaryColor: string;
  logoUrl?: string;
  propertyStyle: 'casual' | 'premium' | 'luxury';
}

export interface PropertyPolicies {
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  checkInInstructions?: string;
  houseRules: string[];
}

export interface PropertySettings {
  targetMarket: 'backpacker' | 'family' | 'business' | 'luxury';
  roomTypes: RoomType[];
  propertyType: 'backpacker_friendly' | 'family_oriented' | 'business_hotel' | 'luxury_resort';
  checkInTime?: string;
  checkOutTime?: string;
  currency?: string;
  taxRate?: number;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomNo: string; // Added for compatibility with real-time grid
  roomType: RoomType;
  floor?: number;
  maxOccupancy: number;
  basePrice: number;
  seasonalPricing?: Record<string, number>; // NEW: {"summer": 1500, "winter": 1200}
  pricing?: RoomPricing; // Enhanced pricing structure
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional per-date availability overrides map: { 'YYYY-MM-DD': boolean }
  availabilityOverrides?: Record<string, boolean>;
}

export interface RoomPricing {
  basePrice: number;
  weekendMultiplier?: number;
  seasonalAdjustments?: SeasonalAdjustment[];
  lastUpdated: Date;
  updatedBy: string;
}

export interface SeasonalAdjustment {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (e.g., 20 for 20%) or fixed amount (e.g., 500 for ₹500)
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  isActive?: boolean;
}

export type RoomType = 'standard' | 'deluxe' | 'twin_single' | 'suite' | 'dormitory';

export interface GridCalendarSettings {
  viewType: 'week' | 'month' | 'custom';
  dateRange: { start: Date; end: Date };
  showPricing: boolean;
  selectedRooms: string[];
}

export interface PropertyContext {
  currentProperty: Property | null;
  properties: Property[];
  switchProperty: (propertyId: string) => void;
  isLoading: boolean;
  error: string | null;
  loadProperties?: () => Promise<void>;
  refreshProperties: () => Promise<void>;
  addProperty: (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Property>;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<Property>;
  deleteProperty: (propertyId: string) => Promise<void>;
  
  // Grid calendar specific state and actions
  gridCalendarSettings: GridCalendarSettings;
  updateGridSettings: (settings: Partial<GridCalendarSettings>) => void;
  refreshGridData: () => Promise<void>;
}

export interface PropertySpecificRoom extends Room {
  property: Property;
  availability?: RoomAvailability;
}

export interface RoomAvailability {
  date: string;
  isAvailable: boolean;
  bookingId?: string;
  guestName?: string;
}

export interface MultiPropertyPricingRule {
  id: string;
  propertyId: string;
  roomType: RoomType;
  seasonType: 'peak' | 'off_peak' | 'regular';
  basePrice: number;
  weekendMultiplier: number;
  minimumStay: number;
  maximumStay: number;
  advanceBookingDays: number;
  isActive: boolean;
  validFrom: string;
  validTo: string;
}

export interface PropertySpecificSettings {
  id: string;
  propertyId: string;
  settingKey: string;
  settingValue: any;
  // General Settings
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  timezone: string;
  language: string;
  emergencyContact: string;
  wifiPassword: string;
  
  // Financial Settings
  taxRate: number;
  localTaxRate: number;
  serviceChargeRate: number;
  
  // Booking Settings
  minAdvanceBookingDays: number;
  maxAdvanceBookingDays: number;
  allowOnlineBooking: boolean;
  autoConfirmBookings: boolean;
  requireAdvancePayment: boolean;
  advancePaymentPercentage: number;
  
  // Cancellation & Policies
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  noShowPolicy: 'charge_full' | 'charge_first_night' | 'no_charge';
  
  // Notification Settings
  sendConfirmationEmail: boolean;
  sendReminderEmail: boolean;
  reminderEmailDays: number;
  
  // Property Policies
  petPolicy: 'allowed' | 'not_allowed' | 'on_request';
  smokingPolicy: 'allowed' | 'not_allowed' | 'designated_areas';
  childPolicy: 'welcome' | 'age_restrictions' | 'not_suitable';
  extraBedPolicy: 'available' | 'not_available' | 'on_request' | 'available_with_fee';
  extraBedCharge: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CrossPropertyAnalytics {
  totalProperties: number;
  totalRooms: number;
  occupancyRate: number;
  revenue: {
    total: number;
    byProperty: PropertyRevenue[];
  };
  bookings: {
    total: number;
    byProperty: PropertyBookings[];
  };
  guestSatisfaction: {
    average: number;
    byProperty: PropertySatisfaction[];
  };
}

export interface PropertyRevenue {
  propertyId: string;
  propertyName: string;
  revenue: number;
  occupancyRate: number;
  averageRate: number;
}

export interface PropertyBookings {
  propertyId: string;
  propertyName: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
}

export interface PropertySatisfaction {
  propertyId: string;
  propertyName: string;
  rating: number;
  reviewCount: number;
}

export interface PropertyComparison {
  metrics: {
    occupancy: PropertyMetric[];
    revenue: PropertyMetric[];
    averageRate: PropertyMetric[];
    guestSatisfaction: PropertyMetric[];
  };
  trends: {
    period: string;
    data: PropertyTrendData[];
  };
}

export interface PropertyMetric {
  propertyId: string;
  propertyName: string;
  value: number;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
}

export interface PropertyTrendData {
  date: string;
  properties: {
    [propertyId: string]: {
      occupancy: number;
      revenue: number;
      bookings: number;
    };
  };
}

export interface PropertyDashboardData {
  summary: {
    totalProperties: number;
    totalRooms: number;
    occupiedRooms: number;
    todayCheckIns: number;
    todayCheckOuts: number;
    pendingBookings: number;
  };
  propertyBreakdown: PropertyBreakdown[];
  upcomingEvents: PropertyEvent[];
  recentActivity: PropertyActivity[];
}

export interface PropertyBreakdown {
  property: Property;
  occupancy: {
    occupied: number;
    available: number;
    outOfOrder: number;
  };
  revenue: {
    today: number;
    thisMonth: number;
    lastMonth: number;
  };
  bookings: {
    checkInsToday: number;
    checkOutsToday: number;
    newBookings: number;
  };
  averageStayDuration?: number;
}

export interface PropertyEvent {
  id: string;
  propertyId: string;
  propertyName: string;
  type: 'check_in' | 'check_out' | 'maintenance' | 'booking';
  title: string;
  description?: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface PropertyActivity {
  id: string;
  propertyId: string;
  propertyName: string;
  type: 'booking_created' | 'booking_modified' | 'check_in' | 'check_out' | 'payment_received';
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

// Property-specific booking interface extending the base booking
export interface PropertyBooking {
  id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  roomNo: string;
  numberOfRooms: number;
  checkIn: string;
  checkOut: string;
  noOfPax: number;
  adultChild: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  cancelled: boolean;
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentAmount?: number;
  paymentMode?: string;
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  bookingDate?: string;
  folioNumber?: string;
  guestProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

// Guest profile with cross-property history
export interface CrossPropertyGuest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  stayHistory: PropertyStay[];
  preferences: GuestPreferences;
  totalStays: number;
  totalSpent: number;
  vipStatus: boolean;
  // Additional properties for guest recognition
  totalBookings: number;
  averageRating: number;
  lastVisitDate: string;
  preferredProperties: string[];
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  specialRequests?: string[];
  visitHistory: VisitHistory[];
  notes?: string;
  tags?: string[];
  isVIP: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisitHistory {
  propertyId: string;
  propertyName: string;
  visitDate: string;
  roomType: string;
  amount: number;
  rating?: number;
  review?: string;
}

export interface PropertyStay {
  propertyId: string;
  propertyName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  roomNumber: string;
  roomType: RoomType;
  totalAmount: number;
  rating?: number;
  review?: string;
}

export interface GuestPreferences {
  roomType?: RoomType;
  floorPreference?: 'low' | 'high' | 'any';
  amenityPreferences: string[];
  dietaryRestrictions?: string[];
  specialRequests?: string[];
  communicationPreference: 'email' | 'sms' | 'both';
  // Additional properties for guest recognition
  bedType?: 'single' | 'double' | 'queen' | 'king';
  floor?: 'ground' | 'low' | 'high' | 'any';
  amenities?: string[];
}

// Form interfaces for property management
export interface PropertyFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  websiteUrl: string;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  policies: PropertyPolicies;
  branding: PropertyBranding;
  settings: PropertySettings;
}

export interface RoomFormData {
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  maxOccupancy: number;
  basePrice: number;
  amenities: string[];
}

// Validation schemas
export interface PropertyValidationErrors {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: string;
  policies?: string;
  branding?: string;
  settings?: string;
}

export interface RoomValidationErrors {
  roomNumber?: string;
  roomType?: string;
  maxOccupancy?: string;
  basePrice?: string;
  amenities?: string;
}

// Room Grid Calendar interfaces for Task 3
export interface RoomGridData {
  room: Room;
  availability: RoomAvailabilityMap[string];
  bookings: PropertyBooking[];
  pricing: PricingMap;
}

export interface PricingMap {
  [dateString: string]: number;
}

// Import RoomAvailabilityMap from roomBookingService
export interface RoomAvailabilityMap {
  [roomNo: string]: {
    [dateString: string]: {
      status: 'available' | 'occupied' | 'checkout' | 'checkin' | 'checkin-checkout' | 'unavailable';
      booking?: PropertyBooking;
      checkInBooking?: PropertyBooking;
      checkOutBooking?: PropertyBooking;
      price: number;
    }
  }
}