import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

export interface SimpleKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  loading?: boolean;
}

export const SimpleKPICard: React.FC<SimpleKPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  className = '',
  loading = false,
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val > 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val > 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  if (loading) {
    return (
      <Card className={`relative ${className}`}>
        <CardHeader className="pb-2">
          <div className="h-5 bg-gray-200 rounded animate-pulse w-24" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className={`inline-block w-0 h-0 mr-1 ${
                trend.isPositive 
                  ? 'border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-green-600'
                  : 'border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-red-600'
              }`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Specialized KPI cards for common metrics
export const RevenueKPICard: React.FC<Omit<SimpleKPICardProps, 'title'>> = (props) => (
  <SimpleKPICard
    {...props}
    title="Total Revenue"
    className="border-l-4 border-l-green-500"
  />
);

export const OccupancyKPICard: React.FC<Omit<SimpleKPICardProps, 'title'>> = (props) => (
  <SimpleKPICard
    {...props}
    title="Occupancy Rate"
    className="border-l-4 border-l-blue-500"
  />
);

export const ExpenseKPICard: React.FC<Omit<SimpleKPICardProps, 'title'>> = (props) => (
  <SimpleKPICard
    {...props}
    title="Total Expenses"
    className="border-l-4 border-l-red-500"
  />
);

// Loading state component
export const KPICardSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="pt-0">
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      </div>
    </CardContent>
  </Card>
);
