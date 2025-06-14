export interface Booking {
  id: string;
  guestName: string;
  roomNo: string;
  checkIn: string;
  checkOut: string;
  noOfPax: number;
  adultChild: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in' | 'checked-out';
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  guestName?: string;
  roomNo?: string;
  status?: Booking['status'][];
  paymentStatus?: Booking['paymentStatus'][];
}

export type ViewMode = 'calendar' | 'list'; 