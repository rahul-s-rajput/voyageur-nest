import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { bookingService } from "../../lib/supabase";
import type { Booking } from "../../types/booking";
import type { AnalyticsFilters, BookingKPIs } from "../../types/analytics";

function safeParse(dateStr: string): Date {
  // booking dates may already be ISO; fallback to new Date
  try {
    return parseISO(dateStr);
  } catch {
    return new Date(dateStr);
  }
}

function clamp(n: number, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(n, min), max);
}

function calculateNightsWithinPeriod(checkIn: string, checkOut: string, periodStart: Date, periodEnd: Date): number {
  const ci = safeParse(checkIn);
  const co = safeParse(checkOut);
  // Nights are from check-in (inclusive) to check-out (exclusive)
  const stayStart = ci < periodStart ? periodStart : ci;
  const stayEnd = co > periodEnd ? periodEnd : co;
  const nights = differenceInCalendarDays(stayEnd, stayStart);
  return Math.max(0, nights);
}

export async function getBookingKPIs(filters: AnalyticsFilters): Promise<BookingKPIs> {
  // Defensive guard: avoid runtime errors when required filters are missing/invalid
  if (!filters?.propertyId || !filters?.start || !filters?.end) {
    return {
      totalRevenue: 0,
      occupancyRate: 0,
      adr: 0,
      revpar: 0,
      totalRoomNightsSold: 0,
      totalRoomNightsAvailable: 0,
      bookingCount: 0,
      sourceDistribution: [],
      // Performance metrics defaults
      cancellationRate: 0,
      bookingConversionRate: null,
      cancelledBookingCount: 0,
      totalBookingsAllStatuses: 0,
      confirmedBookingCount: 0,
      pendingBookingCount: 0,
      // Guest metrics defaults
      avgLengthOfStay: 0,
      totalNightsBooked: 0,
      uniqueGuestsCount: 0,
      repeatGuestsUniqueCount: 0,
      repeatGuestRate: 0,
    };
  }

  const startStr = format(new Date(filters.start), "yyyy-MM-dd");
  const endStr = format(new Date(filters.end), "yyyy-MM-dd");

  // Fetch ALL bookings (including cancelled) for performance/guest metrics
  const allBookings: Booking[] = await bookingService.getBookings({
    propertyId: filters.propertyId,
    dateRange: { start: startStr, end: endStr },
    // showCancelled: undefined -> include both cancelled and non-cancelled
    source: filters.bookingSource && filters.bookingSource !== 'all' ? filters.bookingSource : undefined,
  });
  // Filter out cancelled for revenue/occupancy calculations
  const activeBookings = allBookings.filter(b => !b.cancelled);

  const periodStart = new Date(startStr);
  const periodEnd = new Date(endStr);
  const daysInPeriod = clamp(differenceInCalendarDays(periodEnd, periodStart) + 1, 1);

  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const bookingCount = activeBookings.length;

  const roomNightsSold = activeBookings.reduce((sum, b) => {
    const rooms = b.numberOfRooms || 1;
    const nights = calculateNightsWithinPeriod(b.checkIn, b.checkOut, periodStart, periodEnd);
    return sum + rooms * nights;
  }, 0);

  const totalRooms = filters.totalRooms || 0;
  const roomNightsAvailable = totalRooms > 0 ? totalRooms * daysInPeriod : 0;

  const occupancyRate = roomNightsAvailable > 0
    ? (roomNightsSold / roomNightsAvailable) * 100
    : 0;

  const adr = roomNightsSold > 0 ? totalRevenue / roomNightsSold : 0;
  const revpar = roomNightsAvailable > 0 ? totalRevenue / roomNightsAvailable : 0;

  // Booking source distribution
  const sourceCounts = activeBookings.reduce<Record<string, number>>((acc, b) => {
    const key = (b.source || "Unknown").toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sourceDistribution = Object.entries(sourceCounts).map(([name, count]) => ({
    name,
    count,
    value: bookingCount > 0 ? (count / bookingCount) * 100 : 0,
  }));

  // Performance metrics
  const totalBookingsAllStatuses = allBookings.length;
  const cancelledBookingCount = allBookings.filter(b => b.cancelled).length;
  const cancellationRate = totalBookingsAllStatuses > 0
    ? (cancelledBookingCount / totalBookingsAllStatuses) * 100
    : 0;

  const isConfirmedStatus = (s: Booking['status']) => s === 'confirmed' || s === 'checked-in' || s === 'checked-out';
  const isPendingStatus = (s: Booking['status']) => s === 'pending';

  const confirmedBookingCount = allBookings.filter(b => isConfirmedStatus(b.status)).length;
  const pendingBookingCount = allBookings.filter(b => isPendingStatus(b.status)).length;
  const conversionDenominator = confirmedBookingCount + pendingBookingCount;
  const bookingConversionRate = conversionDenominator > 0
    ? (confirmedBookingCount / conversionDenominator) * 100
    : null; // unknown without inquiries and when there are no confirmed/pending

  // Guest metrics
  // ALOS: average nights per reservation (non-cancelled)
  const perBookingNights = activeBookings.map(b => calculateNightsWithinPeriod(b.checkIn, b.checkOut, periodStart, periodEnd));
  const totalNightsBooked = perBookingNights.reduce((s, n) => s + n, 0);
  const bookingsWithNights = perBookingNights.filter(n => n > 0).length || activeBookings.length; // fallback to count if all zero
  const avgLengthOfStay = bookingsWithNights > 0 ? totalNightsBooked / bookingsWithNights : 0;

  // Unique guest heuristic: prefer guestProfileId, else email, else phone, else name
  const norm = (v?: string | null) => (v || '').trim().toLowerCase();
  const guestKey = (b: Booking) =>
    (b as any).guestProfileId || norm((b as any).contactEmail) || norm((b as any).guestEmail) || (b as any).contactPhone || norm(b.guestName);

  const guestCounts: Record<string, number> = {};
  activeBookings.forEach(b => {
    const key = guestKey(b);
    if (!key) return;
    guestCounts[key] = (guestCounts[key] || 0) + 1;
  });
  const uniqueGuestsCount = Object.keys(guestCounts).length;
  const repeatGuestsUniqueCount = Object.values(guestCounts).filter(c => c > 1).length;
  const repeatGuestRate = uniqueGuestsCount > 0 ? (repeatGuestsUniqueCount / uniqueGuestsCount) * 100 : 0;

  return {
    totalRevenue,
    occupancyRate,
    adr,
    revpar,
    totalRoomNightsSold: roomNightsSold,
    totalRoomNightsAvailable: roomNightsAvailable,
    bookingCount,
    sourceDistribution,
    // New metrics
    cancellationRate,
    bookingConversionRate,
    cancelledBookingCount,
    totalBookingsAllStatuses,
    confirmedBookingCount,
    pendingBookingCount,
    avgLengthOfStay,
    totalNightsBooked,
    uniqueGuestsCount,
    repeatGuestsUniqueCount,
    repeatGuestRate,
  };
}
