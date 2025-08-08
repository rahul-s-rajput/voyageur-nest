-- Add manual_update_required column to ota_platforms table
-- This migration fixes the missing column error in OTAPlatformConfig
-- Also adds property-specific platform configurations for multi-property support

-- Add the manual_update_required column
ALTER TABLE public.ota_platforms 
ADD COLUMN IF NOT EXISTS manual_update_required BOOLEAN DEFAULT false;

-- Add property_id column for property-specific platform configurations (optional)
-- Note: This allows for property-specific OTA configurations while maintaining global defaults
ALTER TABLE public.ota_platforms 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- Update existing records based on platform type and name
-- Set manual_update_required to true for platforms that require manual updates

-- Booking.com requires manual updates via Extranet
UPDATE public.ota_platforms 
SET manual_update_required = true 
WHERE LOWER(name) LIKE '%booking%' OR LOWER(display_name) LIKE '%booking%';

-- MMT/GoIbibo uses Connect API (automated) - keep as false
UPDATE public.ota_platforms 
SET manual_update_required = false 
WHERE LOWER(name) LIKE '%mmt%' OR LOWER(name) LIKE '%goibibo%' 
   OR LOWER(display_name) LIKE '%makemytrip%' OR LOWER(display_name) LIKE '%goibibo%';

-- Airbnb/VRBO use iCal sync (automated) - keep as false
UPDATE public.ota_platforms 
SET manual_update_required = false 
WHERE LOWER(name) LIKE '%airbnb%' OR LOWER(name) LIKE '%vrbo%' 
   OR LOWER(display_name) LIKE '%airbnb%' OR LOWER(display_name) LIKE '%vrbo%';

-- For any platforms with type = 'manual', ensure they're marked as manual_update_required
UPDATE public.ota_platforms 
SET manual_update_required = true 
WHERE type = 'manual';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ota_platforms_manual_update ON ota_platforms(manual_update_required);
CREATE INDEX IF NOT EXISTS idx_ota_platforms_property_id ON ota_platforms(property_id);

-- Create composite index for property-specific platform queries
CREATE INDEX IF NOT EXISTS idx_ota_platforms_property_name ON ota_platforms(property_id, name) WHERE property_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ota_platforms.manual_update_required IS 'Indicates if this platform requires manual updates instead of automated sync. Booking.com=true, Airbnb/VRBO/MMT=false';
COMMENT ON COLUMN public.ota_platforms.property_id IS 'Optional property-specific configuration. NULL means global platform configuration for all properties';

-- Create view for property-specific platform configurations
CREATE OR REPLACE VIEW property_ota_platforms AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    COALESCE(prop_ota.id, global_ota.id) as platform_id,
    COALESCE(prop_ota.name, global_ota.name) as platform_name,
    COALESCE(prop_ota.display_name, global_ota.display_name) as display_name,
    COALESCE(prop_ota.type, global_ota.type) as type,
    COALESCE(prop_ota.manual_update_required, global_ota.manual_update_required) as manual_update_required,
    COALESCE(prop_ota.sync_enabled, global_ota.sync_enabled) as sync_enabled,
    COALESCE(prop_ota.is_active, global_ota.is_active) as is_active,
    COALESCE(prop_ota.configuration, global_ota.configuration) as configuration,
    COALESCE(prop_ota.ical_import_url, global_ota.ical_import_url) as ical_import_url,
    COALESCE(prop_ota.ical_export_url, global_ota.ical_export_url) as ical_export_url,
    CASE WHEN prop_ota.id IS NOT NULL THEN 'property_specific' ELSE 'global' END as config_type
FROM properties p
CROSS JOIN ota_platforms global_ota
LEFT JOIN ota_platforms prop_ota ON prop_ota.property_id = p.id AND prop_ota.name = global_ota.name
WHERE global_ota.property_id IS NULL; -- Only global configurations in the cross join

COMMENT ON VIEW property_ota_platforms IS 'Provides property-specific OTA platform configurations, falling back to global defaults when property-specific configs do not exist';