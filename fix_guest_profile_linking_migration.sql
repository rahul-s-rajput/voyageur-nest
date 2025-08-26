-- Fix Guest Profile Linking Migration
-- This migration fixes the issue where bookings are not properly linked to guest profiles
-- Run this after the guest_profiles_migration.sql

-- First, ensure the guest_profile_id column exists in bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_profile_id UUID REFERENCES public.guest_profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile_id ON public.bookings(guest_profile_id);

-- Function to match and link existing bookings to guest profiles
CREATE OR REPLACE FUNCTION link_existing_bookings_to_guests()
RETURNS void AS $$
DECLARE
  booking_record RECORD;
  guest_id UUID;
  created_count INTEGER := 0;
  linked_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Count total bookings to process
  SELECT COUNT(*) INTO total_count
  FROM bookings 
  WHERE guest_profile_id IS NULL;
  
  RAISE NOTICE 'Starting guest profile linking for % bookings', total_count;
  
  -- Loop through all bookings without guest profiles
  FOR booking_record IN 
    SELECT * FROM bookings 
    WHERE guest_profile_id IS NULL 
    AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL OR guest_name IS NOT NULL)
    ORDER BY created_at DESC
  LOOP
    guest_id := NULL;
    
    -- Try to find existing guest by exact email match
    IF booking_record.contact_email IS NOT NULL THEN
      SELECT id INTO guest_id
      FROM guest_profiles
      WHERE LOWER(email) = LOWER(booking_record.contact_email)
      LIMIT 1;
    END IF;
    
    -- Try to find by phone if no email match
    IF guest_id IS NULL AND booking_record.contact_phone IS NOT NULL THEN
      SELECT id INTO guest_id
      FROM guest_profiles
      WHERE phone = booking_record.contact_phone
      LIMIT 1;
    END IF;
    
    -- Try to find by exact name match if still no match (less reliable)
    IF guest_id IS NULL AND booking_record.guest_name IS NOT NULL THEN
      SELECT id INTO guest_id
      FROM guest_profiles
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(booking_record.guest_name))
      LIMIT 1;
    END IF;
    
    -- If no guest found, create one
    IF guest_id IS NULL THEN
      INSERT INTO guest_profiles (
        name,
        email,
        phone,
        created_at,
        updated_at
      ) VALUES (
        COALESCE(booking_record.guest_name, 'Guest'),
        booking_record.contact_email,
        booking_record.contact_phone,
        booking_record.created_at, -- Use booking creation date
        CURRENT_TIMESTAMP
      ) RETURNING id INTO guest_id;
      
      created_count := created_count + 1;
      RAISE NOTICE 'Created new guest profile % for booking %', guest_id, booking_record.id;
    ELSE
      linked_count := linked_count + 1;
      RAISE NOTICE 'Linked existing guest profile % to booking %', guest_id, booking_record.id;
    END IF;
    
    -- Link the booking to the guest profile
    UPDATE bookings 
    SET guest_profile_id = guest_id 
    WHERE id = booking_record.id;
  END LOOP;
  
  RAISE NOTICE 'Guest profile linking complete: % new profiles created, % existing profiles linked', created_count, linked_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT link_existing_bookings_to_guests();

-- Drop the function after use
DROP FUNCTION IF EXISTS link_existing_bookings_to_guests();

-- Force statistics recalculation for all guest profiles
UPDATE guest_profiles 
SET updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT DISTINCT guest_profile_id 
  FROM bookings 
  WHERE guest_profile_id IS NOT NULL
);

-- Verify results
DO $$
DECLARE
  unlinked_count INTEGER;
  total_guests INTEGER;
  total_bookings INTEGER;
BEGIN
  -- Count unlinked bookings
  SELECT COUNT(*) INTO unlinked_count
  FROM bookings 
  WHERE guest_profile_id IS NULL;
  
  -- Count total guest profiles
  SELECT COUNT(*) INTO total_guests
  FROM guest_profiles;
  
  -- Count total bookings with guest profiles
  SELECT COUNT(*) INTO total_bookings
  FROM bookings 
  WHERE guest_profile_id IS NOT NULL;
  
  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total guest profiles: %', total_guests;
  RAISE NOTICE 'Bookings with guest profiles: %', total_bookings;
  RAISE NOTICE 'Bookings without guest profiles: %', unlinked_count;
  
  IF unlinked_count > 0 THEN
    RAISE WARNING 'There are still % bookings without guest profiles. These may be missing all contact information.', unlinked_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All bookings are now linked to guest profiles!';
  END IF;
END $$;

-- Additional helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email_lower ON public.guest_profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON public.guest_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_name_lower ON public.guest_profiles(LOWER(name));

-- Analyze tables for query optimization
ANALYZE public.bookings;
ANALYZE public.guest_profiles;