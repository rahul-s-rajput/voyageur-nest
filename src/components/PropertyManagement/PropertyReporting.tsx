import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { Property, PropertyComparison, PropertyMetric, PropertyTrendData } from '../../types/property';
import { propertyService } from '../../services/propertyService';
import { 
  ChartBarIcon, 
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  HomeIcon,
  StarIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  Squares2X2Icon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

interface PropertyReportingProps {
  className?: string;
}

const PropertyReporting: React.FC<PropertyReportingProps> = ({ className = '' }) => {
  const { properties } = useProperty();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'comparison' | 'trends' | 'reports'>('comparison');
  const [reportType, setReportType] = useState<'performance' | 'financial' | 'guest' | 'operational'>('performance');
  const [comparisonData, setComparisonData] = useState<PropertyComparison[]>([]);
  const [trendData, setTrendData] = useState<PropertyTrendData[]>([]);
  const [metrics, setMetrics] = useState<PropertyMetric[]>([]);

  useEffect(() => {
    if (properties.length > 0) {
      setSelectedProperties(properties.map(p => p.id));
      loadReportingData();
    }
  }, [properties, dateRange]);

  const loadReportingData = async () => {
    try {
      setLoading(true);
      
      if (selectedProperties.length > 0) {
        // Calculate date range
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        switch (dateRange) {
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(startDate.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }
        const fromDate = startDate.toISOString().split('T')[0];
        
        const [comparison, trends, metricsData] = await Promise.all([
          propertyService.getPropertyComparison(selectedProperties, fromDate, endDate),
          propertyService.getPropertyTrends(selectedProperties[0], 6),
          propertyService.getPropertyMetrics(selectedProperties[0])
        ]);
        
        setComparisonData(comparison);
        setTrendData(trends);
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to load reporting data:', error);
      // Fallback to empty data if database calls fail
      setComparisonData([]);
      setTrendData([]);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const exportReport = (format: 'pdf' | 'excel') => {
    // Implementation for exporting reports
    console.log(`Exporting ${reportType} report as ${format}`);
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DocumentChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
              Property Comparison & Reporting
            </h2>
            <p className="text-gray-600 mt-1">
              Compare performance and generate detailed reports across properties
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => exportReport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={() => exportReport('pdf')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            <button
              onClick={printReport}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center mt-4">
          {/* View Mode Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'comparison', label: 'Comparison', icon: Squares2X2Icon },
              { key: 'trends', label: 'Trends', icon: ArrowTrendingUpIcon },
              { key: 'reports', label: 'Reports', icon: DocumentChartBarIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>

          {/* Property Filter */}
          <div className="relative">
            <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FunnelIcon className="h-4 w-4 mr-2" />
              Properties ({selectedProperties.length})
            </button>
            {/* Property selection dropdown would go here */}
          </div>

          <button
            onClick={loadReportingData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'comparison' && (
          <PropertyComparisonView
            comparisonData={comparisonData}
            properties={properties}
            selectedProperties={selectedProperties}
            onPropertyToggle={handlePropertyToggle}
          />
        )}

        {viewMode === 'trends' && (
          <PropertyTrendsView
            trendData={trendData}
            properties={properties}
            selectedProperties={selectedProperties}
            dateRange={dateRange}
          />
        )}

        {viewMode === 'reports' && (
          <PropertyReportsView
            metrics={metrics}
            comparisonData={comparisonData}
            properties={properties}
            reportType={reportType}
            setReportType={setReportType}
            dateRange={dateRange}
          />
        )}
      </div>
    </div>
  );
};

// Property Comparison View Component
interface PropertyComparisonViewProps {
  comparisonData: PropertyComparison[];
  properties: Property[];
  selectedProperties: string[];
  onPropertyToggle: (propertyId: string) => void;
}

const PropertyComparisonView: React.FC<PropertyComparisonViewProps> = ({
  comparisonData
}) => {
  const [sortBy, setSortBy] = useState<string>('occupancy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Extract metrics from the comparison data structure
  const getMetricsForComparison = () => {
    if (!comparisonData.length) return [];
    
    const comparison = comparisonData[0];
    const allProperties: { [propertyId: string]: any } = {};
    
    // Initialize property objects with null safety
    if (comparison && comparison.metrics && typeof comparison.metrics === 'object') {
      Object.keys(comparison.metrics).forEach(metricType => {
        const metricsArray = comparison.metrics[metricType as keyof typeof comparison.metrics];
        if (Array.isArray(metricsArray)) {
          metricsArray.forEach(metric => {
            if (metric && metric.propertyId) {
              if (!allProperties[metric.propertyId]) {
                allProperties[metric.propertyId] = {
                  propertyId: metric.propertyId,
                  propertyName: metric.propertyName || 'Unknown Property'
                };
              }
              allProperties[metric.propertyId][metricType] = metric.value || 0;
            }
          });
        }
      });
    }
    
    return Object.values(allProperties);
  };

  const metricsData = getMetricsForComparison();

  const sortedData = [...metricsData].sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const formatValue = (key: string, value: number) => {
    switch (key) {
      case 'occupancy':
        return `${value.toFixed(1)}%`;
      case 'revenue':
      case 'averageRate':
        return `₹${value.toLocaleString()}`;
      case 'guestSatisfaction':
        return `${value.toFixed(1)}/5`;
      default:
        return Math.round(value).toString();
    }
  };

  const getPerformanceColor = (key: string, value: number) => {
    const isHigherBetter = ['occupancy', 'revenue', 'guestSatisfaction', 'averageRate'].includes(key);
    
    if (isHigherBetter) {
      return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
    }
    
    return 'text-gray-900';
  };

  const comparisonMetrics: { key: string; label: string; icon: any }[] = [
    { key: 'occupancy', label: 'Occupancy Rate', icon: HomeIcon },
    { key: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
    { key: 'averageRate', label: 'Average Rate', icon: CurrencyDollarIcon },
    { key: 'guestSatisfaction', label: 'Guest Satisfaction', icon: StarIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {comparisonMetrics.slice(0, 4).map(({ key, label, icon: Icon }) => {
          const values = sortedData.map(d => d[key] as number);
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const best = Math.max(...values);
          const worst = Math.min(...values);
          
          return (
            <div key={key} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-gray-600" />
                <span className="text-xs text-gray-500">Avg: {formatValue(key, avg)}</span>
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{label}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">Best: {formatValue(key, best)}</div>
                <div className="text-xs text-red-600">Worst: {formatValue(key, worst)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                {comparisonMetrics.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{label}</span>
                      {sortBy === key && (
                        <span className="text-blue-600">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((property, index) => (
                <tr key={property.propertyId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-semibold text-sm">
                          {property.propertyName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {property.propertyName}
                        </div>
                        <div className="text-xs text-gray-500">
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </td>
                  {comparisonMetrics.map(({ key }) => (
                    <td key={key} className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getPerformanceColor(key, property[key] as number)}`}>
                        {formatValue(key, property[key] as number)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Radar Chart */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Comparison */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Revenue Comparison</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="propertyName" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Occupancy vs Satisfaction */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Occupancy vs Guest Satisfaction</h4>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="propertyName" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="occupancy" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="guestSatisfaction" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Property Trends View Component
interface PropertyTrendsViewProps {
  trendData: PropertyTrendData[];
  properties: Property[];
  selectedProperties: string[];
  dateRange: string;
}

const PropertyTrendsView: React.FC<PropertyTrendsViewProps> = ({
  trendData,
  properties,
  selectedProperties
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'occupancy' | 'revenue' | 'bookings'>('revenue');

  const chartData = trendData.map(day => {
    const result: any = { date: day.date };
    Object.entries(day.properties).forEach(([propertyId, data]) => {
      if (selectedProperties.includes(propertyId)) {
        const property = properties.find(p => p.id === propertyId);
        if (property) {
          result[property.name] = data[selectedMetric];
        }
      }
    });
    return result;
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const formatYAxis = (value: number) => {
    switch (selectedMetric) {
      case 'revenue':
        return `₹${(value / 1000).toFixed(0)}k`;
      case 'occupancy':
        return `${value.toFixed(0)}%`;
      case 'bookings':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const metricOptions = [
    { key: 'revenue', label: 'Revenue', icon: CurrencyDollarIcon },
    { key: 'occupancy', label: 'Occupancy Rate', icon: HomeIcon },
    { key: 'bookings', label: 'Bookings', icon: CalendarIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2">
        {metricOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedMetric(key as any)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMetric === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {metricOptions.find(m => m.key === selectedMetric)?.label} Trends
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value, name) => [formatYAxis(Number(value)), name]}
            />
            <Legend />
            {properties
              .filter(p => selectedProperties.includes(p.id))
              .map((property, index) => (
                <Line
                  key={property.id}
                  type="monotone"
                  dataKey={property.name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties
          .filter(p => selectedProperties.includes(p.id))
          .map((property) => {
            const propertyData = trendData.map(day => 
              day.properties[property.id]?.[selectedMetric] || 0
            );
            
            const current = propertyData[propertyData.length - 1];
            const previous = propertyData[propertyData.length - 2];
            const change = previous ? ((current - previous) / previous) * 100 : 0;
            const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            
            return (
              <div key={property.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{property.name}</h4>
                  <div className={`flex items-center ${
                    trend === 'up' ? 'text-green-600' : 
                    trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                    ) : trend === 'down' ? (
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                    ) : null}
                    <span className="text-sm font-medium">
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatYAxis(current)}
                </div>
                <div className="text-sm text-gray-600">
                  Current {metricOptions.find(m => m.key === selectedMetric)?.label}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

// Property Reports View Component
interface PropertyReportsViewProps {
  metrics: PropertyMetric[];
  comparisonData: PropertyComparison[];
  properties: Property[];
  reportType: 'performance' | 'financial' | 'guest' | 'operational';
  setReportType: (type: 'performance' | 'financial' | 'guest' | 'operational') => void;
  dateRange: string;
}

const PropertyReportsView: React.FC<PropertyReportsViewProps> = ({
  metrics,
  comparisonData,
  properties,
  reportType,
  setReportType,
  dateRange
}) => {
  const reportTypes = [
    { key: 'performance', label: 'Performance Report', icon: ChartBarIcon },
    { key: 'financial', label: 'Financial Report', icon: CurrencyDollarIcon },
    { key: 'guest', label: 'Guest Report', icon: UserGroupIcon },
    { key: 'operational', label: 'Operational Report', icon: HomeIcon }
  ];

  const getReportMetrics = () => {
    switch (reportType) {
      case 'performance':
        return metrics.filter(m => 
          ['Occupancy Rate', 'Revenue Per Room', 'Guest Satisfaction', 'Market Share'].includes(m.propertyName)
        );
      case 'financial':
        return metrics.filter(m => 
          ['Total Revenue', 'Profit Margin', 'Cost Per Booking', 'Average Daily Rate'].includes(m.propertyName)
        );
      case 'guest':
        return metrics.filter(m => 
          ['Guest Satisfaction', 'Repeat Guest Rate', 'Cancellation Rate', 'Average Stay Duration'].includes(m.propertyName)
        );
      case 'operational':
        return metrics.filter(m => 
          ['Booking Count', 'Occupancy Rate', 'Average Stay Duration', 'Cancellation Rate'].includes(m.propertyName)
        );
      default:
        return metrics;
    }
  };

  const reportMetrics = getReportMetrics();

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setReportType(key as any)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Report Header */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {reportTypes.find(r => r.key === reportType)?.label}
        </h3>
        <p className="text-gray-600">
          Generated for {dateRange} period • {properties.length} properties analyzed
        </p>
        <div className="text-sm text-gray-500 mt-1">
          Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportMetrics.slice(0, 4).map(metric => (
            <div key={metric.propertyId} className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {metric.value.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">{metric.propertyName}</div>
              <div className={`text-xs flex items-center justify-center mt-1 ${
                metric.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change > 0 ? (
                  <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                )}
                {Math.abs(metric.change).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h4>
        <div className="space-y-4">
          {reportMetrics.map(metric => (
            <div key={metric.propertyId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{metric.propertyName}</div>
                <div className="text-sm text-gray-600">
                  Property ID: {metric.propertyId}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {metric.value.toFixed(1)}
                </div>
                <div className={`text-sm flex items-center ${
                  metric.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.change > 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(metric.change).toFixed(1)}% vs previous period
                </div>
              </div>
              <div className="ml-4 w-24">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Property Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Property Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satisfaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparisonData.map((property, index) => {
                const occupancyMetric = property.metrics.occupancy.find(m => m.propertyId === property.metrics.occupancy[0]?.propertyId);
                const revenueMetric = property.metrics.revenue.find(m => m.propertyId === property.metrics.revenue[0]?.propertyId);
                const satisfactionMetric = property.metrics.guestSatisfaction.find(m => m.propertyId === property.metrics.guestSatisfaction[0]?.propertyId);
                
                const occupancyValue = occupancyMetric?.value || 0;
                const revenueValue = revenueMetric?.value || 0;
                const satisfactionValue = satisfactionMetric?.value || 0;
                
                const performance = (occupancyValue + satisfactionValue * 20 + (revenueValue / 1000)) / 3;
                const performanceLevel = performance >= 80 ? 'Excellent' : 
                                       performance >= 60 ? 'Good' : 
                                       performance >= 40 ? 'Average' : 'Poor';
                const performanceColor = performance >= 80 ? 'text-green-600' : 
                                       performance >= 60 ? 'text-blue-600' : 
                                       performance >= 40 ? 'text-yellow-600' : 'text-red-600';
                
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {occupancyMetric?.propertyName || `Property ${index + 1}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{occupancyValue.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{revenueValue.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">-</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{satisfactionValue.toFixed(1)}/5</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${performanceColor} bg-opacity-10`}>
                        {performanceLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4">Recommendations</h4>
        <div className="space-y-3">
          {comparisonData
            .filter(property => {
              const occupancyValue = property.metrics.occupancy[0]?.value || 0;
              const satisfactionValue = property.metrics.guestSatisfaction[0]?.value || 0;
              return occupancyValue < 70 || satisfactionValue < 4.0;
            })
            .slice(0, 3)
            .map((property, index) => {
              const occupancyValue = property.metrics.occupancy[0]?.value || 0;
              const satisfactionValue = property.metrics.guestSatisfaction[0]?.value || 0;
              const propertyName = property.metrics.occupancy[0]?.propertyName || `Property ${index + 1}`;
              
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-blue-900">{propertyName}</div>
                    <div className="text-sm text-blue-800">
                      {occupancyValue < 70 && 
                        `Occupancy rate (${occupancyValue.toFixed(1)}%) is below target. Consider promotional campaigns or pricing adjustments.`}
                      {satisfactionValue < 4.0 && 
                        ` Guest satisfaction (${satisfactionValue.toFixed(1)}/5) needs improvement. Focus on service quality and amenities.`}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default PropertyReporting;