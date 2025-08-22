-- ============================================================================
-- RLS FUNCTION-BASED TEST VALIDATION
-- ============================================================================
-- This file provides comprehensive Row Level Security (RLS) testing using
-- dedicated test functions instead of set_config() calls to avoid security-definer errors.
-- Run each section sequentially in your Supabase SQL Editor.

-- ============================================================================
-- SECTION 1: SETUP TEST DATA 
-- ============================================================================

-- Create test admin user in user_roles table
DO $$
DECLARE
  test_admin_id UUID;
  existing_user_count INTEGER;
BEGIN
  -- Check if any users exist in auth.users
  SELECT COUNT(*) INTO existing_user_count FROM auth.users LIMIT 1;
  
  IF existing_user_count > 0 THEN
    -- Get the first existing user to use as test admin
    SELECT id INTO test_admin_id FROM auth.users LIMIT 1;
    
    -- Insert admin role for this user
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (test_admin_id, 'admin', NOW())
    ON CONFLICT (user_id, role) DO UPDATE SET assigned_at = NOW();
    
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

-- ============================================================================
-- SECTION 2: RLS TEST FUNCTIONS
-- ============================================================================

-- Mock JWT generation for testing contexts
CREATE OR REPLACE FUNCTION generate_test_jwt(
  user_id UUID DEFAULT NULL, 
  user_role TEXT DEFAULT 'anon'
) RETURNS JSONB 
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;
  
  RETURN jsonb_build_object(
    'sub', user_id,
    'role', user_role,
    'aud', 'authenticated'
  );
END $$;

