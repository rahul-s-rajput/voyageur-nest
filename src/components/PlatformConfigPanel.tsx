import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Settings, Eye, EyeOff } from 'lucide-react';

interface PlatformConfig {
  id: string;
  propertyId: string;
  platform: 'booking.com' | 'gommt';
  enabled: boolean;
  credentials: {
    username?: string;
    password?: string;
    apiKey?: string;
    propertyId?: string;
    extranetUrl?: string;
    connectAppId?: string;
  };
  settings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    updateReminders: boolean;
    reminderTime: string; // HH:MM
    bulkUpdatePreference: 'csv' | 'json' | 'calendar-grid';
    validationLevel: 'basic' | 'strict';
    timeoutDuration: number; // seconds
  };
  lastSync?: Date;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformConfigPanelProps {
  propertyId: string;
  platform: 'booking.com' | 'gommt';
  onConfigSaved?: (config: PlatformConfig) => void;
}

const PlatformConfigPanel: React.FC<PlatformConfigPanelProps> = ({
  propertyId,
  platform,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<Partial<PlatformConfig>>({
    propertyId,
    platform,
    enabled: false,
    credentials: {},
    settings: {
      autoSync: false,
      syncInterval: 60,
      updateReminders: true,
      reminderTime: '09:00',
      bulkUpdatePreference: platform === 'booking.com' ? 'csv' : 'json',
      validationLevel: 'basic',
      timeoutDuration: 30
    },
    status: 'disconnected'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
  }, [propertyId, platform]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // Mock implementation - replace with actual API call
      const mockConfig: PlatformConfig = {
        id: '1',
        propertyId,
        platform,
        enabled: false,
        credentials: {},
        settings: {
          autoSync: false,
          syncInterval: 60,
          updateReminders: true,
          reminderTime: '09:00',
          bulkUpdatePreference: platform === 'booking.com' ? 'csv' : 'json',
          validationLevel: 'basic',
          timeoutDuration: 30
        },
        status: 'disconnected',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setConfig(mockConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {};

    if (platform === 'booking.com') {
      if (!config.credentials?.username) {
        errors.username = 'Username is required';
      }
      if (!config.credentials?.password) {
        errors.password = 'Password is required';
      }
      if (!config.credentials?.propertyId) {
        errors.propertyId = 'Property ID is required';
      }
    } else if (platform === 'gommt') {
      if (!config.credentials?.apiKey) {
        errors.apiKey = 'API Key is required';
      }
      if (!config.credentials?.connectAppId) {
        errors.connectAppId = 'Connect App ID is required';
      }
    }

    if (config.settings?.syncInterval && config.settings.syncInterval < 15) {
      errors.syncInterval = 'Sync interval must be at least 15 minutes';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testConnection = async () => {
    if (!validateConfig()) return;

    setIsTesting(true);
    try {
      // Mock connection test - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConfig(prev => ({
        ...prev,
        status: 'connected',
        errorMessage: undefined,
        lastSync: new Date()
      }));
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Connection failed. Please check your credentials.'
      }));
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!validateConfig()) return;

    setIsLoading(true);
    try {
      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const savedConfig = {
        ...config,
        id: config.id || '1',
        updatedAt: new Date()
      } as PlatformConfig;

      setConfig(savedConfig);
      onConfigSaved?.(savedConfig);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCredentials = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value
      }
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateSettings = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [field]: value
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'pending': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const platformName = platform === 'booking.com' ? 'Booking.com' : 'GoMMT';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {platformName} Configuration
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure connection and sync settings for {platformName}
          </p>
        </div>
        
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(config.status!)}`}>
          {getStatusIcon(config.status!)}
          <span className="capitalize">{config.status}</span>
        </div>
      </div>

      {config.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900">Connection Error</h4>
              <p className="text-sm text-red-700 mt-1">{config.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Enable {platformName} Integration</h4>
            <p className="text-sm text-gray-600">
              Allow manual updates and sync for this platform
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Credentials Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Credentials</span>
          </h4>

          {platform === 'booking.com' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extranet Username
                  </label>
                  <input
                    type="text"
                    value={config.credentials?.username || ''}
                    onChange={(e) => updateCredentials('username', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your Booking.com username"
                  />
                  {validationErrors.username && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extranet Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.credentials?.password || ''}
                      onChange={(e) => updateCredentials('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property ID
                </label>
                <input
                  type="text"
                  value={config.credentials?.propertyId || ''}
                  onChange={(e) => updateCredentials('propertyId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.propertyId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Your Booking.com property ID"
                />
                {validationErrors.propertyId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.propertyId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extranet URL (Optional)
                </label>
                <input
                  type="url"
                  value={config.credentials?.extranetUrl || ''}
                  onChange={(e) => updateCredentials('extranetUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://admin.booking.com"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.credentials?.apiKey || ''}
                    onChange={(e) => updateCredentials('apiKey', e.target.value)}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      validationErrors.apiKey ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your GoMMT API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {validationErrors.apiKey && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.apiKey}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connect App ID
                </label>
                <input
                  type="text"
                  value={config.credentials?.connectAppId || ''}
                  onChange={(e) => updateCredentials('connectAppId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.connectAppId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Your GoMMT Connect App ID"
                />
                {validationErrors.connectAppId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.connectAppId}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Settings Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Sync Settings</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Interval (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                value={config.settings?.syncInterval || 60}
                onChange={(e) => updateSettings('syncInterval', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.syncInterval ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors.syncInterval && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.syncInterval}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={config.settings?.reminderTime || '09:00'}
                onChange={(e) => updateSettings('reminderTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bulk Update Format
              </label>
              <select
                value={config.settings?.bulkUpdatePreference || (platform === 'booking.com' ? 'csv' : 'json')}
                onChange={(e) => updateSettings('bulkUpdatePreference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {platform === 'booking.com' ? (
                  <>
                    <option value="csv">CSV Format</option>
                    <option value="calendar-grid">Calendar Grid</option>
                  </>
                ) : (
                  <option value="json">JSON Format</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validation Level
              </label>
              <select
                value={config.settings?.validationLevel || 'basic'}
                onChange={(e) => updateSettings('validationLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="strict">Strict</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.settings?.autoSync || false}
                onChange={(e) => updateSettings('autoSync', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Enable auto-sync</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.settings?.updateReminders || false}
                onChange={(e) => updateSettings('updateReminders', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Update reminders</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={testConnection}
              disabled={isTesting || !config.enabled}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {config.lastSync && (
              <span className="text-sm text-gray-600">
                Last sync: {config.lastSync.toLocaleString()}
              </span>
            )}
          </div>

          <button
            onClick={saveConfig}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlatformConfigPanel;