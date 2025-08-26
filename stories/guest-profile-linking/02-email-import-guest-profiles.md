# Story 2: Add Guest Profile Creation to Email Import Service

## 🎯 Objective
Enhance the email booking import service to automatically create or link guest profiles when importing bookings from OTA emails (Booking.com, GoMMT).

## 📋 Acceptance Criteria
- [ ] Email imports search for existing guest profiles by email/phone
- [ ] New guest profiles are created if no match found
- [ ] Existing guest profiles are updated with new information
- [ ] Guest profile ID is linked to imported bookings
- [ ] Process handles missing contact information gracefully

## 📍 Files to Modify
1. `src/services/emailBookingImportService.ts`

## 🔧 Implementation Details

### Step 1: Import GuestProfileService

**Location**: Top of file (after existing imports)

```typescript
import { GuestProfileService } from './guestProfileService';
```

### Step 2: Add Guest Profile Logic to importFromParsed Method

**Location**: `importFromParsed` method (Line ~65, before bookingPayload creation)

**Add this code block**:
```typescript
// Guest Profile Creation/Linking Logic
let guestProfileId: string | undefined;

if (parsed.guest_name || parsed.contact_email || parsed.contact_phone) {
  try {
    // Search for existing guest by email or phone
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
      console.log(`Linked OTA booking to existing guest profile: ${existingGuest.id}`);
    } else {
      // Create new guest profile
      const newGuest = await GuestProfileService.createGuestProfile({
        name: parsed.guest_name || 'Guest',
        email: parsed.contact_email,
        phone: parsed.contact_phone,
      });
      guestProfileId = newGuest.id;
      console.log(`Created new guest profile for OTA booking: ${newGuest.id}`);
    }
  } catch (error) {
    console.error('Failed to create/link guest profile for email import:', error);
    // Continue with booking import even if guest profile fails
  }
}
```

### Step 3: Update bookingPayload to Include guest_profile_id

**Location**: In the `bookingPayload` object creation

**Current Code**:
```typescript
const bookingPayload = {
  propertyId: resolvedPropertyId,
  guestName: parsed.guest_name || 'Guest',
  // ... other fields
  source: 'ota',
  source_details: parsed.booking_reference ? { provider, ota_ref: parsed.booking_reference } : { provider },
} as const;
```

**Updated Code**:
```typescript
const bookingPayload = {
  propertyId: resolvedPropertyId,
  guestName: parsed.guest_name || 'Guest',
  // ... other fields
  guest_profile_id: guestProfileId, // ADD THIS LINE
  source: 'ota',
  source_details: parsed.booking_reference ? { provider, ota_ref: parsed.booking_reference } : { provider },
} as const;
```

## ✅ Testing Steps

### Test Case 1: New Guest from OTA
1. Import a Booking.com email with new guest details
2. Verify new guest profile is created
3. Verify booking is linked to the new guest profile
4. Check guest profile has email, phone, and name from the booking

### Test Case 2: Existing Guest from OTA
1. Create a guest profile manually with email "test@example.com"
2. Import an OTA booking with the same email
3. Verify booking links to existing guest profile
4. Verify guest profile is updated with any new information

### Test Case 3: Modified Booking
1. Import an initial OTA booking (creates guest profile)
2. Import a modification email for the same booking
3. Verify the modification updates the same booking
4. Verify guest profile link is maintained

### Test Case 4: Missing Contact Information
1. Import an OTA booking with no email or phone
2. Verify booking is still created successfully
3. Verify guest profile is created with just the name

## 🚨 Risks & Considerations
- Guest profile creation failure should not block booking import
- Handle duplicate guests gracefully (use existing if found)
- Consider rate limiting if importing many bookings at once
- Ensure guest profile statistics trigger updates

## 📊 Success Metrics
- 100% of OTA imports with contact info have guest profiles
- Guest profiles correctly aggregate bookings from multiple OTAs
- No failed booking imports due to guest profile issues
- Reduction in duplicate guest profiles

## ⏱️ Estimated Time
- Development: 1 hour
- Testing: 1.5 hours
- Total: 2.5 hours

## 🏷️ Priority
**HIGH** - Critical for maintaining complete guest history

## 🔗 Dependencies
- Requires Story 1 (Fix Booking Service) to be completed first
- GuestProfileService must be working correctly