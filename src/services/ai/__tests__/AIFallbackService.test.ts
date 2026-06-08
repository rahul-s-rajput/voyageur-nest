import { describe, it, expect } from 'vitest';
import { generateFallback } from '../AIFallbackService';
import type { AIContext } from '../../../types/ai';

/**
 * Builds a deliberately "healthy" context in which NONE of the rules fire.
 * Each test then overrides only the fields needed to trip exactly one rule,
 * so we can assert that rule fires (and, for the baseline, that none do).
 */
function healthyCtx(): AIContext {
  const booking = {
    totalRevenue: 100000,
    occupancyRate: 80,
    adr: 2500,
    revpar: 2000,
    totalRoomNightsSold: 800,
    totalRoomNightsAvailable: 1000,
    bookingCount: 80,
    sourceDistribution: [
      { name: 'Direct', value: 50, count: 40 },
      { name: 'Booking.com', value: 50, count: 40 },
    ],
    cancellationRate: 5,
    bookingConversionRate: 90,
    cancelledBookingCount: 4,
    totalBookingsAllStatuses: 84,
    confirmedBookingCount: 76,
    pendingBookingCount: 4,
    avgLengthOfStay: 3,
    totalNightsBooked: 240,
    uniqueGuestsCount: 80,
    repeatGuestsUniqueCount: 24,
    repeatGuestRate: 30,
  };
  const expenses = {
    totalExpenses: 30000,
    byCategory: [
      { categoryId: 'a', categoryName: 'Salaries', total: 10000 },
      { categoryId: 'b', categoryName: 'Utilities', total: 10000 },
      { categoryId: 'c', categoryName: 'Supplies', total: 10000 },
    ],
  };
  const kpi = {
    booking,
    expenses,
    profitMarginPct: 70,
    confidence: 80,
    meta: { period: { start: '2025-01-01', end: '2025-01-31', days: 31 }, propertyId: 'p1', currency: 'INR' },
  } as any;
  const comparison = {
    current: kpi,
    previous: kpi,
    deltas: {
      revenueDeltaPct: 2,
      occupancyDeltaPct: 1,
      adrDeltaPct: 1,
      revparDeltaPct: 1,
      expenseDeltaPct: 1,
      marginDeltaPct: 1,
    },
    trends: [],
  } as any;
  return { filters: { propertyId: 'p1', start: '2025-01-01', end: '2025-01-31', totalRooms: 10 } as any, kpi, comparison };
}

function ids(ctx: AIContext): Set<string> {
  return new Set(generateFallback(ctx).insights.map((i) => i.id));
}

describe('generateFallback — baseline', () => {
  it('produces no insights when every metric is healthy', () => {
    const result = generateFallback(healthyCtx());
    expect(result.insights).toHaveLength(0);
  });

  it('always returns rule-based meta (no LLM model, not from cache)', () => {
    const result = generateFallback(healthyCtx());
    expect(result.meta.model).toBe('fallback-rules-v1');
    expect(result.meta.model).not.toMatch(/gemini/i);
    expect(result.meta.fromCache).toBe(false);
    expect(typeof result.meta.generatedAt).toBe('string');
  });
});

describe('generateFallback — individual rules fire on their trigger', () => {
  it('rev_drop when revenue delta < -10%', () => {
    const ctx = healthyCtx();
    ctx.comparison!.deltas.revenueDeltaPct = -12;
    expect(ids(ctx).has('rev_drop')).toBe(true);
  });

  it('low_occ when occupancy < 50%', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).occupancyRate = 40;
    expect(ids(ctx).has('low_occ')).toBe(true);
  });

  it('high_expenses when expenses > 70% of revenue', () => {
    const ctx = healthyCtx();
    (ctx.kpi.expenses as any).totalExpenses = 80000; // 80% of 100k
    expect(ids(ctx).has('high_expenses')).toBe(true);
  });

  it('low_repeat_guest_rate when 0 < repeat rate < 10%', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).repeatGuestRate = 5;
    expect(ids(ctx).has('low_repeat_guest_rate')).toBe(true);
  });

  it('short_stays when ALOS < 1.5 nights', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).avgLengthOfStay = 1.2;
    expect(ids(ctx).has('short_stays')).toBe(true);
  });

  it('high_cancellations when cancellation rate > 25%', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).cancellationRate = 30;
    expect(ids(ctx).has('high_cancellations')).toBe(true);
  });

  it('adr_decline when ADR delta < -5%', () => {
    const ctx = healthyCtx();
    ctx.comparison!.deltas.adrDeltaPct = -8;
    expect(ids(ctx).has('adr_decline')).toBe(true);
  });

  it('revpar_decline when RevPAR delta < -10%', () => {
    const ctx = healthyCtx();
    ctx.comparison!.deltas.revparDeltaPct = -12;
    expect(ids(ctx).has('revpar_decline')).toBe(true);
  });

  it('margin_compression when margin delta < -10%', () => {
    const ctx = healthyCtx();
    ctx.comparison!.deltas.marginDeltaPct = -12;
    expect(ids(ctx).has('margin_compression')).toBe(true);
  });

  it('channel_concentration when a single source >= 70% of bookings', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).sourceDistribution = [
      { name: 'Booking.com', value: 75, count: 60 },
      { name: 'Direct', value: 25, count: 20 },
    ];
    expect(ids(ctx).has('channel_concentration')).toBe(true);
  });

  it('expense_category_concentration when one category >= 40% of spend', () => {
    const ctx = healthyCtx();
    (ctx.kpi.expenses as any).totalExpenses = 20000;
    (ctx.kpi.expenses as any).byCategory = [
      { categoryId: 'a', categoryName: 'Salaries', total: 12000 }, // 60%
      { categoryId: 'b', categoryName: 'Utilities', total: 8000 },
    ];
    expect(ids(ctx).has('expense_category_concentration')).toBe(true);
  });

  it('low_conversion when confirmation rate < 60%', () => {
    const ctx = healthyCtx();
    (ctx.kpi.booking as any).bookingConversionRate = 45;
    expect(ids(ctx).has('low_conversion')).toBe(true);
  });
});

describe('generateFallback — forecasts', () => {
  it('emits revenue, occupancy and expense forecasts when a comparison is present', () => {
    const result = generateFallback(healthyCtx());
    const metrics = (result.forecasts || []).map((f) => f.metric);
    expect(metrics).toContain('revenue');
    expect(metrics).toContain('occupancy');
    expect(metrics).toContain('expenses');
  });

  it('emits no forecasts when there is no comparison period', () => {
    const ctx = healthyCtx();
    delete (ctx as any).comparison;
    const result = generateFallback(ctx);
    expect(result.forecasts).toHaveLength(0);
  });
});
