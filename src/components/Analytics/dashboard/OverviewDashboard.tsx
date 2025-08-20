import { KPICard } from "./KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import {
  DollarSign,
  TrendingUp,
  Users,
  Bed,
  Brain,
  PieChart
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { useProperty } from "../../../contexts/PropertyContext";
import { useKpiPeriod, useKpiComparison } from "../../../hooks/useKPI";
import { Skeleton } from "../../ui/Skeleton";
import { ChartSkeleton } from "../../ui/SkeletonLoader";

function formatCurrency(n: number) {
  return `₹${Math.round(n).toLocaleString()}`;
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function OverviewDashboard() {
  const { currentProperty, gridCalendarSettings } = useProperty();
  const propertyId = currentProperty?.id;
  const totalRooms = currentProperty?.totalRooms;
  const startStr = gridCalendarSettings.dateRange.start.toISOString().slice(0, 10);
  const endStr = gridCalendarSettings.dateRange.end.toISOString().slice(0, 10);
  const bookingSource = gridCalendarSettings.bookingSource;
  const enabled = !!propertyId;

  const filters = {
    propertyId: propertyId ?? "",
    start: startStr,
    end: endStr,
    totalRooms: totalRooms ?? 0,
    bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
  };

  const { data: kpi, isLoading, error } = useKpiPeriod(filters, { enabled });
  const { data: kpiCmp } = useKpiComparison(filters, 'prev_period', { enabled });

  const trendFromDelta = (n?: number): "up" | "down" | "neutral" => {
    if (n === undefined || n === 0) return "neutral" as const;
    return n > 0 ? "up" : "down";
  };

  const kpiData = kpi
    ? [
        {
          title: "Total Revenue",
          value: formatCurrency(kpi.booking.totalRevenue),
          change: kpiCmp ? { value: Number(kpiCmp.deltas.revenueDeltaPct.toFixed(1)), period: "vs prev" } : undefined,
          trend: trendFromDelta(kpiCmp?.deltas.revenueDeltaPct),
          icon: <DollarSign className="h-4 w-4" />,
        },
        {
          title: "Occupancy Rate",
          value: `${kpi.booking.occupancyRate.toFixed(1)}%`,
          change: kpiCmp ? { value: Number(kpiCmp.deltas.occupancyDeltaPct.toFixed(1)), period: "vs prev" } : undefined,
          trend: trendFromDelta(kpiCmp?.deltas.occupancyDeltaPct),
          icon: <Bed className="h-4 w-4" />,
        },
        {
          title: "RevPAR",
          value: formatCurrency(kpi.booking.revpar),
          change: kpiCmp ? { value: Number(kpiCmp.deltas.revparDeltaPct.toFixed(1)), period: "vs prev" } : undefined,
          trend: trendFromDelta(kpiCmp?.deltas.revparDeltaPct),
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          title: "ADR",
          value: formatCurrency(kpi.booking.adr),
          change: kpiCmp ? { value: Number(kpiCmp.deltas.adrDeltaPct.toFixed(1)), period: "vs prev" } : undefined,
          trend: trendFromDelta(kpiCmp?.deltas.adrDeltaPct),
          icon: <Users className="h-4 w-4" />,
        },
      ]
    : [];

  const bookingSourceData = (kpi?.booking.sourceDistribution || []).map((s, idx) => ({
    name: s.name,
    value: Number((s.value ?? 0).toFixed(1)),
    color: chartColors[idx % chartColors.length],
  }));

  const expenseData = (kpi?.expenses.byCategory || []).map((c, idx) => ({
    category: c.categoryName || "Uncategorized",
    amount: c.total,
    color: chartColors[idx % chartColors.length],
  }));

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Failed to load KPIs'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && (
          <>
            {[0,1,2,3].map((i) => (
              <div key={i} className="w-full">
                <Skeleton className="h-28 w-full" />
              </div>
            ))}
          </>
        )}
        {!isLoading && kpiData.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Sources Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Bookings by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height="300px" />
            ) : bookingSourceData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No booking data for the selected filters.</p>
              </div>
            ) : (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={bookingSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {bookingSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, "Share"]}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {bookingSourceData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.name}: {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton height="300px" />
            ) : expenseData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No expenses found for the selected filters.</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="category" 
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) => `₹${value/1000}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Amount"]}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}