-- Migration: Add manual_update_required column to ota_platforms table
-- Date: 2024-12-19
-- Description: Adds manual_update_required boolean column to track platforms requiring manual updates

-- Add manual_update_required column to ota_platforms table
ALTER TABLE ota_platforms 
ADD COLUMN IF NOT EXISTS manual_update_required BOOLEAN DEFAULT false;

-- Update existing records to set appropriate default values
-- Platforms with manual sync method should require manual updates
UPDATE ota_platforms 
SET manual_update_required = true 
WHERE type = 'manual';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ota_platforms_manual_update_required 
ON ota_platforms(manual_update_required);

-- Add comment for documentation
COMMENT ON COLUMN ota_platforms.manual_update_required IS 'Indicates if the platform requires manual updates for calendar synchronization';