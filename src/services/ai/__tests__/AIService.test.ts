import { describe, it, expect, beforeEach } from 'vitest';
import { AIService } from '../AIService';
import type { AIContext } from '../../../types/ai';
import type { KPIPeriodResult, KPIComparisonResult } from '../../analytics/kpiCalculator';
import { invalidate } from '../AIResponseCache';

function makeCtx(): AIContext {
  const filters = { propertyId: 'p1', start: '2025-01-01', end: '2025-01-31', totalRooms: 10 } as any;
  const kpi: KPIPeriodResult = {
    booking: {
      totalRevenue: 100000,
      occupancyRate: 40,
      adr: 2500,
      revpar: 1000,
      totalRoomNightsSold: 400,
      totalRoomNightsAvailable: 1000,
      bookingCount: 80,
      sourceDistribution: [],
      cancellationRate: 30,
      bookingConversionRate: 20,
      cancelledBookingCount: 30,
      totalBookingsAllStatuses: 100,
      confirmedBookingCount: 70,
      pendingBookingCount: 10,
      avgLengthOfStay: 1.2,
      totalNightsBooked: 96,
      uniqueGuestsCount: 80,
      repeatGuestsUniqueCount: 4,
      repeatGuestRate: 5,
    } as any,
    expenses: {
      totalExpenses: 80000,
      byCategory: [],
    },
    profitMarginPct: 20,
    meta: {
      period: { start: '2025-01-01', end: '2025-01-31', days: 31 },
      propertyId: 'p1',
      bookingSource: undefined,
      currency: 'INR',
    },
    confidence: 80,
  };
  const comparison: KPIComparisonResult = {
    current: kpi,
    previous: kpi,
    deltas: {
      revenueDeltaPct: -15,
      occupancyDeltaPct: -5,
      adrDeltaPct: -3,
      revparDeltaPct: -4,
      expenseDeltaPct: 8,
      marginDeltaPct: -10,
    },
    trends: [],
  } as any;

  return { filters, kpi, comparison };
}

describe('AIService.generateInsights (fallback + cache + meta)', () => {
  beforeEach(() => {
    // Clear AI cache between tests
    invalidate();
  });

  it('returns fallback insights with meta and caches result', async () => {
    const ctx = makeCtx();

    const res1 = await AIService.generateInsights(ctx);
    expect(res1).toBeTruthy();
    expect(Array.isArray(res1.insights)).toBe(true);
    expect(res1.meta.model).toBe('fallback-rules-v1');
    expect(typeof res1.meta.generatedAt).toBe('string');
    expect(res1.meta.fromCache).toBe(false);
    // cost estimation fields
    expect(typeof res1.meta.cost).toBe('number');
    expect(typeof res1.meta.promptTokens).toBe('number');
    expect(typeof res1.meta.responseTokens).toBe('number');

    const ids = new Set(res1.insights.map(i => i.id));
    expect(ids.has('rev_drop')).toBe(true);
    expect(ids.has('low_occ')).toBe(true);
    expect(ids.has('high_expenses')).toBe(true);
    expect(ids.has('high_cancellations')).toBe(true);
    expect(ids.has('short_stays')).toBe(true);

    // Second call should hit cache
    const res2 = await AIService.generateInsights(ctx);
    expect(res2.meta.fromCache).toBe(true);
  });
});
