# Guest Profile Linking System - Implementation Plan

## 📋 Executive Summary
This document outlines the comprehensive plan to fix issues with the guest profile linking system where bookings are not properly connecting to guest profiles, preventing proper guest history tracking and management.

## 🔍 Issues Identified

### 1. **Field Name Mismatch in NewBookingModal**
- **Problem**: The modal passes `guest_profile_id` but the booking service expects `guestProfileId`
- **Impact**: Guest profile ID is lost when creating bookings through the web interface
- **Location**: `src/components/NewBookingModal.tsx`

### 2. **bookingService.createBooking Missing Field**
- **Problem**: The service doesn't handle the `guest_profile_id` field at all
- **Impact**: Even if the field is passed correctly, it's never saved to the database
- **Location**: `src/lib/supabase/services.ts`

### 3. **Email Import Service Doesn't Create Guest Profiles**
- **Problem**: When bookings are imported from emails (Booking.com, GoMMT), no guest profiles are created
- **Impact**: All OTA bookings have no guest profile links
- **Location**: `src/services/emailBookingImportService.ts`

### 4. **Check-in Form Works Correctly**
- **Status**: ✅ Working
- **Note**: The check-in form properly creates/updates guest profiles
- **Limitation**: Only helps for bookings where check-in is completed

## 📐 Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Web Booking   │────▶│  Booking Service │────▶│    Database     │
│  (NewBooking)   │     │                  │     │   (bookings)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                    ┌──────────────────┐        ┌─────────────────┐
                    │  Guest Profile   │────────│ guest_profiles  │
                    │     Service      │        │     table       │
                    └──────────────────┘        └─────────────────┘
                               ▲
                               │
