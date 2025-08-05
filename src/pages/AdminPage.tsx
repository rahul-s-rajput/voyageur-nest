import React, { useState } from 'react';
import AdminAuth from '../components/AdminAuth';
import BookingManagement from '../components/BookingManagement';
import TokenManagement from '../components/TokenManagement';
import { GuestProfileList } from '../components/GuestProfileList';
import PropertyDashboard from '../components/PropertyManagement/PropertyDashboard';
import PropertySelector from '../components/PropertySelector';
import { PropertyProvider } from '../contexts/PropertyContext';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'properties' | 'guests' | 'tokens'>('bookings');

  return (
    <AdminAuth>
      <PropertyProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="mt-2 text-gray-600">Manage your hotel operations</p>
                </div>
                <div className="flex items-center space-x-4">
                  <PropertySelector />
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('bookings')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'bookings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📋 Booking Management
                </button>
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'properties'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏢 Property Management
                </button>
                <button
                  onClick={() => setActiveTab('guests')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'guests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  👥 Guest Management
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tokens'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🔐 Device Tokens
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'bookings' && <BookingManagement />}
              {activeTab === 'guests' && <GuestProfileList />}
              {activeTab === 'properties' && <PropertyDashboard />}
              {activeTab === 'tokens' && <TokenManagement />}
            </div>
          </div>
        </div>
      </PropertyProvider>
    </AdminAuth>
  );
};

export default AdminPage;