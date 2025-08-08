// OTA Platform Service
// Handles property-specific OTA platform configurations

import { supabase } from '../lib/supabase';
import type { OTAPlatform, PropertyOTAPlatform } from '../types/ota';

export class OTAPlatformService {
  /**
   * Get all platforms for a specific property (uses the view for fallback logic)
   */
  static async getPlatformsForProperty(propertyId: string): Promise<PropertyOTAPlatform[]> {
    try {
      const { data, error } = await supabase
        .from('property_ota_platforms')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('platform_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching property platforms:', error);
      throw error;
    }
  }

  /**
   * Get a specific platform configuration for a property
   */
  static async getPlatformForProperty(
    propertyId: string, 
    platformName: string
  ): Promise<PropertyOTAPlatform | null> {
    try {
      const { data, error } = await supabase
        .from('property_ota_platforms')
        .select('*')
        .eq('property_id', propertyId)
        .eq('platform_name', platformName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching platform for property:', error);
      throw error;
    }
  }

  /**
   * Get all global platform configurations
   */
  static async getGlobalPlatforms(): Promise<OTAPlatform[]> {
    try {
      const { data, error } = await supabase
        .from('ota_platforms')
        .select('*')
        .is('property_id', null)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching global platforms:', error);
      throw error;
    }
  }

  /**
   * Create or update a property-specific platform configuration
   */
  static async savePropertyPlatformConfig(
    propertyId: string,
    platformName: string,
    config: Partial<OTAPlatform>
  ): Promise<OTAPlatform> {
    try {
      // Check if property-specific config already exists
      const { data: existing } = await supabase
        .from('ota_platforms')
        .select('*')
        .eq('property_id', propertyId)
        .eq('name', platformName)
        .single();

      const platformData = {
        name: platformName,
        property_id: propertyId,
        display_name: config.display_name,
        type: config.type,
        configuration: config.configuration || config.config,
        ical_import_url: config.ical_import_url,
        ical_export_url: config.ical_export_url,
        sync_enabled: config.sync_enabled ?? true,
        is_active: config.active ?? config.is_active ?? true,
        manual_update_required: config.manual_update_required ?? false,
        sync_interval: config.sync_frequency_hours || config.sync_interval || 24,
        credentials: config.credentials,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        // Update existing property-specific config
        const { data, error } = await supabase
          .from('ota_platforms')
          .update(platformData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new property-specific config
        const { data, error } = await supabase
          .from('ota_platforms')
          .insert({
            ...platformData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving property platform config:', error);
      throw error;
    }
  }

  /**
   * Update global platform configuration
   */
  static async saveGlobalPlatformConfig(
    platformId: string,
    config: Partial<OTAPlatform>
  ): Promise<OTAPlatform> {
    try {
      const { data, error } = await supabase
        .from('ota_platforms')
        .update({
          display_name: config.display_name,
          type: config.type,
          configuration: config.configuration || config.config,
          ical_import_url: config.ical_import_url,
          ical_export_url: config.ical_export_url,
          sync_enabled: config.sync_enabled,
          is_active: config.active ?? config.is_active,
          manual_update_required: config.manual_update_required,
          sync_interval: config.sync_frequency_hours || config.sync_interval,
          credentials: config.credentials,
          updated_at: new Date().toISOString()
        })
        .eq('id', platformId)
        .is('property_id', null) // Ensure we're updating global config
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving global platform config:', error);
      throw error;
    }
  }

  /**
   * Delete property-specific platform configuration (reverts to global)
   */
  static async deletePropertyPlatformConfig(
    propertyId: string,
    platformName: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ota_platforms')
        .delete()
        .eq('property_id', propertyId)
        .eq('name', platformName);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting property platform config:', error);
      throw error;
    }
  }

  /**
   * Test platform connection
   */
  static async testPlatformConnection(
    propertyId: string,
    platformName: string
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const platform = await this.getPlatformForProperty(propertyId, platformName);
      if (!platform) {
        return { success: false, message: 'Platform configuration not found' };
      }

      // Test based on platform type
      switch (platform.platform_name.toLowerCase()) {
        case 'airbnb':
        case 'vrbo':
          return await this.testICalConnection(platform.ical_import_url);
        
        case 'booking.com':
          return { 
            success: true, 
            message: 'Booking.com uses manual updates via Extranet - no connection test available' 
          };
        
        case 'gommt':
        case 'makemytrip':
          return await this.testAPIConnection(platform.configuration);
        
        default:
          return { 
            success: true, 
            message: 'Platform configuration saved - connection test not implemented' 
          };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Test iCal URL connection
   */
  private static async testICalConnection(icalUrl?: string): Promise<{ success: boolean; message: string }> {
    if (!icalUrl) {
      return { success: false, message: 'iCal URL not configured' };
    }

    try {
      const response = await fetch(icalUrl, { method: 'HEAD' });
      if (response.ok) {
        return { success: true, message: 'iCal URL is accessible' };
      } else {
        return { success: false, message: `iCal URL returned ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to connect to iCal URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test API connection (placeholder for future implementation)
   */
  private static async testAPIConnection(config: any): Promise<{ success: boolean; message: string }> {
    // Placeholder for API connection testing
    // This would implement actual API calls based on platform requirements
    return { 
      success: true, 
      message: 'API connection test not yet implemented - configuration saved' 
    };
  }

  /**
   * Get platforms that require manual updates for a property
   */
  static async getManualUpdatePlatforms(propertyId: string): Promise<PropertyOTAPlatform[]> {
    try {
      const { data, error } = await supabase
        .from('property_ota_platforms')
        .select('*')
        .eq('property_id', propertyId)
        .eq('manual_update_required', true)
        .eq('is_active', true)
        .order('platform_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching manual update platforms:', error);
      throw error;
    }
  }

  /**
   * Get sync-enabled platforms for a property
   */
  static async getSyncEnabledPlatforms(propertyId: string): Promise<PropertyOTAPlatform[]> {
    try {
      const { data, error } = await supabase
        .from('property_ota_platforms')
        .select('*')
        .eq('property_id', propertyId)
        .eq('sync_enabled', true)
        .eq('is_active', true)
        .order('platform_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sync-enabled platforms:', error);
      throw error;
    }
  }
}