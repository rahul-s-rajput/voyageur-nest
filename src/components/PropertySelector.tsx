import React, { useState } from 'react';
import { useProperty } from '../contexts/PropertyContext';
import { ChevronDownIcon, BuildingOfficeIcon, CheckIcon } from '@heroicons/react/24/outline';

interface PropertySelectorProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

const PropertySelector: React.FC<PropertySelectorProps> = ({ 
  className = '', 
  showLabel = true,
  compact = false 
}) => {
  const { currentProperty, properties, switchProperty, isLoading } = useProperty();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  if (properties.length <= 1) {
    return null; // Don't show selector if only one property
  }

  const handlePropertySelect = (propertyId: string) => {
    switchProperty(propertyId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && !compact && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          className={`
            relative w-full bg-white border border-gray-300 rounded-md shadow-sm 
            pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none 
            focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            ${compact ? 'text-sm' : ''}
          `}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
            <span className="block truncate">
              {currentProperty?.name || 'Select Property'}
            </span>
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon 
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
            {properties.map((property) => (
              <button
                key={property.id}
                className={`
                  w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 
                  focus:outline-none transition-colors duration-150
                  ${currentProperty?.id === property.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                `}
                onClick={() => handlePropertySelect(property.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">{property.name}</div>
                      {property.address && (
                        <div className="text-sm text-gray-500 truncate">
                          {property.address}
                        </div>
                      )}
                    </div>
                  </div>
                  {currentProperty?.id === property.id && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PropertySelector;