┌─────────────────┐     ┌──────────────────┐
│  Email Import   │────▶│   Email Booking   │
│    (OTAs)       │     │  Import Service   │
└─────────────────┘     └──────────────────┘
```

## 🛠️ Implementation Plan

### **Phase 1: Fix Core Issues** (Priority: HIGH - Immediate)

#### 1.1 Fix bookingService.createBooking
**File**: `src/lib/supabase/services.ts`

```typescript
// Update the createBooking method to handle guest_profile_id
createBooking: withErrorHandling(async (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking | null> => {
  // Generate folio number if not provided
  let folioNumber = booking.folioNumber;
  if (!folioNumber) {
    const counter = await invoiceCounterService.getCounter();
    folioNumber = `520/${counter}`;
    await invoiceCounterService.updateCounter(counter + 1);
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      property_id: booking.propertyId,
      guest_name: booking.guestName,
      guest_profile_id: (booking as any).guest_profile_id || (booking as any).guestProfileId, // Handle both field names
      room_no: booking.roomNo,
      number_of_rooms: booking.numberOfRooms || 1,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      no_of_pax: booking.noOfPax,
      adult_child: booking.adultChild,
      status: booking.status,
      cancelled: booking.cancelled,
      total_amount: booking.totalAmount.toString(),
      contact_phone: booking.contactPhone,
      contact_email: booking.contactEmail,
      special_requests: booking.specialRequests,
      booking_date: booking.bookingDate || null,
      folio_number: folioNumber,
      source: (booking as any).source || null,
      source_details: (booking as any).source_details || null
    })
    .select()
    .single()

  // ... rest of the method
})
```

#### 1.2 Fix NewBookingModal Field Naming
**File**: `src/components/NewBookingModal.tsx`

```typescript
// Line ~187: Fix the field name in bookingData
const bookingData = {
  ...formData,
  propertyId: currentProperty?.id,
  roomNo: formData.numberOfRooms > 1 ? roomNumbers.filter(room => room.trim()).join(', ') : formData.roomNo,
  adultChild: `${formData.adults}/${formData.children}`,
  totalAmount: parseFloat(formData.totalAmount) || 0,
  cancelled: false,
  guestProfileId: guestProfileId, // Change from guest_profile_id to guestProfileId
};
```

### **Phase 2: Add Guest Profile Logic to Email Import** (Priority: HIGH)

#### 2.1 Update EmailBookingImportService
**File**: `src/services/emailBookingImportService.ts`

Add import at the top:
```typescript
import { GuestProfileService } from './guestProfileService';
```

Update the `importFromParsed` method:
```typescript
static async importFromParsed(emailMessageId: string, parsed: ParsedBookingEmail, propertyId?: string): Promise<EmailBookingImport> {
  const resolvedPropertyId = propertyId || (await this.resolvePropertyId(parsed));
  const eventType = parsed.event_type;
  const decision: EmailBookingImport['decision'] = parsed.confidence >= 0.8 ? 'auto' : 'manual-approved';

  // NEW: Guest Profile Creation/Linking Logic
  let guestProfileId: string | undefined;
  
  if (parsed.guest_name || parsed.contact_email || parsed.contact_phone) {
    try {
      // Search for existing guest
      const existingGuest = await GuestProfileService.findGuestByContact(
        parsed.contact_email,
        parsed.contact_phone
      );
      
      if (existingGuest) {
        guestProfileId = existingGuest.id;
        // Update with any new information
        await GuestProfileService.updateGuestProfile({
          id: existingGuest.id,
          name: parsed.guest_name || existingGuest.name,
          email: parsed.contact_email || existingGuest.email,
          phone: parsed.contact_phone || existingGuest.phone,
        });
      } else {
        // Create new guest profile
        const newGuest = await GuestProfileService.createGuestProfile({
          name: parsed.guest_name || 'Guest',
          email: parsed.contact_email,
          phone: parsed.contact_phone,
        });
        guestProfileId = newGuest.id;
      }
    } catch (error) {
      console.error('Failed to create/link guest profile for email import:', error);
    }
  }

  // Update bookingPayload to include guest_profile_id
  const bookingPayload = {
    propertyId: resolvedPropertyId,
    guestName: parsed.guest_name || 'Guest',
    roomNo: parsed.room_no || '',
    numberOfRooms: 1,
    checkIn: parsed.check_in || undefined,
    checkOut: parsed.check_out || undefined,
    noOfPax: parsed.no_of_pax ?? undefined,
    adultChild: parsed.adult_child || undefined,
    status: 'confirmed' as const,
    cancelled: false,
    totalAmount: this.normalizeAmount(parsed.total_amount),
    paymentStatus: parsed.payment_status || undefined,
    contactPhone: parsed.contact_phone || undefined,
    contactEmail: parsed.contact_email || undefined,
    specialRequests: parsed.special_requests || undefined,
    guest_profile_id: guestProfileId, // ADD THIS LINE
    source: 'ota',
    source_details: parsed.booking_reference ? { provider, ota_ref: parsed.booking_reference } : { provider },
  } as const;

  // ... rest of the method remains the same
}
```

### **Phase 3: Database Migration** (Priority: HIGH)

#### 3.1 Create Migration File
**File**: `fix_guest_profile_linking_migration.sql`

```sql
-- Fix Guest Profile Linking Migration
-- This migration links existing bookings to guest profiles and ensures future bookings are properly linked

-- Step 1: Create a function to match and link existing bookings
CREATE OR REPLACE FUNCTION link_existing_bookings_to_guests()
RETURNS void AS $$
DECLARE
  booking_record RECORD;
  guest_id UUID;
BEGIN
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
    
    -- Try to find by name if still no match (less reliable)
    IF guest_id IS NULL AND booking_record.guest_name IS NOT NULL THEN
      SELECT id INTO guest_id
      FROM guest_profiles
      WHERE LOWER(name) = LOWER(booking_record.guest_name)
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
      
      RAISE NOTICE 'Created new guest profile % for booking %', guest_id, booking_record.id;
    ELSE
      RAISE NOTICE 'Linked existing guest profile % to booking %', guest_id, booking_record.id;
    END IF;
    
    -- Link the booking to the guest profile
    UPDATE bookings 
    SET guest_profile_id = guest_id 
    WHERE id = booking_record.id;
  END LOOP;
  
  RAISE NOTICE 'Guest profile linking complete';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT link_existing_bookings_to_guests();

-- Drop the function after use
DROP FUNCTION IF EXISTS link_existing_bookings_to_guests();

-- Step 2: Trigger stats recalculation for all guest profiles
UPDATE guest_profiles SET updated_at = CURRENT_TIMESTAMP;

-- Step 3: Add index if not exists for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile_id ON bookings(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email_lower ON guest_profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON guest_profiles(phone);
```

### **Phase 4: Enhanced Guest Matching** (Priority: MEDIUM)

#### 4.1 Add Fuzzy Matching to Guest Profile Service
**File**: `src/services/guestProfileService.ts`

Add these methods to the `GuestProfileService` class:

```typescript
/**
 * Find potential duplicate guest profiles
 */
static async findPotentialDuplicates(
  name: string, 
  email?: string, 
  phone?: string
): Promise<GuestProfile[]> {
  const duplicates: GuestProfile[] = [];
  const foundIds = new Set<string>();
  
  // Exact email match
  if (email) {
    const emailMatches = await this.searchGuestProfiles({ 
      search: email,
      limit: 10 
    });
    emailMatches.forEach(guest => {
      if (guest.email?.toLowerCase() === email.toLowerCase() && !foundIds.has(guest.id)) {
        duplicates.push(guest);
        foundIds.add(guest.id);
      }
    });
  }
  
  // Exact phone match
  if (phone) {
    const phoneMatches = await this.searchGuestProfiles({ 
      search: phone,
      limit: 10 
    });
    phoneMatches.forEach(guest => {
      if (guest.phone === phone && !foundIds.has(guest.id)) {
        duplicates.push(guest);
        foundIds.add(guest.id);
      }
    });
  }
  
  // Similar name match
  const nameMatches = await this.searchGuestProfiles({ 
    search: name,
    limit: 20 
  });
  nameMatches.forEach(guest => {
    const similarity = this.calculateNameSimilarity(guest.name, name);
    if (similarity > 0.8 && !foundIds.has(guest.id)) {
      duplicates.push(guest);
      foundIds.add(guest.id);
    }
  });
  
  return duplicates;
}

/**
 * Calculate similarity between two names (0-1)
 */
private static calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().replace(/\s+/g, '');
  const s2 = name2.toLowerCase().replace(/\s+/g, '');
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Use Levenshtein distance for similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = this.levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
private static levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s2.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s1.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s1.length] = lastValue;
  }
  return costs[s1.length];
}

/**
 * Merge multiple guest profiles into one
 */
static async mergeGuestProfiles(
  primaryGuestId: string,
  guestIdsToMerge: string[]
): Promise<GuestProfile> {
  try {
    // Update all bookings to point to primary guest
    for (const guestId of guestIdsToMerge) {
      if (guestId !== primaryGuestId) {
        await supabase
          .from('bookings')
          .update({ guest_profile_id: primaryGuestId })
          .eq('guest_profile_id', guestId);
        
        // Delete the duplicate guest profile
        await supabase
          .from('guest_profiles')
          .delete()
          .eq('id', guestId);
      }
    }
    
    // Force stats recalculation
    await supabase
      .from('guest_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', primaryGuestId);
    
    // Return updated primary guest profile
    const updatedGuest = await this.getGuestProfile(primaryGuestId);
    if (!updatedGuest) throw new Error('Failed to fetch updated guest profile');
    
    return updatedGuest;
  } catch (error) {
    console.error('Error merging guest profiles:', error);
    throw error;
  }
}
```

#### 4.2 Create Duplicate Detection Component
**File**: `src/components/GuestDuplicateAlert.tsx`

```typescript
import React, { useState } from 'react';
import { AlertTriangle, Users, Merge } from 'lucide-react';
import { GuestProfile } from '../types/guest';

interface GuestDuplicateAlertProps {
  potentialDuplicates: GuestProfile[];
  onMerge: (primaryId: string, mergeIds: string[]) => Promise<void>;
  onDismiss: () => void;
}

export const GuestDuplicateAlert: React.FC<GuestDuplicateAlertProps> = ({
  potentialDuplicates,
  onMerge,
  onDismiss
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [merging, setMerging] = useState(false);

  if (potentialDuplicates.length === 0) return null;

  const handleMerge = async () => {
    if (!selectedPrimary) return;
    
    setMerging(true);
    try {
      await onMerge(
        selectedPrimary,
        potentialDuplicates.map(g => g.id)
      );
      onDismiss();
    } catch (error) {
      console.error('Failed to merge profiles:', error);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Potential Duplicate Guests Detected
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            The following guests might be the same person based on matching contact information:
          </p>
          
          <div className="space-y-2 mb-4">
            {potentialDuplicates.map(guest => (
              <label 
                key={guest.id} 
                className="flex items-center p-2 bg-white rounded border border-yellow-300 cursor-pointer hover:bg-yellow-50"
              >
                <input
                  type="radio"
                  name="primary-guest"
                  value={guest.id}
                  checked={selectedPrimary === guest.id}
                  onChange={(e) => setSelectedPrimary(e.target.value)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{guest.name}</div>
                  <div className="text-xs text-gray-600">
                    {guest.email && <span className="mr-2">{guest.email}</span>}
                    {guest.phone && <span className="mr-2">{guest.phone}</span>}
                    <span className="text-gray-500">
                      • {guest.total_stays || 0} stay(s) • ₹{guest.total_spent || 0}
                    </span>
                  </div>
                </div>
                {selectedPrimary === guest.id && (
                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Primary
                  </span>
                )}
              </label>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleMerge}
              disabled={!selectedPrimary || merging}
              className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Merge className="w-4 h-4 mr-1" />
              {merging ? 'Merging...' : 'Merge Profiles'}
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Keep Separate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### **Phase 5: Testing & Validation** (Priority: HIGH)

#### 5.1 Test Cases

1. **New Booking via Web Form**
   - Create a new booking through NewBookingModal
   - Verify guest profile is created
   - Check guest_profile_id is set in bookings table

2. **Email Import Testing**
   - Import a booking from Booking.com email
   - Verify guest profile is created
   - Import another booking with same email
   - Verify it links to existing guest profile

3. **Migration Testing**
   - Run migration on test database
   - Verify all existing bookings get linked to guest profiles
   - Check for any orphaned bookings

4. **Duplicate Detection**
   - Create bookings with similar names
   - Verify duplicate detection works
   - Test merge functionality

#### 5.2 Validation Queries

```sql
-- Check bookings without guest profiles
SELECT COUNT(*) as unlinked_bookings
FROM bookings 
WHERE guest_profile_id IS NULL;

-- Check guest profiles with booking counts
SELECT 
  gp.id,
  gp.name,
  gp.email,
  gp.phone,
  COUNT(b.id) as actual_bookings,
  gp.total_stays as recorded_stays
FROM guest_profiles gp
LEFT JOIN bookings b ON b.guest_profile_id = gp.id
GROUP BY gp.id, gp.name, gp.email, gp.phone, gp.total_stays
HAVING COUNT(b.id) != gp.total_stays;

-- Find potential duplicate guests
SELECT 
  name, 
  email, 
  phone,
  COUNT(*) as duplicate_count
FROM guest_profiles
GROUP BY LOWER(name), LOWER(email), phone
HAVING COUNT(*) > 1;
```

## 📈 Expected Outcomes

After implementing this plan:

1. ✅ **100% Guest Profile Coverage**: All bookings will have associated guest profiles
2. ✅ **Automatic Linking**: System will automatically match and link guests by email/phone
3. ✅ **Complete History**: Guest management will show full booking history
4. ✅ **Duplicate Prevention**: System will detect and allow merging of duplicate profiles
5. ✅ **OTA Integration**: Email imports will create/update guest profiles
6. ✅ **Data Integrity**: Historical data will be cleaned and linked properly

## 🚦 Implementation Order

1. **Day 1**: 
   - Fix core issues (Phase 1)
   - Run migration (Phase 3)
   - Test basic functionality

2. **Day 2**:
   - Implement email import enhancement (Phase 2)
   - Test OTA imports
   - Validate guest profile creation

3. **Day 3**:
   - Add fuzzy matching (Phase 4)
   - Implement duplicate detection UI
   - Complete testing (Phase 5)

## 📝 Notes

- Keep the original check-in form logic as it's working correctly
- Monitor the migration logs for any issues with historical data
- Consider adding a manual "Link to Guest" option in booking details for edge cases
- Future enhancement: Add guest profile photo support
- Future enhancement: Add guest preferences tracking for repeat customers

## 🔍 Monitoring

After implementation, monitor:
- Guest profile creation rate
- Duplicate detection accuracy
- Booking-to-profile linking success rate
- Any errors in logs related to guest profiles

---

**Document Version**: 1.0
**Last Updated**: August 2025
**Author**: System Analysis
**Status**: Ready for Implementation
