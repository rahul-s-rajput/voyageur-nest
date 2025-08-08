import { useState, useEffect, useCallback } from 'react';
import { useProperty } from '../contexts/PropertyContext';
import { propertyService } from '../services/propertyService';
import { RoomGridData } from '../types/property';
import { formatDateLocal } from '../utils/dateUtils';

export const useGridCalendar = () => {
  const { 
    currentProperty, 
    gridCalendarSettings, 
    updateGridSettings 
  } = useProperty();
  
  const [gridData, setGridData] = useState<RoomGridData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGridData = useCallback(async () => {
    if (!currentProperty) {
      console.log('No current property selected');
      return;
    }
    
    // Use the date range from settings consistently
    const { start, end } = gridCalendarSettings.dateRange;
    
    console.log('🔍 DEBUG: Calendar date range:', {
      start: start,
      end: end,
      startString: formatDateLocal(start),
      endString: formatDateLocal(end)
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await propertyService.getPropertyRoomsWithBookings(
        currentProperty.id,
        start,
        end
      );
      console.log('Grid data fetched:', data.length, 'rooms');
      if (data.length > 0) {
        console.log('🔍 DEBUG: First room availability keys:', Object.keys(data[0].availability));
      }
      setGridData(data);
    } catch (err) {
      const errorMsg = 'Failed to load room data';
      setError(errorMsg);
      console.error('Grid data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProperty, gridCalendarSettings.dateRange]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  return {
    gridData,
    loading,
    error,
    settings: gridCalendarSettings,
    updateSettings: updateGridSettings,
    refreshData: fetchGridData
  };
};