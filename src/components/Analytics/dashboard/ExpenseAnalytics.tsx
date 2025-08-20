import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
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
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Calendar,
  Receipt,
  CreditCard,
  Target
} from "lucide-react";
import { useDetailedExpenseAnalytics } from "../../../hooks/useChartData";
import { useProperty } from "../../../contexts/PropertyContext";

// Utility functions
const fmtCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString()}`;
const fmtPct = (rate?: number) => rate != null ? `${Math.round(rate)}%` : '—';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function ExpenseAnalytics() {
  const { currentProperty, gridCalendarSettings } = useProperty();
  const propertyId = currentProperty?.id;
  const totalRooms = currentProperty?.totalRooms;
  const startStr = gridCalendarSettings.dateRange.start.toISOString().slice(0, 10);
  const endStr = gridCalendarSettings.dateRange.end.toISOString().slice(0, 10);
  const bookingSource = gridCalendarSettings.bookingSource;

  const filters = {
    propertyId: propertyId ?? "",
    start: startStr,
    end: endStr,
    totalRooms: totalRooms ?? 0,
    bookingSource: bookingSource && bookingSource !== 'all' ? bookingSource : undefined,
  };

  const { 
    data: expenseData, 
    isLoading, 
    error 
  } = useDetailedExpenseAnalytics(filters);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load expense analytics</p>
        </CardContent>
      </Card>
    );
  }

  const { kpis, byCategory, trends, budgetComparison, vendorAnalysis, paymentMethodBreakdown } = expenseData || {};

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-gradient-data">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total Expenses</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(kpis?.totalExpenses || 0)}</div>
                <div className="text-xs text-muted-foreground">This period</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-data">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Monthly Average</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(kpis?.monthlyAverage || 0)}</div>
                <div className="text-xs text-muted-foreground">Per month</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-data">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Budget Variance</span>
                </div>
                <div className={`text-2xl font-bold ${(kpis?.budgetVariance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {kpis?.budgetVariance && kpis.budgetVariance !== 0 ? 
                    `${kpis.budgetVariance > 0 ? '+' : ''}${fmtCurrency(kpis.budgetVariance)}` : 
                    '—'
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {kpis?.budgetVariancePercent ? fmtPct(Math.abs(kpis.budgetVariancePercent)) : 'No budget set'}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-data">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Expense Count</span>
                </div>
                <div className="text-2xl font-bold">{kpis?.expenseCount || 0}</div>
                <div className="text-xs text-muted-foreground">
                  Avg: {fmtCurrency(kpis?.averageExpenseAmount || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Category & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byCategory?.slice(0, 6) || []}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({categoryName, total}) => `${categoryName}: ₹${Math.round(total/1000)}k`}
                      >
                        {byCategory?.slice(0, 6).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [fmtCurrency(value as number), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethodBreakdown?.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.method}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{fmtCurrency(item.amount)}</div>
                        <div className="text-xs text-muted-foreground">{fmtPct(item.percentage)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="categoryName" 
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
                      formatter={(value) => [fmtCurrency(value as number), 'Amount']}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="hsl(var(--chart-1))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetComparison && budgetComparison.length > 0 ? (
                <div className="space-y-6">
                  {budgetComparison.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.categoryName}</span>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground">
                            {fmtCurrency(item.actual)} / {fmtCurrency(item.budgeted)}
                          </span>
                          <div className={`text-xs flex items-center gap-1 ${
                            item.variance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.variance > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3" />
                                Over by {fmtPct(Math.abs(item.variancePercent))}
                              </>
                            ) : item.variance < 0 ? (
                              <>
                                <TrendingDown className="h-3 w-3" />
                                Under by {fmtPct(Math.abs(item.variancePercent))}
                              </>
                            ) : (
                              "On target"
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.variance > 0 ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (item.actual / Math.max(item.budgeted, item.actual)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No budget data available for comparison
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorAnalysis?.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{vendor.vendor}</div>
                        <div className="text-sm text-muted-foreground">{vendor.count} expenses</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmtCurrency(vendor.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {fmtCurrency(vendor.amount / vendor.count)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Trends (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends || []}>
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
                      formatter={(value, name) => [
                        fmtCurrency(value as number), 
                        name === 'totalExpenses' ? 'Actual Expenses' : 'Budget'
                      ]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalExpenses" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={3}
                      name="Actual Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Budget"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {trends && trends.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No expense trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
