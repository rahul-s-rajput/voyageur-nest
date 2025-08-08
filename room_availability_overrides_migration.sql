-- Add per-date availability overrides to rooms
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS availability_overrides JSONB DEFAULT '{}'::jsonb;

-- Optional: create a GIN index for faster date override lookups
-- CREATE INDEX IF NOT EXISTS idx_rooms_availability_overrides ON rooms USING GIN (availability_overrides); 