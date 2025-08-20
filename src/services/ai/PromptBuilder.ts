import type { AIContext } from '../../types/ai';

export function buildInsightsPrompt(ctx: AIContext): string {
  const { filters, kpi, comparison } = ctx;
  const schema = `Return ONLY a JSON object with the following shape (no markdown fences):\n{
  "insights": [
    {"id": string, "title": string, "description": string, "severity": "low"|"medium"|"high"|"critical", "tags": string[], "actions": [{"label": string, "type"?: string, "payload"?: object}], "evidence"?: string}
  ],
  "forecasts": [
    {"metric": string, "value": number, "changePct"?: number, "confidence"?: number, "unit"?: string, "horizon"?: string}
  ],
  "meta": {"model": string}
}`;

  const kpiSummary = {
    booking: {
      totalRevenue: Math.round(kpi.booking.totalRevenue),
      occupancyRate: Number(kpi.booking.occupancyRate.toFixed(2)),
      adr: Math.round(kpi.booking.adr),
      revpar: Math.round(kpi.booking.revpar),
      bookingCount: kpi.booking.bookingCount,
      cancellationRate: Number((kpi.booking as any).cancellationRate ?? 0),
      avgLengthOfStay: Number((kpi.booking as any).avgLengthOfStay ?? 0),
      repeatGuestRate: Number((kpi.booking as any).repeatGuestRate ?? 0),
    },
    expenses: {
      totalExpenses: Math.round(kpi.expenses.totalExpenses),
    },
    profitMarginPct: Number(kpi.profitMarginPct.toFixed(2)),
    confidence: kpi.confidence,
  };

  const cmp = comparison ? {
    deltas: comparison.deltas,
  } : undefined;

  const filtersSummary = {
    propertyId: filters.propertyId,
    start: filters.start,
    end: filters.end,
    bookingSource: filters.bookingSource || 'all',
    totalRooms: filters.totalRooms || 0,
  };

  return [
    'You are an analytics assistant for a small hotel property. Generate actionable, concise insights.',
    'Output requirements (STRICT):',
    '- Return STRICT JSON only. No markdown, no comments, no trailing commas.',
    '- Provide 4-8 insights in total. Each insight description must be <= 280 chars.',
    '- Coverage: include at least one insight for each module: revenue, expenses, guests, anomalies.',
    '- Each insight must include tags; include one of: revenue | expenses | guests | anomalies (as applicable).',
    '- Provide 2-3 forecasts. REQUIRED metrics: revenue and occupancy. Optional: expenses.',
    '- Use India context and INR units for currency-related metrics.',
    schema,
    'Context:',
    `Filters: ${JSON.stringify(filtersSummary)}`,
    `KPIs: ${JSON.stringify(kpiSummary)}`,
    `Comparison: ${JSON.stringify(cmp)}`,
    'Respond with JSON only.'
  ].join('\n');
}
