-- Migration to add number_of_rooms column to bookings table
-- Run this SQL in your Supabase SQL editor

-- Add the number_of_rooms column with default value of 1
ALTER TABLE bookings 
ADD COLUMN number_of_rooms INTEGER DEFAULT 1 NOT NULL;

-- Update existing records to have number_of_rooms = 1 (if not already set)
UPDATE bookings 
SET number_of_rooms = 1 
WHERE number_of_rooms IS NULL;

-- Add a check constraint to ensure number_of_rooms is at least 1
ALTER TABLE bookings 
ADD CONSTRAINT check_number_of_rooms_positive 
CHECK (number_of_rooms >= 1); 