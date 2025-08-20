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
import { useOccupancyTrends, useSourceAnalysis, useGuestDemographics, useCancellationTrends, usePropertyComparison } from "../../../hooks/useChartData";
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
  const { data: cancellationData = [], isLoading: isCancLoading } = useCancellationTrends(safeFilters);
  const { data: propertyComparison = [], isLoading: isCompLoading } = usePropertyComparison({
    start: safeFilters.start,
    end: safeFilters.end,
  });
  
  const booking = data?.booking;
  const fmtPct = (v?: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const fmtDays = (v?: number | null) => (v == null ? '—' : `${v.toFixed(1)} days`);
  const repeatRate = booking?.repeatGuestRate ?? null;
  const firstTimeRate = repeatRate == null ? null : Math.max(0, 100 - repeatRate);
  return (
    <div className="space-y-6">
      <Tabs defaultValue="occupancy" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
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

        <TabsContent value="conversions" className="space-y-6">
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
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{fmtPct(booking?.bookingConversionRate ?? null)}</div>
                    <div className="text-xs text-muted-foreground">Bookings confirmed</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Confirmed</span>
                    </div>
                    <div className="text-2xl font-bold">{booking?.confirmedBookingCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Successful bookings</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                    <div className="text-2xl font-bold">{booking?.pendingBookingCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Awaiting confirmation</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Cancelled</span>
                    </div>
                    <div className="text-2xl font-bold">{booking?.cancelledBookingCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Lost opportunities</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Status Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-11/12 ml-2" />
                    <Skeleton className="h-8 w-10/12 ml-4" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-primary rounded flex items-center justify-center text-white text-xs font-bold">
                          100%
                        </div>
                        <div className="flex-1 h-8 bg-primary rounded flex items-center px-3 text-white text-sm font-medium">
                          Total Inquiries ({(Number(booking?.confirmedBookingCount || 0) + Number(booking?.pendingBookingCount || 0) + Number(booking?.cancelledBookingCount || 0))})
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative ml-2">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-success rounded flex items-center justify-center text-white text-xs font-bold">
                          {booking?.bookingConversionRate ? Math.round(booking.bookingConversionRate) : 0}%
                        </div>
                        <div className="flex-1 h-8 bg-success rounded flex items-center px-3 text-white text-sm font-medium">
                          Confirmed ({booking?.confirmedBookingCount ?? 0})
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative ml-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-warning rounded flex items-center justify-center text-white text-xs font-bold">
                          {booking?.pendingBookingCount && (Number(booking?.confirmedBookingCount || 0) + Number(booking?.pendingBookingCount || 0) + Number(booking?.cancelledBookingCount || 0)) > 0 
                            ? Math.round((booking.pendingBookingCount / (Number(booking?.confirmedBookingCount || 0) + Number(booking?.pendingBookingCount || 0) + Number(booking?.cancelledBookingCount || 0))) * 100) 
                            : 0}%
                        </div>
                        <div className="flex-1 h-8 bg-warning rounded flex items-center px-3 text-white text-sm font-medium">
                          Pending ({booking?.pendingBookingCount ?? 0})
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Source Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {isSourceLoading ? (
                  <ChartSkeleton height="250px" />
                ) : (
                  <>
                    <div className="h-[250px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceAnalysis.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="source" 
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [value, 'Bookings']}
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Bar dataKey="bookings" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-3">
                      {sourceAnalysis.slice(0, 3).map((source, index) => (
                        <div key={source.source} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-chart-${index + 1}`} />
                            <span className="text-sm font-medium">{source.source}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{source.bookings} bookings</div>
                            <div className="text-xs text-muted-foreground">₹{Math.round(source.revenue / source.bookings).toLocaleString()} avg</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="cancellations" className="space-y-6">
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
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Cancellation Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{fmtPct(booking?.cancellationRate)}</div>
                    <div className="text-xs text-muted-foreground">Lost bookings</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">No-Show Rate</span>
                    </div>
                    <div className="text-2xl font-bold">3.2%</div>
                    <div className="text-xs text-muted-foreground">Unattended arrivals</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold">{booking?.cancellationRate ? fmtPct(100 - booking.cancellationRate) : '—'}</div>
                    <div className="text-xs text-muted-foreground">Completed stays</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-data">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Lost Revenue</span>
                    </div>
                    <div className="text-2xl font-bold">₹{booking?.cancelledBookingCount && booking?.adr ? Math.round(booking.cancelledBookingCount * booking.adr).toLocaleString() : '—'}</div>
                    <div className="text-xs text-muted-foreground">Potential earnings</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cancellation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {isCancLoading ? (
                <ChartSkeleton height="400px" />
              ) : (
                <>
                  <div className="h-[400px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cancellationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip 
                          formatter={(value) => [
                            value,
                            value === 'cancellations' ? 'Cancellations' : value === 'noShows' ? 'No-Shows' : 'Total Bookings'
                          ]}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          name="Total Bookings"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cancellations" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={3}
                          name="Cancellations"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="noShows" 
                          stroke="hsl(var(--chart-3))" 
                          strokeWidth={2}
                          name="No-Shows"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {cancellationData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No cancellation data available
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
              {isCompLoading ? (
                <ChartSkeleton height="300px" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={propertyComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="propertyName" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}%`,
                          name === 'occupancyRate' ? 'Occupancy' : 'Conversion Rate'
                        ]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="occupancyRate" fill="hsl(var(--chart-1))" name="Occupancy Rate" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="conversionRate" fill="hsl(var(--chart-3))" name="Conversion Rate" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Comparison</CardTitle>
              </CardHeader>
              <CardContent>
              {isCompLoading ? (
                <ChartSkeleton height="300px" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={propertyComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="propertyName" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `₹${value}`,
                          name === 'adr' ? 'Avg Room Rate' : 'Revenue Per Room'
                        ]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="adr" fill="hsl(var(--chart-2))" name="Avg Room Rate" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="revpar" fill="hsl(var(--chart-4))" name="Revenue Per Room" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Property Performance Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border">
                      <th className="text-left py-3">Property</th>
                      <th className="text-center py-3">Occupancy</th>
                      <th className="text-center py-3">Avg Room Rate</th>
                      <th className="text-center py-3">Revenue Per Room</th>
                      <th className="text-center py-3">Bookings</th>
                      <th className="text-center py-3">Avg Stay</th>
                      <th className="text-center py-3">Cancel Rate</th>
                      <th className="text-center py-3">Success Rate</th>
                      <th className="text-center py-3">Repeat Guests</th>
                      <th className="text-center py-3">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCompLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-card-border">
                          <td className="py-3"><Skeleton className="h-5 w-40" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-24 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-24 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-12 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-20 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                          <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto" /></td>
                        </tr>
                      ))
                    ) : (
                      <>
                        {propertyComparison.map((property, index) => {
                          const performanceScore = Math.round(
                            (property.occupancyRate * 0.3 + 
                             (property.conversionRate || 0) * 0.25 + 
                             property.repeatGuestRate * 0.25 + 
                             Math.max(0, 100 - property.cancellationRate) * 0.2)
                          );
                          return (
                            <tr key={property.propertyId} className={index < propertyComparison.length - 1 ? "border-b border-card-border" : ""}>
                              <td className="py-3 font-medium">{property.propertyName}</td>
                              <td className="text-center py-3">
                                <Badge className={
                                  property.occupancyRate >= 85 ? "bg-success/10 text-success" :
                                  property.occupancyRate >= 70 ? "bg-primary/10 text-primary" :
                                  "bg-warning/10 text-warning"
                                }>
                                  {fmtPct(property.occupancyRate)}
                                </Badge>
                              </td>
                              <td className="text-center py-3">₹{property.adr.toLocaleString()}</td>
                              <td className="text-center py-3">₹{property.revpar.toLocaleString()}</td>
                              <td className="text-center py-3">{property.bookings}</td>
                              <td className="text-center py-3">{fmtDays(property.avgStay)}</td>
                              <td className="text-center py-3">{fmtPct(property.cancellationRate)}</td>
                              <td className="text-center py-3">{fmtPct(property.conversionRate)}</td>
                              <td className="text-center py-3">{fmtPct(property.repeatGuestRate)}</td>
                              <td className="text-center py-3">
                                <Badge className={
                                  performanceScore >= 80 ? "bg-success/10 text-success" :
                                  performanceScore >= 60 ? "bg-primary/10 text-primary" :
                                  "bg-destructive/10 text-destructive"
                                }>
                                  {performanceScore}/100
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                        {propertyComparison.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-muted-foreground">
                              No comparison data available
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}