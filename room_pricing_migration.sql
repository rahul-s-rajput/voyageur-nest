-- Room Pricing Enhancement Migration
-- Adds seasonal pricing support to rooms table

-- Add seasonal_pricing column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS seasonal_pricing JSONB DEFAULT '{}';

-- Update existing rooms with default seasonal pricing (empty object)
UPDATE rooms 
SET seasonal_pricing = '{}' 
WHERE seasonal_pricing IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN rooms.seasonal_pricing IS 'JSON object storing seasonal pricing rules, e.g., {"summer": 1500, "winter": 1200}';

-- Create index for better performance on seasonal pricing queries
CREATE INDEX IF NOT EXISTS idx_rooms_seasonal_pricing ON rooms USING GIN (seasonal_pricing);

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'rooms' 
AND column_name IN ('base_price', 'seasonal_pricing');