-- Migration to add property_id column to bookings table
-- Run this SQL in your Supabase SQL editor

-- Add property_id column to bookings table if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Create index for better performance on property_id queries
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);

-- Update existing bookings to have a default property_id if needed
-- This assumes you have at least one property in the properties table
-- You may need to adjust this based on your specific data

-- Get the first property ID for default assignment
DO $$
DECLARE
    default_property_id UUID;
BEGIN
    -- Get the first property ID
    SELECT id INTO default_property_id FROM properties LIMIT 1;
    
    -- Update bookings that don't have a property_id set
    IF default_property_id IS NOT NULL THEN
        UPDATE bookings 
        SET property_id = default_property_id 
        WHERE property_id IS NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.property_id IS 'Foreign key reference to the property where this booking is made';