import { useQuery } from '@tanstack/react-query';
import type { AnalyticsFilters } from '../types/analytics';
import type { AIInsightsResult, AIContext } from '../types/ai';
import KPICalculator from '../services/analytics/kpiCalculator';
import { AIService } from '../services/ai/AIService';
import { isAIDebug } from '../services/ai/AIConfig';

const k = {
  insights: (f: AnalyticsFilters) => [
    'ai','insights',
    f.propertyId,
    f.start,
    f.end,
    f.totalRooms ?? 0,
    f.bookingSource ?? 'all',
  ],
};

export function useAIInsights(filters: AnalyticsFilters, options?: { enabled?: boolean }) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end) && (options?.enabled ?? true);
  return useQuery<AIInsightsResult>({
    queryKey: k.insights(filters),
    enabled,
    queryFn: async () => {
      if (isAIDebug()) console.log('useAIInsights queryFn start', { filters });
      const [kpi, comparison] = await Promise.all([
        KPICalculator.getPeriodResult(filters),
        KPICalculator.compareWithPrevious(filters, 'prev_period'),
      ]);
      const ctx: AIContext = { filters, kpi, comparison };
      const res = await AIService.generateInsights(ctx);
      if (isAIDebug()) console.log('useAIInsights queryFn completed', { fromCache: res.meta.fromCache, model: res.meta.model });
      return res;
    },
  });
}
