import React from 'react';
import { PropertyBreakdown, Property } from '../../types/property';
import { useProperty } from '../../contexts/PropertyContext';
import { 
  BuildingOfficeIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface PropertyCardProps {
  breakdown: PropertyBreakdown;
  onClick?: () => void;
  onViewDetails?: (property: Property) => void;
  onManageRooms?: (property: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ breakdown, onClick, onViewDetails, onManageRooms }) => {
  const { switchProperty, currentProperty } = useProperty();
  const { property, occupancy, revenue, bookings } = breakdown;

  const occupancyRate = property.totalRooms > 0 
    ? Math.round((occupancy.occupied / property.totalRooms) * 100) 
    : 0;

  const revenueChange = revenue.thisMonth > revenue.lastMonth 
    ? ((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100 
    : 0;

  const isCurrentProperty = currentProperty?.id === property.id;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (!isCurrentProperty) {
      switchProperty(property.id);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isCurrentProperty ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`
              p-2 rounded-lg mr-3
              ${isCurrentProperty ? 'bg-blue-100' : 'bg-gray-100'}
            `}>
              <BuildingOfficeIcon className={`
                h-6 w-6 
                ${isCurrentProperty ? 'text-blue-600' : 'text-gray-600'}
              `} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
              <p className="text-sm text-gray-500">{property.address}</p>
            </div>
          </div>
          {isCurrentProperty && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Current
            </span>
          )}
        </div>

        {/* Occupancy Stats */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Occupancy</span>
            <span className="text-sm font-bold text-gray-900">{occupancyRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{occupancy.occupied} occupied</span>
            <span>{occupancy.available} available</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              ₹{(revenue.today / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-gray-600">Today's Revenue</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              {bookings.checkInsToday + bookings.checkOutsToday}
            </div>
            <div className="text-xs text-gray-600">Check-ins/outs</div>
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Monthly Revenue</div>
              <div className="text-lg font-bold text-gray-900">
                ₹{(revenue.thisMonth / 1000).toFixed(0)}k
              </div>
            </div>
            <div className={`
              flex items-center text-sm font-medium
              ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}
            `}>
              {revenueChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(revenueChange).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(property);
              }}
              className="flex-1 text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              View Details
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onManageRooms?.(property);
              }}
              className="flex-1 text-xs px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              Manage Rooms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;