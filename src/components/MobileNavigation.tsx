import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useProperty } from '../contexts/PropertyContext';

type AdminTab = 'bookings' | 'properties' | 'guests' | 'tokens' | 'ota-calendar' | 'manual-updates' | 'menu' | 'notifications-settings' | 'analytics';

interface MobileNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  propertySelector?: React.ReactNode;
}

type NavId = Exclude<AdminTab, 'notifications-settings'>;

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, onTabChange, propertySelector }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems: { id: NavId | 'notifications-settings'; label: string; icon: string; description: string }[] = [
    {
      id: 'bookings' as const,
      label: 'Booking Management',
      icon: '📋',
      description: 'Manage reservations and bookings'
    },
    {
      id: 'properties' as const,
      label: 'Property Management',
      icon: '🏢',
      description: 'Manage properties and rooms'
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: '📊',
      description: 'View reports and analytics'
    },
    {
      id: 'guests' as const,
      label: 'Guest Management',
      icon: '👥',
      description: 'Manage guest profiles and information'
    },
    {
      id: 'tokens' as const,
      label: 'Device Tokens',
      icon: '🔐',
      description: 'Manage device access tokens'
    },
    {
      id: 'ota-calendar' as const,
      label: 'OTA Calendar',
      icon: '📅',
      description: 'Manage OTA calendar synchronization'
    },
    {
      id: 'manual-updates' as const,
      label: 'Manual Updates',
      icon: '🛠️',
      description: 'Generate and track manual OTA updates'
    }
    ,
    {
      id: 'notifications-settings' as any,
      label: 'Notifications',
      icon: '🔔',
      description: 'Configure in‑app, email and SMS notifications'
    },
    {
      id: 'menu' as const,
      label: 'Menu',
      icon: '🍽️',
      description: 'Manage F&B menu (categories & items)'
    }
  ];

  const handleTabSelect = (tabId: AdminTab) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  const currentItem = navigationItems.find(item => item.id === activeTab);

  // Keep provider hierarchy; avoid unused variable warning by destructuring nothing
  useProperty();

  return (
    <>
      {/* Mobile Header with Menu Button and Property Selector */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-xl flex-shrink-0">{currentItem?.icon}</span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">{currentItem?.label}</h1>
                <p className="text-xs text-gray-500 truncate">{currentItem?.description}</p>
              </div>
            </div>
          </div>
          {propertySelector && (
            <div className="flex-shrink-0 ml-4">
              {propertySelector}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors
                      ${activeTab === item.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              {propertySelector && (
                <div className="flex-shrink-0">
                  {propertySelector}
                </div>
              )}
              {/* Global notifications bell in header (no property filter) */}
              <NotificationCenter />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Side Navigation Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Side Navigation Panel */}
          <div className="relative flex flex-col w-80 max-w-xs bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-4 py-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-start space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      activeTab === item.id ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      {item.label}
                    </p>
                    <p className={`text-xs mt-1 ${
                      activeTab === item.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                  {activeTab === item.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 text-center">
                Voyageur Nest Admin Panel
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;