import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Progress } from "../../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/Tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { parse, format } from "date-fns";
import { useKpiPeriod, useKpiPerProperty } from "../../../hooks/useKPI";
import { useDetailedExpenseAnalytics, useRevenueTrends } from "../../../hooks/useChartData";
import { useProperty } from "../../../contexts/PropertyContext";
import { Skeleton } from "../../ui/Skeleton";
import { ChartSkeleton } from "../../ui/SkeletonLoader";



// Utility functions
const fmtCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString()}`;

export function FinancialReports() {
  const { currentProperty, gridCalendarSettings, properties } = useProperty();
  const propertyId = currentProperty?.id ?? "";
  const totalRooms = currentProperty?.totalRooms ?? 0;
  // Local (IST) formatting — toISOString() shifts an IST-midnight boundary back a
  // day, which would window differently from the Overview tab.
  const startStr = format(gridCalendarSettings.dateRange.start, "yyyy-MM-dd");
  const endStr = format(gridCalendarSettings.dateRange.end, "yyyy-MM-dd");
  const bookingSource = gridCalendarSettings.bookingSource;

  const filters = {
    propertyId,
    start: startStr,
    end: endStr,
    totalRooms,
    bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
  };

  const { data: period, isLoading: isPeriodLoading } = useKpiPeriod(filters, { enabled: !!propertyId });
  const { data: expenseData, isLoading: isExpenseLoading } = useDetailedExpenseAnalytics(filters);
  // Real per-month revenue, aligned to the same "MMM yyyy" buckets as expense trends.
  const { data: revenueTrends, isLoading: isRevenueLoading } = useRevenueTrends(filters);

  // Fetch per-property KPI data for profitability comparison
  const totalRoomsByProperty = Object.fromEntries(
    properties.map(p => [p.id, p.totalRooms || 0])
  );
  const { dataByProperty, isLoading: isPerPropLoading } = useKpiPerProperty({
    propertyIds: properties.map(p => p.id),
    date: { start: startStr, end: endStr },
    totalRoomsByProperty,
    bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
  }, { enabled: properties.length > 0 });

  // Calculate financial metrics from real data
  const totalRevenue = period?.booking.totalRevenue || 0;
  const totalExpenses = expenseData?.kpis?.totalExpenses || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Combine real per-month revenue with per-month expenses. Use the UNION of
  // months present in either series (a month with revenue but no expenses — or
  // vice versa — must still appear), ordered chronologically by parsing the
  // shared "MMM yyyy" key.
  const revenueByMonth = new Map((revenueTrends || []).map(r => [r.month, r.revenue]));
  const expenseByMonth = new Map((expenseData?.trends || []).map(t => [t.month, t.totalExpenses]));
  const allMonths = Array.from(new Set([
    ...(revenueTrends || []).map(r => r.month),
    ...(expenseData?.trends || []).map(t => t.month),
  ]));
  const incomeData = allMonths
    .sort((a, b) => parse(a, 'MMM yyyy', new Date(0)).getTime() - parse(b, 'MMM yyyy', new Date(0)).getTime())
    .map(month => ({
      month,
      revenue: revenueByMonth.get(month) ?? 0,
      expenses: expenseByMonth.get(month) ?? 0,
    }));
  
  // Create property comparison data from per-property KPI results (all properties)
  const propertyComparison = properties.map(property => {
    const res = dataByProperty?.get(property.id);
    const propertyRevenue = res?.booking.totalRevenue || 0;
    const propertyExpenses = res?.expenses.totalExpenses || 0;
    const profit = propertyRevenue - propertyExpenses;
    const margin = propertyRevenue > 0 ? (profit / propertyRevenue) * 100 : 0;
    return {
      property: property.name,
      revenue: propertyRevenue,
      profit: profit,
      margin: Math.round(margin)
    };
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="income">Income Statement</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isPeriodLoading || isExpenseLoading || isRevenueLoading ? (
                <>
                  <ChartSkeleton height="400px" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-lg">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                    <div className="p-4 rounded-lg">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                    <div className="p-4 rounded-lg">
                      <Skeleton className="h-4 w-28 mb-2" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={incomeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(value) => `₹${value/1000}k`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Expenses']}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expenses" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={3}
                          dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-success">{fmtCurrency(totalRevenue)}</p>
                      <p className="text-xs text-success flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Payments received
                      </p>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-warning">{fmtCurrency(totalExpenses)}</p>
                      <p className="text-xs text-warning flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        All categories
                      </p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Net Profit</p>
                      <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                        {fmtCurrency(netProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        Margin: {profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Profitability Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {isPeriodLoading || isExpenseLoading || isPerPropLoading ? (
                <>
                  <ChartSkeleton height="300px" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border border-card-border rounded-lg">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-[300px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={propertyComparison}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="property" 
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(value) => `₹${value/1000}k`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            `₹${value.toLocaleString()}`, 
                            name === 'revenue' ? 'Revenue' : 'Profit'
                          ]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="profit" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {propertyComparison.map((property, index) => (
                      <div key={index} className="p-4 border border-card-border rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{property.property}</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span>₹{property.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Profit:</span>
                            <span>₹{property.profit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Margin:</span>
                            <span className="font-medium">{property.margin}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
      </Tabs>
    </div>
  );
}