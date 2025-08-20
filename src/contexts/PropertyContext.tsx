import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Property, PropertyContext as PropertyContextType, GridCalendarSettings } from '../types/property';
import { propertyService } from '../services/propertyService';
import { toast } from 'react-hot-toast';
import { addDays, startOfDay } from 'date-fns';
import { validateGridCalendarSettings } from '../utils/localStorageUtils';

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: ReactNode;
}

// Default grid calendar settings
const getDefaultGridSettings = (): GridCalendarSettings => {
  // Use date-fns to ensure consistent date handling
  const today = startOfDay(new Date());
  const endDate = addDays(today, 6); // Add 6 days to get exactly 7 days total (inclusive)
  
  return {
    viewType: 'week',
    dateRange: {
      start: today,
      end: endDate
    },
    showPricing: true,
    selectedRooms: [],
    bookingSource: 'all'
  };
};

export const PropertyProvider: React.FC<PropertyProviderProps> = ({ children }) => {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gridCalendarSettings, setGridCalendarSettings] = useState<GridCalendarSettings>(getDefaultGridSettings());

  // Load properties and grid settings on mount
  useEffect(() => {
    loadProperties();
    
    // Validate existing localStorage data first
    validateGridCalendarSettings();
    
    // Load grid calendar settings from localStorage
    const savedSettings = localStorage.getItem('gridCalendarSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const today = startOfDay(new Date());
        
        // Parse and validate saved dates
        const savedStartDate = startOfDay(new Date(parsed.dateRange.start));
        const savedEndDate = startOfDay(new Date(parsed.dateRange.end));
        
        // Check if saved dates are valid and not in the past
        if (savedStartDate < today || isNaN(savedStartDate.getTime()) || isNaN(savedEndDate.getTime())) {
          // Reset to default if invalid or in the past
          console.log('Resetting invalid or past grid calendar dates');
          const defaultSettings = getDefaultGridSettings();
          setGridCalendarSettings(defaultSettings);
          localStorage.setItem('gridCalendarSettings', JSON.stringify({
            ...defaultSettings,
            dateRange: {
              start: defaultSettings.dateRange.start.toISOString(),
              end: defaultSettings.dateRange.end.toISOString()
            }
          }));
        } else {
          // Ensure week view always has exactly 7 days
          if (parsed.viewType === 'week') {
            const correctedEnd = addDays(savedStartDate, 6);
            setGridCalendarSettings({
              ...parsed,
              bookingSource: parsed.bookingSource ?? 'all',
              dateRange: {
                start: savedStartDate,
                end: correctedEnd
              }
            });
            // Update localStorage with corrected dates
            localStorage.setItem('gridCalendarSettings', JSON.stringify({
              ...parsed,
              bookingSource: parsed.bookingSource ?? 'all',
              dateRange: {
                start: savedStartDate.toISOString(),
                end: correctedEnd.toISOString()
              }
            }));
          } else {
            // For month or custom view, use saved dates but ensure they're clean
            const daysDiff = Math.ceil((savedEndDate.getTime() - savedStartDate.getTime()) / (1000 * 60 * 60 * 24));
            if (parsed.viewType === 'month' && daysDiff !== 29) {
              // Fix month view to be exactly 30 days
              const correctedEnd = addDays(savedStartDate, 29);
              setGridCalendarSettings({
                ...parsed,
                bookingSource: parsed.bookingSource ?? 'all',
                dateRange: {
                  start: savedStartDate,
                  end: correctedEnd
                }
              });
            } else {
              setGridCalendarSettings({
                ...parsed,
                bookingSource: parsed.bookingSource ?? 'all',
                dateRange: {
                  start: savedStartDate,
                  end: savedEndDate
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved grid calendar settings, resetting to defaults:', err);
        // Reset to default settings on error
        const defaultSettings = getDefaultGridSettings();
        setGridCalendarSettings(defaultSettings);
        localStorage.setItem('gridCalendarSettings', JSON.stringify({
          ...defaultSettings,
          dateRange: {
            start: defaultSettings.dateRange.start.toISOString(),
            end: defaultSettings.dateRange.end.toISOString()
          }
        }));
      }
    } else {
      // No saved settings, use default
      const defaultSettings = getDefaultGridSettings();
      setGridCalendarSettings(defaultSettings);
      localStorage.setItem('gridCalendarSettings', JSON.stringify({
        ...defaultSettings,
        dateRange: {
          start: defaultSettings.dateRange.start.toISOString(),
          end: defaultSettings.dateRange.end.toISOString()
        }
      }));
    }
  }, []);

  // Load saved property preference on mount
  useEffect(() => {
    const savedPropertyId = localStorage.getItem('selectedPropertyId');
    if (savedPropertyId && properties.length > 0) {
      const savedProperty = properties.find(p => p.id === savedPropertyId);
      if (savedProperty) {
        setCurrentProperty(savedProperty);
      } else {
        // If saved property doesn't exist, select first available
        setCurrentProperty(properties[0]);
        localStorage.setItem('selectedPropertyId', properties[0].id);
      }
    } else if (properties.length > 0) {
      // No saved preference, select first property
      setCurrentProperty(properties[0]);
      localStorage.setItem('selectedPropertyId', properties[0].id);
    }
  }, [properties]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedProperties = await propertyService.getAllProperties();
      setProperties(fetchedProperties);
      
      if (fetchedProperties.length === 0) {
        setError('No properties found. Please add a property first.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load properties';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchProperty = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setCurrentProperty(property);
      localStorage.setItem('selectedPropertyId', propertyId);
      toast.success(`Switched to ${property.name}`);
    } else {
      toast.error('Property not found');
    }
  };

  const refreshProperties = async () => {
    await loadProperties();
  };

  const addProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProperty = await propertyService.createProperty(propertyData);
      setProperties(prev => [...prev, newProperty]);
      toast.success(`Property "${newProperty.name}" added successfully`);
      return newProperty;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add property';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateProperty = async (propertyId: string, updates: Partial<Property>) => {
    try {
      const updatedProperty = await propertyService.updateProperty(propertyId, updates);
      setProperties(prev => 
        prev.map(p => p.id === propertyId ? updatedProperty : p)
      );
      
      // Update current property if it's the one being updated
      if (currentProperty?.id === propertyId) {
        setCurrentProperty(updatedProperty);
      }
      
      toast.success('Property updated successfully');
      return updatedProperty;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update property';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      await propertyService.deleteProperty(propertyId);
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      
      // If deleted property was current, switch to first available
      if (currentProperty?.id === propertyId) {
        const remainingProperties = properties.filter(p => p.id !== propertyId);
        if (remainingProperties.length > 0) {
          switchProperty(remainingProperties[0].id);
        } else {
          setCurrentProperty(null);
          localStorage.removeItem('selectedPropertyId');
        }
      }
      
      toast.success('Property deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete property';
      toast.error(errorMessage);
      throw err;
    }
  };

  // Grid calendar methods
  const updateGridSettings = useCallback((settings: Partial<GridCalendarSettings>) => {
    setGridCalendarSettings(prev => {
      const updatedSettings = { ...prev, ...settings };
      // Save to localStorage with the new settings
      try {
        localStorage.setItem('gridCalendarSettings', JSON.stringify({
          ...updatedSettings,
          dateRange: {
            start: updatedSettings.dateRange.start.toISOString(),
            end: updatedSettings.dateRange.end.toISOString()
          }
        }));
      } catch (error) {
        console.warn('Failed to save grid calendar settings:', error);
      }
      return updatedSettings;
    });
  }, []);

  const refreshGridData = async () => {
    // This will be handled by the useGridCalendar hook
    // This method is here to satisfy the interface
    return Promise.resolve();
  };

  const contextValue: PropertyContextType = {
    currentProperty,
    properties,
    switchProperty,
    isLoading,
    error,
    // Additional methods for property management
    refreshProperties,
    addProperty,
    updateProperty,
    deleteProperty,
    gridCalendarSettings,
    updateGridSettings,
    refreshGridData,
  };

  return (
    <PropertyContext.Provider value={contextValue}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = (): PropertyContextType => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};

// Hook for getting current property ID (commonly used)
export const useCurrentPropertyId = (): string | null => {
  const { currentProperty } = useProperty();
  return currentProperty?.id || null;
};

// Hook for checking if multi-property mode is enabled
export const useIsMultiProperty = (): boolean => {
  const { properties } = useProperty();
  return properties.length > 1;
};

// Hook for property-specific operations
export const usePropertyOperations = () => {
  const context = useProperty();
  
  return {
    addProperty: context.addProperty,
    updateProperty: context.updateProperty,
    deleteProperty: context.deleteProperty,
    refreshProperties: context.refreshProperties,
  };
};

export default PropertyContext;