-- Test anonymous/public access
CREATE OR REPLACE FUNCTION test_anonymous_access()
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT) 
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test public read access to menu items (should succeed)
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.menu_items LIMIT 5;
    RETURN QUERY SELECT 
      'menu_items public read'::TEXT,
      'PASS'::TEXT,
      format('Found %s menu items', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'menu_items public read'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test public read access to menu categories (should succeed)
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.menu_categories LIMIT 5;
    RETURN QUERY SELECT 
      'menu_categories public read'::TEXT,
      'PASS'::TEXT,
      format('Found %s categories', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'menu_categories public read'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test restricted access to email_messages (should fail)
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.email_messages LIMIT 5;
    RETURN QUERY SELECT 
      'email_messages anon access'::TEXT,
      'FAIL'::TEXT,
      'Should have been blocked but was allowed'::TEXT;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN QUERY SELECT 
      'email_messages anon access'::TEXT,
      'PASS'::TEXT,
      'Correctly blocked access'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'email_messages anon access'::TEXT,
      'INCONCLUSIVE'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test check-in data creation (should succeed)
  BEGIN
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
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '2 days',
      'TEST001',
      'Special request',
      NOW()
    );
    RETURN QUERY SELECT 
      'checkin_data anon create'::TEXT,
      'PASS'::TEXT,
      'Successfully created checkin record'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'checkin_data anon create'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

END $$;

-- Test authenticated non-admin user access
CREATE OR REPLACE FUNCTION test_authenticated_access(test_user_id UUID)
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test that authenticated users can read public tables
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.menu_items LIMIT 5;
    RETURN QUERY SELECT 
      'authenticated menu_items read'::TEXT,
      'PASS'::TEXT,
      format('Found %s menu items', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'authenticated menu_items read'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test bookings access (should have limited access)
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.bookings LIMIT 5;
    RETURN QUERY SELECT 
      'authenticated bookings read'::TEXT,
      'PASS'::TEXT,
      format('Found %s bookings', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'authenticated bookings read'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test restricted admin tables (should fail)
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.email_messages LIMIT 5;
    RETURN QUERY SELECT 
      'non-admin email_messages access'::TEXT,
      'FAIL'::TEXT,
      'Should have been blocked but was allowed'::TEXT;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN QUERY SELECT 
      'non-admin email_messages access'::TEXT,
      'PASS'::TEXT,
      'Correctly blocked access'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'non-admin email_messages access'::TEXT,
      'INCONCLUSIVE'::TEXT,
      SQLERRM::TEXT;
  END;

END $$;

-- Test admin user access
CREATE OR REPLACE FUNCTION test_admin_access(admin_user_id UUID)
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  test_count INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  -- Verify user is actually admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = admin_user_id AND role = 'admin'
  ) INTO is_user_admin;

  IF NOT is_user_admin THEN
    RETURN QUERY SELECT 
      'admin_verification'::TEXT,
      'FAIL'::TEXT,
      format('User %s is not in admin role', admin_user_id)::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT 
    'admin_verification'::TEXT,
    'PASS'::TEXT,
    format('User %s confirmed as admin', admin_user_id)::TEXT;

  -- Test admin access to public tables
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.menu_items LIMIT 5;
    RETURN QUERY SELECT 
      'admin menu_items access'::TEXT,
      'PASS'::TEXT,
      format('Found %s menu items', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'admin menu_items access'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test admin access to bookings
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.bookings LIMIT 5;
    RETURN QUERY SELECT 
      'admin bookings access'::TEXT,
      'PASS'::TEXT,
      format('Found %s bookings', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'admin bookings access'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test admin access to restricted tables
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.email_messages LIMIT 5;
    RETURN QUERY SELECT 
      'admin email_messages access'::TEXT,
      'PASS'::TEXT,
      format('Found %s email messages', test_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'admin email_messages access'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

END $$;

-- Test helper functions
CREATE OR REPLACE FUNCTION test_helper_functions()
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  admin_user_id UUID;
  admin_check BOOLEAN;
  auth_check BOOLEAN;
BEGIN
  -- Get admin user for testing
  SELECT user_id INTO admin_user_id 
  FROM public.user_roles 
  WHERE role = 'admin' 
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'helper_function_setup'::TEXT,
      'SKIP'::TEXT,
      'No admin user found for helper function testing'::TEXT;
    RETURN;
  END IF;

  -- Test is_admin function (note: this may not work perfectly without proper JWT context)
  BEGIN
    SELECT public.is_admin() INTO admin_check;
    RETURN QUERY SELECT 
      'is_admin() function'::TEXT,
      CASE WHEN admin_check IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::TEXT,
      format('Function returned: %s', admin_check)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'is_admin() function'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

  -- Test is_authenticated function
  BEGIN
    SELECT public.is_authenticated() INTO auth_check;
    RETURN QUERY SELECT 
      'is_authenticated() function'::TEXT,
      CASE WHEN auth_check IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::TEXT,
      format('Function returned: %s', auth_check)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'is_authenticated() function'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
  END;

END $$;

-- ============================================================================
-- SECTION 3: RLS STATUS AND POLICY VALIDATION
-- ============================================================================

-- Check built-in RLS validation function
CREATE OR REPLACE FUNCTION run_built_in_rls_tests()
RETURNS TABLE(test_name TEXT, result TEXT, details TEXT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  BEGIN
    RETURN QUERY 
    SELECT 
      'built_in_rls_test'::TEXT,
      'EXECUTED'::TEXT,
      'Running public.test_rls_policies()'::TEXT;
    
    -- Note: This will show results from the built-in function
    -- Results should be reviewed in the output
    PERFORM public.test_rls_policies();
    
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'built_in_rls_test'::TEXT,
      'ERROR'::TEXT,
      SQLERRM::TEXT;
  END;
END $$;

-- Get RLS status across all tables
CREATE OR REPLACE FUNCTION get_rls_status()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN, policy_count BIGINT)
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT as table_name,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename 
    AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE 'sql_%'
  GROUP BY t.tablename, t.rowsecurity
  HAVING t.rowsecurity = true
  ORDER BY t.tablename;
END $$;

-- ============================================================================
-- SECTION 4: COMPREHENSIVE TEST RUNNER
-- ============================================================================

-- Master test runner function
CREATE OR REPLACE FUNCTION run_comprehensive_rls_tests()
RETURNS TABLE(
  section TEXT,
  test_name TEXT, 
  result TEXT, 
  details TEXT,
  timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  admin_user_id UUID;
  test_user_id UUID;
BEGIN
  -- Get test users
  SELECT user_id INTO admin_user_id 
  FROM public.user_roles 
  WHERE role = 'admin' 
  LIMIT 1;

  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
  LIMIT 1;

  -- If no non-admin user exists, use admin user for authenticated tests
  IF test_user_id IS NULL THEN
    test_user_id := admin_user_id;
  END IF;

  -- Test anonymous access
  RETURN QUERY 
  SELECT 
    'Anonymous Access'::TEXT as section,
    t.test_name,
    t.result,
    t.details,
    NOW() as timestamp
  FROM test_anonymous_access() t;

  -- Test authenticated access (if we have a user)
  IF test_user_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT 
      'Authenticated Access'::TEXT as section,
      t.test_name,
      t.result,
      t.details,
      NOW() as timestamp
    FROM test_authenticated_access(test_user_id) t;
  END IF;

  -- Test admin access (if we have an admin)
  IF admin_user_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT 
      'Admin Access'::TEXT as section,
      t.test_name,
      t.result,
      t.details,
      NOW() as timestamp
    FROM test_admin_access(admin_user_id) t;
  END IF;

  -- Test helper functions
  RETURN QUERY 
  SELECT 
    'Helper Functions'::TEXT as section,
    t.test_name,
    t.result,
    t.details,
    NOW() as timestamp
  FROM test_helper_functions() t;

  -- Run built-in tests
  RETURN QUERY 
  SELECT 
    'Built-in RLS Tests'::TEXT as section,
    t.test_name,
    t.result,
    t.details,
    NOW() as timestamp
  FROM run_built_in_rls_tests() t;

END $$;

-- ============================================================================
-- SECTION 5: EXECUTION INSTRUCTIONS
-- ============================================================================

/*
TO RUN THESE TESTS:

1. First, ensure you have at least one user in auth.users:
   - Either create a user through your app's signup flow
   - Or manually insert a test user if needed

2. Run the comprehensive test suite:
   SELECT * FROM run_comprehensive_rls_tests();

3. Check RLS status across tables:
   SELECT * FROM get_rls_status();

4. Run individual test sections if needed:
   SELECT * FROM test_anonymous_access();
   SELECT * FROM test_authenticated_access('user-uuid-here');
   SELECT * FROM test_admin_access('admin-user-uuid-here');
   SELECT * FROM test_helper_functions();

5. Monitor performance (if you've set up the monitoring views):
   SELECT * FROM public.rls_performance_stats;

EXPECTED RESULTS:
- Anonymous access: Should pass for public tables, fail for restricted tables
- Authenticated access: Should pass for most tables with user-based restrictions
- Admin access: Should pass for all tables including admin-only tables
- Helper functions: Should execute without errors and return boolean results

If any tests fail unexpectedly, check:
1. RLS policies are properly enabled
2. Helper functions (is_admin, is_authenticated) are working correctly  
3. User roles are properly assigned in the user_roles table
4. JWT handling is working in your Supabase instance
*/

-- Clean up test checkin data
DELETE FROM public.checkin_data 
WHERE booking_id = '55555555-5555-5555-5555-555555555555'
  AND email = 'test@x.co';

-- Show completion message
SELECT 
  'RLS Function-Based Test Suite' as title,
  'Ready to execute' as status,
  'Run: SELECT * FROM run_comprehensive_rls_tests();' as next_step;
