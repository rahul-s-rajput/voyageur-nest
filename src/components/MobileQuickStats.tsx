import React, { useMemo } from 'react';
import { 
  UserCheck, 
  Clock, 
  Building, 
  DollarSign,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Booking } from '../types/booking';

interface MobileQuickStatsProps {
  bookings: Booking[];
  className?: string;
}

const MobileQuickStats: React.FC<MobileQuickStatsProps> = ({ bookings, className = '' }) => {
  const quickStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeBookings = bookings.filter(b => !b.cancelled);
    
    // Today's check-ins and check-outs
    const todayCheckIns = activeBookings.filter(b => b.checkIn === today);
    const todayCheckOuts = activeBookings.filter(b => b.checkOut === today);
    
    // Current occupancy
    const currentlyOccupied = activeBookings.filter(b => 
      b.status === 'checked-in' && 
      b.checkIn <= today && 
      b.checkOut > today
    );
    
    // Pending payments
    const pendingPayments = activeBookings.filter(b => 
      b.paymentStatus === 'unpaid' || b.paymentStatus === 'partial' || !b.paymentStatus
    );
    
    // Total revenue
    const totalRevenue = activeBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    
    return {
      checkIns: todayCheckIns.length,
      checkOuts: todayCheckOuts.length,
      occupied: currentlyOccupied.length,
      pendingPayments: pendingPayments.length,
      revenue: totalRevenue
    };
  }, [bookings]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Today's Overview</h3>
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Check-ins */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded">
            <UserCheck className="w-3 h-3 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Check-ins</div>
            <div className="text-sm font-semibold text-gray-900">{quickStats.checkIns}</div>
          </div>
        </div>
        
        {/* Check-outs */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-100 rounded">
            <Clock className="w-3 h-3 text-orange-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Check-outs</div>
            <div className="text-sm font-semibold text-gray-900">{quickStats.checkOuts}</div>
          </div>
        </div>
        
        {/* Occupied */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-green-100 rounded">
            <Building className="w-3 h-3 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Occupied</div>
            <div className="text-sm font-semibold text-gray-900">{quickStats.occupied}</div>
          </div>
        </div>
        
        {/* Pending Payments */}
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded ${quickStats.pendingPayments > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertCircle className={`w-3 h-3 ${quickStats.pendingPayments > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Pending</div>
            <div className={`text-sm font-semibold ${quickStats.pendingPayments > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {quickStats.pendingPayments}
            </div>
          </div>
        </div>
      </div>
      
      {/* Revenue Summary */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <DollarSign className="w-3 h-3 text-purple-600" />
            </div>
            <div className="text-xs text-gray-500">Total Revenue</div>
          </div>
          <div className="text-sm font-semibold text-purple-600">
            ₹{(quickStats.revenue / 1000).toFixed(1)}k
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileQuickStats;