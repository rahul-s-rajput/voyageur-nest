import React, { useState, useEffect } from 'react';
import { Property, PropertySettings } from '../../types/property';
import { propertyService } from '../../services/propertyService';
import RoomManagement from './RoomManagement';
import { useNotification } from '../NotificationContainer';

interface PropertyProfileProps {
  property: Property;
  onUpdate: (property: Property) => void;
  onClose: () => void;
  initialTab?: 'details' | 'rooms' | 'settings';
}

const PropertyProfile: React.FC<PropertyProfileProps> = ({
  property,
  onUpdate,
  onClose,
  initialTab = 'details'
}) => {
  const { showSuccess, showError } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Property>(property);
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'rooms' | 'settings'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditedProperty(property);
    loadPropertySettings();
  }, [property]);

  const loadPropertySettings = async () => {
    try {
      // Load settings from database
      const propertySettings = await propertyService.getPropertySettings(property.id);
      
      // Convert database settings to our simplified format
      // If no settings exist, use defaults
      const settings: PropertySettings = {
        targetMarket: 'family', // Default value
        roomTypes: ['standard'], // Default value
        propertyType: 'family_oriented', // Default value
        checkInTime: propertySettings.find(s => s.settingKey === 'check_in_time')?.settingValue || property.checkInTime || '15:00',
        checkOutTime: propertySettings.find(s => s.settingKey === 'check_out_time')?.settingValue || property.checkOutTime || '11:00',
        currency: propertySettings.find(s => s.settingKey === 'currency')?.settingValue || 'INR',
        taxRate: propertySettings.find(s => s.settingKey === 'tax_rate')?.settingValue || 0,
        emailNotifications: propertySettings.find(s => s.settingKey === 'send_confirmation_email')?.settingValue ?? true,
        smsNotifications: propertySettings.find(s => s.settingKey === 'send_reminder_email')?.settingValue ?? false,
      };
      
      setSettings(settings);
    } catch (error) {
      console.error('Failed to load property settings:', error);
      // Set default settings if loading fails
      const defaultSettings: PropertySettings = {
        targetMarket: 'family',
        roomTypes: ['standard'],
        propertyType: 'family_oriented',
        checkInTime: property.checkInTime || '15:00',
        checkOutTime: property.checkOutTime || '11:00',
        currency: 'INR',
        taxRate: 0,
        emailNotifications: true,
        smsNotifications: false,
      };
      setSettings(defaultSettings);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updated = await propertyService.updateProperty(editedProperty.id, editedProperty);
      onUpdate(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update property:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setIsEditing(false);
  };

  const handleSettingsUpdate = async (updatedSettings: Partial<PropertySettings>) => {
    if (!settings) return;
    
    const previousSettings = settings;
    
    try {
      // Update the local settings immediately for better UX
      const newSettings = { ...settings, ...updatedSettings };
      setSettings(newSettings);
      
      // Map the updated settings to database format and save immediately
      const settingsToSave: Record<string, any> = {};
      
      if (updatedSettings.checkInTime !== undefined) {
        settingsToSave.check_in_time = updatedSettings.checkInTime;
      }
      if (updatedSettings.checkOutTime !== undefined) {
        settingsToSave.check_out_time = updatedSettings.checkOutTime;
      }
      if (updatedSettings.currency !== undefined) {
        settingsToSave.currency = updatedSettings.currency;
      }
      if (updatedSettings.taxRate !== undefined) {
        settingsToSave.tax_rate = updatedSettings.taxRate;
      }
      if (updatedSettings.emailNotifications !== undefined) {
        settingsToSave.send_confirmation_email = updatedSettings.emailNotifications;
      }
      if (updatedSettings.smsNotifications !== undefined) {
        settingsToSave.send_reminder_email = updatedSettings.smsNotifications;
      }
      
      // Save to database
      await propertyService.updatePropertySettings(property.id, settingsToSave);
      
    } catch (error) {
      console.error('Failed to update property settings:', error);
      // Revert the local changes on error
      setSettings(previousSettings);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setIsLoading(true);
    try {
      // Map the simplified settings to the database format
      const settingsToSave = {
        check_in_time: settings.checkInTime,
        check_out_time: settings.checkOutTime,
        currency: settings.currency,
        tax_rate: settings.taxRate,
        send_confirmation_email: settings.emailNotifications,
        // For SMS notifications, we'll map it to a general notification setting
        // since the database structure uses separate email/SMS fields
        send_reminder_email: settings.smsNotifications,
      };
      
      // Save settings to database using PropertyService
      await propertyService.updatePropertySettings(property.id, settingsToSave);
      
      showSuccess('Settings Saved', 'Property settings have been saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Save Failed', 'Error saving settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🏢</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{property.name}</h2>
              <p className="text-sm text-gray-500">{property.location}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Property Details
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rooms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Room Management
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={editedProperty.name || ''}
                    onChange={(e) => setEditedProperty({ ...editedProperty, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editedProperty.location || ''}
                    onChange={(e) => setEditedProperty({ ...editedProperty, location: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editedProperty.contactPhone || ''}
                    onChange={(e) => setEditedProperty({ ...editedProperty, contactPhone: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={editedProperty.contactEmail || ''}
                    onChange={(e) => setEditedProperty({ ...editedProperty, contactEmail: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editedProperty.description || ''}
                  onChange={(e) => setEditedProperty({ ...editedProperty, description: e.target.value })}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{property.totalRooms}</div>
                  <div className="text-sm text-gray-600">Total Rooms</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{property.isActive ? 'Active' : 'Inactive'}</div>
                  <div className="text-sm text-gray-600">Status</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Date(property.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">Created</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <RoomManagement property={property} />
          )}

          {activeTab === 'settings' && settings && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-in Time
                      </label>
                      <input
                        type="time"
                        value={settings.checkInTime || ''}
                        onChange={(e) => handleSettingsUpdate({ checkInTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Check-out Time
                      </label>
                      <input
                        type="time"
                        value={settings.checkOutTime || ''}
                        onChange={(e) => handleSettingsUpdate({ checkOutTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={settings.currency || 'INR'}
                        onChange={(e) => handleSettingsUpdate({ currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.taxRate || 0}
                        onChange={(e) => handleSettingsUpdate({ taxRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingsUpdate({ emailNotifications: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Email Notifications
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.smsNotifications}
                      onChange={(e) => handleSettingsUpdate({ smsNotifications: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      SMS Notifications
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyProfile;