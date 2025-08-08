// OTA Calendar Management Page
// Story 4.2: Main page integrating all OTA calendar components

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Bell
} from 'lucide-react';
import { OTACalendarDashboard } from '../components/OTACalendarDashboard';
import { OTAPlatformConfig } from '../components/OTAPlatformConfig';
import EnhancedManualUpdateDashboard from '../components/EnhancedManualUpdateDashboard';
import { OTAMonitoringService } from '../services/otaMonitoringService';
import { useProperty } from '../contexts/PropertyContext';
import type { MonitoringAlert, SyncHealthMetrics } from '../types/ota';

type TabType = 'dashboard' | 'config' | 'manual-updates' | 'analytics' | 'alerts';

export const OTACalendar: React.FC = () => {
  const { currentProperty } = useProperty();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<SyncHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInitialData();
    
    // Set up periodic refresh for alerts and health metrics
    const interval = setInterval(() => {
      loadAlerts();
      loadHealthMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAlerts(),
        loadHealthMetrics()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load monitoring alerts
   */
  const loadAlerts = async () => {
    try {
      const alertData = await OTAMonitoringService.checkSyncAlerts();
      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  /**
   * Load health metrics
   */
  const loadHealthMetrics = async () => {
    try {
      const metrics = await OTAMonitoringService.getSyncHealthMetrics(7);
      setHealthMetrics(metrics);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    }
  };

  /**
   * Refresh all data
   */
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Acknowledge alert
   */
  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  /**
   * Get health status color
   */
  const getHealthStatusColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get health status icon
   */
  const getHealthStatusIcon = (score?: number) => {
    if (!score) return <Clock className="w-5 h-5 text-gray-600" />;
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  /**
   * Render tab content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OTACalendarDashboard />;
      case 'config':
        return <OTAPlatformConfig />;
      case 'manual-updates':
        return <EnhancedManualUpdateDashboard 
                 propertyId={currentProperty?.id || ''} 
                 platforms={[
                   { 
                     id: 'booking.com', 
                     name: 'Booking.com', 
                     display_name: 'Booking.com',
                     type: 'booking_com',
                     config: {},
                     ical_import_url: '',
                     ical_export_url: '',
                     last_sync: null,
                     sync_status: 'never',
                     created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString(),
                     sync_method: 'manual',
                     sync_enabled: true,
                     active: true,
                     manual_update_required: true,
                     color: '#003580',
                     sync_frequency_hours: 24
                   },
                   { 
                     id: 'gommt', 
                     name: 'GoMMT', 
                     display_name: 'GoMMT',
                     type: 'gommt',
                     config: {},
                     ical_import_url: '',
                     ical_export_url: '',
                     last_sync: null,
                     sync_status: 'never',
                     created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString(),
                     sync_method: 'manual',
                     sync_enabled: true,
                     active: true,
                     manual_update_required: true,
                     color: '#eb2226',
                     sync_frequency_hours: 24
                   }
                 ]} 
               />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'alerts':
        return <AlertsTab />;
      default:
        return <OTACalendarDashboard />;
    }
  };

  /**
   * Analytics tab component
   */
  const AnalyticsTab = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
          OTA Analytics & Reports
        </h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>
      
      {healthMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Health Score</p>
                <p className={`text-2xl font-bold ${getHealthStatusColor(healthMetrics.overallHealthScore)}`}>
                  {healthMetrics.overallHealthScore ?? '--'}%
                </p>
              </div>
              {getHealthStatusIcon(healthMetrics.overallHealthScore)}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sync Success Rate</p>
                <p className={`text-2xl font-bold ${getHealthStatusColor(healthMetrics.syncSuccessRate)}`}>
                  {healthMetrics.syncSuccessRate ?? '--'}%
                </p>
              </div>
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conflict Resolution</p>
                <p className={`text-2xl font-bold ${getHealthStatusColor(healthMetrics.conflictResolutionRate)}`}>
                  {healthMetrics.conflictResolutionRate ?? '--'}%
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center text-gray-500 py-12">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Detailed analytics charts will be implemented here</p>
        <p className="text-sm">Including sync trends, platform performance, and conflict analysis</p>
      </div>
    </div>
  );

  /**
   * Alerts tab component
   */
  const AlertsTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
            System Alerts
          </h3>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {alerts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <p>No active alerts</p>
            <p className="text-sm">All systems are operating normally</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.acknowledged 
                    ? 'bg-gray-50 border-gray-200' 
                    : alert.severity === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {alert.severity === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        alert.acknowledged ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {alert.message}
                      </p>
                      {alert.platformName && (
                        <p className="text-sm text-gray-500 mt-1">
                          Platform: {alert.platformName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(alert.timestamp || alert.triggered_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading OTA Calendar...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">OTA Calendar Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-gray-600 text-sm">System</div>
              <div className="text-gray-900 font-semibold">Health: <span className="text-gray-600">-</span></div>
            </div>
            <div className="flex items-center text-orange-600">
              <AlertTriangle className="w-5 h-5 mr-1" />
              <span className="font-medium">{alerts.length} Alert(s)</span>
            </div>
          </div>
        </div>
        <p className="text-gray-700 mt-2">Manage calendar synchronization across all OTA platforms</p>
      </div>
 
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mt-4 md:mt-6">
        <div className="flex space-x-4 md:space-x-6 mb-4 md:mb-6 border-b pb-2 overflow-x-auto no-scrollbar">
          <button 
            className={`flex items-center space-x-2 px-3 py-2 rounded ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar Dashboard</span>
          </button>
          <button 
            className={`flex items-center space-x-2 px-3 py-2 rounded ${activeTab === 'config' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings className="w-4 h-4" />
            <span>Platform Config</span>
          </button>
          <button 
            className={`flex items-center space-x-2 px-3 py-2 rounded ${activeTab === 'manual-updates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('manual-updates')}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Manual Updates</span>
          </button>
          <button 
            className={`flex items-center space-x-2 px-3 py-2 rounded ${activeTab === 'analytics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <button 
            className={`flex items-center space-x-2 px-3 py-2 rounded ${activeTab === 'alerts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
          </button>
        </div>
 
        {renderTabContent()}
      </div>
    </div>
  );
};

export default OTACalendar;