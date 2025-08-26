# Story 5: Comprehensive Testing & Validation

## 🎯 Objective
Perform end-to-end testing of the guest profile linking system to ensure all components work together correctly and validate that the implementation meets all requirements.

## 📋 Acceptance Criteria
- [ ] All new bookings have guest profiles linked
- [ ] Email imports create/link guest profiles correctly
- [ ] Historical data migration completed successfully
- [ ] Guest statistics are accurate
- [ ] Duplicate detection works as expected
- [ ] No regression in existing functionality

## 📍 Test Scenarios

## 🔧 Test Plan

### 1. Manual Booking Creation Tests

#### Test 1.1: New Guest via Web Form
```javascript
// Test Steps:
1. Open NewBookingModal
2. Enter new guest details:
   - Name: "Test Guest One"
   - Email: "testguest1@example.com"
   - Phone: "+91-9876543210"
3. Complete booking
4. Verify in database:
   - Guest profile created with correct details
   - Booking has guest_profile_id
   - Guest statistics show 1 stay
```

#### Test 1.2: Existing Guest via Web Form
```javascript
// Test Steps:
1. Use existing guest from Test 1.1
2. Create another booking with same email
3. Verify:
   - No new guest profile created
   - Booking linked to existing profile
   - Guest statistics show 2 stays
   - Total spent increased
```

### 2. Email Import Tests

#### Test 2.1: Booking.com Import - New Guest
```javascript
// Sample Email Content:
Subject: "New booking - Reservation 1234567890"
Body: Contains:
- Guest Name: "John Doe"
- Email: "john.doe@email.com"
- Phone: "+1-555-0123"
- Check-in: "2025-02-01"
- Check-out: "2025-02-03"

// Verify:
1. Guest profile created
2. Booking created with guest_profile_id
3. Source shows as 'ota'
4. Source details contain booking reference
```

#### Test 2.2: GoMMT Import - Existing Guest
```javascript
// Use same email as previous test
// Verify:
1. Links to existing "John Doe" profile
2. Statistics updated
3. No duplicate profile created
```

### 3. Check-in Form Tests

#### Test 3.1: Check-in Creates Profile
```javascript
// Test Steps:
1. Create booking without guest profile
2. Complete check-in form
3. Verify:
   - Guest profile created from check-in data
   - Profile linked to booking
   - Check-in data has guest_profile_id
```

#### Test 3.2: Check-in Updates Existing
```javascript
// Test Steps:
1. Use booking with existing guest profile
2. Complete check-in with updated info
3. Verify:
   - Guest profile updated with new info
   - No duplicate created
   - Same guest_profile_id maintained
```

### 4. Migration Validation

#### SQL Validation Queries
```sql
-- 1. Count unlinked bookings
SELECT COUNT(*) as unlinked_count
FROM bookings 
WHERE guest_profile_id IS NULL;

-- 2. Verify guest statistics accuracy
SELECT 
  gp.id,
  gp.name,
  gp.total_stays as recorded_stays,
  COUNT(b.id) as actual_bookings,
  gp.total_spent as recorded_spent,
  SUM(b.total_amount) as actual_spent
FROM guest_profiles gp
LEFT JOIN bookings b ON b.guest_profile_id = gp.id
GROUP BY gp.id
HAVING COUNT(b.id) != gp.total_stays 
   OR COALESCE(SUM(b.total_amount), 0) != COALESCE(gp.total_spent, 0);

-- 3. Find potential remaining duplicates
WITH duplicate_emails AS (
  SELECT email, COUNT(*) as count
  FROM guest_profiles
  WHERE email IS NOT NULL
  GROUP BY email
  HAVING COUNT(*) > 1
)
SELECT gp.*
FROM guest_profiles gp
JOIN duplicate_emails de ON gp.email = de.email
ORDER BY gp.email, gp.created_at;

-- 4. Verify all OTA bookings have profiles
SELECT COUNT(*) as ota_without_profiles
FROM bookings
WHERE source = 'ota'
AND guest_profile_id IS NULL;

-- 5. Check data integrity
SELECT 
  'Total Bookings' as metric,
  COUNT(*) as count
FROM bookings
UNION ALL
SELECT 
  'Bookings with Profiles' as metric,
  COUNT(*) as count
FROM bookings
WHERE guest_profile_id IS NOT NULL
UNION ALL
SELECT 
  'Total Guest Profiles' as metric,
  COUNT(*) as count
FROM guest_profiles
UNION ALL
SELECT 
  'Profiles with Bookings' as metric,
  COUNT(DISTINCT guest_profile_id) as count
FROM bookings
WHERE guest_profile_id IS NOT NULL;
```

