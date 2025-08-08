import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { format, addDays, eachDayOfInterval, startOfDay, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';

import { PropertyBooking, Room, RoomPricing } from '../types/property';
import { Booking } from '../types/booking';
import { useGridCalendar } from '../hooks/useGridCalendar';
import { useBreakpoint } from '../hooks/useWindowSize';
import { GridCalendarErrorBoundary } from './GridCalendarErrorBoundary';
import { GridUpdateManager } from './RoomGridCalendar/GridUpdateManager';
import { formatDateLocal } from '../utils/dateUtils';
import { ResponsiveGridCalendar } from './RoomGridCalendar/ResponsiveGridCalendar';

import { RoomRowWithPricing } from './RoomGridCalendar/RoomRowWithPricing';
import { BookingCellWithPricing } from './RoomGridCalendar/BookingCellWithPricing';
import { QuickPricingEdit } from './pricing/QuickPricingEdit';

interface RoomGridCalendarProps {
  propertyId: string;
  dateRange?: { start: Date; end: Date };
  viewType?: 'week' | 'month' | 'custom';
  onBookingClick?: (booking: Booking | PropertyBooking) => void;
  onCellClick?: (roomNumber: string, date: Date) => void;
  showPricing?: boolean;
  className?: string;
}

export const RoomGridCalendar: React.FC<RoomGridCalendarProps> = ({
  propertyId,
  dateRange: initialDateRange,
  viewType: initialViewType = 'week',
  onBookingClick,
  onCellClick,
  showPricing = true,
  className = ''
}) => {
  const { 
    gridData, 
    loading, 
    error, 
    settings, 
    updateSettings, 
    refreshData 
  } = useGridCalendar();
  const { isMobile } = useBreakpoint();

  // Modal state for pricing edit
  const [pricingModal, setPricingModal] = useState<{
    room: Room;
    date: Date;
    pricing: RoomPricing;
  } | null>(null);
  const [mobileSelectedRoomType, setMobileSelectedRoomType] = useState<import('../types/property').RoomType | null>(null);

  // Use date range from grid calendar settings
  const dateRange = useMemo(() => {
    return settings.dateRange;
  }, [settings.dateRange]);

  // Real-time update handlers
  const handleBookingsUpdate = useCallback(() => {
    // Trigger grid data refresh to incorporate real-time updates
    refreshData();
  }, [refreshData]);

  const handleRoomsUpdate = useCallback(() => {
    // Trigger grid data refresh to incorporate real-time updates
    refreshData();
  }, [refreshData]);

  // Handle pricing updates for rooms
  const handlePricingUpdate = useCallback(async (room: Room, date: Date, pricing: RoomPricing) => {
    try {
      console.log('Updating pricing for room:', room.roomNumber, 'on date:', format(date, 'yyyy-MM-dd'), 'with pricing:', pricing);
      
      // Import the property service and update room pricing
      const { propertyService } = await import('../services/propertyService');
      
      // Get current room data to preserve existing seasonal pricing
      const currentRoom = await propertyService.getRoomById(room.id);
      if (!currentRoom) {
        throw new Error('Room not found');
      }
      
      // Prepare date-specific pricing updates
      const dateKey = formatDateLocal(date); // Use same format as availability data
      const existingSeasonalPricing = currentRoom.seasonalPricing || {};
      
      // Calculate final price for this specific date
      let finalPrice = pricing.basePrice;
      
      // Apply seasonal adjustments if any
      if (pricing.seasonalAdjustments && pricing.seasonalAdjustments.length > 0) {
        // Use the latest adjustment (most recent one added)
        const latestAdjustment = pricing.seasonalAdjustments[pricing.seasonalAdjustments.length - 1];
        if (latestAdjustment.type === 'percentage') {
          finalPrice = pricing.basePrice * (1 + latestAdjustment.value / 100);
        } else {
          finalPrice = pricing.basePrice + latestAdjustment.value;
        }
      }
      
      // Update seasonal pricing for this specific date only
      const updatedSeasonalPricing = {
        ...existingSeasonalPricing,
        [dateKey]: finalPrice
      };
      
      // Only update seasonal pricing, not the base price
      await propertyService.updateRoomPricing(room.id, {
        seasonalPricing: updatedSeasonalPricing
      });
      
      // Show success message
      const { toast } = await import('react-hot-toast');
      toast.success(`Updated pricing for Room ${room.roomNumber} on ${format(date, 'yyyy-MM-dd')}`);

      // Auto-append manual update checklist items for OTAs
      try {
        const { supabase } = await import('../lib/supabase');
        const { ManualUpdateService } = await import('../services/manualUpdateService');
        // Resolve manual platforms (property-specific first, then global)
        const { data: propPlatforms } = await supabase
          .from('ota_platforms')
          .select('id, name, display_name, is_active, manual_update_required, property_id')
          .eq('is_active', true)
          .eq('manual_update_required', true)
          .eq('property_id', room.propertyId);
        const { data: globalPlatforms } = await supabase
          .from('ota_platforms')
          .select('id, name, display_name, is_active, manual_update_required, property_id')
          .eq('is_active', true)
          .eq('manual_update_required', true)
          .is('property_id', null);
        const allPlatforms = [...(propPlatforms || []), ...(globalPlatforms || [])];

        const item = {
          id: `delta-pricing-${room.roomNumber}-${dateKey}`,
          title: 'Update rates',
          description: `Set price for room ${room.roomNumber} on ${format(date, 'yyyy-MM-dd')} to ₹${Math.round(finalPrice)}`,
          category: 'pricing',
          required: true,
          estimated_minutes: 3,
          verification_criteria: 'OTA calendar shows intended rate',
          status: 'pending' as const
        };

        for (const platform of allPlatforms) {
          const name = ((platform.display_name || platform.name) || '').toLowerCase();
          if (!(name.includes('booking') || name.includes('gommt') || name.includes('makemytrip'))) continue;
          await ManualUpdateService.appendChecklistItems(
            platform.id as unknown as string,
            room.propertyId,
            [item as any],
            { dateRange: { start: date, end: date } }
          );
        }
      } catch (e) {
        console.warn('Failed to append OTA manual checklist items for pricing update:', e);
      }

      // Refresh the grid data to show updated pricing
      await refreshData();
    } catch (error) {
      console.error('Failed to update pricing:', error);
      const { toast } = await import('react-hot-toast');
      toast.error('Failed to update pricing');
    }
  }, [refreshData]);

  // Generate date columns for the grid - always use settings date range
  const dateColumns = useMemo(() => {
    // Ensure we're using clean dates from settings
    const cleanStart = startOfDay(new Date(dateRange.start));
    const cleanEnd = startOfDay(new Date(dateRange.end));
    
    const dates = eachDayOfInterval({
      start: cleanStart,
      end: cleanEnd
    });
    
    console.log('🔍 DEBUG: Calendar dateColumns generated:', {
      count: dates.length,
      start: cleanStart,
      end: cleanEnd,
      firstDate: dates[0] ? formatDateLocal(dates[0]) : '',
      lastDate: dates[dates.length - 1] ? formatDateLocal(dates[dates.length - 1]) : '',
      allDates: dates.map(d => formatDateLocal(d))
    });
    return dates;
  }, [dateRange.start, dateRange.end]);

  // Track if component is internally navigating to prevent prop updates from overriding
  const isInternalNavigationRef = useRef(false);
  
  // Only use initial date range on first mount if provided
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (initialDateRange && !hasInitializedRef.current && !isInternalNavigationRef.current) {
      hasInitializedRef.current = true;
      // Don't override the settings from PropertyContext
      // The PropertyContext already handles date range initialization properly
    }
  }, []); // Remove dependencies to prevent re-runs

  useEffect(() => {
    // View type can be updated from props
    if (initialViewType && initialViewType !== settings.viewType) {
      updateSettings({ viewType: initialViewType });
    }
  }, [initialViewType]); // Only depend on initialViewType

  // Ensure month view on mobile without updating state during render
  useEffect(() => {
    if (!isMobile) return;
    if (settings.viewType !== 'month') {
      const start = startOfDay(settings.dateRange.start);
      const end = startOfDay(addDays(start, 29));
      updateSettings({ viewType: 'month', dateRange: { start, end } });
    }
  }, [isMobile, settings.viewType, settings.dateRange.start, updateSettings]);

  // Navigation handlers
  const navigateDate = (direction: number) => {
    // Set flag to prevent prop updates from overriding this navigation
    isInternalNavigationRef.current = true;
    
    // Use current visible range length to stride for custom; fixed 7 for week; 30 for month
    const currentRangeDays = differenceInCalendarDays(settings.dateRange.end, settings.dateRange.start) + 1;
    const days = settings.viewType === 'week' ? 7 : settings.viewType === 'month' ? 30 : Math.max(currentRangeDays, 1);
    const newStart = startOfDay(addDays(settings.dateRange.start, direction * days));
    // For week view, always add exactly 6 days to get 7 days total (inclusive)
    const daysToAdd = settings.viewType === 'week' ? 6 : (settings.viewType === 'month' ? 29 : days - 1);
    const newEnd = startOfDay(addDays(newStart, daysToAdd));
    
    updateSettings({
      dateRange: { start: newStart, end: newEnd }
    });
    
    // Reset flag after a short delay to allow for prop updates after navigation
    setTimeout(() => {
      isInternalNavigationRef.current = false;
    }, 100);
  };

  // Do not reset date range when opening a modal; keep current settings until explicit navigation
  // The booking click handlers already use current dateRange from settings; no change needed here.

  const handleViewTypeChange = (newViewType: 'week' | 'month' | 'custom') => {
    // When switching to week view, ensure we have exactly 7 days
    if (newViewType === 'week') {
      const start = startOfDay(settings.dateRange.start);
      const end = startOfDay(addDays(start, 6));
      updateSettings({ 
        viewType: newViewType,
        dateRange: { start, end }
      });
    } else if (newViewType === 'month') {
      // Month view shows 30 days from current start
      const start = startOfDay(settings.dateRange.start);
      const end = startOfDay(addDays(start, 29));
      updateSettings({ viewType: newViewType, dateRange: { start, end } });
    } else {
      // Custom view keeps current range; just set the view type
      updateSettings({ viewType: newViewType });
    }
  };

  // Date Navigation Component
  const DateNavigation = () => {
    const { isMobile } = useBreakpoint();
    
    return (
      <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'} mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200`}>
        {/* Mobile Layout */}
        {isMobile ? (
          <>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigateDate(-1)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4" /> 
              </button>
              
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd')}
                </div>
                <div className="text-xs text-gray-500">
                  {format(dateRange.start, 'yyyy')}
                </div>
              </div>
              
              <button 
                onClick={() => navigateDate(1)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex justify-center">
              <select 
                value={settings.viewType} 
                onChange={(e) => handleViewTypeChange(e.target.value as 'week' | 'month' | 'custom')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-48"
                disabled={loading}
              >
                <option value="week">Week View</option>
                <option value="month">Month View</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </>
        ) : (
          /* Desktop Layout */
          <>
            <button 
              onClick={() => navigateDate(-1)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 
              Previous {settings.viewType}
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="text-lg font-semibold text-gray-900">
                {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
              </div>
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="flex items-center space-x-2">
              <select 
                value={settings.viewType} 
                onChange={(e) => handleViewTypeChange(e.target.value as 'week' | 'month' | 'custom')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="week">Week View</option>
                <option value="month">Month View</option>
                <option value="custom">Custom Range</option>
              </select>
              
              <button 
                onClick={() => navigateDate(1)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                Next {settings.viewType} <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Grid Layout Component
  const GridLayout = () => {
    const { isMobile } = useBreakpoint();

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 text-gray-500" role="status" aria-live="polite">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading room grid...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-red-500 mb-2">Failed to load room grid</div>
            <div className="text-sm text-gray-500">{error}</div>
            <button 
              onClick={refreshData}
              className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (gridData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div>No rooms found for this property</div>
            <div className="text-sm mt-1">Check your property configuration</div>
          </div>
        </div>
      );
    }

    // Enable responsive mobile view
    if (isMobile) {
      const rooms = gridData.map(roomData => roomData.room);
      return (
        <ResponsiveGridCalendar
          gridData={gridData}
          dateRange={dateColumns}
          showPricing={showPricing}
          onBookingClick={onBookingClick}
          onCellClick={(room, date) => onCellClick?.(room.roomNumber, date)}
          onPricingUpdate={(roomId, date, newPrice) => {
            const room = rooms.find(r => r.id === roomId);
            if (room) {
              const pricing: RoomPricing = {
                basePrice: newPrice,
                weekendMultiplier: 1,
                seasonalAdjustments: room.pricing?.seasonalAdjustments || [],
                lastUpdated: new Date(),
                updatedBy: 'user'
              };
              handlePricingUpdate(room, date, pricing);
            }
          }}
          // Pass controlled room-type selection for mobile
          onRoomTypeSelect={(type) => setMobileSelectedRoomType(type as any)}
          selectedRoomType={mobileSelectedRoomType as any}
        />
      );
    }

    // Standard grid layout for all screen sizes
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header with date columns - Simplified grid for better compatibility */}
        <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          <div className="flex min-w-max">
            <div className="w-48 p-3 font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 flex-shrink-0">
              Room
            </div>
            {dateColumns.map(date => (
              <div 
                key={date.toISOString()}
                className="w-32 p-3 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0 flex-shrink-0"
              >
                <div className="text-sm">{format(date, 'EEE')}</div>
                <div className="text-lg">{format(date, 'dd')}</div>
                <div className="text-xs text-gray-500">{format(date, 'MMM')}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Room rows - matching layout */}
        <div className="divide-y divide-gray-200">
          {(() => {
            console.log('About to render', gridData.length, 'room rows');
            console.log('Grid data sample:', gridData[0]);
            return gridData.map(roomData => {
              console.log('Rendering room:', roomData.room.roomNumber); // Debug log
              return (
                <div key={roomData.room.roomNumber} className="flex min-w-max hover:bg-gray-50 h-20">
                  {/* Room Info Column */}
                  <div className="w-48 p-4 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                    <div className="font-semibold text-gray-900">{roomData.room.roomNumber}</div>
                    <div className="text-sm text-gray-600 capitalize">{roomData.room.roomType.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-500">Max: {roomData.room.maxOccupancy}</div>
                  </div>

                  {/* Calendar Cells */}
                  {dateColumns.map((date, index) => {
                    const dateKey = formatDateLocal(date); // Use same format as availability data
                    const cellAvailability = roomData.availability?.[dateKey];
                    
                    return (
                      <div key={index} className="w-32 border-r border-gray-200 last:border-r-0 flex-shrink-0">
                        <div className="h-20">
                          <BookingCellWithPricing
                            room={roomData.room}
                            date={date}
                            booking={cellAvailability?.booking}
                            checkInBooking={cellAvailability?.checkInBooking}
                            checkOutBooking={cellAvailability?.checkOutBooking}
                            pricing={roomData.room.pricing}
                            showPricing={showPricing}
                            availabilityStatus={cellAvailability?.status}
                            onClick={() => onCellClick?.(roomData.room.roomNumber, date)}
                            onDoubleClick={() => {
                              // Handle double click for same-day transitions
                              if (cellAvailability?.status === 'checkin-checkout') {
                                // You could show a modal with both bookings or handle differently
                                cellAvailability?.checkOutBooking && onBookingClick?.(cellAvailability.checkOutBooking);
                              } else {
                                cellAvailability?.booking && onBookingClick?.(cellAvailability.booking);
                              }
                            }}
                            onPriceClick={(room, date) => {
                              // Open pricing edit modal instead of direct update
                              const currentPricing: RoomPricing = {
                                basePrice: room.basePrice || 1000,
                                weekendMultiplier: 1,
                                seasonalAdjustments: room.pricing?.seasonalAdjustments || [],
                                lastUpdated: new Date(),
                                updatedBy: 'user'
                              };
                              setPricingModal({ room, date, pricing: currentPricing });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  return (
    <GridCalendarErrorBoundary>
      <GridUpdateManager
        dateRange={dateRange}
        propertyId={propertyId}
        onBookingsUpdate={handleBookingsUpdate}
        onRoomsUpdate={handleRoomsUpdate}
        className={className}
      >
        <div className="space-y-4">
          <DateNavigation />
          <GridLayout />
        </div>
      </GridUpdateManager>

      {/* Pricing Edit Modal */}
      {pricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <QuickPricingEdit
              room={pricingModal.room}
              date={pricingModal.date}
              currentPricing={pricingModal.pricing}
              onUpdate={async (updatedPricing) => {
                await handlePricingUpdate(pricingModal.room, pricingModal.date, updatedPricing);
                setPricingModal(null);
              }}
              onCancel={() => setPricingModal(null)}
            />
          </div>
        </div>
      )}
    </GridCalendarErrorBoundary>
  );
};

export default RoomGridCalendar;
