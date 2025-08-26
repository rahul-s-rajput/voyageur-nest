# Story 1: Fix Booking Service to Handle Guest Profile ID

## 🎯 Objective
Update the bookingService.createBooking method to properly save the guest_profile_id field when creating new bookings.

## 📋 Acceptance Criteria
- [x] bookingService.createBooking accepts and saves guest_profile_id
- [x] legacyBookingService.createBooking also accepts and saves guest_profile_id  
- [x] Guest profile ID is correctly stored in the database
- [x] Existing functionality remains unaffected

## 📍 Files to Modify
1. `src/lib/supabase/services.ts` - Primary service
2. `src/lib/supabase.ts` - Legacy service wrapper

## 🔧 Implementation Details

### Step 1: Update bookingService.createBooking in services.ts

**Location**: `src/lib/supabase/services.ts` (Line ~85)

**Current Code**:
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    property_id: booking.propertyId,
    guest_name: booking.guestName,
    room_no: booking.roomNo,
    // ... other fields
  })
```

**Updated Code**:
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    property_id: booking.propertyId,
    guest_name: booking.guestName,
    guest_profile_id: (booking as any).guest_profile_id || (booking as any).guestProfileId || null,
    room_no: booking.roomNo,
    // ... other fields
  })
```

### Step 2: Update legacyBookingService.createBooking in supabase.ts

**Location**: `src/lib/supabase.ts` (Line ~245)

**Current Code**:
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    property_id: booking.propertyId,
    guest_name: booking.guestName,
    // ... other fields
  })
```

**Updated Code**:
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    property_id: booking.propertyId,
    guest_name: booking.guestName,
    guest_profile_id: (booking as any).guest_profile_id || (booking as any).guestProfileId || null,
    // ... other fields
  })
```

## ✅ Testing Steps
1. Create a new booking via NewBookingModal
2. Check database to verify guest_profile_id is saved
3. Verify guest profile statistics are updated
4. Test with existing guest (should link) and new guest (should create and link)

## 🚨 Risks & Considerations
- Low risk change - adding a field that was previously ignored
- Ensure backward compatibility with existing bookings
- Test with both snake_case (guest_profile_id) and camelCase (guestProfileId) field names

## 📊 Success Metrics
- 100% of new bookings have guest_profile_id populated
- Guest profile statistics (total_stays, total_spent) update correctly
- No regression in existing booking creation functionality

## ⏱️ Estimated Time
- Development: 30 minutes
- Testing: 30 minutes
- Total: 1 hour

## 🏷️ Priority
**HIGH** - This is the core issue preventing guest profile linking

## 📌 Status
Completed: 2025-08-26