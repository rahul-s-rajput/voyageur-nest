import type { AnalyticsFilters, OverviewAnalytics } from "../../types/analytics";
import { getBookingKPIs } from "./bookingAnalyticsService";
import { getExpenseAnalytics } from "./expenseAnalyticsService";

export async function getOverviewAnalytics(filters: AnalyticsFilters): Promise<OverviewAnalytics> {
  const [booking, expenses] = await Promise.all([
    getBookingKPIs(filters),
    getExpenseAnalytics(filters),
  ]);

  return { booking, expenses };
}
