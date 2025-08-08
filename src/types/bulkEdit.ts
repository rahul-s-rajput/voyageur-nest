import { RoomType } from './property';

export interface BulkEditOptions {
  // Room selection
  selectionType: 'roomType' | 'roomNumber';
  selectedRoomType?: RoomType;
  selectedRoomNumbers?: string[];
  
  // Date range
  dateRange: {
    startDate: string;
    endDate: string;
  };
  
  // Update types
  updatePricing: boolean;
  updateAvailability: boolean;
  
  // Pricing updates
  pricingUpdate?: {
    type: 'fixed' | 'percentage';
    value: number; // Fixed amount or percentage
    basePrice?: number; // For fixed price updates
  };
  
  // Availability updates
  availabilityUpdate?: {
    isAvailable: boolean;
    reason?: string; // Optional reason for unavailability
  };
}

export interface BulkEditPreview {
  affectedRooms: {
    roomNumber: string;
    roomType: RoomType;
    currentPrice: number;
    newPrice?: number;
    currentAvailability: boolean;
    newAvailability?: boolean;
    error?: string; // Optional error message if room processing failed
  }[];
  
  affectedDates: string[];
  
  summary: {
    totalRooms: number;
    totalDates: number;
    totalChanges: number;
    priceChanges: number;
    availabilityChanges: number;
  };
  
  conflicts?: BulkEditConflict[];
}

export interface BulkEditConflict {
  type: 'existing_booking' | 'price_validation' | 'date_validation';
  roomNumber: string;
  date: string;
  message: string;
  severity: 'warning' | 'error';
  bookingId?: string;
  guestName?: string;
}

export interface BulkEditResult {
  success: boolean;
  updatedRooms: number;
  updatedDates: number;
  errors?: string[];
  warnings?: string[];
}

export interface RoomPriceUpdate {
  roomNumber: string;
  date: string;
  oldPrice: number;
  newPrice: number;
}

export interface RoomAvailabilityUpdate {
  roomNumber: string;
  date: string;
  oldAvailability: boolean;
  newAvailability: boolean;
  reason?: string;
}