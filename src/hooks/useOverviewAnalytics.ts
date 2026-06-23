import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useProperty } from "../contexts/PropertyContext";
import { getOverviewAnalytics } from "../services/analytics/analyticsService";
import type { OverviewAnalytics } from "../types/analytics";

function toDateString(d: Date): string {
  // Format in LOCAL (IST) time, not UTC. Using toISOString() here shifted an
  // IST-midnight boundary back a day (e.g. "today" became "yesterday"), which
  // silently dropped the current day's bookings/payments from the window.
  return format(d, "yyyy-MM-dd");
}

export function useOverviewAnalytics() {
  const { currentProperty, gridCalendarSettings } = useProperty();
  const propertyId = currentProperty?.id;
  const totalRooms = currentProperty?.totalRooms;

  const start = gridCalendarSettings.dateRange.start;
  const end = gridCalendarSettings.dateRange.end;
  const bookingSource = gridCalendarSettings.bookingSource;

  const filters = propertyId
    ? {
        propertyId,
        start: toDateString(start),
        end: toDateString(end),
        totalRooms,
        bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
      }
    : null;

  return useQuery<OverviewAnalytics, Error>({
    queryKey: ["overview-analytics", filters],
    enabled: !!filters,
    queryFn: async () => {
      if (!filters) throw new Error("Missing filters");
      return getOverviewAnalytics(filters);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
