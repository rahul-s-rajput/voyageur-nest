import React from 'react';
import { 
  BuildingOfficeIcon,
  HomeIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface PropertyStatsProps {
  summary: {
    totalProperties: number;
    totalRooms: number;
    occupiedRooms: number;
    todayCheckIns: number;
    todayCheckOuts: number;
    pendingBookings: number;
  };
  loading?: boolean;
}

const PropertyStats: React.FC<PropertyStatsProps> = ({ summary, loading = false }) => {
  const stats = [
    {
      name: 'Total Properties',
      value: summary.totalProperties,
      icon: BuildingOfficeIcon,
      color: 'blue',
      description: 'Active properties'
    },
    {
      name: 'Total Rooms',
      value: summary.totalRooms,
      icon: HomeIcon,
      color: 'green',
      description: 'Across all properties'
    },
    {
      name: 'Occupied Rooms',
      value: summary.occupiedRooms,
      icon: UserGroupIcon,
      color: 'purple',
      description: `${summary.totalRooms > 0 ? Math.round((summary.occupiedRooms / summary.totalRooms) * 100) : 0}% occupancy`
    },
    {
      name: 'Check-ins Today',
      value: summary.todayCheckIns,
      icon: ArrowRightOnRectangleIcon,
      color: 'indigo',
      description: 'Guests arriving'
    },
    {
      name: 'Check-outs Today',
      value: summary.todayCheckOuts,
      icon: ArrowLeftOnRectangleIcon,
      color: 'orange',
      description: 'Guests departing'
    },
    {
      name: 'Pending Bookings',
      value: summary.pendingBookings,
      icon: ClockIcon,
      color: 'red',
      description: 'Awaiting confirmation'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      orange: 'bg-orange-50 text-orange-600',
      red: 'bg-red-50 text-red-600',
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-50 text-gray-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${getColorClasses(stat.color)} mr-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PropertyStats;