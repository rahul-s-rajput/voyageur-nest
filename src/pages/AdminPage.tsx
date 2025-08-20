import React, { useEffect, useMemo, useState } from 'react';
import AdminAuth from '../components/AdminAuth';
import BookingManagement from '../components/BookingManagement';
import TokenManagement from '../components/TokenManagement';
import { GuestProfileList } from '../components/GuestProfileList';
import PropertyDashboard from '../components/PropertyManagement/PropertyDashboard';
import NotificationSettings from '../components/NotificationSettings';
import PropertySelector from '../components/PropertySelector';
import OTACalendar from './OTACalendar';
import { PropertyProvider, useProperty } from '../contexts/PropertyContext';
import MobileNavigation from '../components/MobileNavigation';
import EnhancedManualUpdateDashboard from '../components/EnhancedManualUpdateDashboard';
import AnalyticsWrapper from '../components/Analytics/AnalyticsWrapper';
import { useLocation, useNavigate } from 'react-router-dom';

const ManualUpdatesTab: React.FC = () => {
  const { currentProperty } = useProperty();
  return (
    <EnhancedManualUpdateDashboard
      propertyId={currentProperty?.id || ''}
      platforms={[] as any}
    />
  );
};

const NotificationsSettingsTab: React.FC = () => {
  const { currentProperty } = useProperty();
  return (
    <NotificationSettings propertyId={currentProperty?.id || ''} />
  );
};

const AdminPage: React.FC = () => {
  type AdminTab = 'bookings' | 'properties' | 'guests' | 'tokens' | 'ota-calendar' | 'manual-updates' | 'menu' | 'notifications-settings' | 'analytics';

  const location = useLocation();
  const navigate = useNavigate();

  const allTabs: AdminTab[] = useMemo(
    () => ['bookings', 'properties', 'analytics', 'guests', 'tokens', 'ota-calendar', 'manual-updates', 'menu', 'notifications-settings'],
    []
  );

  const getTabFromPath = (pathname: string): AdminTab | null => {
    const seg = pathname.split('/')[2];
    if (!seg) return null;
    return (allTabs.includes(seg as AdminTab) ? (seg as AdminTab) : null);
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    // Prefer tab from URL if present; otherwise use saved tab or default
    const initialFromRoute = getTabFromPath(window.location.pathname);
    const saved = (localStorage.getItem('admin_active_tab') as AdminTab) || 'bookings';
    return initialFromRoute ?? saved ?? 'bookings';
  });

  // Keep activeTab in sync with URL
  useEffect(() => {
    const tabFromRoute = getTabFromPath(location.pathname);
    if (tabFromRoute && tabFromRoute !== activeTab) {
      setActiveTab(tabFromRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Persist tab and ensure URL reflects it on user-initiated changes
  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
    const desiredPath = activeTab === 'bookings' ? '/admin' : `/admin/${activeTab}`;
    if (location.pathname !== desiredPath) {
      navigate(desiredPath, { replace: false });
    }
  }, [activeTab, location.pathname, navigate]);

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
              {activeTab === 'analytics' && <AnalyticsWrapper />}
              {activeTab === 'tokens' && <TokenManagement />}
              {activeTab === 'ota-calendar' && <OTACalendar />}
              {activeTab === 'manual-updates' && <ManualUpdatesTab />}
              {activeTab === 'notifications-settings' && <NotificationsSettingsTab />}
              {activeTab === 'menu' && (
                // Lazy import to avoid initial bundle growth
                <React.Suspense fallback={<div>Loading menu…</div>}>
                  {React.createElement(React.lazy(() => import('../components/FnB/MenuManagement')))}
                </React.Suspense>
              )}
            </div>
          </div>
        </div>
      </PropertyProvider>
    </AdminAuth>
  );
};

export default AdminPage;