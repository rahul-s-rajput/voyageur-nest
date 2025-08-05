export interface Booking {
  id: string;
  propertyId?: string; // Added for multi-property support
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
}

export type ViewMode = 'calendar' | 'list';