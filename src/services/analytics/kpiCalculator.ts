import { format, differenceInCalendarDays, subDays, subYears } from 'date-fns';
import type { AnalyticsFilters, BookingKPIs, ExpenseAnalytics } from '../../types/analytics';
import { getBookingKPIs } from './bookingAnalyticsService';
import { getExpenseAnalytics } from './expenseAnalyticsService';

// Local types exported from this module to avoid changes to global types for now
export interface KPIPeriodResult {
  booking: BookingKPIs;
  expenses: ExpenseAnalytics;
  // Percentage 0-100
  profitMarginPct: number;
  // Metadata helpful for dashboards/reporting
  meta: {
    period: { start: string; end: string; days: number };
    propertyId?: string;
    bookingSource?: string;
    currency?: string; // default: INR
  };
  // 0-100 simple confidence score
  confidence: number;
}

export interface KPIComparisonDelta {
  revenueDeltaPct: number;
  occupancyDeltaPct: number;
  adrDeltaPct: number;
  revparDeltaPct: number;
  expenseDeltaPct: number;
  marginDeltaPct: number;
}

export interface KPIComparisonResult {
  current: KPIPeriodResult;
  previous: KPIPeriodResult;
  deltas: KPIComparisonDelta;
  trends: Array<{
    metric: keyof KPIComparisonDelta;
    direction: 'up' | 'down' | 'flat';
    changePct: number;
    confidence: number; // mirrors current.confidence for now per metric
  }>;
}

export type TotalRoomsByProperty = Record<string, number | undefined>;

function toInclusiveISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function safePctDelta(curr: number, prev: number): number {
  if (!isFinite(curr) || !isFinite(prev)) return 0;
  if (prev === 0) return curr === 0 ? 0 : 100; // treat from-zero as 100% change
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function trendDirection(changePct: number): 'up' | 'down' | 'flat' {
  if (Math.abs(changePct) < 0.001) return 'flat';
  return changePct > 0 ? 'up' : 'down';
}

function calcProfitMarginPct(totalRevenue: number, totalExpenses: number): number {
  if (totalRevenue <= 0) return 0;
  const margin = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
  return Math.max(0, Math.min(100, margin));
}

function calcConfidence(booking: BookingKPIs, expenses: ExpenseAnalytics, totalRooms?: number): number {
  // Heuristic confidence: components 0..1
  // - room coverage: have roomNightsAvailable and >0 rooms
  const roomCoverage = totalRooms && totalRooms > 0 ? 1 : 0.5;
  // - sample size: bookingCount scaled (>= 10 -> 1.0)
  const sample = Math.max(0, Math.min(1, booking.bookingCount / 10));
  // - consistency: ADR & RevPAR finite and not NaN
  const consistency = Number.isFinite(booking.adr) && Number.isFinite(booking.revpar) ? 1 : 0.6;
  // - expense availability
  const expenseAvail = Number.isFinite(expenses.totalExpenses) ? 1 : 0.5;
  const score01 = 0.35 * roomCoverage + 0.35 * sample + 0.2 * consistency + 0.1 * expenseAvail;
  return Math.round(score01 * 100);
}

export class KPICalculator {
  // Core: Compute KPI results for a property/period
  static async getPeriodResult(filters: AnalyticsFilters): Promise<KPIPeriodResult> {
    const start = new Date(filters.start);
    const end = new Date(filters.end);
    const startStr = toInclusiveISO(start);
    const endStr = toInclusiveISO(end);
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);

    const [booking, expenses] = await Promise.all([
      getBookingKPIs({ ...filters, start: startStr, end: endStr }),
      getExpenseAnalytics({ ...filters, start: startStr, end: endStr }),
    ]);

    const profitMarginPct = calcProfitMarginPct(booking.totalRevenue, expenses.totalExpenses);
    const confidence = calcConfidence(booking, expenses, filters.totalRooms);

    return {
      booking,
      expenses,
      profitMarginPct,
      meta: {
        period: { start: startStr, end: endStr, days },
        propertyId: filters.propertyId,
        bookingSource: filters.bookingSource,
        currency: 'INR',
      },
      confidence,
    };
  }

  // Compare with previous period (same length) or previous year
  static async compareWithPrevious(
    current: AnalyticsFilters,
    mode: 'prev_period' | 'prev_year' = 'prev_period',
  ): Promise<KPIComparisonResult> {
    const start = new Date(current.start);
    const end = new Date(current.end);
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);

    let prevStart: Date;
    let prevEnd: Date;
    if (mode === 'prev_period') {
      prevEnd = subDays(start, 1);
      prevStart = subDays(prevEnd, days - 1);
    } else {
      prevStart = subYears(start, 1);
      prevEnd = subYears(end, 1);
    }

    const previous: AnalyticsFilters = {
      ...current,
      start: toInclusiveISO(prevStart),
      end: toInclusiveISO(prevEnd),
    };

    const [currRes, prevRes] = await Promise.all([
      this.getPeriodResult(current),
      this.getPeriodResult(previous),
    ]);

    const deltas: KPIComparisonDelta = {
      revenueDeltaPct: safePctDelta(currRes.booking.totalRevenue, prevRes.booking.totalRevenue),
      occupancyDeltaPct: safePctDelta(currRes.booking.occupancyRate, prevRes.booking.occupancyRate),
      adrDeltaPct: safePctDelta(currRes.booking.adr, prevRes.booking.adr),
      revparDeltaPct: safePctDelta(currRes.booking.revpar, prevRes.booking.revpar),
      expenseDeltaPct: safePctDelta(currRes.expenses.totalExpenses, prevRes.expenses.totalExpenses),
      marginDeltaPct: safePctDelta(currRes.profitMarginPct, prevRes.profitMarginPct),
    };

    const trends: KPIComparisonResult['trends'] = (Object.keys(deltas) as Array<keyof KPIComparisonDelta>).map(
      (metric) => ({
        metric,
        direction: trendDirection(deltas[metric]),
        changePct: deltas[metric],
        confidence: currRes.confidence,
      }),
    );

    return {
      current: currRes,
      previous: prevRes,
      deltas,
      trends,
    };
  }

  // Aggregate results across multiple properties. Requires totalRoomsByProperty for accurate occupancy.
  static async aggregateAcrossProperties(args: {
    propertyIds: string[];
    date: { start: string; end: string };
    totalRoomsByProperty: TotalRoomsByProperty;
    bookingSource?: string;
  }): Promise<KPIPeriodResult> {
    const { propertyIds, date, totalRoomsByProperty, bookingSource } = args;

    const results = await Promise.all(
      propertyIds.map((pid) =>
        this.getPeriodResult({
          propertyId: pid,
          start: date.start,
          end: date.end,
          totalRooms: totalRoomsByProperty[pid] || 0,
          bookingSource,
        }),
      ),
    );

    // Aggregate booking metrics
    const aggBooking: BookingKPIs = results.reduce<BookingKPIs>(
      (acc, r) => {
        acc.totalRevenue += r.booking.totalRevenue;
        acc.totalRoomNightsSold += r.booking.totalRoomNightsSold;
        acc.totalRoomNightsAvailable += r.booking.totalRoomNightsAvailable;
        acc.bookingCount += r.booking.bookingCount;
        // Sum supporting counts for new metrics
        acc.cancelledBookingCount = (acc.cancelledBookingCount || 0) + (r.booking.cancelledBookingCount || 0);
        acc.totalBookingsAllStatuses = (acc.totalBookingsAllStatuses || 0) + (r.booking.totalBookingsAllStatuses || 0);
        acc.confirmedBookingCount = (acc.confirmedBookingCount || 0) + (r.booking.confirmedBookingCount || 0);
        acc.pendingBookingCount = (acc.pendingBookingCount || 0) + (r.booking.pendingBookingCount || 0);
        acc.totalNightsBooked = (acc.totalNightsBooked || 0) + (r.booking.totalNightsBooked || 0);
        acc.uniqueGuestsCount = (acc.uniqueGuestsCount || 0) + (r.booking.uniqueGuestsCount || 0);
        acc.repeatGuestsUniqueCount = (acc.repeatGuestsUniqueCount || 0) + (r.booking.repeatGuestsUniqueCount || 0);
        // Merge source distribution by counts
        r.booking.sourceDistribution.forEach((s) => {
          const existing = acc.sourceDistribution.find((x) => x.name === s.name);
          if (existing) {
            existing.count += s.count;
          } else {
            acc.sourceDistribution.push({ ...s });
          }
        });
        return acc;
      },
      {
        totalRevenue: 0,
        occupancyRate: 0, // computed below
        adr: 0,
        revpar: 0,
        totalRoomNightsSold: 0,
        totalRoomNightsAvailable: 0,
        bookingCount: 0,
        sourceDistribution: [],
        // initialize new fields
        cancellationRate: 0,
        bookingConversionRate: null,
        cancelledBookingCount: 0,
        totalBookingsAllStatuses: 0,
        confirmedBookingCount: 0,
        pendingBookingCount: 0,
        avgLengthOfStay: 0,
        totalNightsBooked: 0,
        uniqueGuestsCount: 0,
        repeatGuestsUniqueCount: 0,
        repeatGuestRate: 0,
      },
    );

    // Recompute rate-based metrics from totals
    aggBooking.occupancyRate = aggBooking.totalRoomNightsAvailable > 0
      ? (aggBooking.totalRoomNightsSold / aggBooking.totalRoomNightsAvailable) * 100
      : 0;
    aggBooking.adr = aggBooking.totalRoomNightsSold > 0
      ? aggBooking.totalRevenue / aggBooking.totalRoomNightsSold
      : 0;
    aggBooking.revpar = aggBooking.totalRoomNightsAvailable > 0
      ? aggBooking.totalRevenue / aggBooking.totalRoomNightsAvailable
      : 0;

    // Derived new metrics from totals
    aggBooking.cancellationRate = (aggBooking.totalBookingsAllStatuses || 0) > 0
      ? (Number(aggBooking.cancelledBookingCount || 0) / Number(aggBooking.totalBookingsAllStatuses || 0)) * 100
      : 0;
    const convDen = Number(aggBooking.confirmedBookingCount || 0) + Number(aggBooking.pendingBookingCount || 0);
    aggBooking.bookingConversionRate = convDen > 0
      ? (Number(aggBooking.confirmedBookingCount || 0) / convDen) * 100
      : null;
    // ALOS approximation from totals: total nights over count of active bookings
    aggBooking.avgLengthOfStay = (aggBooking.bookingCount || 0) > 0
      ? Number(aggBooking.totalNightsBooked || 0) / Number(aggBooking.bookingCount || 0)
      : 0;
    aggBooking.repeatGuestRate = (aggBooking.uniqueGuestsCount || 0) > 0
      ? (Number(aggBooking.repeatGuestsUniqueCount || 0) / Number(aggBooking.uniqueGuestsCount || 0)) * 100
      : 0;

    const totalExpenses = results.reduce((s, r) => s + r.expenses.totalExpenses, 0);
    const aggExpenses: ExpenseAnalytics = {
      totalExpenses,
      byCategory: [], // optional at aggregate level; could merge by id/name if needed in future
    };

    // Source distribution percentages from counts
    const totalBookings = aggBooking.bookingCount || 1;
    aggBooking.sourceDistribution = aggBooking.sourceDistribution.map((s) => ({
      ...s,
      value: (s.count / totalBookings) * 100,
    }));

    const profitMarginPct = calcProfitMarginPct(aggBooking.totalRevenue, aggExpenses.totalExpenses);
    // Average confidence across properties
    const avgConfidence = Math.round(results.reduce((s, r) => s + r.confidence, 0) / Math.max(1, results.length));

    const days = Math.max(
      1,
      differenceInCalendarDays(new Date(date.end), new Date(date.start)) + 1,
    );

    return {
      booking: aggBooking,
      expenses: aggExpenses,
      profitMarginPct,
      meta: {
        period: { start: date.start, end: date.end, days },
        bookingSource,
        currency: 'INR',
      },
      confidence: avgConfidence,
    };
  }
}

export default KPICalculator;
