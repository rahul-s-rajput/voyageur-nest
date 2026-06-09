import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import RoomManagement from './RoomManagement';
import PricingManagement from './PricingManagement';
import PropertySettings from './PropertySettings';
import ExpenseManagement from './ExpenseManagement';
import GuestRecognition from './GuestRecognition';
import { Cog6ToothIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { bookingService } from '../../lib/supabase';
import ExpenseService from '../../services/expenseService';

// Single-property management hub. Reports/KPIs live in the Analytics tab;
// this tab focuses on day-to-day operations: rooms, pricing, expenses, guests.
type ManagementSection =
  | 'overview'
  | 'room-inventory'
  | 'pricing-rules'
  | 'guest-services'
  | 'expenses'
  | 'settings';

const PropertyDashboard: React.FC = () => {
  const { currentProperty, isLoading } = useProperty();
  const [activeSection, setActiveSection] = useState<ManagementSection>('overview');
  const [occupancy, setOccupancy] = useState<{ occupied: number; available: number }>({ occupied: 0, available: 0 });
  const [expenseSummary, setExpenseSummary] = useState<{
    mtd: number;
    pending: number;
    recent: Array<{ id: string; date: string; amount: number; category?: string | null; vendor?: string | null; status: string }>;
  }>({ mtd: 0, pending: 0, recent: [] });

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProperty]);

  const handleSectionChange = (section: ManagementSection) => setActiveSection(section);

  const loadDashboardData = async () => {
    if (!currentProperty) return;

    try {
      // Today's occupancy for this property (check-out is exclusive)
      const allBookings = await bookingService.getBookings();
      const today = new Date().toISOString().split('T')[0];
      const propertyBookings = allBookings.filter(b => b.propertyId === currentProperty.id);
      const occupied = propertyBookings.filter(b =>
        b.checkIn <= today &&
        b.checkOut > today &&
        (b.status === 'confirmed' || b.status === 'checked-in') &&
        !b.cancelled
      ).length;
      setOccupancy({ occupied, available: Math.max(0, currentProperty.totalRooms - occupied) });

      // Expense summary (MTD totals, pending approvals, recent)
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        const exps = await ExpenseService.listExpensesForPropertyView({ propertyId: currentProperty.id, from: start, to: end });
        const mtd = exps
          .filter(e => e.approvalStatus !== 'rejected')
          .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0))), 0);
        const pending = exps.filter(e => e.approvalStatus === 'pending').length;
        const recentAll = await ExpenseService.listExpensesForPropertyView({ propertyId: currentProperty.id });
        const recent = recentAll
          .slice(0, 5)
          .map(e => ({ id: e.id, date: e.expenseDate, amount: e.amount, category: e.categoryId || null, vendor: e.vendor || null, status: e.approvalStatus }));
        setExpenseSummary({ mtd, pending, recent });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load expense summary', e);
        setExpenseSummary({ mtd: 0, pending: 0, recent: [] });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentProperty) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12 text-gray-500">No property selected</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeSection === 'overview' ? (
          <>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentProperty.name}</h2>
                <p className="text-gray-600 mt-1">{currentProperty.address}</p>
              </div>
              <button
                onClick={() => handleSectionChange('settings')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>

            {/* Today's occupancy at a glance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{currentProperty.totalRooms}</div>
                <div className="text-sm text-blue-700">Total Rooms</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{occupancy.occupied}</div>
                <div className="text-sm text-green-700">Occupied Today</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{occupancy.available}</div>
                <div className="text-sm text-yellow-700">Available Today</div>
              </div>
            </div>

            {/* Expenses overview widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-xs text-gray-600">MTD Expenses</div>
                <div className="text-2xl font-semibold text-gray-900">₹{expenseSummary.mtd.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Excludes rejected</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-xs text-gray-600">Pending Approvals</div>
                <div className="text-2xl font-semibold text-gray-900">{expenseSummary.pending}</div>
                <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-xs text-gray-600 mb-2">Latest Expenses</div>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {expenseSummary.recent.length === 0 && (
                    <div className="text-sm text-gray-500">No recent expenses</div>
                  )}
                  {expenseSummary.recent.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div className="truncate">
                        <span className="text-gray-700">₹{r.amount.toFixed(0)}</span>
                        <span className="text-gray-500"> • {r.date}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Management sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Rooms &amp; Pricing</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSectionChange('room-inventory')}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium">Room Inventory</div>
                    <div className="text-sm text-gray-600">Manage room types and availability</div>
                  </button>
                  <button
                    onClick={() => handleSectionChange('pricing-rules')}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium">Pricing Rules</div>
                    <div className="text-sm text-gray-600">Set seasonal and dynamic pricing</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Operations</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSectionChange('guest-services')}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium">Guest Services</div>
                    <div className="text-sm text-gray-600">Handle guest requests and feedback</div>
                  </button>
                  <button
                    onClick={() => handleSectionChange('expenses')}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="font-medium">Expenses</div>
                    <div className="text-sm text-gray-600">Track expenses, approvals, and budgets</div>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Back button and section header */}
            <div className="flex items-center mb-6">
              <button
                onClick={() => handleSectionChange('overview')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Overview
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeSection === 'room-inventory' && 'Room Inventory'}
                  {activeSection === 'pricing-rules' && 'Pricing Rules'}
                  {activeSection === 'guest-services' && 'Guest Services'}
                  {activeSection === 'expenses' && 'Expenses'}
                  {activeSection === 'settings' && 'Property Settings'}
                </h2>
                <p className="text-gray-600 mt-1">{currentProperty.name}</p>
              </div>
            </div>

            {/* Active section */}
            <div className="min-h-[400px]">
              {activeSection === 'room-inventory' && <RoomManagement property={currentProperty} />}
              {activeSection === 'pricing-rules' && <PricingManagement />}
              {activeSection === 'guest-services' && <GuestRecognition />}
              {activeSection === 'expenses' && <ExpenseManagement />}
              {activeSection === 'settings' && <PropertySettings />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertyDashboard;
