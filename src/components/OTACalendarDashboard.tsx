// OTA Calendar Dashboard Component
// Story 4.2: Task 5 - OTA Calendar Dashboard

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  AlertTriangle, 
  Eye,
  EyeOff,
  Download,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ICalService } from '../services/icalService';
import { ManualUpdateService } from '../services/manualUpdateService';
import type { 
  CalendarDashboardData, 
  OTAPlatform, 
  CalendarConflict, 
  OTABooking,
  ManualUpdateChecklist,
  CalendarEvent,
  CalendarView,
  FilterOptions
} from '../types/ota';

const localizer = momentLocalizer(moment);

interface OTACalendarDashboardProps {
  propertyId?: string;
  multiProperty?: boolean;
}

export const OTACalendarDashboard: React.FC<OTACalendarDashboardProps> = ({
  propertyId,
  multiProperty = false
}) => {
  // State management
  const [dashboardData, setDashboardData] = useState<CalendarDashboardData | null>(null);
  const [platforms, setPlatforms] = useState<OTAPlatform[]>([]);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [checklists, setChecklists] = useState<ManualUpdateChecklist[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [filters] = useState<FilterOptions>({
    platforms: [],
    showResolved: false
  });
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<string>>(new Set());

  /**
   * Load dashboard overview data
   */
  const loadDashboardData = useCallback(async () => {
    try {
      const data: CalendarDashboardData = {
        properties: [],
        platforms: [],
        recent_syncs: [],
        active_conflicts: [],
        pending_checklists: [],
        total_properties: 0,
        total_platforms: 0,
        active_syncs: 0,
        pending_conflicts: 0,
        last_sync_status: 'success',
        sync_health_score: 0,
        manual_updates_pending: 0
      };

      // Get properties count
      const { data: properties } = await supabase
        .from('properties')
        .select('id', { count: 'exact' });
      data.total_properties = properties?.length || 0;

      // Get platforms count
      const { data: platformsData } = await supabase
        .from('ota_platforms')
        .select('id', { count: 'exact' })
        .eq('is_active', true);
      data.total_platforms = platformsData?.length || 0;

      // Get active syncs
      const { data: activeSyncs } = await supabase
        .from('ota_sync_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');
      data.active_syncs = activeSyncs?.length || 0;

      // Get pending conflicts
      const { data: pendingConflicts } = await supabase
        .from('calendar_conflicts')
        .select('id', { count: 'exact' })
        .eq('status', 'detected');
      data.pending_conflicts = pendingConflicts?.length || 0;

      // Get manual updates pending
      const { data: manualUpdates } = await supabase
        .from('manual_update_checklists')
        .select('id', { count: 'exact' })
        .in('status', ['pending', 'in_progress']);
      data.manual_updates_pending = manualUpdates?.length || 0;

      // Calculate sync health score
      data.sync_health_score = calculateSyncHealthScore(data);

      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, []);

  /**
   * Load OTA platforms
   */
  const loadPlatforms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
      
      // Initialize visible platforms
      const platformIds = new Set(data?.map(p => p.id) || []);
      setVisiblePlatforms(platformIds);
    } catch (error) {
      console.error('Error loading platforms:', error);
    }
  }, []);

  /**
   * Load calendar conflicts
   */
  const loadConflicts = useCallback(async () => {
    try {
      let query = supabase
        .from('calendar_conflicts')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertyId && !multiProperty) {
        query = query.eq('property_id', propertyId);
      }

      if (!filters.showResolved) {
        query = query.neq('status', 'resolved');
      }

      const { data, error } = await query;
      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    }
  }, [filters.showResolved]);

  /**
   * Load manual update checklists
   */
  const loadChecklists = useCallback(async () => {
    try {
      let query = supabase
        .from('manual_update_checklists')
        .select(`
          *,
          ota_platforms(name),
          properties(name)
        `)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (propertyId && !multiProperty) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Error loading checklists:', error);
    }
  }, [propertyId, multiProperty]);

  /**
   * Load calendar events
   */
  const loadCalendarEvents = useCallback(async () => {
    try {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      let query = supabase
        .from('bookings')
        .select(`
          *,
          properties(name)
        `)
        .eq('cancelled', false)
        .gte('check_in', format(startDate, 'yyyy-MM-dd'))
        .lte('check_out', format(endDate, 'yyyy-MM-dd'));

      if (propertyId && !multiProperty) {
        query = query.eq('property_id', propertyId);
      }

      const { data: bookings, error } = await query;
      if (error) throw error;

      // Convert bookings to calendar events
      const calendarEvents: CalendarEvent[] = (bookings || []).map(booking => ({
        id: booking.id,
        title: `${booking.guest_name} - Room ${booking.room_no}`,
        start: new Date(booking.check_in),
        end: new Date(booking.check_out),
        resource: {
          booking,
          platform: booking.ota_platform_id,
          property: booking.property_id,
          conflict: conflicts.find(c => 
            c.booking_id_1 === booking.id || c.booking_id_2 === booking.id
          )
        }
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, propertyId, multiProperty, conflicts]);

  /**
   * Calculate sync health score
   */
  const calculateSyncHealthScore = (data: CalendarDashboardData): number => {
    const factors = {
      conflicts: Math.max(0, 100 - ((data.pending_conflicts || 0) * 10)),
      activeSyncs: (data.active_syncs || 0) > 0 ? 80 : 100,
      manualUpdates: Math.max(0, 100 - ((data.manual_updates_pending || 0) * 5))
    };

    return Math.round(
      (factors.conflicts + factors.activeSyncs + factors.manualUpdates) / 3
    );
  };

  /**
   * Trigger manual sync for a platform
   */
  const triggerSync = async (platformId: string) => {
    setSyncing(platformId);
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) throw new Error('Platform not found');

      if (platform.sync_method === 'ical') {
        // Trigger iCal sync
        if (platform.ical_import_url) {
          const icalData = await ICalService.fetchICalFromURL(platform.ical_import_url);
          await ICalService.parseOTACalendar(icalData, platformId, propertyId || '');
        }
      } else {
        // Generate manual checklist
        await ManualUpdateService.generateChecklist(platformId, propertyId || '');
      }

      await loadDashboardData();
      await loadConflicts();
      await loadChecklists();
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setSyncing(null);
    }
  };

  /**
   * Export calendar data
   */
  const exportCalendar = async (platformId: string) => {
    try {
      const icalData = await ICalService.generatePropertyCalendar(
        propertyId || '',
        platformId
      );
      
      // Create download link
      const blob = new Blob([icalData], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendar-${platformId}-${format(new Date(), 'yyyy-MM-dd')}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting calendar:', error);
    }
  };

  /**
   * Toggle platform visibility
   */
  const togglePlatformVisibility = (platformId: string) => {
    const newVisible = new Set(visiblePlatforms);
    if (newVisible.has(platformId)) {
      newVisible.delete(platformId);
    } else {
      newVisible.add(platformId);
    }
    setVisiblePlatforms(newVisible);
  };

  /**
   * Event style getter for calendar
   */
  const eventStyleGetter = (event: CalendarEvent) => {
    const { resource } = event;
    let backgroundColor = '#3174ad';
    
    if (resource?.conflict) {
      backgroundColor = '#dc3545'; // Red for conflicts
    } else if (resource?.platform) {
      const platform = platforms.find(p => p.id === resource.platform);
      backgroundColor = platform?.color || '#3174ad';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: visiblePlatforms.has(resource?.platform || '') ? 1 : 0.3,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  /**
   * Filtered events based on visibility settings
   */
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const platformId = event.resource?.platform;
      return !platformId || visiblePlatforms.has(platformId);
    });
  }, [events, visiblePlatforms]);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadPlatforms();
    loadConflicts();
    loadChecklists();
    loadCalendarEvents();
  }, [loadDashboardData, loadPlatforms, loadConflicts, loadChecklists, loadCalendarEvents]);

  // Real-time subscriptions
  useEffect(() => {
    const conflictSubscription = supabase
      .channel('calendar_conflicts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'calendar_conflicts' },
        () => loadConflicts()
      )
      .subscribe();

    const syncSubscription = supabase
      .channel('ota_sync_logs')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ota_sync_logs' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      conflictSubscription.unsubscribe();
      syncSubscription.unsubscribe();
    };
  }, [loadConflicts, loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading calendar data...</span>
      </div>
    );
  }

  // Handle view change with proper type conversion
  const handleViewChange = (view: string) => {
    // Convert react-big-calendar view names to our CalendarView type
    const viewMap: Record<string, CalendarView> = {
      'month': 'month',
      'week': 'week',
      'work_week': 'week',
      'day': 'day',
      'agenda': 'agenda'
    };
    
    const mappedView = viewMap[view] || 'month';
    setCalendarView(mappedView);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3 text-blue-500" />
            OTA Calendar Dashboard
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => loadDashboardData()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.total_platforms}
              </div>
              <div className="text-sm text-gray-600">Active Platforms</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.sync_health_score}%
              </div>
              <div className="text-sm text-gray-600">Sync Health</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardData.pending_conflicts || 0}
              </div>
              <div className="text-sm text-gray-600">Pending Conflicts</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {dashboardData.manual_updates_pending || 0}
              </div>
              <div className="text-sm text-gray-600">Manual Updates</div>
            </div>
          </div>
        )}

        {/* Platform Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {platforms.map(platform => (
            <div key={platform.id} className="flex items-center space-x-2">
              <button
                onClick={() => togglePlatformVisibility(platform.id)}
                className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
                  visiblePlatforms.has(platform.id)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {visiblePlatforms.has(platform.id) ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                <span>{platform.name}</span>
              </button>
              <button
                onClick={() => triggerSync(platform.id)}
                disabled={syncing === platform.id}
                className="p-1 text-gray-400 hover:text-blue-500"
                title="Sync Platform"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === platform.id ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => exportCalendar(platform.id)}
                className="p-1 text-gray-400 hover:text-green-500"
                title="Export Calendar"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">
              {conflicts.length} Calendar Conflict{conflicts.length !== 1 ? 's' : ''} Detected
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {conflicts.slice(0, 3).map(conflict => (
              <div key={conflict.id} className="text-sm text-red-700">
                • {conflict.description} ({conflict.room_no})
              </div>
            ))}
            {conflicts.length > 3 && (
              <div className="text-sm text-red-600">
                ... and {conflicts.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Updates Alert */}
      {checklists.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-800">
              {checklists.length} Manual Update{checklists.length !== 1 ? 's' : ''} Pending
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {checklists.slice(0, 3).map(checklist => (
              <div key={checklist.id} className="text-sm text-yellow-700">
                {/* Safely format platform labels from either string[], object, or missing */}
                {(() => {
                  const v = (checklist as any).ota_platforms;
                  let label = 'Manual Update';
                  if (Array.isArray(v)) {
                    if (v.length > 0) {
                      if (typeof v[0] === 'string') label = v.join(', ');
                      else if (typeof v[0] === 'object' && v[0]?.name) label = v.map((x: any) => x.name).join(', ');
                      else label = 'Multiple Platforms';
                    }
                  } else if (v && typeof v === 'object' && (v as any).name) {
                    label = (v as any).name;
                  }
                  return (
                    <>
                      • {label} - {checklist.total_items} items
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={calendarView}
            onView={handleViewChange}
            date={selectedDate}
            onNavigate={setSelectedDate}
            eventPropGetter={eventStyleGetter}
            popup
            showMultiDayTimes
            step={60}
            showAllEvents
          />
        </div>
      </div>
    </div>
  );
};

export default OTACalendarDashboard;