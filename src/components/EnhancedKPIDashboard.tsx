import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  AlertCircle,
  CreditCard,
  UserCheck,
  Building
} from 'lucide-react';
import { Booking } from '../types/booking';
import { useProperty } from '../contexts/PropertyContext';
import MobileQuickStats from './MobileQuickStats';
import { bookingComplianceService } from '../services/bookingComplianceService';

interface EnhancedKPIDashboardProps {
  bookings: Booking[];
  className?: string;
  onOpenActions?: () => void;
}

interface KPIMetric {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}

// The Bookings tab shows only the day-to-day operational KPIs. Revenue, expenses,
// profit margin and other reporting numbers live in the Analytics tab.
const EnhancedKPIDashboard: React.FC<EnhancedKPIDashboardProps> = ({ bookings, className = '', onOpenActions }) => {
  const { currentProperty } = useProperty();
  const [enforcementToday, setEnforcementToday] = useState<number>(0);
  const [enforcementOverdue, setEnforcementOverdue] = useState<number>(0);

  // Load enforcement counts for banner
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!currentProperty?.id) {
          if (!cancelled) {
            setEnforcementToday(0);
            setEnforcementOverdue(0);
          }
          return;
        }
        const [today, overdue] = await Promise.all([
          bookingComplianceService.getTodayCount(currentProperty.id),
          bookingComplianceService.getOverdueCount(currentProperty.id)
        ]);
        if (!cancelled) {
          setEnforcementToday(today);
          setEnforcementOverdue(overdue);
        }
      } catch (e) {
        if (!cancelled) {
          setEnforcementToday(0);
          setEnforcementOverdue(0);
        }
        console.error('Failed to load enforcement counts for KPI banner', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentProperty?.id]);

  const kpiMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Filter active bookings (non-cancelled) and validate data
    const activeBookings = bookings.filter(b => {
      if (!b || b.cancelled) return false;

      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      const totalAmount = parseFloat(String(b.totalAmount || 0));
      const paymentAmount = parseFloat(String(b.paymentAmount || 0));

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return false;
      if (checkIn >= checkOut) return false;
      if (totalAmount < 0 || paymentAmount < 0) return false;
      if (paymentAmount > totalAmount) return false;

      return true;
    });

    // Today's movements
    const todayCheckIns = activeBookings.filter(b => b.checkIn === today);
    const todayCheckOuts = activeBookings.filter(b => b.checkOut === today);
    const tomorrowCheckIns = activeBookings.filter(b => b.checkIn === tomorrow);

    // Current occupancy (checked-in guests)
    const currentlyOccupied = activeBookings.filter(b =>
      b.status === 'checked-in' &&
      b.checkIn <= today &&
      b.checkOut > today
    );
    const totalRooms = currentProperty?.totalRooms || 0;
    const occupancyRate = totalRooms > 0 ? (currentlyOccupied.length / totalRooms) * 100 : 0;

    // Outstanding balances
    const totalRevenue = activeBookings.reduce((sum, b) => sum + parseFloat(String(b.totalAmount || 0)), 0);
    const paidRevenue = activeBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + parseFloat(String(b.paymentAmount || b.totalAmount || 0)), 0);
    const partialRevenue = activeBookings
      .filter(b => b.paymentStatus === 'partial')
      .reduce((sum, b) => sum + parseFloat(String(b.paymentAmount || 0)), 0);
    const pendingRevenue = totalRevenue - paidRevenue - partialRevenue;
    const partialBookings = activeBookings.filter(b => b.paymentStatus === 'partial');
    const unpaidBookings = activeBookings.filter(b => b.paymentStatus === 'unpaid' || !b.paymentStatus);

    const metrics: KPIMetric[] = [
      {
        id: 'today-checkins',
        label: 'Today Check-ins',
        value: todayCheckIns.length,
        subValue: `${tomorrowCheckIns.length} tomorrow`,
        icon: <UserCheck className="w-5 h-5" />,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      },
      {
        id: 'today-checkouts',
        label: 'Today Check-outs',
        value: todayCheckOuts.length,
        icon: <Clock className="w-5 h-5" />,
        color: 'text-orange-600 bg-orange-50 border-orange-200'
      },
      {
        id: 'current-occupancy',
        label: 'Current Occupancy',
        value: currentlyOccupied.length,
        subValue: `${occupancyRate.toFixed(0)}% rate`,
        icon: <Building className="w-5 h-5" />,
        color: 'text-green-600 bg-green-50 border-green-200'
      },
      {
        id: 'pending-payments',
        label: 'Pending Payments',
        value: `₹${(pendingRevenue / 1000).toFixed(1)}k`,
        subValue: `${unpaidBookings.length + partialBookings.length} bookings`,
        icon: <CreditCard className="w-5 h-5" />,
        color: 'text-red-600 bg-red-50 border-red-200'
      }
    ];

    return metrics;
  }, [bookings, currentProperty?.totalRooms]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile Quick Stats - Only visible on mobile */}
      <div className="block sm:hidden">
        <MobileQuickStats bookings={bookings} />
      </div>

      {/* Enforcement Alerts Banner - hidden on mobile (MobileQuickStats shows compact counters) */}
      <div className="hidden sm:block">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenActions?.()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenActions?.(); }}}
          className={`rounded-lg border p-3 flex items-center gap-3 cursor-pointer ${
            enforcementToday + enforcementOverdue > 0
              ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
              : 'bg-green-50 border-green-200 hover:bg-green-100'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 ${
              enforcementToday + enforcementOverdue > 0 ? 'text-amber-600' : 'text-green-600'
            }`}
          />
          <div className="flex-1 text-sm">
            {enforcementToday + enforcementOverdue > 0 ? (
              <div className="text-amber-800">
                Enforcement alerts: <span className="font-semibold">{enforcementToday}</span> today •{' '}
                <span className="font-semibold">{enforcementOverdue}</span> overdue
              </div>
            ) : (
              <div className="text-green-800">No enforcement alerts. All good!</div>
            )}
          </div>
        </div>
      </div>

      {/* Operational KPIs - one even row on tablet+ (mobile uses MobileQuickStats) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiMetrics.map((metric) => (
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedKPIDashboard;
