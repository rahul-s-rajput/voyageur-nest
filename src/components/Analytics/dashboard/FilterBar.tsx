import React from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/Select";
import { Calendar as CalendarIcon, Download, Filter, RefreshCw } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useProperty } from "../../../contexts/PropertyContext";
import { useQueryClient } from "@tanstack/react-query";
import { subDays, startOfDay, startOfYear } from "date-fns";
import { Calendar as PrimeCalendar } from "primereact/calendar";
import { OverlayPanel } from "primereact/overlaypanel";
import { ExportSelectionModal, ExportData } from "./ExportSelectionModal";
import { useKpiPeriod } from "../../../hooks/useKPI";
import { useDetailedExpenseAnalytics, usePropertyComparison, useOccupancyTrends, useSourceAnalysis, useGuestDemographics, useCancellationTrends } from "../../../hooks/useChartData";

interface FilterBarProps {
  className?: string;
  sticky?: boolean;
}

export function FilterBar({ className, sticky = true }: FilterBarProps) {
  const { properties, currentProperty, switchProperty, gridCalendarSettings, updateGridSettings } = useProperty();
  const queryClient = useQueryClient();
  const today = startOfDay(new Date());
  const datePanelRef = React.useRef<OverlayPanel>(null);
  const customDateBtnRef = React.useRef<HTMLButtonElement>(null);
  const [rangeDraft, setRangeDraft] = React.useState<Date[] | null>(null);
  const propertyId = currentProperty?.id ?? "";
  const totalRooms = currentProperty?.totalRooms ?? 0;
  const startStr = gridCalendarSettings.dateRange.start.toISOString().slice(0, 10);
  const endStr = gridCalendarSettings.dateRange.end.toISOString().slice(0, 10);
  const bookingSource = gridCalendarSettings.bookingSource && gridCalendarSettings.bookingSource !== 'all' 
    ? gridCalendarSettings.bookingSource 
    : undefined;

  const filters = {
    propertyId,
    start: startStr,
    end: endStr,
    totalRooms,
    bookingSource,
  };

  // Preload/capture analytics data (react-query caches across tabs; keeps this responsive)
  const { data: kpiPeriod, isLoading: isKpiLoading } = useKpiPeriod(filters, { enabled: !!propertyId });
  const { data: expenseData, isLoading: isExpenseLoading } = useDetailedExpenseAnalytics(filters);
  const { data: propertyComparison = [], isLoading: isCompLoading } = usePropertyComparison({ start: startStr, end: endStr });

  const setRange = (start: Date, end: Date) => {
    updateGridSettings({
      dateRange: {
        start: startOfDay(start),
        end: startOfDay(end),
      },
    });
  };

  const handleRangeChange = (value: string) => {
    switch (value) {
      case 'today':
        setRange(today, today);
        break;
      case 'last7':
        setRange(subDays(today, 6), today);
        break;
      case 'last30':
        setRange(subDays(today, 29), today);
        break;
      case 'last90':
        setRange(subDays(today, 89), today);
        break;
      case 'year':
        setRange(startOfYear(today), today);
        break;
      case 'custom':
        // Open the existing OverlayPanel by programmatically clicking the button
        customDateBtnRef.current?.click();
        break;
      default:
        break;
    }
  };

  const inferRangeValue = (): string => {
    const start = startOfDay(gridCalendarSettings.dateRange.start);
    const end = startOfDay(gridCalendarSettings.dateRange.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 6) return 'last7';
    if (diffDays === 29) return 'last30';
    if (diffDays === 89) return 'last90';
    return 'custom';
  };

  const onRefresh = async () => {
    // Invalidate all caches to force a full refresh across tabs
    await queryClient.invalidateQueries();
  };

  // Fetch additional data for comprehensive exports
  const { data: occupancyTrends = [], isLoading: isOccTrendsLoading } = useOccupancyTrends(filters);
  const { isLoading: isSourceLoading } = useSourceAnalysis(filters);
  const { data: guestDemographics = [], isLoading: isGuestLoading } = useGuestDemographics(filters);
  const { data: cancellationTrends = [], isLoading: isCancTrendsLoading } = useCancellationTrends(filters);

  const buildExportData = (): ExportData => {
    const booking = kpiPeriod?.booking;
    const expenses = kpiPeriod?.expenses;
    
    return {
      summary: {
        sheetName: 'Summary',
        data: [
          { Field: 'Property Name', Value: currentProperty?.name ?? '-' },
          { Field: 'Property ID', Value: currentProperty?.id ?? '-' },
          { Field: 'Total Rooms', Value: currentProperty?.totalRooms ?? 0 },
          { Field: 'Report Period', Value: `${startStr} to ${endStr}` },
          { Field: 'Days in Period', Value: Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)) + 1 },
          { Field: 'Booking Source Filter', Value: bookingSource ?? 'All Sources' },
          { Field: 'Export Generated', Value: new Date().toLocaleString() },
          { Field: 'Generated By', Value: 'VoyageurNest Analytics' }
        ]
      },
      kpi_summary: {
        sheetName: 'KPI Summary',
        data: [
          { Category: 'Revenue Metrics', Metric: 'Total Revenue', Value: booking?.totalRevenue ?? 0, Unit: '₹' },
          { Category: 'Revenue Metrics', Metric: 'Average Daily Rate (ADR)', Value: booking?.adr ?? null, Unit: '₹/night' },
          { Category: 'Revenue Metrics', Metric: 'Revenue Per Available Room (RevPAR)', Value: booking?.revpar ?? null, Unit: '₹/room/day' },
          { Category: 'Occupancy Metrics', Metric: 'Occupancy Rate', Value: booking?.occupancyRate ?? null, Unit: '%' },
          { Category: 'Occupancy Metrics', Metric: 'Room Nights Sold', Value: booking?.totalRoomNightsSold ?? 0, Unit: 'nights' },
          { Category: 'Occupancy Metrics', Metric: 'Room Nights Available', Value: booking?.totalRoomNightsAvailable ?? 0, Unit: 'nights' },
          { Category: 'Guest Metrics', Metric: 'Total Bookings', Value: booking?.bookingCount ?? 0, Unit: 'bookings' },
          { Category: 'Guest Metrics', Metric: 'Average Length of Stay (ALOS)', Value: booking?.avgLengthOfStay ?? null, Unit: 'nights' },
          { Category: 'Guest Metrics', Metric: 'Repeat Guest Rate', Value: booking?.repeatGuestRate ?? null, Unit: '%' },
          { Category: 'Performance Metrics', Metric: 'Cancellation Rate', Value: booking?.cancellationRate ?? null, Unit: '%' },
          { Category: 'Performance Metrics', Metric: 'Booking Conversion Rate', Value: booking?.bookingConversionRate ?? null, Unit: '%' },
          { Category: 'Expense Metrics', Metric: 'Total Expenses', Value: expenses?.totalExpenses ?? 0, Unit: '₹' },
          { Category: 'Profitability', Metric: 'Net Profit', Value: (booking?.totalRevenue ?? 0) - (expenses?.totalExpenses ?? 0), Unit: '₹' },
          { Category: 'Profitability', Metric: 'Profit Margin', Value: booking?.totalRevenue ? (((booking.totalRevenue - (expenses?.totalExpenses ?? 0)) / booking.totalRevenue) * 100) : null, Unit: '%' }
        ],
        columns: ['Category', 'Metric', 'Value', 'Unit']
      },
      booking_sources: {
        sheetName: 'Booking Sources',
        data: (booking?.sourceDistribution ?? []).map(source => ({
          'Source': source.name,
          'Bookings': source.count,
          'Revenue Share (%)': Number(source.value?.toFixed(2) ?? 0),
          'Estimated Revenue': Math.round((booking?.totalRevenue ?? 0) * (source.value ?? 0) / 100)
        })),
        columns: ['Source', 'Bookings', 'Revenue Share (%)', 'Estimated Revenue']
      },
      occupancy_trends: {
        sheetName: 'Occupancy Trends',
        data: occupancyTrends.map((row: any) => {
          // Service returns monthly rows with dynamic property keys; pick current property's key if available
          const propKey = (currentProperty?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const occVal = Number((propKey && row[propKey] != null) ? row[propKey] : 0);
          return {
            'Month': row.month,
            'Occupancy Rate (%)': Math.round(occVal * 10) / 10,
          };
        }),
        columns: ['Month', 'Occupancy Rate (%)']
      },
      guest_demographics: {
        sheetName: 'Guest Demographics',
        data: guestDemographics.map(demo => ({
          'Region': demo.region,
          'Bookings': demo.bookings,
          'Percentage (%)': demo.percentage,
        })),
        columns: ['Region', 'Bookings', 'Percentage (%)']
      },
      cancellation_analysis: {
        sheetName: 'Cancellation Analysis',
        data: cancellationTrends.map(trend => ({
          'Month': trend.month,
          'Total Bookings': trend.total,
          'Cancelled Bookings': trend.cancellations,
          'No Shows (est.)': trend.noShows,
          'Cancellation Rate (%)': trend.total ? Number(((trend.cancellations / trend.total) * 100).toFixed(1)) : 0,
        })),
        columns: ['Month', 'Total Bookings', 'Cancelled Bookings', 'No Shows (est.)', 'Cancellation Rate (%)']
      },
      property_comparison: {
        sheetName: 'Property Comparison',
        data: propertyComparison.map(prop => ({
          'Property': prop.propertyName,
          'Occupancy Rate (%)': Number(prop.occupancyRate?.toFixed(1) ?? 0),
          'ADR (₹)': Math.round(prop.adr ?? 0),
          'RevPAR (₹)': Math.round(prop.revpar ?? 0),
          'Total Bookings': prop.bookings ?? 0,
          'Avg Stay (nights)': Number(prop.avgStay?.toFixed(1) ?? 0),
          'Cancellation Rate (%)': Number(prop.cancellationRate?.toFixed(1) ?? 0),
          'Conversion Rate (%)': prop.conversionRate ? Number(prop.conversionRate.toFixed(1)) : null,
          'Repeat Guest Rate (%)': Number(prop.repeatGuestRate?.toFixed(1) ?? 0)
        })),
        columns: ['Property', 'Occupancy Rate (%)', 'ADR (₹)', 'RevPAR (₹)', 'Total Bookings', 'Avg Stay (nights)', 'Cancellation Rate (%)', 'Conversion Rate (%)', 'Repeat Guest Rate (%)']
      },
      expense_categories: {
        sheetName: 'Expense Categories',
        data: (expenseData?.byCategory ?? []).map(cat => ({
          'Category': cat.categoryName,
          'Total Amount (₹)': Math.round(cat.total ?? 0),
          'Percentage of Total': expenses?.totalExpenses ? Number(((cat.total / expenses.totalExpenses) * 100).toFixed(1)) : 0,
          'Monthly Average (₹)': Math.round((cat.total ?? 0) / Math.max(1, Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24 * 30))))
        })),
        columns: ['Category', 'Total Amount (₹)', 'Percentage of Total', 'Monthly Average (₹)']
      },
      budget_vs_actual: {
        sheetName: 'Budget vs Actual',
        data: (expenseData?.budgetComparison ?? []).map(item => ({
          'Category': item.categoryName,
          'Budgeted Amount (₹)': Math.round(item.budgeted ?? 0),
          'Actual Amount (₹)': Math.round(item.actual ?? 0),
          'Variance (₹)': Math.round(item.variance ?? 0),
          'Variance (%)': Number(item.variancePercent?.toFixed(1) ?? 0),
          'Status': (item.variance ?? 0) > 0 ? 'Over Budget' : (item.variance ?? 0) < 0 ? 'Under Budget' : 'On Target',
          'Budget Utilization (%)': item.budgeted ? Number(((item.actual / item.budgeted) * 100).toFixed(1)) : 0
        })),
        columns: ['Category', 'Budgeted Amount (₹)', 'Actual Amount (₹)', 'Variance (₹)', 'Variance (%)', 'Status', 'Budget Utilization (%)']
      },
      vendor_analysis: {
        sheetName: 'Vendor Analysis',
        data: (expenseData?.vendorAnalysis ?? []).map(vendor => ({
          'Vendor': vendor.vendor ?? 'Unknown',
          'Total Spent (₹)': Math.round(vendor.amount ?? 0),
          'Transactions': vendor.count ?? 0,
          'Average Transaction (₹)': vendor.count ? Math.round((vendor.amount ?? 0) / vendor.count) : 0,
        })),
        columns: ['Vendor', 'Total Spent (₹)', 'Transactions', 'Average Transaction (₹)']
      },
      payment_methods: {
        sheetName: 'Payment Methods',
        data: (expenseData?.paymentMethodBreakdown ?? []).map(method => ({
          'Payment Method': method.method,
          'Total Amount (₹)': Math.round(method.amount ?? 0),
          'Percentage of Total (%)': method.percentage ? Number(method.percentage.toFixed(1)) : 0,
        })),
        columns: ['Payment Method', 'Total Amount (₹)', 'Percentage of Total (%)']
      },
      income_statement: {
        sheetName: 'Income Statement',
        data: [
          { Item: 'REVENUE', Amount: booking?.totalRevenue ?? 0, Type: 'Revenue', Percentage: 100 },
          { Item: 'Room Revenue', Amount: booking?.totalRevenue ?? 0, Type: 'Revenue', Percentage: 100 },
          { Item: '', Amount: null, Type: 'Separator', Percentage: null },
          { Item: 'OPERATING EXPENSES', Amount: expenses?.totalExpenses ?? 0, Type: 'Expense', Percentage: expenses?.totalExpenses && booking?.totalRevenue ? Number(((expenses.totalExpenses / booking.totalRevenue) * 100).toFixed(1)) : 0 },
          ...(expenseData?.byCategory ?? []).map(cat => ({
            Item: `  ${cat.categoryName}`,
            Amount: cat.total,
            Type: 'Expense Line',
            Percentage: booking?.totalRevenue ? Number(((cat.total / booking.totalRevenue) * 100).toFixed(1)) : 0
          })),
          { Item: '', Amount: null, Type: 'Separator', Percentage: null },
          { Item: 'NET PROFIT', Amount: (booking?.totalRevenue ?? 0) - (expenses?.totalExpenses ?? 0), Type: 'Profit', Percentage: booking?.totalRevenue ? Number((((booking.totalRevenue - (expenses?.totalExpenses ?? 0)) / booking.totalRevenue) * 100).toFixed(1)) : 0 }
        ],
        columns: ['Item', 'Amount', 'Type', 'Percentage']
      },
      profitability_analysis: {
        sheetName: 'Profitability Analysis',
        data: [
          { Metric: 'Gross Revenue', Value: booking?.totalRevenue ?? 0, Formula: 'Total room revenue earned', Benchmark: 'Industry standard varies by location' },
          { Metric: 'Total Operating Expenses', Value: expenses?.totalExpenses ?? 0, Formula: 'Sum of all expense categories', Benchmark: '60-70% of revenue is typical' },
          { Metric: 'Net Operating Income', Value: (booking?.totalRevenue ?? 0) - (expenses?.totalExpenses ?? 0), Formula: 'Revenue - Operating Expenses', Benchmark: '30-40% margin is healthy' },
          { Metric: 'Profit Margin (%)', Value: booking?.totalRevenue ? Number((((booking.totalRevenue - (expenses?.totalExpenses ?? 0)) / booking.totalRevenue) * 100).toFixed(2)) : 0, Formula: '(Revenue - Expenses) / Revenue * 100', Benchmark: '25-35% is excellent' },
          { Metric: 'Revenue per Available Room (RevPAR)', Value: booking?.revpar ?? 0, Formula: 'Revenue / Total Room Nights Available', Benchmark: 'Compare with local competitors' },
          { Metric: 'Cost per Available Room', Value: currentProperty?.totalRooms ? Number(((expenses?.totalExpenses ?? 0) / ((currentProperty.totalRooms || 1) * Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(2)) : 0, Formula: 'Total Expenses / (Rooms * Days)', Benchmark: 'Should be < 70% of ADR' }
        ],
        columns: ['Metric', 'Value', 'Formula', 'Benchmark']
      }
    };
  };

  return (
    <Card className={cn(
      "bg-card border-card-border shadow-sm p-4 rounded-lg",
      sticky && "sticky top-0 z-20 backdrop-blur-sm bg-card/95",
      className
    )}>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>

          <Select value={currentProperty?.id ?? 'none'} onValueChange={(v) => switchProperty(v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                Select Property
              </SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={inferRangeValue()} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last90">Last 90 days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={gridCalendarSettings.bookingSource ?? "all"}
            onValueChange={(v) => updateGridSettings({ bookingSource: v })}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Booking Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="direct">Direct Booking</SelectItem>
              <SelectItem value="booking">Booking.com</SelectItem>
              <SelectItem value="airbnb">Airbnb</SelectItem>
              <SelectItem value="makemytrip">MakeMyTrip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={(e) => datePanelRef.current?.toggle(e)}
            ref={customDateBtnRef}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Custom Date
          </Button>
          <OverlayPanel ref={datePanelRef} className="p-2">
            <PrimeCalendar
              selectionMode="range"
              numberOfMonths={1}
              value={
                rangeDraft ?? [gridCalendarSettings.dateRange.start, gridCalendarSettings.dateRange.end]
              }
              showButtonBar
              touchUI
              inline
              onChange={(e) => {
                const val = (e.value as Date[] | null) ?? [];
                // Always reflect current selection in draft to show partial range
                setRangeDraft(Array.isArray(val) ? val : null);

                if (Array.isArray(val) && val[0] && val[1]) {
                  // Commit only when both dates are selected
                  setRange(val[0], val[1]);
                  setRangeDraft(null);
                  datePanelRef.current?.hide();
                } else if (!Array.isArray(val) || val.length === 0) {
                  // Clear action: reset to today to keep app state valid
                  setRange(today, today);
                  setRangeDraft(null);
                  datePanelRef.current?.hide();
                }
              }}
            />
          </OverlayPanel>
          <ExportSelectionModal
            currentProperty={currentProperty ?? undefined}
            dateRange={{ start: startStr, end: endStr }}
            bookingSource={bookingSource}
            exportData={buildExportData()}
            isLoading={isKpiLoading || isExpenseLoading || isCompLoading || isOccTrendsLoading || isSourceLoading || isGuestLoading || isCancTrendsLoading}
            trigger={
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 sm:flex-none"
                disabled={!propertyId || isKpiLoading || isExpenseLoading || isCompLoading || isOccTrendsLoading || isSourceLoading || isGuestLoading || isCancTrendsLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            }
          />
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </Card>
  );
}