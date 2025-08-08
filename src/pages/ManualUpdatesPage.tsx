import React from 'react';
import AdminAuth from '../components/AdminAuth';
import { PropertyProvider, useProperty } from '../contexts/PropertyContext';
import PropertySelector from '../components/PropertySelector';
import MobileNavigation from '../components/MobileNavigation';
import EnhancedManualUpdateDashboard from '../components/EnhancedManualUpdateDashboard';

const ManualUpdatesContent: React.FC = () => {
  const { currentProperty } = useProperty();

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNavigation
        activeTab={'manual-updates'}
        onTabChange={() => { /* route-driven; no-op here */ }}
        propertySelector={<PropertySelector compact showLabel={false} />}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xl">🛠️</span>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Overview</h2>
            </div>
            <div className="text-right text-sm text-gray-600">
              Property: <span className="font-medium text-gray-900">{currentProperty?.name || '—'}</span>
            </div>
          </div>
          <p className="text-gray-700 mt-2">Generate, review, and track manual checklists for Booking.com and GoMMT</p>
        </div>

        <EnhancedManualUpdateDashboard
          propertyId={currentProperty?.id || ''}
          platforms={[
            {
              id: 'booking.com',
              name: 'Booking.com',
              display_name: 'Booking.com',
              type: 'booking_com' as any,
              config: {},
              ical_import_url: '',
              ical_export_url: '',
              last_sync: null,
              sync_status: 'never' as any,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sync_method: 'manual' as any,
              sync_enabled: true,
              active: true as any,
              manual_update_required: true as any,
              color: '#003580',
              sync_frequency_hours: 24
            },
            {
              id: 'gommt',
              name: 'GoMMT',
              display_name: 'GoMMT',
              type: 'gommt' as any,
              config: {},
              ical_import_url: '',
              ical_export_url: '',
              last_sync: null,
              sync_status: 'never' as any,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sync_method: 'manual' as any,
              sync_enabled: true,
              active: true as any,
              manual_update_required: true as any,
              color: '#eb2226',
              sync_frequency_hours: 24
            }
          ]}
        />
      </div>
    </div>
  );
};

const ManualUpdatesPage: React.FC = () => {
  return (
    <AdminAuth>
      <PropertyProvider>
        <ManualUpdatesContent />
      </PropertyProvider>
    </AdminAuth>
  );
};

export default ManualUpdatesPage; 