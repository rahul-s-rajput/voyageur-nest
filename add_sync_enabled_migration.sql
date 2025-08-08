-- Migration to add sync_enabled column to ota_platforms table
-- Run this SQL in your Supabase SQL editor

-- Add sync_enabled column to ota_platforms table
ALTER TABLE public.ota_platforms 
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;

-- Update existing records to have sync_enabled = true (if not already set)
UPDATE public.ota_platforms 
SET sync_enabled = true 
WHERE sync_enabled IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ota_platforms.sync_enabled IS 'Whether sync is enabled for this platform';