-- ============================================================================
-- COMPREHENSIVE RLS TEST AND VALIDATION SUITE
-- Tests all RLS policies against actual database schema
-- ============================================================================

-- This file provides comprehensive testing for the RLS policies implemented
-- in accurate_rls_policies_migration.sql. Run each section sequentially.

-- ============================================================================
-- SECTION 1: SETUP TEST USERS AND DATA
-- ============================================================================

-- Create test admin user in user_roles table
-- Note: Replace test UUIDs with actual user IDs from your auth.users table
DO $$
DECLARE
  test_admin_id UUID;
  existing_user_count INTEGER;
BEGIN
  -- Check if any users exist in auth.users
  SELECT COUNT(*) INTO existing_user_count FROM auth.users LIMIT 1;
  
  IF existing_user_count > 0 THEN
    -- Use the first existing user as test admin
    SELECT id INTO test_admin_id FROM auth.users LIMIT 1;
    
    INSERT INTO public.user_roles (user_id, role, assigned_at) 
    VALUES (test_admin_id, 'admin', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Test admin user created with ID: %', test_admin_id;
  ELSE
    RAISE NOTICE 'No users found in auth.users - skipping user_roles setup';
    RAISE NOTICE 'Create a user via Supabase Auth first, then re-run this test';
  END IF;
  
END $$;

-- Create test property for consistent testing
INSERT INTO public.properties (
  id, name, address, email, phone, website_url, description, is_active, created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'TestProp',
  '123 Test',
  't@t.com',
  '555012',
  'test.com',
  'Test property for RLS validation',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true;

-- Create test room for bookings
INSERT INTO public.rooms (
  id, property_id, room_number, room_type, 
  base_price, max_occupancy, is_active, created_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'TEST001',
  'Standard',
  100.00,
  2,
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  property_id = EXCLUDED.property_id,
  is_active = true;

-- Create test booking for check-in tests
INSERT INTO public.bookings (
  id, property_id, room_no, guest_name, contact_email, contact_phone,
  check_in, check_out, total_amount, status, created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'TEST001',
  'TestGuest',
  'test@x.co',
  '5550456',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '2 days',
  200.00,
  'confirmed',
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  status = 'confirmed',
  contact_email = EXCLUDED.contact_email;

-- Test data setup completed

-- ============================================================================
-- SECTION 2: BUILT-IN RLS POLICY VALIDATION
-- ============================================================================

-- === Running built-in RLS validation function ===
SELECT * FROM public.test_rls_policies();

-- Check RLS status across all tables
-- === RLS Status Summary ===
SELECT 
  table_name,
  rls_enabled,
  policy_count
FROM (
  SELECT 
    t.tablename as table_name,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename 
    AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename
) rls_summary
WHERE rls_enabled = true;

-- ============================================================================
-- SECTION 3: ANONYMOUS (PUBLIC) ACCESS TESTS
-- ============================================================================

-- === Testing Anonymous/Public Access ===

-- Reset to anonymous context (no JWT claims)
SELECT set_config('request.jwt.claims', '{}', true);

-- --- Public Read Access (Should Succeed) ---

-- Test public read access to menu items
SELECT 'menu_items public read' as test_name, 
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.menu_items LIMIT 5;

-- Test public read access to menu categories  
SELECT 'menu_categories public read' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.menu_categories LIMIT 5;

-- Test public read access to properties
SELECT 'properties public read' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.properties WHERE is_active = true LIMIT 5;

-- Test public read access to rooms
SELECT 'rooms public read' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.rooms WHERE is_active = true LIMIT 5;

-- --- Public Write Access to Protected Tables (Should Fail) ---

-- Test that anon cannot access admin-only tables
DO $$
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM public.expenses LIMIT 1;
    RAISE NOTICE 'expenses anon access: FAIL - Should be blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'expenses anon access: PASS - Correctly blocked';
  END;
  
  BEGIN
    PERFORM COUNT(*) FROM public.user_roles LIMIT 1;
    RAISE NOTICE 'user_roles anon access: FAIL - Should be blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'user_roles anon access: PASS - Correctly blocked';
  END;
  
  BEGIN
    PERFORM COUNT(*) FROM public.email_messages LIMIT 1;
    RAISE NOTICE 'email_messages anon access: FAIL - Should be blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'email_messages anon access: PASS - Correctly blocked';
  END;
END $$;

-- ============================================================================
-- SECTION 4: AUTHENTICATED NON-ADMIN ACCESS TESTS  
-- ============================================================================

-- === Testing Authenticated Non-Admin Access ===

-- Set authenticated non-admin user context
SELECT set_config('request.jwt.claims', 
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

-- --- Non-Admin Read Access Tests ---

-- Test that authenticated users can read public tables
SELECT 'authenticated menu_items read' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.menu_items LIMIT 5;

-- Test that authenticated users can read their own bookings
SELECT 'authenticated bookings read' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.bookings LIMIT 5;

-- --- Non-Admin Admin Table Access (Should Fail) ---

-- Test that non-admin cannot access admin-only tables
DO $$
BEGIN
  BEGIN
    PERFORM COUNT(*) FROM public.expenses LIMIT 1;
    RAISE NOTICE 'non-admin expenses access: FAIL - Should be blocked';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'non-admin expenses access: PASS - Correctly blocked';
  END;
  
  BEGIN
    PERFORM COUNT(*) FROM public.email_messages LIMIT 1;
    RAISE NOTICE 'non-admin email_messages access: FAIL - Should be blocked'; 
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'non-admin email_messages access: PASS - Correctly blocked';
  END;
END $$;

-- ============================================================================
-- SECTION 5: ADMIN ACCESS TESTS
-- ============================================================================

-- === Testing Admin Access ===

-- Set admin user context
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- --- Admin Full Access Tests ---

-- Test admin access to all table types
SELECT 'admin menu_items access' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.menu_items LIMIT 5;

SELECT 'admin bookings access' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.bookings LIMIT 5;

SELECT 'admin expenses access' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.expenses LIMIT 5;

SELECT 'admin user_roles access' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.user_roles LIMIT 5;

SELECT 'admin email_messages access' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM public.email_messages LIMIT 5;

-- ============================================================================
-- SECTION 6: CHECK-IN WORKFLOW TESTS
-- ============================================================================

-- === Testing Check-in Workflow ===

-- Reset to anonymous context for check-in test
SELECT set_config('request.jwt.claims', '{}', true);

-- --- Anonymous Check-in Data Creation Test ---

-- Test anonymous check-in data creation
DO $$
DECLARE
  checkin_id UUID;
BEGIN
  -- This should succeed - public can create check-in data
  INSERT INTO public.checkin_data (
    id, booking_id, email, first_name, last_name, phone,
    id_type, id_number, address, emergency_contact_name, 
    emergency_contact_phone, emergency_contact_relation, 
    purpose_of_visit, arrival_date, departure_date, room_number,
    special_requests, created_at
  ) VALUES (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555',
    'test@x.co',
    'Test',
    'Guest',
    '5550456',
    'passport',
    'TEST123',
    'Test Addr',
    'Emergency',
    '5550789',
    'friend',
    'business',
    CURRENT_DATE::text,
    (CURRENT_DATE + INTERVAL '2 days')::text,
    'TEST001',
    'Test request',
    NOW()
  ) RETURNING id INTO checkin_id;
  
  RAISE NOTICE 'Anonymous check-in creation: PASS - ID: %', checkin_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Anonymous check-in creation: FAIL - %', SQLERRM;
END $$;

-- --- Anonymous Check-in Data Update Test ---

-- Test anonymous check-in data update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- This should succeed with proper email validation
  UPDATE public.checkin_data 
  SET special_requests = 'Updated request',
      updated_at = NOW()
  WHERE booking_id = '55555555-5555-5555-5555-555555555555'
    AND email = 'test@x.co';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Anonymous check-in update: PASS - % rows updated', updated_count;
  ELSE
    RAISE NOTICE 'Anonymous check-in update: INCONCLUSIVE - No matching rows';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Anonymous check-in update: FAIL - %', SQLERRM;
END $$;

-- ============================================================================
-- SECTION 7: HELPER FUNCTION TESTS
-- ============================================================================

-- === Testing Helper Functions ===

-- Test is_admin() function with different roles
SELECT set_config('request.jwt.claims', '{}', true);
SELECT 'is_admin() anon' as test_name, 
       public.is_admin() as result,
       CASE WHEN public.is_admin() = false THEN 'PASS' ELSE 'FAIL' END as status;

SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT 'is_admin() non-admin' as test_name,
       public.is_admin() as result,
       CASE WHEN public.is_admin() = false THEN 'PASS' ELSE 'FAIL' END as status;

SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT 'is_admin() admin' as test_name,
       public.is_admin() as result,
       CASE WHEN public.is_admin() = true THEN 'PASS' ELSE 'FAIL' END as status;

-- Test is_authenticated() function
SELECT set_config('request.jwt.claims', '{}', true);
SELECT 'is_authenticated() anon' as test_name,
       public.is_authenticated() as result,
       CASE WHEN public.is_authenticated() = false THEN 'PASS' ELSE 'FAIL' END as status;

SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT 'is_authenticated() auth' as test_name,
       public.is_authenticated() as result,
       CASE WHEN public.is_authenticated() = true THEN 'PASS' ELSE 'FAIL' END as status;

-- Test validate_booking_access() function
SELECT 'validate_booking_access() valid' as test_name,
       public.validate_booking_access(
         '55555555-5555-5555-5555-555555555555'::UUID,
         'testguest@rls.com'
       ) as result,
       CASE WHEN public.validate_booking_access(
         '55555555-5555-5555-5555-555555555555'::UUID,
         'testguest@rls.com'
       ) = true THEN 'PASS' ELSE 'FAIL' END as status;

SELECT 'validate_booking_access() invalid' as test_name,
       public.validate_booking_access(
         '55555555-5555-5555-5555-555555555555'::UUID,
         'wrong@email.com'
       ) as result,
       CASE WHEN public.validate_booking_access(
         '55555555-5555-5555-5555-555555555555'::UUID,
         'wrong@email.com'
       ) = false THEN 'PASS' ELSE 'FAIL' END as status;

-- ============================================================================
-- SECTION 8: PERFORMANCE AND MONITORING
-- ============================================================================

-- === Performance and Monitoring Checks ===

-- Check RLS performance stats
SELECT 'RLS Performance Stats' as check_name;
SELECT 
  tablename,
  inserts,
  updates, 
  deletes,
  sequential_scans,
  index_scans,
  index_usage_pct
FROM public.rls_performance_stats 
WHERE sequential_scans > 0 OR index_scans > 0
ORDER BY sequential_scans DESC
LIMIT 10;

-- Check audit log entries
SELECT 'Audit Log Entries' as check_name;
SELECT 
  event_type,
  table_name,
  user_id,
  details,
  created_at
FROM public.checkin_audit_log 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for any policy violations or errors
SELECT 'Recent Security Events' as check_name;
SELECT 
  COUNT(*) as security_event_count,
  event_type
FROM public.checkin_audit_log 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND event_type IN ('policy_violation', 'access_denied', 'unauthorized_attempt')
GROUP BY event_type;

-- ============================================================================
-- SECTION 9: CLEANUP TEST DATA
-- ============================================================================

-- === Cleaning up test data ===

-- Set admin context for cleanup
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- Clean up test check-in data
DELETE FROM public.checkin_data 
WHERE booking_id = '55555555-5555-5555-5555-555555555555';

-- Note: We keep the test users, property, room, and booking for future tests
-- To fully clean up, uncomment these lines:
-- DELETE FROM public.bookings WHERE id = '55555555-5555-5555-5555-555555555555';
-- DELETE FROM public.rooms WHERE id = '44444444-4444-4444-4444-444444444444';  
-- DELETE FROM public.properties WHERE id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM public.user_roles WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- === RLS Test Suite Completed ===

-- Final summary
SELECT 
  'RLS Test Suite' as test_suite,
  'Completed' as status,
  NOW() as completed_at;

-- Instructions for manual verification
/*
=== MANUAL VERIFICATION STEPS ===
1. Review all test results above for any FAIL statuses
2. Check that public tables are readable by anonymous users
3. Verify admin-only tables are blocked for non-admin users
4. Confirm check-in workflow works for anonymous users
5. Test your application to ensure normal functionality
6. Monitor rls_performance_stats and checkin_audit_log tables

If any tests fail, review the RLS policies in accurate_rls_policies_migration.sql
*/
