import React, { useState, useEffect } from 'react';
import AdminAuth from '../components/AdminAuth';
import BookingManagement from '../components/BookingManagement';
import TokenManagement from '../components/TokenManagement';

const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'tokens'>('bookings');

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_device_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-blue-500 text-2xl mr-3">🏨</div>
              <h1 className="text-xl font-semibold text-gray-800">
                Booking Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Admin Panel
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-t border-gray-200">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'bookings' && <BookingManagement />}
        {activeTab === 'tokens' && <TokenManagement />}
      </div>
    </div>
  );
};

export default AdminPage;