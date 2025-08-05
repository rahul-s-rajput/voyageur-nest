import React, { useState, useEffect } from 'react';
import { PropertySpecificSettings } from '../../types/property';
import { useProperty } from '../../contexts/PropertyContext';
import { propertyService } from '../../services/propertyService';
import { 
  CogIcon, 
  ClockIcon, 
  BellIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface PropertySettingsProps {
  className?: string;
}

const PropertySettings: React.FC<PropertySettingsProps> = ({ className = '' }) => {
  const { currentProperty } = useProperty();
  const [settings, setSettings] = useState<PropertySpecificSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'booking' | 'notifications' | 'policies' | 'integrations'>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProperty) {
      loadPropertySettings();
    }
  }, [currentProperty]);

  const loadPropertySettings = async () => {
    if (!currentProperty) return;
    
    try {
      setLoading(true);
      const propertySettings = await propertyService.getPropertySettings(currentProperty.id);
      // getPropertySettings returns an array, take the first element or null
      setSettings(propertySettings.length > 0 ? propertySettings[0] : null);
    } catch (error) {
      console.error('Failed to load property settings:', error);
      // If no settings exist, create default settings
      if (error instanceof Error && error.message.includes('No settings found')) {
        const defaultSettings: PropertySpecificSettings = {
          id: '',
          propertyId: currentProperty.id,
          settingKey: 'general_settings',
          settingValue: 'default_configuration',
          checkInTime: '14:00',
          checkOutTime: '11:00',
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          language: 'en',
          emergencyContact: '+91-9876543210',
          wifiPassword: 'guest123',
          taxRate: 12,
          localTaxRate: 0,
          serviceChargeRate: 10,
          minAdvanceBookingDays: 1,
          maxAdvanceBookingDays: 365,
          allowOnlineBooking: true,
          autoConfirmBookings: false,
          requireAdvancePayment: true,
          advancePaymentPercentage: 30,
          cancellationPolicy: 'flexible',
          allowCancellation: true,
          cancellationDeadlineHours: 24,
          noShowPolicy: 'charge_full',
          sendConfirmationEmail: true,
          sendReminderEmail: true,
          reminderEmailDays: 1,
          petPolicy: 'not_allowed',
          smokingPolicy: 'not_allowed',
          childPolicy: 'welcome',
          extraBedPolicy: 'available',
          extraBedCharge: 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setSettings(defaultSettings);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof PropertySpecificSettings, value: any) => {
    if (!settings) return;
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateSettings = (): boolean => {
    if (!settings) return false;
    
    const errors: Record<string, string> = {};
    
    // Validate check-in/check-out times
    if (settings.checkInTime >= settings.checkOutTime) {
      errors.checkInTime = 'Check-in time must be before check-out time';
    }
    
    // Validate tax rates
    if (settings.taxRate < 0 || settings.taxRate > 100) {
      errors.taxRate = 'Tax rate must be between 0 and 100';
    }
    
    if (settings.localTaxRate < 0 || settings.localTaxRate > 100) {
      errors.localTaxRate = 'Local tax rate must be between 0 and 100';
    }
    
    // Validate advance payment percentage
    if (settings.requireAdvancePayment && (settings.advancePaymentPercentage < 1 || settings.advancePaymentPercentage > 100)) {
      errors.advancePaymentPercentage = 'Advance payment percentage must be between 1 and 100';
    }
    
    // Validate booking days
    if (settings.maxAdvanceBookingDays < settings.minAdvanceBookingDays) {
      errors.maxAdvanceBookingDays = 'Maximum advance booking days must be greater than minimum';
    }
    
    // Validate emergency contact
    if (!settings.emergencyContact || !/^\+?[\d\s-()]+$/.test(settings.emergencyContact)) {
      errors.emergencyContact = 'Please enter a valid emergency contact number';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!settings || !currentProperty) return;
    
    if (!validateSettings()) {
      return;
    }
    
    try {
      setSaving(true);
      await propertyService.updatePropertySettings(currentProperty.id, settings);
      setHasChanges(false);
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all changes?')) {
      loadPropertySettings();
      setHasChanges(false);
      setValidationErrors({});
    }
  };

  if (loading || !settings) {
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

  const tabs = [
    { key: 'general', label: 'General', icon: CogIcon },
    { key: 'booking', label: 'Booking Rules', icon: ClockIcon },
    { key: 'notifications', label: 'Notifications', icon: BellIcon },
    { key: 'policies', label: 'Policies', icon: ShieldCheckIcon },
    { key: 'integrations', label: 'Integrations', icon: GlobeAltIcon }
  ];

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <CogIcon className="h-6 w-6 mr-2 text-blue-600" />
              Property Settings
            </h2>
            <p className="text-gray-600 mt-1">
              Configure settings for {currentProperty?.name}
            </p>
          </div>
          
          {hasChanges && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-orange-600 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Unsaved changes
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4 bg-gray-100 p-1 rounded-lg">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key
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
        {activeTab === 'general' && (
          <GeneralSettings 
            settings={settings} 
            onChange={handleSettingChange}
            errors={validationErrors}
          />
        )}
        
        {activeTab === 'booking' && (
          <BookingSettings 
            settings={settings} 
            onChange={handleSettingChange}
            errors={validationErrors}
          />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationSettings 
            settings={settings} 
            onChange={handleSettingChange}
            errors={validationErrors}
          />
        )}
        
        {activeTab === 'policies' && (
          <PolicySettings 
            settings={settings} 
            onChange={handleSettingChange}
            errors={validationErrors}
          />
        )}
        
        {activeTab === 'integrations' && (
          <IntegrationSettings 
            settings={settings} 
            onChange={handleSettingChange}
            errors={validationErrors}
          />
        )}
      </div>
    </div>
  );
};

// General Settings Component
interface SettingsComponentProps {
  settings: PropertySpecificSettings;
  onChange: (key: keyof PropertySpecificSettings, value: any) => void;
  errors: Record<string, string>;
}

const GeneralSettings: React.FC<SettingsComponentProps> = ({ settings, onChange, errors }) => {
  const currencies = [
    { value: 'INR', label: 'Indian Rupee (₹)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' }
  ];

  const timezones = [
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-in Time
          </label>
          <input
            type="time"
            value={settings.checkInTime}
            onChange={(e) => onChange('checkInTime', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.checkInTime ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.checkInTime && (
            <p className="mt-1 text-sm text-red-600">{errors.checkInTime}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check-out Time
          </label>
          <input
            type="time"
            value={settings.checkOutTime}
            onChange={(e) => onChange('checkOutTime', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.checkOutTime ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.checkOutTime && (
            <p className="mt-1 text-sm text-red-600">{errors.checkOutTime}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            value={settings.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currencies.map(currency => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timezones.map(timezone => (
              <option key={timezone.value} value={timezone.value}>
                {timezone.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Language
          </label>
          <select
            value={settings.language}
            onChange={(e) => onChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(language => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Contact
          </label>
          <input
            type="tel"
            value={settings.emergencyContact}
            onChange={(e) => onChange('emergencyContact', e.target.value)}
            placeholder="+91-9876543210"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.emergencyContact ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.emergencyContact && (
            <p className="mt-1 text-sm text-red-600">{errors.emergencyContact}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={settings.taxRate}
            onChange={(e) => onChange('taxRate', parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.taxRate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.taxRate && (
            <p className="mt-1 text-sm text-red-600">{errors.taxRate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Local Tax Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={settings.localTaxRate}
            onChange={(e) => onChange('localTaxRate', parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.localTaxRate ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.localTaxRate && (
            <p className="mt-1 text-sm text-red-600">{errors.localTaxRate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Charge Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={settings.serviceChargeRate}
            onChange={(e) => onChange('serviceChargeRate', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          WiFi Password
        </label>
        <input
          type="text"
          value={settings.wifiPassword}
          onChange={(e) => onChange('wifiPassword', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter WiFi password for guests"
        />
      </div>
    </div>
  );
};

// Booking Settings Component
const BookingSettings: React.FC<SettingsComponentProps> = ({ settings, onChange, errors }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Advance Booking (days)
          </label>
          <input
            type="number"
            min="0"
            value={settings.minAdvanceBookingDays}
            onChange={(e) => onChange('minAdvanceBookingDays', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Advance Booking (days)
          </label>
          <input
            type="number"
            min="1"
            value={settings.maxAdvanceBookingDays}
            onChange={(e) => onChange('maxAdvanceBookingDays', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.maxAdvanceBookingDays ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.maxAdvanceBookingDays && (
            <p className="mt-1 text-sm text-red-600">{errors.maxAdvanceBookingDays}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowOnlineBooking"
            checked={settings.allowOnlineBooking}
            onChange={(e) => onChange('allowOnlineBooking', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="allowOnlineBooking" className="ml-2 text-sm text-gray-700">
            Allow online booking
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoConfirmBookings"
            checked={settings.autoConfirmBookings}
            onChange={(e) => onChange('autoConfirmBookings', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="autoConfirmBookings" className="ml-2 text-sm text-gray-700">
            Auto-confirm bookings
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="requireAdvancePayment"
            checked={settings.requireAdvancePayment}
            onChange={(e) => onChange('requireAdvancePayment', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="requireAdvancePayment" className="ml-2 text-sm text-gray-700">
            Require advance payment
          </label>
        </div>
      </div>

      {settings.requireAdvancePayment && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Advance Payment Percentage (%)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={settings.advancePaymentPercentage}
            onChange={(e) => onChange('advancePaymentPercentage', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.advancePaymentPercentage ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.advancePaymentPercentage && (
            <p className="mt-1 text-sm text-red-600">{errors.advancePaymentPercentage}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cancellation Policy
        </label>
        <select
          value={settings.cancellationPolicy}
          onChange={(e) => onChange('cancellationPolicy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="flexible">Flexible - Free cancellation 24 hours before</option>
          <option value="moderate">Moderate - Free cancellation 5 days before</option>
          <option value="strict">Strict - 50% refund up to 1 week before</option>
          <option value="super_strict">Super Strict - No refund</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowCancellation"
            checked={settings.allowCancellation}
            onChange={(e) => onChange('allowCancellation', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="allowCancellation" className="ml-2 text-sm text-gray-700">
            Allow cancellation
          </label>
        </div>

        {settings.allowCancellation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Deadline (hours before check-in)
            </label>
            <input
              type="number"
              min="0"
              value={settings.cancellationDeadlineHours}
              onChange={(e) => onChange('cancellationDeadlineHours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          No-Show Policy
        </label>
        <select
          value={settings.noShowPolicy}
          onChange={(e) => onChange('noShowPolicy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="charge_full">Charge full amount</option>
          <option value="charge_first_night">Charge first night only</option>
          <option value="no_charge">No charge</option>
        </select>
      </div>
    </div>
  );
};

// Notification Settings Component
const NotificationSettings: React.FC<SettingsComponentProps> = ({ settings, onChange, errors }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="sendConfirmationEmail"
            checked={settings.sendConfirmationEmail}
            onChange={(e) => onChange('sendConfirmationEmail', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="sendConfirmationEmail" className="ml-2 text-sm text-gray-700">
            Send booking confirmation emails
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="sendReminderEmail"
            checked={settings.sendReminderEmail}
            onChange={(e) => onChange('sendReminderEmail', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="sendReminderEmail" className="ml-2 text-sm text-gray-700">
            Send reminder emails before check-in
          </label>
        </div>
      </div>

      {settings.sendReminderEmail && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send reminder email (days before check-in)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={settings.reminderEmailDays}
            onChange={(e) => onChange('reminderEmailDays', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Email Templates</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Booking confirmation email template</p>
          <p>• Check-in reminder email template</p>
          <p>• Cancellation confirmation email template</p>
          <p>• Payment receipt email template</p>
        </div>
        <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
          Customize Email Templates →
        </button>
      </div>
    </div>
  );
};

// Policy Settings Component
const PolicySettings: React.FC<SettingsComponentProps> = ({ settings, onChange, errors }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pet Policy
          </label>
          <select
            value={settings.petPolicy}
            onChange={(e) => onChange('petPolicy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="not_allowed">Not Allowed</option>
            <option value="allowed">Allowed</option>
            <option value="allowed_with_fee">Allowed with Fee</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Smoking Policy
          </label>
          <select
            value={settings.smokingPolicy}
            onChange={(e) => onChange('smokingPolicy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="not_allowed">Not Allowed</option>
            <option value="designated_areas">Designated Areas Only</option>
            <option value="allowed">Allowed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Child Policy
          </label>
          <select
            value={settings.childPolicy}
            onChange={(e) => onChange('childPolicy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="allowed">Children Allowed</option>
            <option value="not_allowed">Adults Only</option>
            <option value="age_restriction">Age Restrictions Apply</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Extra Bed Policy
          </label>
          <select
            value={settings.extraBedPolicy}
            onChange={(e) => onChange('extraBedPolicy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="not_available">Not Available</option>
            <option value="available">Available</option>
            <option value="available_with_fee">Available with Fee</option>
          </select>
        </div>
      </div>

      {(settings.extraBedPolicy === 'available_with_fee') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Extra Bed Charge (per night)
          </label>
          <input
            type="number"
            min="0"
            value={settings.extraBedCharge}
            onChange={(e) => onChange('extraBedCharge', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">House Rules</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Check-in: {settings.checkInTime} | Check-out: {settings.checkOutTime}</p>
          <p>• Smoking: {settings.smokingPolicy.replace('_', ' ')}</p>
          <p>• Pets: {settings.petPolicy.replace('_', ' ')}</p>
          <p>• Children: {settings.childPolicy.replace('_', ' ')}</p>
          {settings.extraBedPolicy !== 'not_available' && (
            <p>• Extra beds: {settings.extraBedPolicy.replace('_', ' ')} 
              {settings.extraBedCharge > 0 && ` (₹${settings.extraBedCharge}/night)`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Integration Settings Component
const IntegrationSettings: React.FC<SettingsComponentProps> = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <GlobeAltIcon className="h-5 w-5 mr-2" />
          Online Travel Agencies (OTAs)
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold text-xs">B</span>
              </div>
              <div>
                <div className="font-medium">Booking.com</div>
                <div className="text-sm text-gray-500">Channel Manager Integration</div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Configure
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                <span className="text-red-600 font-bold text-xs">A</span>
              </div>
              <div>
                <div className="font-medium">Airbnb</div>
                <div className="text-sm text-gray-500">Property Sync</div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Configure
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mr-3">
                <span className="text-green-600 font-bold text-xs">E</span>
              </div>
              <div>
                <div className="font-medium">Expedia</div>
                <div className="text-sm text-gray-500">Rate & Availability Sync</div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Configure
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2" />
          Payment Gateways
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center mr-3">
                <span className="text-purple-600 font-bold text-xs">R</span>
              </div>
              <div>
                <div className="font-medium">Razorpay</div>
                <div className="text-sm text-gray-500">Primary Payment Gateway</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Configure
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold text-xs">P</span>
              </div>
              <div>
                <div className="font-medium">PayPal</div>
                <div className="text-sm text-gray-500">International Payments</div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Configure
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
          Communication
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center mr-3">
                <span className="text-green-600 font-bold text-xs">W</span>
              </div>
              <div>
                <div className="font-medium">WhatsApp Business</div>
                <div className="text-sm text-gray-500">Guest Communication</div>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Configure
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3">
                <EnvelopeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Email Service</div>
                <div className="text-sm text-gray-500">SMTP Configuration</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySettings;