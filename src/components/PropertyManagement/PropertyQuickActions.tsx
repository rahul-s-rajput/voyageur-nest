import React from 'react';
import { 
  PlusIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BellIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';

const PropertyQuickActions: React.FC = () => {
  const actions = [
    {
      name: 'New Booking',
      description: 'Create a new reservation',
      icon: PlusIcon,
      color: 'blue',
      href: '/bookings/new'
    },
    {
      name: 'Calendar View',
      description: 'View room availability',
      icon: CalendarDaysIcon,
      color: 'green',
      href: '/calendar'
    },
    {
      name: 'Analytics',
      description: 'Performance insights',
      icon: ChartBarIcon,
      color: 'purple',
      href: '/analytics'
    },
    {
      name: 'Settings',
      description: 'Property configuration',
      icon: Cog6ToothIcon,
      color: 'gray',
      href: '/settings'
    },
    {
      name: 'Guest Management',
      description: 'Manage guest profiles',
      icon: UserGroupIcon,
      color: 'indigo',
      href: '/guests'
    },
    {
      name: 'Reports',
      description: 'Generate reports',
      icon: DocumentTextIcon,
      color: 'orange',
      href: '/reports'
    },
    {
      name: 'Notifications',
      description: 'View alerts & updates',
      icon: BellIcon,
      color: 'red',
      href: '/notifications'
    },
    {
      name: 'Revenue',
      description: 'Financial overview',
      icon: CurrencyRupeeIcon,
      color: 'emerald',
      href: '/revenue'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200',
      green: 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200',
      purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200',
      gray: 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200',
      indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200',
      orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200',
      red: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
      emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200',
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200';
  };

  const handleActionClick = (href: string) => {
    // For now, just log the action. In a real app, this would navigate
    console.log(`Navigate to: ${href}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              onClick={() => handleActionClick(action.href)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-center
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${getColorClasses(action.color)}
              `}
            >
              <Icon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium mb-1">{action.name}</div>
              <div className="text-xs opacity-75">{action.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyQuickActions;