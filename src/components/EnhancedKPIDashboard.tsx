import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  UserCheck,
  Building,
  Percent
} from 'lucide-react';
import { Booking } from '../types/booking';
import { useProperty } from '../contexts/PropertyContext';
import MobileQuickStats from './MobileQuickStats';

interface EnhancedKPIDashboardProps {
  bookings: Booking[];
  className?: string;
}

interface KPIMetric {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  priority: 'high' | 'medium' | 'low';
}

const EnhancedKPIDashboard: React.FC<EnhancedKPIDashboardProps> = ({ bookings, className = '' }) => {
  const { currentProperty } = useProperty();
  
  const kpiMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    // Filter active bookings (non-cancelled) and validate data
    const activeBookings = bookings.filter(b => {
      if (!b || b.cancelled) return false;
      
      // Data validation
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      const totalAmount = parseFloat(String(b.totalAmount || 0));
      const paymentAmount = parseFloat(String(b.paymentAmount || 0));
      
      // Validate dates and amounts
      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return false;
      if (checkIn >= checkOut) return false;
      if (totalAmount < 0 || paymentAmount < 0) return false;
      if (paymentAmount > totalAmount) return false;
      
      return true;
    });
    
    // Today's metrics
    const todayCheckIns = activeBookings.filter(b => b.checkIn === today);
    const todayCheckOuts = activeBookings.filter(b => b.checkOut === today);
    const tomorrowCheckIns = activeBookings.filter(b => b.checkIn === tomorrow);
    
    // Current occupancy (checked-in guests)
    const currentlyOccupied = activeBookings.filter(b => 
      b.status === 'checked-in' && 
      b.checkIn <= today && 
      b.checkOut > today
    );
    
    // Revenue metrics - Fixed calculation logic
    const totalRevenue = activeBookings.reduce((sum, b) => sum + parseFloat(String(b.totalAmount || 0)), 0);
    
    // Fixed: Use consistent logic for paid revenue calculation
    const paidRevenue = activeBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + parseFloat(String(b.paymentAmount || b.totalAmount || 0)), 0);
    
    // Fixed: Calculate partial revenue using actual paymentAmount
    const partialRevenue = activeBookings
      .filter(b => b.paymentStatus === 'partial')
      .reduce((sum, b) => sum + parseFloat(String(b.paymentAmount || 0)), 0);
    
    const pendingRevenue = totalRevenue - paidRevenue - partialRevenue;
    
    // This month's bookings
    const thisMonthBookings = activeBookings.filter(b => {
      const bookingDate = new Date(b.checkIn);
      return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear;
    });
    
    // Payment status breakdown
    const paidBookings = activeBookings.filter(b => b.paymentStatus === 'paid');
    const partialBookings = activeBookings.filter(b => b.paymentStatus === 'partial');
    const unpaidBookings = activeBookings.filter(b => b.paymentStatus === 'unpaid' || !b.paymentStatus);
    
    // Average booking value
    const avgBookingValue = activeBookings.length > 0 ? totalRevenue / activeBookings.length : 0;
    
    // Fixed: Proper occupancy rate calculation using actual property room count
    const totalRooms = currentProperty?.totalRooms || 0;
    const occupancyRate = totalRooms > 0 ? (currentlyOccupied.length / totalRooms) * 100 : 0;

    // Average stay duration
    const avgStayDuration = activeBookings.length > 0 
      ? activeBookings.reduce((sum, b) => {
          const checkIn = new Date(b.checkIn);
          const checkOut = new Date(b.checkOut);
          return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / activeBookings.length
      : 0;

    // Upcoming departures (next 3 days)
    const next3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcomingDepartures = activeBookings.filter(b => 
      b.checkOut > today && b.checkOut <= next3Days
    );

    // New bookings this week
    const thisWeekBookings = activeBookings.filter(b => {
      const bookingDate = new Date(b.bookingDate || b.checkIn);
      return bookingDate >= thisWeekStart;
    });

    const metrics: KPIMetric[] = [
      {
        id: 'today-checkins',
        label: 'Today Check-ins',
        value: todayCheckIns.length,
        subValue: `${tomorrowCheckIns.length} tomorrow`,
        icon: <UserCheck className="w-5 h-5" />,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        priority: 'high'
      },
      {
        id: 'today-checkouts',
        label: 'Today Check-outs',
        value: todayCheckOuts.length,
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        priority: 'high'
      },
      {
        id: 'current-occupancy',
        label: 'Current Occupancy',
        value: currentlyOccupied.length,
        subValue: `${occupancyRate.toFixed(0)}% rate`,
        icon: <Building className="w-5 h-5" />,
        color: 'text-green-600 bg-green-50 border-green-200',
        priority: 'high'
      },
      {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: `₹${(totalRevenue / 1000).toFixed(1)}k`,
        subValue: `₹${avgBookingValue.toFixed(0)} avg`,
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        priority: 'high'
      },
      {
        id: 'pending-payments',
        label: 'Pending Payments',
        value: `₹${(pendingRevenue / 1000).toFixed(1)}k`,
        subValue: `${unpaidBookings.length + partialBookings.length} bookings`,
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-red-600 bg-red-50 border-red-200',
        priority: 'medium'
      },
      {
        id: 'active-bookings',
        label: 'Active Bookings',
        value: activeBookings.length,
        subValue: `${bookings.filter(b => b.cancelled).length} cancelled`,
        icon: <Calendar className="w-5 h-5" />,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        priority: 'medium'
      },
      {
        id: 'this-month',
        label: 'This Month',
        value: thisMonthBookings.length,
        subValue: `₹${(thisMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0) / 1000).toFixed(1)}k`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        priority: 'low'
      },
      {
        id: 'payment-rate',
        label: 'Payment Rate',
        value: `${activeBookings.length > 0 ? ((paidBookings.length / activeBookings.length) * 100).toFixed(0) : 0}%`,
        subValue: `${paidBookings.length}/${activeBookings.length} paid`,
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        priority: 'medium'
      },
      {
        id: 'avg-stay',
        label: 'Avg Stay',
        value: `${avgStayDuration.toFixed(1)} days`,
        subValue: `${upcomingDepartures.length} departing soon`,
        icon: <Clock className="w-5 h-5" />,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        priority: 'low'
      },
      {
        id: 'new-bookings',
        label: 'New This Week',
        value: thisWeekBookings.length,
        subValue: `₹${(thisWeekBookings.reduce((sum, b) => sum + b.totalAmount, 0) / 1000).toFixed(1)}k value`,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        priority: 'low'
      }
    ];

    return metrics;
  }, [bookings, currentProperty?.totalRooms]);

  // Separate metrics by priority for responsive layout
  const highPriorityMetrics = kpiMetrics.filter(m => m.priority === 'high');
  const mediumPriorityMetrics = kpiMetrics.filter(m => m.priority === 'medium');
  const lowPriorityMetrics = kpiMetrics.filter(m => m.priority === 'low');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile Quick Stats - Only visible on mobile */}
      <div className="block sm:hidden">
        <MobileQuickStats bookings={bookings} />
      </div>

      {/* High Priority Metrics - Hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {highPriorityMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`bg-white p-3 sm:p-4 rounded-lg shadow-sm border-2 ${metric.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
                  {metric.label}
                </div>
                <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-xs text-gray-500 truncate">
                    {metric.subValue}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 p-2 rounded-lg ${metric.color.replace('text-', 'bg-').replace('bg-', 'bg-').replace('border-', '')}`}>
                {metric.icon}
              </div>
            </div>
            {metric.trend && (
              <div className="mt-2 flex items-center">
                {metric.trend.isPositive ? (
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs font-medium ${
                  metric.trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(metric.trend.value)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Medium Priority Metrics - Hidden on Mobile, Visible on Tablet+ */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {mediumPriorityMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`bg-white p-3 sm:p-4 rounded-lg shadow-sm border ${metric.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
                  {metric.label}
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-xs text-gray-500 truncate">
                    {metric.subValue}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 p-2 rounded-lg ${metric.color.replace('text-', 'bg-').replace('bg-', 'bg-').replace('border-', '')}`}>
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Low Priority Metrics - Hidden on Mobile/Tablet, Visible on Desktop */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {lowPriorityMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`bg-white p-4 rounded-lg shadow-sm border ${metric.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-600 mb-1 truncate">
                  {metric.label}
                </div>
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                {metric.subValue && (
                  <div className="text-xs text-gray-500 truncate">
                    {metric.subValue}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 p-2 rounded-lg ${metric.color.replace('text-', 'bg-').replace('bg-', 'bg-').replace('border-', '')}`}>
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
};

export default EnhancedKPIDashboard;