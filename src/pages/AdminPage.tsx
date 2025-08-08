import React, { useState } from 'react';
import AdminAuth from '../components/AdminAuth';
import BookingManagement from '../components/BookingManagement';
import TokenManagement from '../components/TokenManagement';
import { GuestProfileList } from '../components/GuestProfileList';
import PropertyDashboard from '../components/PropertyManagement/PropertyDashboard';
import PropertySelector from '../components/PropertySelector';
import OTACalendar from './OTACalendar';
import { PropertyProvider, useProperty } from '../contexts/PropertyContext';
import MobileNavigation from '../components/MobileNavigation';
import EnhancedManualUpdateDashboard from '../components/EnhancedManualUpdateDashboard';

const ManualUpdatesTab: React.FC = () => {
  const { currentProperty } = useProperty();
  return (
    <EnhancedManualUpdateDashboard
      propertyId={currentProperty?.id || ''}
      platforms={[] as any}
    />
  );
};

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'properties' | 'guests' | 'tokens' | 'ota-calendar' | 'manual-updates'>('bookings');

  return (
    <AdminAuth>
      <PropertyProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Mobile Navigation */}
          <MobileNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            propertySelector={<PropertySelector compact showLabel={false} />}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Desktop Tab Navigation (handled by MobileNavigation component) */}

            {/* Tab Content */}
            <div>
              {activeTab === 'bookings' && <BookingManagement />}
              {activeTab === 'guests' && <GuestProfileList />}
              {activeTab === 'properties' && <PropertyDashboard />}
              {activeTab === 'tokens' && <TokenManagement />}
              {activeTab === 'ota-calendar' && <OTACalendar />}
              {activeTab === 'manual-updates' && <ManualUpdatesTab />}
            </div>
          </div>
        </div>
      </PropertyProvider>
    </AdminAuth>
  );
};

export default AdminPage;