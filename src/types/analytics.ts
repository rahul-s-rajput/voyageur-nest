import type { ExpenseReportCategoryTotal } from "./expenses";

export interface BookingKPIs {
  totalRevenue: number;
  occupancyRate: number; // percentage 0-100
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  totalRoomNightsSold: number;
  totalRoomNightsAvailable: number;
  bookingCount: number;
  sourceDistribution: Array<{ name: string; value: number; count: number }>; // value as percentage for charts
  // Performance metrics
  cancellationRate?: number; // % cancelled of all bookings in period (includes cancelled)
  bookingConversionRate?: number | null; // % confirmed of (confirmed+pending) in period; null when not computable
  cancelledBookingCount?: number; // supporting count for aggregation
  totalBookingsAllStatuses?: number; // supporting count for aggregation (includes cancelled and all statuses)
  confirmedBookingCount?: number; // supporting count for conversion
  pendingBookingCount?: number; // supporting count for conversion
  // Guest metrics
  avgLengthOfStay?: number; // ALOS in nights per reservation (non-cancelled)
  totalNightsBooked?: number; // Sum of nights across non-cancelled reservations (not multiplied by rooms)
  uniqueGuestsCount?: number; // unique guest keys within period (non-cancelled)
  repeatGuestsUniqueCount?: number; // unique guests appearing >1 time within period
  repeatGuestRate?: number; // % of unique guests who are repeats within period
}

export interface ExpenseAnalytics {
  totalExpenses: number;
  byCategory: ExpenseReportCategoryTotal[]; // { categoryId, categoryName, total }
}

export interface OverviewAnalytics {
  booking: BookingKPIs;
  expenses: ExpenseAnalytics;
}

export interface AnalyticsFilters {
  propertyId: string;
  start: string; // ISO date string (inclusive)
  end: string;   // ISO date string (inclusive)
  totalRooms?: number; // used for occupancy calculations
  // Optional booking source filter (use 'all' or omit to include all)
  bookingSource?: string;
}
