-- Migration to add folio_number column to bookings table
-- This should be run in your Supabase SQL editor

-- Add folio_number column to bookings table
ALTER TABLE bookings 
ADD COLUMN folio_number TEXT;

-- Create an index on folio_number for better query performance
CREATE INDEX idx_bookings_folio_number ON bookings(folio_number);

-- Update existing bookings with folio numbers based on their creation order
-- This will assign folio numbers starting from 391 (current counter value)
WITH numbered_bookings AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) + 390 as folio_num
  FROM bookings 
  WHERE folio_number IS NULL
)
UPDATE bookings 
SET folio_number = '520/' || numbered_bookings.folio_num
FROM numbered_bookings 
WHERE bookings.id = numbered_bookings.id;

-- Update the invoice counter to the next available number
-- This ensures new bookings get the correct folio numbers
UPDATE invoice_counter 
SET value = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(folio_number FROM 5) AS INTEGER)), 390) + 1
  FROM bookings 
  WHERE folio_number IS NOT NULL
) 
WHERE id = 1; 