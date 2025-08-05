import React, { useState, useEffect } from 'react';
import { useProperty } from '../../contexts/PropertyContext';
import { MultiPropertyPricingRule, Property, RoomType } from '../../types/property';
import { propertyService, PricingRule } from '../../services/propertyService';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface PricingManagementProps {
  className?: string;
}

const PricingManagement: React.FC<PricingManagementProps> = ({ className = '' }) => {
  const { currentProperty, properties } = useProperty();
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'rules' | 'comparison' | 'overview'>('overview');

  useEffect(() => {
    loadPricingRules();
  }, [currentProperty]);

  const loadPricingRules = async () => {
    try {
      setLoading(true);
      if (currentProperty?.id) {
        const rules = await propertyService.getPricingRules(currentProperty.id);
        setPricingRules(rules);
      }
    } catch (error) {
      console.error('Failed to load pricing rules:', error);
      setPricingRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setShowAddForm(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setEditingRule(rule);
    setShowAddForm(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this pricing rule?')) {
      try {
        await propertyService.deletePricingRule(ruleId);
        setPricingRules(prev => prev.filter(rule => rule.id !== ruleId));
      } catch (error) {
        console.error('Failed to delete pricing rule:', error);
      }
    }
  };

  const handleFormSubmit = async (data: Partial<PricingRule>) => {
    try {
      if (editingRule) {
        // Update existing rule
        const updatedRule = await propertyService.updatePricingRule(editingRule.id, data);
        setPricingRules(prev => prev.map(rule => 
          rule.id === editingRule.id ? updatedRule : rule
        ));
      } else {
        // Add new rule
        const newRuleData: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'> = {
          propertyId: currentProperty?.id || '',
          ruleName: 'New Pricing Rule',
          roomType: 'standard',
          seasonType: 'regular',
          basePrice: 2000,
          weekendMultiplier: 1.2,
          minimumStay: 1,
          maximumStay: 30,
          advanceBookingDays: 0,
          isActive: true,
          validFrom: new Date().toISOString().split('T')[0],
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ...data
        };
        const newRule = await propertyService.createPricingRule(newRuleData);
        setPricingRules(prev => [...prev, newRule]);
      }
      setShowAddForm(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save pricing rule:', error);
    }
  };

  const filteredRules = selectedProperty === 'all' 
    ? pricingRules 
    : pricingRules.filter(rule => rule.propertyId === selectedProperty);

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };

  const calculatePriceComparison = () => {
    const comparison = properties.map(property => {
      const propertyRules = pricingRules.filter(rule => rule.propertyId === property.id);
      const avgPrice = propertyRules.length > 0 
        ? propertyRules.reduce((sum, rule) => sum + rule.basePrice, 0) / propertyRules.length
        : 0;
      
      return {
        property,
        avgPrice,
        ruleCount: propertyRules.length,
        priceRange: {
          min: Math.min(...propertyRules.map(r => r.basePrice)),
          max: Math.max(...propertyRules.map(r => r.basePrice))
        }
      };
    });
    
    return comparison;
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
              <CurrencyDollarIcon className="h-6 w-6 mr-2 text-green-600" />
              Multi-Property Pricing Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage pricing strategies across all properties
            </p>
          </div>
          <button
            onClick={handleAddRule}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Pricing Rule
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 p-1 rounded-lg">
          {[
            { key: 'overview', label: 'Overview', icon: ChartBarIcon },
            { key: 'rules', label: 'Pricing Rules', icon: CurrencyDollarIcon },
            { key: 'comparison', label: 'Property Comparison', icon: ArrowTrendingUpIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'overview' && (
          <PricingOverview 
            pricingRules={pricingRules} 
            properties={properties}
            onViewRules={() => setViewMode('rules')}
            onViewComparison={() => setViewMode('comparison')}
          />
        )}

        {viewMode === 'rules' && (
          <PricingRulesView
            pricingRules={filteredRules}
            properties={properties}
            selectedProperty={selectedProperty}
            onPropertyChange={setSelectedProperty}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            getPropertyName={getPropertyName}
          />
        )}

        {viewMode === 'comparison' && (
          <PricingComparisonView
            comparison={calculatePriceComparison()}
          />
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <PricingRuleForm
          rule={editingRule}
          properties={properties}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowAddForm(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

// Pricing Overview Component
interface PricingOverviewProps {
  pricingRules: PricingRule[];
  properties: Property[];
  onViewRules: () => void;
  onViewComparison: () => void;
}

const PricingOverview: React.FC<PricingOverviewProps> = ({ 
  pricingRules, 
  properties, 
  onViewRules, 
  onViewComparison 
}) => {
  const totalRules = pricingRules.length;
  const activeRules = pricingRules.filter(rule => rule.isActive).length;
  const avgPrice = pricingRules.length > 0 
    ? pricingRules.reduce((sum, rule) => sum + rule.basePrice, 0) / pricingRules.length 
    : 0;

  const priceRange = pricingRules.length > 0 ? {
    min: Math.min(...pricingRules.map(r => r.basePrice)),
    max: Math.max(...pricingRules.map(r => r.basePrice))
  } : { min: 0, max: 0 };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{totalRules}</div>
          <div className="text-sm text-blue-800">Total Pricing Rules</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{activeRules}</div>
          <div className="text-sm text-green-800">Active Rules</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">₹{Math.round(avgPrice)}</div>
          <div className="text-sm text-purple-800">Average Price</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            ₹{priceRange.min} - ₹{priceRange.max}
          </div>
          <div className="text-sm text-orange-800">Price Range</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={onViewRules}
          className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Manage Pricing Rules</h3>
              <p className="text-gray-600 text-sm">Create and edit property-specific pricing strategies</p>
            </div>
          </div>
        </div>
        
        <div 
          onClick={onViewComparison}
          className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Compare Properties</h3>
              <p className="text-gray-600 text-sm">Analyze pricing strategies across properties</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Rules */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pricing Rules</h3>
        <div className="space-y-3">
          {pricingRules.slice(0, 3).map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">
                  {properties.find(p => p.id === rule.propertyId)?.name} - {rule.roomType}
                </div>
                <div className="text-sm text-gray-600">
                  ₹{rule.basePrice} • {rule.seasonType} season
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${
                rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {rule.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pricing Rules View Component
interface PricingRulesViewProps {
  pricingRules: PricingRule[];
  properties: Property[];
  selectedProperty: string;
  onPropertyChange: (propertyId: string) => void;
  onEditRule: (rule: PricingRule) => void;
  onDeleteRule: (ruleId: string) => void;
  getPropertyName: (propertyId: string) => string;
}

const PricingRulesView: React.FC<PricingRulesViewProps> = ({
  pricingRules,
  properties,
  selectedProperty,
  onPropertyChange,
  onEditRule,
  onDeleteRule,
  getPropertyName
}) => {
  return (
    <div className="space-y-4">
      {/* Property Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Property:</label>
        <select
          value={selectedProperty}
          onChange={(e) => onPropertyChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">All Properties</option>
          {properties.map(property => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {pricingRules.map(rule => (
          <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {getPropertyName(rule.propertyId)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {rule.roomType} • {rule.seasonType} season
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">₹{rule.basePrice}</div>
                    <div className="text-xs text-gray-500">base price</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {rule.weekendMultiplier}x
                    </div>
                    <div className="text-xs text-gray-500">weekend</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {rule.minimumStay}-{rule.maximumStay} nights
                    </div>
                    <div className="text-xs text-gray-500">stay range</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  <span>Valid: {rule.validFrom} to {rule.validTo}</span>
                  <span>Advance booking: {rule.advanceBookingDays} days</span>
                  <span className={`px-2 py-1 rounded-full ${
                    rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEditRule(rule)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pricingRules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No pricing rules found for the selected property.
        </div>
      )}
    </div>
  );
};

// Pricing Comparison View Component
interface PricingComparisonViewProps {
  comparison: Array<{
    property: Property;
    avgPrice: number;
    ruleCount: number;
    priceRange: { min: number; max: number };
  }>;
}

const PricingComparisonView: React.FC<PricingComparisonViewProps> = ({ comparison }) => {
  const maxPrice = Math.max(...comparison.map(c => c.avgPrice));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Property Pricing Comparison</h3>
      
      <div className="space-y-4">
        {comparison.map(({ property, avgPrice, ruleCount, priceRange }) => (
          <div key={property.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{property.name}</h4>
                <p className="text-sm text-gray-600">{property.location}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">₹{Math.round(avgPrice)}</div>
                <div className="text-xs text-gray-500">average price</div>
              </div>
            </div>
            
            {/* Price Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>₹{priceRange.min}</span>
                <span>₹{priceRange.max}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(avgPrice / maxPrice) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{ruleCount} pricing rules</span>
              <div className="flex items-center space-x-2">
                {avgPrice === maxPrice ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />
                )}
                <span className={avgPrice === maxPrice ? 'text-red-600' : 'text-green-600'}>
                  {avgPrice === maxPrice ? 'Highest' : 'Competitive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pricing Rule Form Component
interface PricingRuleFormProps {
  rule: PricingRule | null;
  properties: Property[];
  onSubmit: (data: Partial<PricingRule>) => void;
  onCancel: () => void;
}

const PricingRuleForm: React.FC<PricingRuleFormProps> = ({ rule, properties, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    propertyId: rule?.propertyId || properties[0]?.id || '',
    roomType: rule?.roomType || 'standard' as RoomType,
    seasonType: rule?.seasonType || 'regular' as 'peak' | 'off-peak' | 'regular',
    basePrice: rule?.basePrice || 2000,
    weekendMultiplier: rule?.weekendMultiplier || 1.2,
    minimumStay: rule?.minimumStay || 1,
    maximumStay: rule?.maximumStay || 30,
    advanceBookingDays: rule?.advanceBookingDays || 0,
    isActive: rule?.isActive ?? true,
    validFrom: rule?.validFrom || new Date().toISOString().split('T')[0],
    validTo: rule?.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const roomTypes: { value: RoomType; label: string }[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'deluxe', label: 'Deluxe' },
    { value: 'twin_single', label: 'Twin Single' },
    { value: 'suite', label: 'Suite' },
    { value: 'dormitory', label: 'Dormitory' },
  ];

  const seasonTypes = [
    { value: 'regular', label: 'Regular Season' },
    { value: 'peak', label: 'Peak Season' },
    { value: 'off-peak', label: 'Off-Peak Season' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {rule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </label>
                <select
                  value={formData.roomType}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomType: e.target.value as RoomType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roomTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Season Type
                </label>
                <select
                  value={formData.seasonType}
                  onChange={(e) => setFormData(prev => ({ ...prev, seasonType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {seasonTypes.map(season => (
                    <option key={season.value} value={season.value}>
                      {season.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (₹/night)
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weekend Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weekendMultiplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekendMultiplier: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stay (nights)
                </label>
                <input
                  type="number"
                  value={formData.minimumStay}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumStay: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Stay (nights)
                </label>
                <input
                  type="number"
                  value={formData.maximumStay}
                  onChange={(e) => setFormData(prev => ({ ...prev, maximumStay: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Booking (days)
                </label>
                <input
                  type="number"
                  value={formData.advanceBookingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid To
                </label>
                <input
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active pricing rule
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {rule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PricingManagement;