import { useQuery, useQueries } from '@tanstack/react-query';
import KPICalculator, { KPIComparisonResult, KPIPeriodResult, TotalRoomsByProperty } from '../services/analytics/kpiCalculator';
import type { AnalyticsFilters } from '../types/analytics';

// Build consistent cache keys
const k = {
  period: (f: AnalyticsFilters) => [
    'kpi','period',
    f.propertyId,
    f.start,
    f.end,
    f.totalRooms ?? 0,
    f.bookingSource ?? 'all',
  ],
  comparison: (f: AnalyticsFilters, mode: 'prev_period' | 'prev_year') => [
    'kpi','comparison',
    mode,
    f.propertyId,
    f.start,
    f.end,
    f.totalRooms ?? 0,
    f.bookingSource ?? 'all',
  ],
  aggregate: (
    propertyIds: string[],
    date: { start: string; end: string },
    totalRoomsByProperty: TotalRoomsByProperty,
    bookingSource?: string,
  ) => [
    'kpi','aggregate',
    [...propertyIds].sort().join(','),
    date.start,
    date.end,
    JSON.stringify(totalRoomsByProperty),
    bookingSource ?? 'all',
  ],
};

export function useKpiPeriod(filters: AnalyticsFilters, options?: { enabled?: boolean }) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end) && (options?.enabled ?? true);
  return useQuery<KPIPeriodResult>({
    queryKey: k.period(filters),
    queryFn: () => KPICalculator.getPeriodResult(filters),
    enabled,
  });
}

export function useKpiComparison(
  filters: AnalyticsFilters,
  mode: 'prev_period' | 'prev_year' = 'prev_period',
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end) && (options?.enabled ?? true);
  return useQuery<KPIComparisonResult>({
    queryKey: k.comparison(filters, mode),
    queryFn: () => KPICalculator.compareWithPrevious(filters, mode),
    enabled,
  });
}

export function useKpiAggregate(args: {
  propertyIds: string[];
  date: { start: string; end: string };
  totalRoomsByProperty: TotalRoomsByProperty;
  bookingSource?: string;
}, options?: { enabled?: boolean }) {
  const { propertyIds, date, totalRoomsByProperty, bookingSource } = args;
  const enabled = propertyIds?.length > 0 && Boolean(date?.start && date?.end) && (options?.enabled ?? true);
  return useQuery<KPIPeriodResult>({
    queryKey: k.aggregate(propertyIds, date, totalRoomsByProperty, bookingSource),
    queryFn: () => KPICalculator.aggregateAcrossProperties(args),
    enabled,
  });
}

// Fetch KPI period results for multiple properties in parallel
// Returns a map of propertyId -> KPIPeriodResult plus loading/error aggregate state
export function useKpiPerProperty(args: {
  propertyIds: string[];
  date: { start: string; end: string };
  totalRoomsByProperty: TotalRoomsByProperty;
  bookingSource?: string;
}, options?: { enabled?: boolean }) {
  const { propertyIds, date, totalRoomsByProperty, bookingSource } = args;
  const enabled = propertyIds?.length > 0 && Boolean(date?.start && date?.end) && (options?.enabled ?? true);

  const queries = useQueries({
    queries: (propertyIds || []).map((pid) => ({
      queryKey: k.period({
        propertyId: pid,
        start: date.start,
        end: date.end,
        totalRooms: totalRoomsByProperty[pid] || 0,
        bookingSource,
      } as AnalyticsFilters),
      queryFn: () => KPICalculator.getPeriodResult({
        propertyId: pid,
        start: date.start,
        end: date.end,
        totalRooms: totalRoomsByProperty[pid] || 0,
        bookingSource,
      }),
      enabled,
    })),
  });

  const dataByProperty = new Map<string, KPIPeriodResult>();
  let isLoading = false;
  let error: unknown = null;
  queries.forEach((q: any, idx: number) => {
    if (q.isLoading) isLoading = true;
    if (q.error && !error) error = q.error;
    const pid = propertyIds[idx];
    if (q.data) dataByProperty.set(pid, q.data as KPIPeriodResult);
  });

  return { dataByProperty, queries, isLoading, error } as const;
}
