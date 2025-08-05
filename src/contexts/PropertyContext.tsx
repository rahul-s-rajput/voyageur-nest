import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Property, PropertyContext as PropertyContextType } from '../types/property';
import { propertyService } from '../services/propertyService';
import { toast } from 'react-hot-toast';

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: ReactNode;
}

export const PropertyProvider: React.FC<PropertyProviderProps> = ({ children }) => {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load properties on mount
  useEffect(() => {
    loadProperties();
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