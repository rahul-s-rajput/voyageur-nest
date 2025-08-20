export interface Booking {
  id: string;
  propertyId?: string; // Added for multi-property support
  guestName: string;
  guestEmail?: string; // Added for real-time grid
  guestPhone?: string; // Added for real-time grid
  roomNo: string;
  numberOfRooms?: number;
  numberOfGuests?: number; // Added for real-time grid
  checkIn: string;
  checkOut: string;
  noOfPax?: number;
  adultChild?: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out';
  cancelled?: boolean;
  totalAmount: number;
  paymentStatus?: 'paid' | 'partial' | 'unpaid';
  paymentAmount?: number;
  paymentMode?: string;
  source?: string; // Added for analytics: booking source (Direct, OTA, etc.)
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  notes?: string; // Added for real-time grid
  bookingDate?: string;
  folioNumber?: string;
  guestProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  propertyId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  guestName?: string;
  roomNo?: string;
  status?: Booking['status'][];
  paymentStatus?: Booking['paymentStatus'][];
  showCancelled?: boolean;
  // Optional booking source filter
  source?: string;
}

export type ViewMode = 'calendar' | 'list' | 'grid';