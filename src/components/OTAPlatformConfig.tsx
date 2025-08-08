// OTA Platform Configuration Component
// Story 4.2: Task 6 - Platform Integration Components

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Building,
  Globe,
  Copy,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ICalService } from '../services/icalService';
import { OTAPlatformService } from '../services/otaPlatformService';
import { useProperty } from '../contexts/PropertyContext';
import { toast } from 'react-hot-toast';
import type { 
  OTAPlatform, 
  PlatformConfig,
  AirbnbConfig,
  VRBOConfig,
  BookingComConfig,
  GoMMTConfig,
  PropertyOTAPlatform
} from '../types/ota';

interface OTAPlatformConfigProps {
  platformId?: string;
  onSave?: (platform: OTAPlatform | PropertyOTAPlatform) => void;
}

export const OTAPlatformConfig: React.FC<OTAPlatformConfigProps> = ({
  platformId,
  onSave
}) => {
  const { currentProperty, properties } = useProperty();
  const [platforms, setPlatforms] = useState<PropertyOTAPlatform[]>([]);
  const [globalPlatforms, setGlobalPlatforms] = useState<OTAPlatform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PropertyOTAPlatform | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [viewMode, setViewMode] = useState<'property' | 'global'>('property');

  useEffect(() => {
    if (currentProperty) {
      loadPlatforms();
    }
  }, [currentProperty]);

  useEffect(() => {
    if (platformId && platforms.length > 0) {
      const platform = platforms.find(p => p.platform_id === platformId);
      setSelectedPlatform(platform || null);
    }
  }, [platformId, platforms]);

  /**
   * Load platforms for current property
   */
  const loadPlatforms = async () => {
    if (!currentProperty) return;
    
    try {
      setLoading(true);
      
      if (viewMode === 'property') {
        // Load property-specific platforms (with fallback to global)
        const propertyPlatforms = await OTAPlatformService.getPlatformsForProperty(currentProperty.id);
        setPlatforms(propertyPlatforms);
        
        if (!platformId && propertyPlatforms.length > 0) {
          setSelectedPlatform(propertyPlatforms[0]);
        }
      } else {
        // Load global platforms
        const globals = await OTAPlatformService.getGlobalPlatforms();
        setGlobalPlatforms(globals);
        
        // Convert to PropertyOTAPlatform format for consistency
        const converted: PropertyOTAPlatform[] = globals.map(p => ({
          property_id: currentProperty.id,
          property_name: currentProperty.name,
          platform_id: p.id,
          platform_name: p.name,
          display_name: p.display_name || p.name,
          type: p.type,
          manual_update_required: p.manual_update_required,
          sync_enabled: p.sync_enabled,
          is_active: p.active || p.is_active || false,
          configuration: p.configuration || p.config || {},
          ical_import_url: p.ical_import_url,
          ical_export_url: p.ical_export_url,
          config_type: 'global'
        }));
        
        setPlatforms(converted);
        if (!platformId && converted.length > 0) {
          setSelectedPlatform(converted[0]);
        }
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save platform configuration
   */
  const savePlatform = async () => {
    if (!selectedPlatform || !currentProperty) return;

    try {
      setSaving(true);
      
      if (viewMode === 'property') {
        // Save property-specific configuration
        await OTAPlatformService.savePropertyPlatformConfig(
          currentProperty.id,
          selectedPlatform.platform_id,
          {
            sync_enabled: selectedPlatform.sync_enabled,
            configuration: selectedPlatform.configuration,
            ical_import_url: selectedPlatform.ical_import_url,
            ical_export_url: selectedPlatform.ical_export_url
          }
        );
      } else {
        // Save global configuration
        await OTAPlatformService.saveGlobalPlatformConfig(
          selectedPlatform.platform_id,
          {
            display_name: selectedPlatform.display_name,
            sync_enabled: selectedPlatform.sync_enabled,
            configuration: selectedPlatform.configuration,
            ical_import_url: selectedPlatform.ical_import_url,
            ical_export_url: selectedPlatform.ical_export_url,
            is_active: selectedPlatform.is_active
          }
        );
      }

      // Reload platforms to get updated data
      await loadPlatforms();
      
      onSave?.(selectedPlatform);
      setTestResult({ success: true, message: 'Configuration saved successfully!' });
    } catch (error) {
      console.error('Error saving platform:', error);
      setTestResult({ success: false, message: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Test platform connection
   */
  const testConnection = async () => {
    if (!selectedPlatform || !currentProperty) return;

    try {
      setTesting(true);
      setTestResult(null);

      const result = await OTAPlatformService.testPlatformConnection(
        currentProperty.id,
        selectedPlatform.platform_name
      );

      setTestResult(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      });
    } finally {
      setTesting(false);
    }
  };



  /**
   * Copy global configuration to property-specific
   */
  const copyGlobalToProperty = async () => {
    if (!selectedPlatform || !currentProperty) return;

    try {
      setSaving(true);
      
      // Create property-specific configuration
      const propertyConfig = {
        ...selectedPlatform,
        config_type: 'property_specific' as const
      };
      
      setSelectedPlatform(propertyConfig);
      
      // Save to database
      await OTAPlatformService.savePropertyPlatformConfig(
        currentProperty.id,
        selectedPlatform.platform_id,
        {
          sync_enabled: selectedPlatform.sync_enabled,
          configuration: selectedPlatform.configuration,
          ical_import_url: selectedPlatform.ical_import_url,
          ical_export_url: selectedPlatform.ical_export_url
        }
      );
      
      await loadPlatforms();
      toast.success('Configuration customized for this property');
    } catch (error) {
      console.error('Error copying configuration:', error);
      toast.error('Failed to customize configuration');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete property-specific configuration and revert to global
   */
  const deletePropertyConfig = async () => {
    if (!selectedPlatform || !currentProperty) return;

    try {
      setSaving(true);
      
      await OTAPlatformService.deletePropertyPlatformConfig(
        currentProperty.id,
        selectedPlatform.platform_id
      );
      
      await loadPlatforms();
      toast.success('Reverted to global configuration');
    } catch (error) {
      console.error('Error deleting property configuration:', error);
      toast.error('Failed to revert configuration');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update platform field
   */
  const updatePlatformField = (field: keyof PropertyOTAPlatform, value: any) => {
    if (!selectedPlatform) return;
    
    setSelectedPlatform(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const updateConfig = (field: string, value: any) => {
    if (!selectedPlatform) return;
    
    setSelectedPlatform(prev => prev ? {
      ...prev,
      configuration: {
        ...prev.configuration,
        [field]: value
      }
    } : null);
  };



  /**
   * Add new platform
   */
  const addNewPlatform = () => {
    if (!currentProperty) return;
    
    const newPlatform: PropertyOTAPlatform = {
      property_id: currentProperty.id,
      property_name: currentProperty.name,
      platform_id: `new-${Date.now()}`,
      platform_name: 'New Platform',
      display_name: 'New Platform',
      type: 'other',
      manual_update_required: true,
      sync_enabled: false,
      is_active: true,
      configuration: {},
      config_type: viewMode === 'property' ? 'property_specific' : 'global'
    };
    
    setSelectedPlatform(newPlatform);
  };

  /**
   * Delete platform
   */
  const deletePlatform = async () => {
    if (!selectedPlatform) return;

    try {
      // If it's a new platform (not saved yet), just remove from local state
      if (selectedPlatform.platform_id.startsWith('new-')) {
        setPlatforms(prev => prev.filter(p => p.platform_id !== selectedPlatform.platform_id));
        setSelectedPlatform(null);
        return;
      }

      // Delete from database
      const { error } = await supabase
        .from('ota_platforms')
        .delete()
        .eq('platform_id', selectedPlatform.platform_id);

      if (error) throw error;

      // Remove from local state
      setPlatforms(prev => prev.filter(p => p.platform_id !== selectedPlatform.platform_id));
      setSelectedPlatform(null);
      
      toast.success('Platform deleted successfully');
    } catch (error) {
      console.error('Error deleting platform:', error);
      toast.error('Failed to delete platform');
    }
  };

  /**
   * Render platform-specific configuration
   */
  const renderPlatformConfig = () => {
    if (!selectedPlatform) return null;

    const platformName = selectedPlatform.platform_name.toLowerCase();
    
    switch (platformName) {
      case 'airbnb':
        return renderAirbnbConfig();
      case 'vrbo':
        return renderVRBOConfig();
      case 'booking.com':
      case 'booking_com':
        return renderBookingComConfig();
      case 'gommt':
      case 'makemytrip':
        return renderGoMMTConfig();
      default:
        return renderGenericConfig();
    }
  };

  /**
   * Render Airbnb configuration
   */
  const renderAirbnbConfig = () => {
    const config = selectedPlatform?.configuration as AirbnbConfig;
    
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Airbnb Configuration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calendar Export URL
          </label>
          <input
            type="url"
            value={config?.calendar_export_url ?? ''}
            onChange={(e) => updateConfig('calendar_export_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://www.airbnb.com/calendar/ical/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property ID
          </label>
          <input
            type="text"
            value={config?.property_id ?? ''}
            onChange={(e) => updateConfig('property_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Airbnb property ID"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="airbnb-auto-accept"
            checked={config?.auto_accept_bookings ?? false}
            onChange={(e) => updateConfig('auto_accept_bookings', e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="airbnb-auto-accept" className="text-sm text-gray-700">
            Auto-accept bookings
          </label>
        </div>
      </div>
    );
  };

  /**
   * Render VRBO configuration
   */
  const renderVRBOConfig = () => {
    const config = selectedPlatform?.configuration as VRBOConfig;
    
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">VRBO Configuration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            iCal URL
          </label>
          <input
            type="url"
            value={config?.ical_url ?? ''}
            onChange={(e) => updateConfig('ical_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://www.vrbo.com/calendar/ical/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Manager ID
          </label>
          <input
            type="text"
            value={config?.property_manager_id ?? ''}
            onChange={(e) => updateConfig('property_manager_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="VRBO property manager ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listing ID
          </label>
          <input
            type="text"
            value={config?.listing_id ?? ''}
            onChange={(e) => updateConfig('listing_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="VRBO listing ID"
          />
        </div>
      </div>
    );
  };

  /**
   * Render Booking.com configuration
   */
  const renderBookingComConfig = () => {
    const config = selectedPlatform?.configuration as BookingComConfig;
    
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Booking.com Configuration</h4>
        
        {/* Sync Method Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Synchronization Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="booking_sync_method"
                value="ical"
                checked={(config?.update_method || 'ical') === 'ical'}
                onChange={(e) => updateConfig('update_method', 'ical')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">iCal Synchronization (Recommended)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="booking_sync_method"
                value="extranet_calendar"
                checked={config?.update_method === 'extranet_calendar'}
                onChange={(e) => updateConfig('update_method', 'extranet_calendar')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Manual Extranet Updates</span>
            </label>
          </div>
        </div>
        
        {/* iCal Configuration */}
        {(config?.update_method || 'ical') === 'ical' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-3">iCal Synchronization Setup</h5>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  iCal Import URL (from Booking.com)
                </label>
                <input
                  type="url"
                  value={config?.ical_url ?? ''}
                  onChange={(e) => updateConfig('ical_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://admin.booking.com/hotel/hoteladmin/ical/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from Booking.com Extranet → Property → Calendar → iCal Export
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  iCal Export URL (to Booking.com)
                </label>
                <input
                  type="url"
                  value={config?.ical_export_url ?? ''}
                  onChange={(e) => updateConfig('ical_export_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://admin.booking.com/hotel/hoteladmin/ical/import/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Import URL from Booking.com Extranet → Property → Calendar → iCal Import
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Manual Configuration */}
        {config?.update_method === 'extranet_calendar' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-3">Manual Extranet Configuration</h5>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extranet Username
                </label>
                <input
                  type="text"
                  value={config?.extranet_username ?? ''}
                  onChange={(e) => updateConfig('extranet_username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Booking.com extranet username"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="booking-notifications"
                  checked={config?.email_notifications ?? false}
                  onChange={(e) => updateConfig('email_notifications', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="booking-notifications" className="text-sm text-gray-700">
                  Email notifications for manual updates
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Common Configuration */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property ID
            </label>
            <input
              type="text"
              value={config?.property_id ?? ''}
              onChange={(e) => updateConfig('property_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Booking.com property ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Update Frequency (hours)
            </label>
            <select
              value={config?.update_frequency_hours ?? 24}
              onChange={(e) => updateConfig('update_frequency_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={6}>Every 6 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Daily</option>
              <option value={48}>Every 2 days</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render GoMMT configuration
   */
  const renderGoMMTConfig = () => {
    const config = selectedPlatform?.configuration as GoMMTConfig;
    
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">GoMMT/MakeMyTrip Configuration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connect App Username
          </label>
          <input
            type="text"
            value={config?.connect_username ?? ''}
            onChange={(e) => updateConfig('connect_username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="GoMMT Connect app username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Code
          </label>
          <input
            type="text"
            value={config?.property_code ?? ''}
            onChange={(e) => updateConfig('property_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Property code in GoMMT system"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Update Reminder Time
          </label>
          <input
            type="time"
            value={config?.reminder_time ?? '09:00'}
            onChange={(e) => updateConfig('reminder_time', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="gommt-mobile-notifications"
            checked={config?.mobile_notifications ?? false}
            onChange={(e) => updateConfig('mobile_notifications', e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="gommt-mobile-notifications" className="text-sm text-gray-700">
            Mobile push notifications
          </label>
        </div>
      </div>
    );
  };

  /**
   * Render generic configuration
   */
  const renderGenericConfig = () => {
    const config = selectedPlatform?.configuration as Record<string, any>;
    
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Platform Configuration</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform URL
          </label>
          <input
            type="url"
            value={config?.platform_url ?? ''}
            onChange={(e) => updateConfig('platform_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Platform management URL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username/Email
          </label>
          <input
            type="text"
            value={config?.username ?? ''}
            onChange={(e) => updateConfig('username', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Platform username or email"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading platform configurations...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              OTA Platform Configuration
            </h3>
            {currentProperty && (
              <span className="text-sm text-gray-500">
                - {currentProperty.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode('property');
                  loadPlatforms();
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'property'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Property</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('global');
                  loadPlatforms();
                }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'global'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Global</span>
              </button>
            </div>
            
            {viewMode === 'global' && (
              <button
                onClick={addNewPlatform}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Platform
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Platform List */}
        <div className="w-1/3 border-r border-gray-200">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {viewMode === 'property' ? 'Property Platforms' : 'Global Platforms'}
              </h4>
              {viewMode === 'property' && (
                <span className="text-xs text-gray-500">
                  {platforms.filter(p => p.config_type === 'property_specific').length} custom
                </span>
              )}
            </div>
            <div className="space-y-2">
              {platforms.map(platform => (
                <button
                  key={`${platform.platform_id}-${platform.property_id}`}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedPlatform?.platform_id === platform.platform_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{platform.display_name || platform.platform_name}</span>
                      {viewMode === 'property' && platform.config_type === 'property_specific' && (
                        <Building className="w-3 h-3 text-blue-500" />
                      )}
                      {viewMode === 'property' && platform.config_type === 'global' && (
                        <Globe className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      {platform.sync_enabled ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {platform.is_active ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {platform.type} • {(() => {
                      // Show sync method based on platform configuration
                      if (platform.type === 'booking_com' || 
                          platform.platform_name?.toLowerCase() === 'booking.com' ||
                          platform.platform_name === 'booking_com') {
                        const config = platform.configuration as BookingComConfig;
                        return config?.update_method === 'extranet_calendar' ? 'Manual' : 'iCal';
                      } else if (platform.type === 'airbnb' || platform.type === 'vrbo' ||
                                 platform.platform_name?.toLowerCase() === 'airbnb' || 
                                 platform.platform_name?.toLowerCase() === 'vrbo' ||
                                 platform.platform_name === 'airbnb' ||
                                 platform.platform_name === 'vrbo') {
                        return 'iCal';
                      } else if (platform.ical_import_url || platform.ical_export_url) {
                        return 'iCal';
                      } else {
                        return platform.manual_update_required ? 'Manual' : 'Auto';
                      }
                    })()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Configuration */}
        <div className="flex-1 p-6">
          {selectedPlatform ? (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={selectedPlatform.display_name || selectedPlatform.platform_name}
                      onChange={(e) => updatePlatformField('display_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={viewMode === 'property'}
                    />
                    {viewMode === 'property' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Platform name can only be changed in global settings
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Type
                    </label>
                    <select
                      value={selectedPlatform.type}
                      onChange={(e) => {
                        const newType = e.target.value as PropertyOTAPlatform['type'];
                        updatePlatformField('type', newType);
                        // Auto-configure based on platform type
                        if (newType === 'booking_com') {
                          updatePlatformField('manual_update_required', false);
                          updatePlatformField('platform_name', 'Booking.com');
                          updatePlatformField('display_name', 'Booking.com');
                          // Set default to iCal method
                          updateConfig('update_method', 'ical');
                        } else if (newType === 'airbnb') {
                          updatePlatformField('manual_update_required', false);
                          updatePlatformField('platform_name', 'Airbnb');
                          updatePlatformField('display_name', 'Airbnb');
                        } else if (newType === 'vrbo') {
                          updatePlatformField('manual_update_required', false);
                          updatePlatformField('platform_name', 'VRBO');
                          updatePlatformField('display_name', 'VRBO');
                        } else {
                          updatePlatformField('manual_update_required', true);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={viewMode === 'property'}
                    >
                      <option value="airbnb">Airbnb</option>
                      <option value="vrbo">VRBO</option>
                      <option value="booking_com">Booking.com</option>
                      <option value="gommt">GoMMT/MakeMyTrip</option>
                      <option value="other">Other</option>
                    </select>
                    {viewMode === 'property' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Platform type can only be changed in global settings
                      </p>
                    )}
                  </div>
                </div>

                {(selectedPlatform.type === 'airbnb' || selectedPlatform.type === 'vrbo' || selectedPlatform.type === 'booking_com' || selectedPlatform.ical_import_url || selectedPlatform.ical_export_url) && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        iCal Import URL
                      </label>
                      <input
                        type="url"
                        value={selectedPlatform.ical_import_url ?? ''}
                        onChange={(e) => updatePlatformField('ical_import_url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://platform.com/calendar/ical/..."
                      />
                    </div>
                    
                    {viewMode === 'global' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          iCal Export URL
                        </label>
                        <input
                          type="url"
                          value={selectedPlatform.ical_export_url ?? ''}
                          onChange={(e) => updatePlatformField('ical_export_url', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="https://your-domain.com/calendar/export/..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Configuration Type Indicator */}
                {viewMode === 'property' && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {selectedPlatform.config_type === 'property_specific' ? (
                          <>
                            <Building className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-900">Property-specific configuration</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">Using global configuration</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {selectedPlatform.config_type === 'global' && (
                          <button
                            onClick={copyGlobalToProperty}
                            disabled={saving}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Customize</span>
                          </button>
                        )}
                        
                        {selectedPlatform.config_type === 'property_specific' && (
                          <button
                            onClick={deletePropertyConfig}
                            disabled={saving}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Revert to Global</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {viewMode === 'global' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPlatform.is_active || false}
                        onChange={(e) => updatePlatformField('is_active', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlatform.sync_enabled || false}
                      onChange={(e) => updatePlatformField('sync_enabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Sync Enabled</span>
                  </label>
                  
                  {viewMode === 'global' && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedPlatform.manual_update_required || false}
                        onChange={(e) => updatePlatformField('manual_update_required', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Manual Updates Required</span>
                      {(selectedPlatform.type === 'airbnb' || selectedPlatform.type === 'vrbo' || selectedPlatform.type === 'booking_com') && (
                        <span className="ml-2 text-xs text-green-600">(iCal sync available)</span>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Configuration Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="config_type"
                      value="global"
                      checked={selectedPlatform.config_type === 'global'}
                      onChange={(e) => updatePlatformField('config_type', e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Global</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="config_type"
                      value="property_specific"
                      checked={selectedPlatform.config_type === 'property_specific'}
                      onChange={(e) => updatePlatformField('config_type', e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Property Specific</span>
                  </label>
                </div>
              </div>

              {/* Platform-specific Configuration */}
              {renderPlatformConfig()}



              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    )}
                    <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={testConnection}
                    disabled={testing}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center disabled:opacity-50"
                  >
                    <TestTube className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                  
                  {selectedPlatform.platform_id.startsWith('new-') && (
                    <button
                      onClick={deletePlatform}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
                
                <button
                  onClick={savePlatform}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                  Save Configuration
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Select a platform to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTAPlatformConfig;