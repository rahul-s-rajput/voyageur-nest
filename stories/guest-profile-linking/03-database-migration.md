# Story 3: Database Migration - Link Existing Bookings to Guest Profiles

## 🎯 Objective
Create and execute a database migration to link all existing bookings to guest profiles based on matching email, phone, or name, ensuring no bookings are left without guest profile connections.

## 📋 Acceptance Criteria
- [ ] All existing bookings are analyzed for guest profile matching
- [ ] New guest profiles are created for bookings without matches
- [ ] Bookings are linked to appropriate guest profiles
- [ ] Guest profile statistics are recalculated
- [ ] Migration is idempotent (can be run multiple times safely)
- [ ] Migration logs progress and results

## 📍 Files to Create
1. `fix_guest_profile_linking_migration.sql`

## 🔧 Implementation Details

### Complete Migration Script

```sql
-- Fix Guest Profile Linking Migration
-- This migration links existing bookings to guest profiles
-- Run this in Supabase SQL Editor

-- Step 1: Create a function to match and link existing bookings
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

-- Step 2: Execute the function
SELECT link_existing_bookings_to_guests();

-- Step 3: Drop the function after use
DROP FUNCTION IF EXISTS link_existing_bookings_to_guests();

-- Step 4: Force statistics recalculation for all guest profiles
UPDATE guest_profiles 
SET updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT DISTINCT guest_profile_id 
  FROM bookings 
  WHERE guest_profile_id IS NOT NULL
);

-- Step 5: Verify results
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

-- Step 6: Add indexes if not exists (for better performance)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile_id ON bookings(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email_lower ON guest_profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON guest_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_name_lower ON guest_profiles(LOWER(name));

-- Step 7: Analyze tables for query optimization
ANALYZE bookings;
ANALYZE guest_profiles;
```

## ✅ Testing Steps

### Pre-Migration Testing
1. Backup the database
2. Count bookings without guest_profile_id
3. Count existing guest profiles
4. Identify sample bookings for verification

### Migration Testing
1. Run migration on test database first
2. Monitor console output for progress logs
3. Verify no errors occur during execution
4. Check that function is properly dropped after use

### Post-Migration Verification
1. Verify all bookings with contact info have guest_profile_id
2. Check guest profile statistics are updated
3. Verify no duplicate guest profiles were created unnecessarily
4. Test that the booking-guest relationship works in the application

### Rollback Plan
```sql
-- Emergency rollback (if needed)
-- WARNING: This will unlink all guest profiles from bookings
UPDATE bookings SET guest_profile_id = NULL;
-- Note: Created guest profiles would need manual cleanup if rollback is needed
```

## 🚨 Risks & Considerations
- **Data Quality**: Some bookings may have inconsistent names/emails
- **Performance**: Migration may take time on large databases
- **Duplicates**: May create duplicate guest profiles if data quality is poor
- **Backup**: Always backup before running migration
- **Timing**: Run during low-traffic period

## 📊 Success Metrics
- 0 bookings without guest profiles (excluding those with no contact info)
- All guest profile statistics correctly calculated
- No timeout errors during migration
- Migration completes within 5 minutes for databases with < 10,000 bookings

## ⏱️ Estimated Time
- Script Development: 45 minutes
- Testing on Dev: 30 minutes
- Production Execution: 15 minutes
- Verification: 30 minutes
- Total: 2 hours

## 🏷️ Priority
**HIGH** - Required to fix historical data

## 🔗 Dependencies
- Database backup must be completed before execution
- Stories 1 & 2 should be deployed first to prevent new unlinked bookings

## 📝 Notes
- Run this migration ONCE after deploying the code fixes
- The migration is idempotent but shouldn't be run repeatedly
- Monitor the Supabase logs during execution
- Consider running in batches if you have > 50,000 bookings