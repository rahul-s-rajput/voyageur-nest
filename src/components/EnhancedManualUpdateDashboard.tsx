import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, RefreshCw, Settings, Download, Bell, Cog } from 'lucide-react';
import BulkFormatPanel from './BulkFormatPanel';
import NotificationCenter from './NotificationCenter';
import PlatformConfigPanel from './PlatformConfigPanel';
import { ReminderManagement } from './manual-updates/ReminderManagement';
import { ManualUpdateService } from '../services/manualUpdateService';
import { BulkUpdateFormat } from '../services/bulkFormatService';
import { ManualUpdateChecklist, OTABooking, OTAPlatform } from '../types/ota';
import { supabase } from '../lib/supabase';

interface EnhancedManualUpdateDashboardProps {
  propertyId: string;
  platforms: OTAPlatform[];
}

interface PlatformStats {
  platform: string;
  pendingUpdates: number;
  lastUpdate: string;
  estimatedTime: number;
  status: 'up-to-date' | 'needs-update' | 'overdue';
}

const EnhancedManualUpdateDashboard: React.FC<EnhancedManualUpdateDashboardProps> = ({
  propertyId,
  platforms
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'booking.com' | 'gommt' | 'notifications' | 'config' | 'reminders'>('overview');
  const [checklists, setChecklists] = useState<ManualUpdateChecklist[]>([]);
  const [bookings, setBookings] = useState<OTABooking[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'booking.com' | 'gommt'>('booking.com');
  const [platformMap, setPlatformMap] = useState<Record<string, string>>({}); // platform_id -> canonical label
  const [statusFilter, setStatusFilter] = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [hideSetupSteps, setHideSetupSteps] = useState<boolean>(true);

  // Load data on component mount
  useEffect(() => {
    if (propertyId) {
      loadDashboardData();
    }
  }, [propertyId, statusFilter]);

  const loadDashboardData = async () => {
    if (!propertyId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Load platform map (property-specific first, then global)
      const labels: Record<string, string> = {};
      const normalize = (n?: string) => (n || '').toLowerCase();
      const labelFromName = (n: string) => normalize(n).includes('booking') ? 'booking.com' : (normalize(n).includes('gommt') || normalize(n).includes('makemytrip') ? 'gommt' : normalize(n));

      const { data: propPlatforms } = await supabase
        .from('ota_platforms')
        .select('id, name, display_name, is_active')
        .eq('is_active', true)
        .eq('property_id', propertyId);
      (propPlatforms || []).forEach(p => { labels[p.id as unknown as string] = labelFromName((p.display_name || p.name) as string); });

      const { data: globalPlatforms } = await supabase
        .from('ota_platforms')
        .select('id, name, display_name, is_active')
        .eq('is_active', true)
        .is('property_id', null);
      (globalPlatforms || []).forEach(p => { if (!labels[p.id as unknown as string]) labels[p.id as unknown as string] = labelFromName((p.display_name || p.name) as string); });

      setPlatformMap(labels);

      // Load checklists for this property with optional status filter
      const fetched = statusFilter === 'all'
        ? await ManualUpdateService.getChecklistsForProperty(propertyId)
        : await ManualUpdateService.getChecklistsForProperty(propertyId, statusFilter);
      setChecklists(fetched);

      // Calculate platform statistics from freshly fetched data
      const stats = calculatePlatformStats(fetched, labels);
      setPlatformStats(stats);

      // Load recent bookings for bulk format generation
      // This would typically come from your booking service
      const recentBookings = await loadRecentBookings(propertyId);
      setBookings(recentBookings);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getChecklistPlatformKey = (checklist: ManualUpdateChecklist): 'booking.com' | 'gommt' | null => {
    const v: any = (checklist as any).ota_platforms;
    const norm = (s: string) => s.toLowerCase();
    const fromString = (s: string) => norm(s).includes('booking') ? 'booking.com' : (norm(s).includes('gommt') || norm(s).includes('makemytrip') ? 'gommt' : null);
    if (Array.isArray(v) && v.length > 0) {
      if (typeof v[0] === 'string') return fromString(v[0]) as any;
      if (typeof v[0] === 'object' && v[0]?.name) return fromString(v[0].name) as any;
    }
    if (!Array.isArray(v) && v && typeof v === 'object' && v.name) return fromString(v.name) as any;
    if (checklist.platform_id && platformMap[checklist.platform_id]) return platformMap[checklist.platform_id] as any;
    return null;
  };

  const calculatePlatformStats = (checklists: ManualUpdateChecklist[], labelsMap: Record<string, string>): PlatformStats[] => {
    const manualPlatforms = ['booking.com', 'gommt'];
    
    return manualPlatforms.map(platform => {
      // Filter checklists by platform (using platform_id or other identifier)
      const platformChecklists = checklists.filter(c => getChecklistPlatformKey(c) === (platform as any));
      
      const pendingUpdates = platformChecklists.reduce((sum, c) => 
        sum + (c.checklist_items?.filter(item => !(item as any).completed).length || 0), 0
      );
      
      const lastUpdate = platformChecklists.length > 0 
        ? platformChecklists[0].updated_at 
        : new Date().toISOString();
      
      const estimatedTime = platformChecklists.reduce((sum, c) => 
        sum + (c.estimated_duration || 0), 0
      );

      // Determine status based on last update and pending items
      let status: 'up-to-date' | 'needs-update' | 'overdue' = 'up-to-date';
      const hoursSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
      
      if (pendingUpdates > 0) {
        status = hoursSinceUpdate > 24 ? 'overdue' : 'needs-update';
      }

      return {
        platform,
        pendingUpdates,
        lastUpdate,
        estimatedTime,
        status
      };
    });
  };

  const loadRecentBookings = async (propertyId: string): Promise<OTABooking[]> => {
    // Mock implementation - replace with actual booking service call
    return [
      {
        id: '1',
        guest_name: 'John Doe',
        room_no: 'D101',
        check_in: '2024-01-15',
        check_out: '2024-01-18',
        no_of_pax: 2,
        adult_child: '2+0',
        status: 'confirmed',
        cancelled: false,
        total_amount: 300,
        payment_status: 'paid',
        ota_sync_status: 'pending',
        source: 'ota',
        ota_platform_id: 'booking_com',
        ota_booking_id: 'BK123456',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        guest_name: 'Jane Smith',
        room_no: 'S201',
        check_in: '2024-01-20',
        check_out: '2024-01-22',
        no_of_pax: 1,
        adult_child: '1+0',
        status: 'confirmed',
        cancelled: false,
        total_amount: 200,
        payment_status: 'paid',
        ota_sync_status: 'pending',
        source: 'ota',
        ota_platform_id: 'gommt',
        ota_booking_id: 'MMT789012',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  };

  const generateDailyChecklist = async (platform: string) => {
    try {
      // Resolve platform UUID by name keywords (property-specific first, fallback to global)
      const keyword = platform === 'booking.com' ? 'booking' : 'gommt';
      let resolvedId: string | null = null;

      // Try property-specific
      if (propertyId) {
        const { data: propSpecific } = await supabase
          .from('ota_platforms')
          .select('id, name, display_name, is_active, manual_update_required')
          .eq('property_id', propertyId)
          .eq('is_active', true)
          .eq('manual_update_required', true);

        const match = (propSpecific || []).find(p => (p.name || '').toLowerCase().includes(keyword) || (p.display_name || '').toLowerCase().includes(keyword));
        if (match) {
          resolvedId = match.id as unknown as string;
        }
      }

      // Fallback to global
      if (!resolvedId) {
        const { data: global } = await supabase
          .from('ota_platforms')
          .select('id, name, display_name, is_active, manual_update_required')
          .is('property_id', null)
          .eq('is_active', true)
          .eq('manual_update_required', true);

        const match = (global || []).find(p => (p.name || '').toLowerCase().includes(keyword) || (p.display_name || '').toLowerCase().includes(keyword));
        if (match) {
          resolvedId = match.id as unknown as string;
        }
      }

      if (!resolvedId) {
        throw new Error('Platform not found');
      }

      await ManualUpdateService.generateChecklist(
        resolvedId,
        propertyId,
        {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      );
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error generating daily checklist:', error);
    }
  };

  const handleBulkFormatGenerated = (format: BulkUpdateFormat) => {
    console.log('Bulk format generated:', format);
    // You could show a success notification here
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up-to-date': return 'text-green-600 bg-green-100';
      case 'needs-update': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up-to-date': return <CheckCircle className="w-4 h-4" />;
      case 'needs-update': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredBookings = bookings.filter(booking => 
    activeTab === 'overview' || booking.ota_platform_id === activeTab
  );

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Property Selected</h3>
          <p className="text-sm md:text-base text-gray-600">Please select a property to view manual update dashboard</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm md:text-base text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-2 md:p-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Manual Update Dashboard</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage manual updates for Booking.com and GoMMT platforms
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
          >
            <Download className="w-4 h-4" />
            <span>Bulk Format</span>
          </button>
          <div className="hidden md:flex items-center space-x-2">
            <label className="text-sm text-gray-600">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {platformStats.map((stat) => (
          <div key={stat.platform} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 capitalize">
                {stat.platform === 'booking.com' ? 'Booking.com' : 'GoMMT'}
              </h3>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stat.status)}`}>
                {getStatusIcon(stat.status)}
                <span className="capitalize">{stat.status.replace('-', ' ')}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Updates:</span>
                <span className="font-medium">{stat.pendingUpdates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Time:</span>
                <span className="font-medium">{stat.estimatedTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="font-medium text-sm">
                  {new Date(stat.lastUpdate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => generateDailyChecklist(stat.platform)}
              className="w-full mt-4 px-3 py-2 md:px-4 md:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
            >
              Generate Checklist
            </button>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto whitespace-nowrap no-scrollbar">
          {[
            { key: 'overview', label: 'Overview', icon: Calendar },
            { key: 'booking.com', label: 'Booking.com', icon: null },
            { key: 'gommt', label: 'GoMMT', icon: null },
            { key: 'notifications', label: 'Notifications', icon: Bell },
            { key: 'config', label: 'Configuration', icon: Settings },
            { key: 'reminders', label: 'Reminders', icon: Cog }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key !== 'overview' && (tab.key === 'booking.com' || tab.key === 'gommt')) {
                  setSelectedPlatform(tab.key as 'booking.com' | 'gommt');
                }
              }}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm md:text-base transition-colors flex items-center gap-2
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'notifications' && (
        <NotificationCenter propertyId={propertyId} />
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          <PlatformConfigPanel 
            propertyId={propertyId} 
            platform={selectedPlatform || 'booking.com'} 
          />
          <div className="bg-white rounded-lg shadow p-4 md:p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Maintenance</h3>
            <p className="text-sm text-gray-600 mb-4">Quickly clear manual update checklists for testing or cleanup.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={async () => {
                  const count = await ManualUpdateService.deleteChecklists({ propertyId });
                  console.log('Deleted checklists:', count);
                  await loadDashboardData();
                }}
                className="px-4 py-2 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              >
                Delete ALL checklists for this property
              </button>
              <button
                onClick={async () => {
                  // Resolve selected platform ID if possible
                  try {
                    const { data: platform } = await supabase
                      .from('ota_platforms')
                      .select('id, name, display_name')
                      .eq('property_id', propertyId)
                      .ilike('name', selectedPlatform === 'booking.com' ? '%booking%' : '%mmt%')
                      .maybeSingle();
                    const platformId = platform?.id;
                    const count = await ManualUpdateService.deleteChecklists({ propertyId, platformId });
                    console.log('Deleted platform checklists:', count);
                    await loadDashboardData();
                  } catch (e) {
                    console.error('Failed to delete platform-specific checklists', e);
                  }
                }}
                className="px-4 py-2 rounded bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200"
              >
                Delete {selectedPlatform} checklists
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <ReminderManagement propertyId={propertyId} />
      )}

      {/* Bulk Format Panel */}
      {showBulkPanel && (activeTab === 'booking.com' || activeTab === 'gommt') && (
        <BulkFormatPanel
          platform={selectedPlatform}
          bookings={filteredBookings}
          onFormatGenerated={handleBulkFormatGenerated}
        />
      )}

      {/* Checklists - Only show for overview and platform tabs */}
      {(activeTab === 'overview' || activeTab === 'booking.com' || activeTab === 'gommt') && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="all">All</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded" checked={hideSetupSteps} onChange={(e) => setHideSetupSteps(e.target.checked)} />
              Hide setup/navigation steps
            </label>
          </div>
          <div className="space-y-3 md:space-y-4">
            {checklists
              .filter(checklist => {
                if (activeTab === 'overview') return true;
                const key = getChecklistPlatformKey(checklist);
                return key === (activeTab as any);
              })
              .filter(c => statusFilter === 'all' ? true : c.status === statusFilter)
              .map((checklist) => (
                <div key={checklist.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {(() => {
                          const key = getChecklistPlatformKey(checklist);
                          const label = key || 'Manual Update';
                          return `${label} Checklist`;
                        })()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created: {new Date(checklist.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600">
                        {(checklist.checklist_items || []).filter(item => (item as any)?.completed).length} / {checklist.checklist_items?.length || 0} completed
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{checklist.estimated_duration || 0} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(checklist.checklist_items || [])
                      .filter((item) => hideSetupSteps ? !['setup', 'navigation'].includes((item as any).category) : true)
                      .map((item, index) => (
                        <div key={item.id || index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={(item as any).completed === true}
                            onChange={async () => {
                              try {
                                const nextStatus = (item as any).completed ? 'pending' : 'completed';
                                const itemId = (item as any).id || String(index);
                                await ManualUpdateService.updateChecklistItem(checklist.id, itemId, nextStatus as any);
                                const updated = await ManualUpdateService.getChecklist(checklist.id);
                                if (updated) {
                                  setChecklists(prev => prev.map(c => c.id === checklist.id ? updated : c));
                                }
                              } catch (e) {
                                console.error('Failed to update checklist item', e);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {(() => {
                                // Try to emphasize structured parts if present in description format "Room: X | Dates: A → B | Set: Y"
                                const desc = String(item.description || '');
                                const parts = desc.split(' | ');
                                if (parts.length >= 2) {
                                  return (
                                    <span>
                                      {parts.map((p, i) => {
                                        const [label, val] = p.includes(':') ? [p.split(':')[0].trim(), p.split(':').slice(1).join(':').trim()] : ['', p];
                                        return (
                                          <span key={i} className="inline-flex items-center gap-1 mr-2">
                                            {label && <span className="text-gray-500">{label}:</span>}
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-xs md:text-[0.8rem]">{val}</span>
                                          </span>
                                        );
                                      })}
                                    </span>
                                  );
                                }
                                return desc;
                              })()}
                            </p>
                            {item.instructions && (
                              <p className="text-xs text-gray-600 mt-1">
                                {Array.isArray(item.instructions)
                                  ? (item.instructions as string[]).join(' · ')
                                  : String(item.instructions)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{item.estimated_minutes || 0} min</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>

          {checklists.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No checklists found</h3>
              <p className="text-gray-600 mb-4">
                Generate daily checklists for your manual update platforms
              </p>
              <button
                onClick={() => generateDailyChecklist('booking.com')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Checklist
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedManualUpdateDashboard;