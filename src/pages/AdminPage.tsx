import React, { useEffect, useMemo, useState } from 'react';
import AdminAuth from '../components/AdminAuth';
import BookingManagement from '../components/BookingManagement';
import TokenManagement from '../components/TokenManagement';
import { GuestProfileList } from '../components/GuestProfileList';
import PropertyDashboard from '../components/PropertyManagement/PropertyDashboard';
import NotificationSettings from '../components/NotificationSettings';
import PropertySelector from '../components/PropertySelector';
import { PropertyProvider, useProperty } from '../contexts/PropertyContext';
import MobileNavigation from '../components/MobileNavigation';
import AnalyticsWrapper from '../components/Analytics/AnalyticsWrapper';
import { useLocation, useNavigate } from 'react-router-dom';

// Settings tab — consolidates Notifications + Device Tokens (a single property
// doesn't need these as separate top-level tabs).
const SettingsTab: React.FC = () => {
  const { currentProperty } = useProperty();
  const [section, setSection] = useState<'notifications' | 'tokens'>('notifications');
  const sections = [
    { id: 'notifications' as const, label: 'Notifications' },
    { id: 'tokens' as const, label: 'Device Tokens' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      <div className="flex gap-2 border-b">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              section === s.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === 'notifications' && <NotificationSettings propertyId={currentProperty?.id || ''} />}
      {section === 'tokens' && <TokenManagement />}
    </div>
  );
};

const AdminPage: React.FC = () => {
  type AdminTab = 'bookings' | 'properties' | 'analytics' | 'guests' | 'menu' | 'settings';

  const location = useLocation();
  const navigate = useNavigate();

  const allTabs: AdminTab[] = useMemo(
    () => ['bookings', 'properties', 'analytics', 'guests', 'menu', 'settings'],
    []
  );

  const getTabFromPath = (pathname: string): AdminTab | null => {
    const seg = pathname.split('/')[2];
    if (!seg) return null;
    return (allTabs.includes(seg as AdminTab) ? (seg as AdminTab) : null);
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    // Prefer tab from URL if present; otherwise use saved tab or default.
    const initialFromRoute = getTabFromPath(window.location.pathname);
    const saved = (localStorage.getItem('admin_active_tab') as AdminTab);
    // Guard against stale saved tabs (e.g. a now-removed 'ota-calendar').
    const savedValid = allTabs.includes(saved) ? saved : 'bookings';
    return initialFromRoute ?? savedValid;
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
          {/* Navigation (desktop tabs + mobile drawer) */}
          <MobileNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            propertySelector={<PropertySelector compact showLabel={false} />}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Content */}
            <div>
              {activeTab === 'bookings' && <BookingManagement />}
              {activeTab === 'guests' && <GuestProfileList />}
              {activeTab === 'properties' && <PropertyDashboard />}
              {activeTab === 'analytics' && <AnalyticsWrapper />}
              {activeTab === 'settings' && <SettingsTab />}
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
