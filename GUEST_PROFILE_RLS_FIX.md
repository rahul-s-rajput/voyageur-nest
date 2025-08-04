# Guest Profile RLS Fix Summary

## Issue Description
The application was encountering 401 (Unauthorized) errors when trying to create guest profiles during check-in submission. The error message indicated:

```
new row violates row-level security policy for table "guest_profiles"
```

## Root Cause Analysis
The issue was caused by overly restrictive Row Level Security (RLS) policies on the `guest_profiles` table:

1. **Anonymous users could only INSERT** guest profiles
2. **Only authenticated users could SELECT** guest profiles
3. **Guest search functionality** required SELECT permissions for anonymous users
4. **Check-in process** runs as anonymous users, not authenticated users

## Fixes Applied

### 1. TypeScript Errors Fixed
- ✅ Fixed `searchGuests` method calls to use `GuestProfileService.searchGuestProfiles()`
- ✅ Fixed `full_name` property references to use `name` instead
- ✅ Updated guest profile creation to use correct field names

### 2. RLS Policy Updates
Created migration file: `fix_guest_profiles_rls.sql`

**New Policies:**
- **Allow anon to read guest profiles** - Enables guest search during check-in
- **Allow anon to insert guest profiles** - Enables guest profile creation during check-in  
- **Allow anon to update guest profiles** - Enables guest profile updates during check-in
- **Allow authenticated users full access** - Maintains admin functionality

### 3. Migration Instructions
To apply the fix:

1. Open your Supabase SQL editor
2. Run the contents of `fix_guest_profiles_rls.sql`
3. Verify policies are applied correctly

## Security Considerations
- Anonymous access is limited to guest profile operations needed for check-in
- Authenticated users (admin) retain full access
- RLS still provides row-level security, just with appropriate permissions
- Guest data remains protected while enabling necessary functionality

## Testing
After applying the migration:
1. Test guest profile search in NewBookingModal
2. Test guest profile creation during check-in
3. Verify admin functionality still works
4. Confirm no unauthorized access to other data

## Files Modified
- `src/components/NewBookingModal.tsx` - Fixed TypeScript errors
- `fix_guest_profiles_rls.sql` - New RLS policies migration

## Status
✅ **Ready for deployment** - Apply the SQL migration to resolve the RLS issues.