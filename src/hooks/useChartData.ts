import { useQuery } from '@tanstack/react-query';
import { chartDataService } from '../services/analytics/chartDataService';
import type {
  OccupancyTrendData,
  SourceAnalysisData,
  GuestDemographicsData,
  CancellationTrendData,
  PropertyComparisonData,
} from '../services/analytics/chartDataService';
import { getDetailedExpenseAnalytics } from '../services/analytics/expenseAnalyticsService';
import type { DetailedExpenseAnalytics } from '../services/analytics/expenseAnalyticsService';
import type { AnalyticsFilters } from '../types/analytics';

export function useOccupancyTrends(filters: AnalyticsFilters) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end);
  return useQuery<OccupancyTrendData[]>({
    queryKey: ['occupancyTrends', filters],
    queryFn: () => chartDataService.getOccupancyTrends(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

export function useSourceAnalysis(filters: AnalyticsFilters) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end);
  return useQuery<SourceAnalysisData[]>({
    queryKey: ['sourceAnalysis', filters],
    queryFn: () => chartDataService.getSourceAnalysis(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useGuestDemographics(filters: AnalyticsFilters) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end);
  return useQuery<GuestDemographicsData[]>({
    queryKey: ['guestDemographics', filters],
    queryFn: () => chartDataService.getGuestDemographics(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useCancellationTrends(filters: AnalyticsFilters) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end);
  return useQuery<CancellationTrendData[]>({
    queryKey: ['cancellationTrends', filters],
    queryFn: () => chartDataService.getCancellationTrends(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function usePropertyComparison(dateRange: { start: string; end: string }) {
  const enabled = Boolean(dateRange?.start && dateRange?.end);
  return useQuery<PropertyComparisonData[]>({
    queryKey: ['propertyComparison', dateRange.start, dateRange.end],
    queryFn: () => chartDataService.getPropertyComparison(dateRange),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useDetailedExpenseAnalytics(filters: AnalyticsFilters) {
  const enabled = Boolean(filters?.propertyId && filters?.start && filters?.end);
  return useQuery<DetailedExpenseAnalytics>({
    queryKey: ['detailedExpenseAnalytics', filters],
    queryFn: () => getDetailedExpenseAnalytics(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
