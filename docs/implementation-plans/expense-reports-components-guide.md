# Expense Reports UI Components - Quick Implementation Guide

## Immediate Improvements (Can be implemented today)

### 1. Enhanced KPI Cards with Sparklines

```tsx
// EnhancedKPICard.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  sparklineData: number[];
  icon: React.ElementType;
  color?: 'green' | 'red' | 'yellow' | 'blue';
  onClick?: () => void;
}

export const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
  title,
  value,
  change,
  changeLabel,
  sparklineData,
  icon: Icon,
  color = 'blue',
  onClick
}) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${onClick ? 'hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm text-gray-600">{title}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-gray-500">{changeLabel}</div>
        </div>

        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData.map((val, idx) => ({ value: val, index: idx }))}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={change > 0 ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 2. Mobile-Responsive Chart Container

```tsx
// ResponsiveChartContainer.tsx
import React from 'react';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, Maximize2, MoreVertical } from 'lucide-react';

interface ResponsiveChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onExport?: () => void;
  onFullscreen?: () => void;
  actions?: React.ReactNode;
}

export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  title,
  subtitle,
  children,
  onExport,
  onFullscreen,
  actions
}) => {
  const { isMobile } = useBreakpoint();
  const [showActions, setShowActions] = React.useState(false);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          
          {isMobile ? (
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 p-1">
                  {onExport && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={onExport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  )}
                  {onFullscreen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={onFullscreen}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                  )}
                  {actions}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {onExport && (
                <Button size="sm" variant="outline" onClick={onExport}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {onFullscreen && (
                <Button size="sm" variant="outline" onClick={onFullscreen}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className={isMobile ? 'h-64' : 'h-80'}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 3. Advanced Filter Panel

```tsx
// AdvancedFilterPanel.tsx
import React, { useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Filter, RefreshCw, Save, X } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useWindowSize';

interface FilterState {
  dateRange: [Date | null, Date | null];
  categories: string[];
  vendors: string[];
  paymentMethods: string[];
  approvalStatus: string[];
  amountRange: [number, number];
}

interface AdvancedFilterPanelProps {
  categories: Array<{ id: string; name: string }>;
  vendors: string[];
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  savedPresets?: Array<{ id: string; name: string; filters: FilterState }>;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  categories,
  vendors,
  onApply,
  onReset,
  savedPresets = []
}) => {
  const { isMobile } = useBreakpoint();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: [null, null],
    categories: [],
    vendors: [],
    paymentMethods: [],
    approvalStatus: [],
    amountRange: [0, 100000]
  });

  const quickRanges = [
    { label: 'Today', getValue: () => [new Date(), new Date()] },
    { label: 'This Week', getValue: () => {
      const now = new Date();
      const start = new Date(now.setDate(now.getDate() - now.getDay()));
      return [start, new Date()];
    }},
    { label: 'This Month', getValue: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    }},
    { label: 'Last Month', getValue: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return [lastMonth, lastDay];
    }},
    { label: 'This Quarter', getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return [start, now];
    }},
    { label: 'This Year', getValue: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), now];
    }}
  ];

  if (isMobile) {
    return (
      <>
        <Button
          onClick={() => setIsExpanded(true)}
          size="sm"
          className="w-full mb-4"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters {filters.categories.length + filters.vendors.length > 0 && 
            `(${filters.categories.length + filters.vendors.length})`}
        </Button>

        {isExpanded && (
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Mobile filter content */}
              <FilterContent 
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                vendors={vendors}
                quickRanges={quickRanges}
                isMobile={true}
              />

              <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
                <Button onClick={() => onReset()} variant="outline" className="flex-1">
                  Reset
                </Button>
                <Button 
                  onClick={() => {
                    onApply(filters);
                    setIsExpanded(false);
                  }}
                  className="flex-1"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Card className="p-4 mb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={() => onApply(filters)}>
              Apply
            </Button>
          </div>
        </div>

        <FilterContent 
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          vendors={vendors}
          quickRanges={quickRanges}
          isMobile={false}
        />
      </div>
    </Card>
  );
};

// Shared filter content component
const FilterContent: React.FC<any> = ({ 
  filters, 
  setFilters, 
  categories, 
  vendors, 
  quickRanges,
  isMobile 
}) => (
  <>
    <div>
      <label className="text-sm font-medium mb-2 block">Date Range</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {quickRanges.map(range => (
          <Button
            key={range.label}
            size="sm"
            variant="outline"
            onClick={() => setFilters({ ...filters, dateRange: range.getValue() })}
          >
            {range.label}
          </Button>
        ))}
      </div>
      <Calendar
        value={filters.dateRange}
        onChange={(e) => setFilters({ ...filters, dateRange: e.value as [Date, Date] })}
        selectionMode="range"
        readOnlyInput
        showIcon
        className="w-full"
      />
    </div>

    <div>
      <label className="text-sm font-medium mb-2 block">Categories</label>
      <MultiSelect
        value={filters.categories}
        onChange={(e) => setFilters({ ...filters, categories: e.value })}
        options={categories}
        optionLabel="name"
        optionValue="id"
        placeholder="Select Categories"
        className="w-full"
        display="chip"
      />
    </div>

    <div>
      <label className="text-sm font-medium mb-2 block">Vendors</label>
      <MultiSelect
        value={filters.vendors}
        onChange={(e) => setFilters({ ...filters, vendors: e.value })}
        options={vendors.map(v => ({ label: v, value: v }))}
        optionLabel="label"
        optionValue="value"
        placeholder="Select Vendors"
        className="w-full"
        display="chip"
      />
    </div>

    <div>
      <label className="text-sm font-medium mb-2 block">Approval Status</label>
      <MultiSelect
        value={filters.approvalStatus}
        onChange={(e) => setFilters({ ...filters, approvalStatus: e.value })}
        options={[
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' }
        ]}
        optionLabel="label"
        optionValue="value"
        placeholder="Select Status"
        className="w-full"
      />
    </div>
  </>
);
```

### 4. Interactive Gauge Chart for Budget Utilization

```tsx
// BudgetGauge.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface BudgetGaugeProps {
  value: number; // 0-100 percentage
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BudgetGauge: React.FC<BudgetGaugeProps> = ({ 
  value, 
  label, 
  size = 'md' 
}) => {
  const data = [
    { value: value },
    { value: 100 - value }
  ];

  const getColor = () => {
    if (value < 60) return '#10b981'; // green
    if (value < 80) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const sizes = {
    sm: { width: 100, height: 60 },
    md: { width: 150, height: 90 },
    lg: { width: 200, height: 120 }
  };

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={sizes[size].width} height={sizes[size].height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="60%"
            outerRadius="100%"
            dataKey="value"
          >
            <Cell fill={getColor()} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <div className="text-2xl font-bold">{value}%</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>
  );
};
```

### 5. Heatmap Calendar Component

```tsx
// ExpenseHeatmap.tsx
import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'primereact/tooltip';

interface ExpenseHeatmapProps {
  data: Array<{ date: string; count: number; amount: number }>;
  startDate: Date;
  endDate: Date;
  onDayClick?: (day: any) => void;
}

export const ExpenseHeatmap: React.FC<ExpenseHeatmapProps> = ({
  data,
  startDate,
  endDate,
  onDayClick
}) => {
  const maxAmount = Math.max(...data.map(d => d.amount));

  const getClassForValue = (value: any) => {
    if (!value || !value.amount) return 'color-empty';
    const ratio = value.amount / maxAmount;
    if (ratio < 0.25) return 'color-scale-1';
    if (ratio < 0.5) return 'color-scale-2';
    if (ratio < 0.75) return 'color-scale-3';
    return 'color-scale-4';
  };

  return (
    <div className="expense-heatmap">
      <style>{`
        .expense-heatmap .color-empty { fill: #f3f4f6; }
        .expense-heatmap .color-scale-1 { fill: #bbf7d0; }
        .expense-heatmap .color-scale-2 { fill: #86efac; }
        .expense-heatmap .color-scale-3 { fill: #4ade80; }
        .expense-heatmap .color-scale-4 { fill: #22c55e; }
        .expense-heatmap rect:hover { stroke: #000; stroke-width: 1px; }
      `}</style>
      
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={data}
        classForValue={getClassForValue}
        onClick={onDayClick}
        tooltipDataAttrs={(value: any) => {
          if (!value || !value.date) return {};
          return {
            'data-pr-tooltip': `Date: ${value.date}\nExpenses: ${value.count}\nTotal: ₹${value.amount?.toFixed(2) || 0}`,
            'data-pr-position': 'top'
          };
        }}
      />
      <Tooltip target=".expense-heatmap rect" />
      
      <div className="flex items-center justify-end gap-2 mt-2 text-xs">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-100"></div>
          <div className="w-3 h-3 bg-green-200"></div>
          <div className="w-3 h-3 bg-green-300"></div>
          <div className="w-3 h-3 bg-green-400"></div>
          <div className="w-3 h-3 bg-green-500"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
```

### 6. Mobile-Optimized Swipeable Tabs

```tsx
// SwipeableTabs.tsx
import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface SwipeableTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export const SwipeableTabs: React.FC<SwipeableTabsProps> = ({
  tabs,
  defaultTab
}) => {
  const [activeTab, setActiveTab] = useState(
    defaultTab || tabs[0]?.id
  );

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="w-full">
      <div className="flex border-b mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Swiper
        spaceBetween={20}
        slidesPerView={1}
        initialSlide={activeIndex}
        onSlideChange={(swiper) => {
          setActiveTab(tabs[swiper.activeIndex]?.id);
        }}
      >
        {tabs.map((tab) => (
          <SwiperSlide key={tab.id}>
            <div className="min-h-[400px]">
              {tab.content}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
```

## Usage Example in ExpenseManagement.tsx

```tsx
// Enhanced Reports Tab Implementation
import { EnhancedKPICard } from './components/EnhancedKPICard';
import { ResponsiveChartContainer } from './components/ResponsiveChartContainer';
import { AdvancedFilterPanel } from './components/AdvancedFilterPanel';
import { BudgetGauge } from './components/BudgetGauge';
import { ExpenseHeatmap } from './components/ExpenseHeatmap';
import { SwipeableTabs } from './components/SwipeableTabs';

// In your reports view:
{viewMode === 'reports' && (
  <>
    {/* Enhanced KPI Cards Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <EnhancedKPICard
        title="Total Expenses"
        value={`₹${reportData.totalActual.toFixed(2)}`}
        change={12.5}
        changeLabel="vs last month"
        sparklineData={[100, 120, 115, 130, 125, 140, 135]}
        icon={DollarSign}
        color="blue"
        onClick={() => console.log('View details')}
      />
      
      <EnhancedKPICard
        title="Budget Remaining"
        value={`₹${(reportData.totalBudget - reportData.totalActual).toFixed(2)}`}
        change={-8.2}
        changeLabel="vs last month"
        sparklineData={[80, 75, 70, 65, 60, 55, 50]}
        icon={TrendingDown}
        color={reportData.totalBudget - reportData.totalActual > 0 ? 'green' : 'red'}
      />
      
      <EnhancedKPICard
        title="Avg Daily Expense"
        value={`₹${(reportData.totalActual / 30).toFixed(2)}`}
        change={5.7}
        changeLabel="vs last month"
        sparklineData={[50, 55, 52, 58, 60, 57, 62]}
        icon={Calendar}
        color="yellow"
      />
      
      <EnhancedKPICard
        title="Categories Used"
        value={reportData.items.length}
        change={0}
        changeLabel="active categories"
        sparklineData={[5, 5, 6, 6, 7, 7, 7]}
        icon={Tag}
        color="green"
      />
    </div>

    {/* Advanced Filters */}
    <AdvancedFilterPanel
      categories={categories}
      vendors={uniqueVendors}
      onApply={handleAdvancedFilters}
      onReset={resetFilters}
    />

    {/* Budget Utilization Gauges */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {reportData.items.slice(0, 4).map(item => (
        <div key={item.categoryId} className="bg-white rounded-lg p-4 border">
          <BudgetGauge
            value={Math.round((item.actual / item.budget) * 100)}
            label={item.categoryName}
            size="sm"
          />
        </div>
      ))}
    </div>

    {/* Expense Heatmap */}
    <ResponsiveChartContainer
      title="Expense Activity Heatmap"
      subtitle="Daily expense patterns over time"
      onExport={() => exportHeatmapData()}
    >
      <ExpenseHeatmap
        data={heatmapData}
        startDate={new Date(reportMonth + '-01')}
        endDate={new Date()}
        onDayClick={handleDayClick}
      />
    </ResponsiveChartContainer>

    {/* Mobile-Optimized Tab View */}
    {isMobile ? (
      <SwipeableTabs
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <OverviewCharts />
          },
          {
            id: 'categories',
            label: 'Categories',
            content: <CategoryAnalysis />
          },
          {
            id: 'trends',
            label: 'Trends',
            content: <TrendAnalysis />
          },
          {
            id: 'forecast',
            label: 'Forecast',
            content: <ForecastView />
          }
        ]}
      />
    ) : (
      // Desktop tab view (existing implementation)
      <Tabs defaultValue="overview">
        {/* ... */}
      </Tabs>
    )}
  </>
)}
```

## Quick CSS Improvements

```css
/* Add to your global CSS or component styles */

/* Smooth animations */
.chart-enter {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile-optimized touch targets */
@media (max-width: 768px) {
  button, .clickable {
    min-height: 44px;
    min-width: 44px;
  }
  
  .chart-container {
    touch-action: pan-y pinch-zoom;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dashboard-card {
    background: #1f2937;
    border-color: #374151;
  }
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  .chart-container {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

## Performance Optimizations

```tsx
// Use React.memo for expensive components
export const ExpensiveChart = React.memo(({ data }) => {
  // Chart implementation
}, (prevProps, nextProps) => {
  // Custom comparison logic
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

// Use lazy loading for heavy components
const HeavyAnalytics = React.lazy(() => import('./HeavyAnalytics'));

// Use virtualization for long lists
import { FixedSizeList } from 'react-window';

const VirtualizedExpenseList = ({ expenses }) => (
  <FixedSizeList
    height={600}
    itemCount={expenses.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <ExpenseRow expense={expenses[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

## Next Steps for Implementation

1. **Start with KPI cards** - Quick win, immediate visual improvement
2. **Add mobile responsiveness** - Critical for small hotel staff on-the-go
3. **Implement advanced filters** - Better data exploration
4. **Add gauge charts** - Visual budget tracking
5. **Deploy heatmap** - Pattern recognition
6. **Optimize performance** - Ensure smooth experience

## Testing Checklist

- [ ] Test on mobile devices (iOS/Android)
- [ ] Test on tablets (portrait/landscape)
- [ ] Test with large datasets (1000+ expenses)
- [ ] Test offline functionality
- [ ] Test export functions
- [ ] Test keyboard navigation
- [ ] Test with screen readers
- [ ] Test print layouts
- [ ] Test in different browsers
- [ ] Test dark mode
