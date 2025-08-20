import type { AIContext, AIInsightsResult, AIInsight, AIForecast } from '../../types/ai';

export function generateFallback(ctx: AIContext): AIInsightsResult {
  const insights: AIInsight[] = [];
  const { kpi, comparison } = ctx;
  const deltas = comparison?.deltas;

  // Revenue intelligence
  if (deltas && deltas.revenueDeltaPct < -10) {
    insights.push({
      id: 'rev_drop',
      title: 'Revenue is down',
      description: `Revenue fell ${deltas.revenueDeltaPct.toFixed(1)}% vs previous period. Review pricing and channel promotions.`,
      severity: 'high',
      tags: ['revenue','pricing','channels'],
      actions: [
        { label: 'Review pricing rules', type: 'navigate', payload: { to: 'pricing' } },
        { label: 'Boost high-ROI channels', type: 'navigate', payload: { to: 'channels' } },
      ],
    });
  }

  // Occupancy intelligence
  if (kpi.booking.occupancyRate < 50) {
    insights.push({
      id: 'low_occ',
      title: 'Low occupancy risk',
      description: `Occupancy at ${kpi.booking.occupancyRate.toFixed(1)}%. Consider discount nights and local promotions.`,
      severity: 'medium',
      tags: ['occupancy','marketing'],
    });
  }

  // Expense intelligence
  if ((kpi.expenses.totalExpenses || 0) > (kpi.booking.totalRevenue || 0) * 0.7) {
    insights.push({
      id: 'high_expenses',
      title: 'High expense ratio',
      description: `Expenses are ${Math.round((kpi.expenses.totalExpenses / Math.max(1,kpi.booking.totalRevenue))*100)}% of revenue. Audit top categories.`,
      severity: 'medium',
      tags: ['expenses','cost-control'],
      actions: [ { label: 'Review expense categories', type: 'navigate', payload: { to: 'expenses' } } ],
    });
  }

  // Guest intelligence
  const repeatRate = Number((kpi.booking as any).repeatGuestRate ?? 0);
  if (repeatRate > 0 && repeatRate < 10) {
    insights.push({
      id: 'low_repeat_guest_rate',
      title: 'Low repeat guest rate',
      description: `Only ${repeatRate.toFixed(1)}% of guests are repeats. Launch loyalty offers and post-stay emails.`,
      severity: 'medium',
      tags: ['guests','loyalty','crm'],
    });
  }

  const alos = Number((kpi.booking as any).avgLengthOfStay ?? 0);
  if (alos > 0 && alos < 1.5) {
    insights.push({
      id: 'short_stays',
      title: 'Short stays dominate',
      description: `Avg length of stay is ${alos.toFixed(2)} nights. Try 2+ night discounts to boost ADR and reduce turnover costs.`,
      severity: 'low',
      tags: ['pricing','stay-patterns'],
    });
  }

  // Anomalies
  const cancellationRate = Number((kpi.booking as any).cancellationRate ?? 0);
  if (cancellationRate > 25) {
    insights.push({
      id: 'high_cancellations',
      title: 'High cancellation rate',
      description: `Cancellations at ${cancellationRate.toFixed(1)}%. Tighten policies on high-risk channels and confirm deposits.`,
      severity: 'high',
      tags: ['anomaly','cancellations','channels'],
    });
  }

  const forecasts: AIForecast[] = [];
  if (deltas) {
    const nextRevenue = Math.max(0, kpi.booking.totalRevenue * (1 + deltas.revenueDeltaPct / 100));
    forecasts.push({ metric: 'revenue', value: Math.round(nextRevenue), changePct: deltas.revenueDeltaPct, confidence: kpi.confidence, unit: 'INR', horizon: 'next_period' });
    forecasts.push({ metric: 'occupancy', value: Number(kpi.booking.occupancyRate.toFixed(1)), changePct: deltas.occupancyDeltaPct, confidence: kpi.confidence, unit: 'pct', horizon: 'next_period' });
    const nextExpenses = Math.max(0, kpi.expenses.totalExpenses * (1 + deltas.expenseDeltaPct / 100));
    forecasts.push({ metric: 'expenses', value: Math.round(nextExpenses), changePct: deltas.expenseDeltaPct, confidence: kpi.confidence, unit: 'INR', horizon: 'next_period' });
  }

  return {
    insights,
    forecasts,
    meta: {
      model: 'fallback-rules-v1',
      generatedAt: new Date().toISOString(),
      fromCache: false,
    },
  };
}