### 5. Performance Tests

#### Test 5.1: Bulk Import Performance
```javascript
// Test with 100 email imports
const startTime = Date.now();

for (let i = 0; i < 100; i++) {
  await emailBookingImportService.importFromParsed(
    `email_${i}`,
    {
      guest_name: `Guest ${i}`,
      contact_email: `guest${i}@test.com`,
      // ... other fields
    }
  );
}

const duration = Date.now() - startTime;
console.log(`100 imports completed in ${duration}ms`);
// Should complete in < 30 seconds
```

#### Test 5.2: Duplicate Detection Performance
```javascript
// Test with 1000 guest profiles
const profiles = await GuestProfileService.searchGuestProfiles({ limit: 1000 });
const startTime = Date.now();

const duplicates = await GuestProfileService.findAllDuplicates();

const duration = Date.now() - startTime;
console.log(`Duplicate detection for 1000 profiles: ${duration}ms`);
// Should complete in < 5 seconds
```

### 6. Edge Cases

#### Test 6.1: Booking Without Contact Info
```javascript
// Create booking with only guest name
const booking = {
  guestName: "Mystery Guest",
  // No email or phone
};
// Should create guest profile with just name
```

#### Test 6.2: Email Variations
```javascript
// Test email case sensitivity
const emails = [
  "Test@Example.com",
  "test@example.com",
  "TEST@EXAMPLE.COM"
];
// All should link to same profile
```

#### Test 6.3: Phone Format Variations
```javascript
// Test different phone formats
const phones = [
  "+91-9876543210",
  "9876543210",
  "+919876543210",
  "91 9876543210"
];
// Should handle various formats
```

### 7. Regression Tests

#### Test 7.1: Existing Features Still Work
- [ ] Booking creation without guest profile still works
- [ ] Invoice generation unaffected
- [ ] Payment tracking unaffected
- [ ] Room availability checking unaffected
- [ ] Email sync continues working

#### Test 7.2: API Compatibility
- [ ] All existing API endpoints work
- [ ] No breaking changes in response formats
- [ ] Authentication still works correctly

## 📊 Test Metrics & Pass Criteria

| Metric | Target | Actual | Pass? |
|--------|---------|--------|-------|
| Bookings with guest profiles | > 95% | ___ | ⬜ |
| Duplicate profiles | < 5% | ___ | ⬜ |
| Migration completion time | < 5 min | ___ | ⬜ |
| Import with profile linking | 100% | ___ | ⬜ |
| Performance (100 imports) | < 30s | ___ | ⬜ |
| Test cases passed | > 95% | ___ | ⬜ |

## 🐛 Bug Tracking

### Known Issues to Fix
| Issue | Severity | Status | Notes |
|-------|----------|---------|-------|
| Example: Duplicate detection too aggressive | Medium | Open | Detecting different people as duplicates |

## 🚨 Rollback Plan

If critical issues are found:

1. **Code Rollback**:
```bash
git revert [commit-hash]
git push origin main
```

2. **Database Rollback** (if needed):
```sql
-- Remove guest_profile_id from new bookings
UPDATE bookings 
SET guest_profile_id = NULL 
WHERE created_at > '2025-01-25';
```

## 📋 Testing Checklist

### Pre-Deployment
- [ ] All unit tests pass
- [ ] Integration tests complete
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Database backup created

### Post-Deployment
- [ ] Monitor error rates for 24 hours
- [ ] Check guest profile creation rate
- [ ] Verify no increase in failed bookings
- [ ] Confirm email imports working
- [ ] Review user feedback

## ⏱️ Estimated Time
- Test Preparation: 1 hour
- Manual Testing: 3 hours
- Automated Testing: 2 hours
- Performance Testing: 1 hour
- Documentation: 1 hour
- Total: 8 hours

## 🏷️ Priority
**CRITICAL** - Must be completed before production deployment

## 🔗 Dependencies
- All implementation stories (1-4) completed
- Test database with production-like data
- Access to email import system

## 📝 Notes
- Run tests on staging environment first
- Keep test data for future regression testing
- Document any workarounds needed
- Create automated test suite for CI/CD