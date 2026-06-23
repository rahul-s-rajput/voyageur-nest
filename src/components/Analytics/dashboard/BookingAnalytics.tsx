import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/Tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { Calendar, Users, MapPin, AlertTriangle } from "lucide-react";
import { useProperty } from "../../../contexts/PropertyContext";
import { useKpiPeriod } from "../../../hooks/useKPI";
import { useOccupancyTrends, useSourceAnalysis, useGuestDemographics } from "../../../hooks/useChartData";
import { Skeleton } from "../../ui/Skeleton";
import { ChartSkeleton } from "../../ui/SkeletonLoader";
import type { AnalyticsFilters } from "../../../types/analytics";

export function BookingAnalytics() {
  const { currentProperty, gridCalendarSettings } = useProperty();
  const filters = currentProperty
    ? {
        propertyId: currentProperty.id,
        start: gridCalendarSettings.dateRange.start.toISOString(),
        end: gridCalendarSettings.dateRange.end.toISOString(),
        totalRooms: currentProperty.totalRooms,
        bookingSource: gridCalendarSettings.bookingSource && gridCalendarSettings.bookingSource !== 'all'
          ? gridCalendarSettings.bookingSource
          : undefined,
      }
    : null;
  const safeFilters: AnalyticsFilters = filters ?? { propertyId: '', start: '', end: '' };
  const { data, isLoading } = useKpiPeriod(
    (filters as any) || ({ propertyId: '', start: '', end: '' } as any),
    { enabled: Boolean(filters) }
  );
  
  // Fetch real chart data
  const { data: occupancyData = [], isLoading: isOccLoading } = useOccupancyTrends(safeFilters);
  const { data: sourceAnalysis = [], isLoading: isSourceLoading } = useSourceAnalysis(safeFilters);
  const { data: guestDemographics = [], isLoading: isDemoLoading } = useGuestDemographics(safeFilters);

  const booking = data?.booking;
  const fmtPct = (v?: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const fmtDays = (v?: number | null) => (v == null ? '—' : `${v.toFixed(1)} days`);
  const repeatRate = booking?.repeatGuestRate ?? null;
  const firstTimeRate = repeatRate == null ? null : Math.max(0, 100 - repeatRate);
  return (
    <div className="space-y-6">
      <Tabs defaultValue="occupancy" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {isLoading ? (
              <>
                {[0,1,2,3].map((i) => (
                  <div key={i} className="w-full">
                    <Skeleton className="h-24 w-full" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Occupancy Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{fmtPct(booking?.occupancyRate)}</div>
                    <div className="text-xs text-muted-foreground">Room nights sold</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Avg Room Rate</span>
                    </div>
                    <div className="text-2xl font-bold">₹{booking?.adr?.toLocaleString() ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">Per night per room</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Revenue Per Room</span>
                    </div>
                    <div className="text-2xl font-bold">₹{booking?.revpar?.toLocaleString() ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">Daily revenue per room</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Avg Stay</span>
                    </div>
                    <div className="text-2xl font-bold">{fmtDays(booking?.avgLengthOfStay)}</div>
                    <div className="text-xs text-muted-foreground">Length per booking</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Occupancy Trends by Property</CardTitle>
            </CardHeader>
            <CardContent>
              {isOccLoading ? (
                <ChartSkeleton height="400px" />
              ) : (
                <>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={occupancyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        {occupancyData.length > 0 && Object.keys(occupancyData[0])
                          .filter(key => key !== 'month')
                          .map((propertyKey, index) => (
                            <Line 
                              key={propertyKey}
                              type="monotone" 
                              dataKey={propertyKey} 
                              stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                              strokeWidth={3}
                              name={propertyKey.charAt(0).toUpperCase() + propertyKey.slice(1)}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {occupancyData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No occupancy data available for the selected period
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Source Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {isSourceLoading ? (
                <ChartSkeleton height="300px" />
              ) : (
                <>
                  <div className="h-[300px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="source" 
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'bookings' ? value : `₹${value.toLocaleString()}`,
                            name === 'bookings' ? 'Bookings' : 'Revenue'
                          ]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="bookings" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sourceAnalysis.map((source, index) => (
                      <div key={index} className="p-4 border border-card-border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{source.source}</h4>
                          <Badge variant="outline">{source.bookings} bookings</Badge>
                        </div>
                        <div className="text-lg font-bold">₹{source.revenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{Math.round(source.revenue / source.bookings).toLocaleString()} avg per booking
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Guest Demographics by Region
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isDemoLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {[0,1,2,3,4].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-4">Regional Distribution</h4>
                    <div className="space-y-3">
                      {guestDemographics.map((region, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                            />
                            <span className="text-sm">{region.region}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{region.percentage}%</div>
                            <div className="text-xs text-muted-foreground">{region.bookings} bookings</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{fmtPct(repeatRate)}</div>
                        <div className="text-xs text-muted-foreground">Repeat Guests</div>
                      </div>
                      <div className="text-center p-4 bg-accent/10 rounded-lg">
                        <div className="text-2xl font-bold text-accent">{fmtPct(firstTimeRate)}</div>
                        <div className="text-xs text-muted-foreground">First-time Guests</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-lg font-bold text-success">{fmtDays(booking?.avgLengthOfStay)}</div>
                      <div className="text-xs text-muted-foreground">Average Stay Duration</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}