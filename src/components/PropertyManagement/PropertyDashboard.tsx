import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { Property, PropertyDashboardData } from '../../types/property';
import { bookingService } from '../../lib/supabase';
import PropertyCard from './PropertyCard';
import PropertyStats from './PropertyStats';
import PropertyProfile from './PropertyProfile';
import RoomManagement from './RoomManagement';
import PricingManagement from './PricingManagement';
import PropertySettings from './PropertySettings';
import ExpenseManagement from './ExpenseManagement';
import GuestRecognition from './GuestRecognition';
import PropertyReporting from './PropertyReporting';
import AddPropertyModal from './AddPropertyModal';
import { PlusIcon, Cog6ToothIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import ExpenseService from '../../services/expenseService';

type ManagementSection = 'overview' | 'room-inventory' | 'pricing-rules' | 'maintenance' | 'staff-management' | 'guest-services' | 'reports-analytics' | 'expenses' | 'settings';

const PropertyDashboard: React.FC = () => {
  const { properties, currentProperty, isLoading, loadProperties, switchProperty } = useProperty();
  const [dashboardData, setDashboardData] = useState<PropertyDashboardData | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'individual'>('overview');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyProfile, setShowPropertyProfile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialTab, setInitialTab] = useState<'details' | 'rooms' | 'settings'>('details');
  const [loadingData, setLoadingData] = useState(false);
  const [activeSection, setActiveSection] = useState<ManagementSection>('overview');
  const [expenseSummary, setExpenseSummary] = useState<{ mtd: number; pending: number; recent: Array<{ id: string; date: string; amount: number; category?: string | null; vendor?: string | null; status: string }> }>({ mtd: 0, pending: 0, recent: [] });

  useEffect(() => {
    loadDashboardData();
  }, [currentProperty, properties]);

  const handlePropertySelect = (property: Property) => {
    // Switch to the selected property in the context
    switchProperty(property.id);
    setSelectedProperty(property);
    setInitialTab('details');
    setShowPropertyProfile(true);
  };

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setInitialTab('details');
    setShowPropertyProfile(true);
  };

  const handleManageRooms = (property: Property) => {
    setSelectedProperty(property);
    setInitialTab('rooms');
    setShowPropertyProfile(true);
  };

  const handlePropertyUpdate = (updatedProperty: Property) => {
    if (loadProperties) {
      loadProperties(); // Reload properties to reflect changes
    }
    setSelectedProperty(updatedProperty);
  };

  const handleClosePropertyProfile = () => {
    setShowPropertyProfile(false);
    setSelectedProperty(null);
  };

  const handleViewModeChange = (mode: 'overview' | 'individual') => {
    setViewMode(mode);
    setActiveSection('overview');
  };

  const handleSectionChange = (section: ManagementSection) => {
    setActiveSection(section);
  };

  const loadDashboardData = async () => {
    if (!currentProperty) return;
    
    try {
      setLoadingData(true);
      
      // Get all bookings for all properties
      const allBookings = await bookingService.getBookings();
      
      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate summary stats
      const totalRooms = properties.reduce((sum, p) => sum + p.totalRooms, 0);
      const occupiedRooms = allBookings.filter(b => 
        b.checkIn <= today && 
        b.checkOut > today && 
        (b.status === 'confirmed' || b.status === 'checked-in') && 
        !b.cancelled
      ).length;
      
      const todayCheckIns = allBookings.filter(b => 
        b.checkIn === today && 
        (b.status === 'confirmed' || b.status === 'checked-in') && 
        !b.cancelled
      ).length;
      
      const todayCheckOuts = allBookings.filter(b => 
        b.checkOut === today && 
        (b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'checked-out') && 
        !b.cancelled
      ).length;
      
      const pendingBookings = allBookings.filter(b => 
        b.status === 'pending' && 
        !b.cancelled
      ).length;

      // Calculate property breakdown
      const propertyBreakdown = properties.map(property => {
        const propertyBookings = allBookings.filter(b => b.propertyId === property.id);
        
        const occupied = propertyBookings.filter(b => 
          b.checkIn <= today && 
          b.checkOut > today && 
          (b.status === 'confirmed' || b.status === 'checked-in') && 
          !b.cancelled
        ).length;
        
        const available = property.totalRooms - occupied;
        
        const checkInsToday = propertyBookings.filter(b => 
          b.checkIn === today && 
          (b.status === 'confirmed' || b.status === 'checked-in') && 
          !b.cancelled
        ).length;
        
        const checkOutsToday = propertyBookings.filter(b => 
          b.checkOut === today && 
          (b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'checked-out') && 
          !b.cancelled
        ).length;
        
        const newBookings = propertyBookings.filter(b => {
          const bookingDate = new Date(b.bookingDate || b.createdAt);
          const todayDate = new Date(today);
          return bookingDate.toDateString() === todayDate.toDateString();
        }).length;
        
        // Calculate revenue (simplified - using total amounts)
        const todayRevenue = propertyBookings
          .filter(b => b.checkIn === today && (b.status === 'confirmed' || b.status === 'checked-in') && !b.cancelled)
          .reduce((sum, b) => sum + b.totalAmount, 0);
        
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const thisMonthRevenue = propertyBookings
          .filter(b => b.checkIn >= thisMonthStart && (b.status === 'confirmed' || b.status === 'checked-in') && !b.cancelled)
          .reduce((sum, b) => sum + b.totalAmount, 0);
        
        const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
        const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
        const lastMonthRevenue = propertyBookings
          .filter(b => b.checkIn >= lastMonthStart && b.checkIn <= lastMonthEnd && (b.status === 'confirmed' || b.status === 'checked-in') && !b.cancelled)
          .reduce((sum, b) => sum + b.totalAmount, 0);

        return {
          property,
          occupancy: {
            occupied,
            available,
            outOfOrder: 0, // This would need to come from a separate maintenance/room status system
          },
          revenue: {
            today: todayRevenue,
            thisMonth: thisMonthRevenue,
            lastMonth: lastMonthRevenue,
          },
          bookings: {
            checkInsToday,
            checkOutsToday,
            newBookings,
          },
        };
      });

      const dashboardData: PropertyDashboardData = {
        summary: {
          totalProperties: properties.length,
          totalRooms,
          occupiedRooms,
          todayCheckIns,
          todayCheckOuts,
          pendingBookings,
        },
        propertyBreakdown,
        upcomingEvents: [], // This would need to come from a separate events system
        recentActivity: [], // This would need to come from an activity log system
      };
      
      setDashboardData(dashboardData);

      // Load expense summary for current property (MTD totals, pending approvals, recent)
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        const exps = await ExpenseService.listExpenses({ propertyId: currentProperty.id, from: start, to: end });
        const mtd = exps.filter(e => e.approvalStatus !== 'rejected').reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0))), 0);
        const pending = exps.filter(e => e.approvalStatus === 'pending').length;
        const recentAll = await ExpenseService.listExpenses({ propertyId: currentProperty.id });
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
    } finally {
      setLoadingData(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Property
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => handleViewModeChange('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleViewModeChange('individual')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'individual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Individual Properties
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {viewMode === 'overview' ? (
        <div className="space-y-8">
          {/* Summary Stats */}
          {dashboardData && (
            <PropertyStats 
              summary={dashboardData.summary} 
              loading={loadingData} 
            />
          )}

          {/* Property Cards Grid */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Properties</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {dashboardData?.propertyBreakdown.map((breakdown) => (
              <PropertyCard 
                key={breakdown.property.id} 
                breakdown={breakdown}
                onClick={() => handlePropertySelect(breakdown.property)}
                onViewDetails={() => handleViewDetails(breakdown.property)}
                onManageRooms={() => handleManageRooms(breakdown.property)}
              />
            ))}
          </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Individual Property Management */}
          {currentProperty ? (
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

                  {/* Property Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{currentProperty.totalRooms}</div>
                      <div className="text-sm text-blue-700">Total Rooms</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">
                        {dashboardData?.propertyBreakdown
                          .find(b => b.property.id === currentProperty.id)
                          ?.occupancy.occupied || 0}
                      </div>
                      <div className="text-sm text-green-700">Occupied</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-900">
                        {dashboardData?.propertyBreakdown
                          .find(b => b.property.id === currentProperty.id)
                          ?.occupancy.available || 0}
                      </div>
                      <div className="text-sm text-yellow-700">Available</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-900">
                        {dashboardData?.propertyBreakdown
                          .find(b => b.property.id === currentProperty.id)
                          ?.occupancy.outOfOrder || 0}
                      </div>
                      <div className="text-sm text-red-700">Out of Order</div>
                    </div>
                  </div>

                  {/* Expenses Overview Widgets */}
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
                            <span className={`text-xs px-2 py-0.5 rounded ${r.status==='approved'?'bg-green-100 text-green-700': r.status==='rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Property Management Sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Room Management</h3>
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
                        <button 
                          onClick={() => handleSectionChange('maintenance')}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="font-medium">Maintenance Schedule</div>
                          <div className="text-sm text-gray-600">Track room maintenance and repairs</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Operations</h3>
                      <div className="space-y-2">
                        <button 
                          onClick={() => handleSectionChange('staff-management')}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="font-medium">Staff Management</div>
                          <div className="text-sm text-gray-600">Manage staff schedules and roles</div>
                        </button>
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
                        <button 
                          onClick={() => handleSectionChange('reports-analytics')}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="font-medium">Reports & Analytics</div>
                          <div className="text-sm text-gray-600">View performance metrics and insights</div>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Back Button and Section Header */}
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
                        {activeSection === 'maintenance' && 'Maintenance Schedule'}
                        {activeSection === 'staff-management' && 'Staff Management'}
                        {activeSection === 'guest-services' && 'Guest Services'}
                        {activeSection === 'reports-analytics' && 'Reports & Analytics'}
                        {activeSection === 'settings' && 'Property Settings'}
                      </h2>
                      <p className="text-gray-600 mt-1">{currentProperty.name}</p>
                    </div>
                  </div>

                  {/* Render Active Component */}
                  <div className="min-h-[400px]">
                    {activeSection === 'room-inventory' && (
                      <RoomManagement property={currentProperty} />
                    )}
                    {activeSection === 'pricing-rules' && (
                      <PricingManagement />
                    )}
                    {activeSection === 'maintenance' && (
                      <div className="text-center py-12">
                        <div className="text-gray-500">Maintenance Schedule feature coming soon...</div>
                      </div>
                    )}
                    {activeSection === 'staff-management' && (
                      <div className="text-center py-12">
                        <div className="text-gray-500">Staff Management feature coming soon...</div>
                      </div>
                    )}
                    {activeSection === 'guest-services' && (
                      <GuestRecognition />
                    )}
                        {activeSection === 'reports-analytics' && (
                      <PropertyReporting />
                    )}
                        {activeSection === 'expenses' && (
                          <ExpenseManagement />
                        )}
                    {activeSection === 'settings' && (
                      <PropertySettings />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500">No property selected</div>
            </div>
          )}
        </div>
      )}

      {/* Property Profile Modal */}
      {showPropertyProfile && selectedProperty && (
        <PropertyProfile
          property={selectedProperty}
          onUpdate={handlePropertyUpdate}
          onClose={handleClosePropertyProfile}
          initialTab={initialTab}
        />
      )}

      {/* Add Property Modal */}
       <AddPropertyModal
         isOpen={showAddModal}
         onClose={() => {
           setShowAddModal(false);
           if (loadProperties) {
             loadProperties();
           }
         }}
       />
    </div>
  );
};

export default PropertyDashboard;