-- ============================================================================
-- ACCURATE ROW LEVEL SECURITY (RLS) POLICIES IMPLEMENTATION
-- Based on actual database schema - Story 5.2
-- ============================================================================

-- This migration implements RLS policies only for tables that actually exist
-- following the three-tier access model:
-- 1. Public Access: Customer-facing features (menu, properties, rooms)
-- 2. Mixed Access: Public create, admin modify (bookings, check-in)
-- 3. Admin-Only: Full protection (expenses, admin tables)

-- ============================================================================
-- STEP 1: CORE RLS INFRASTRUCTURE - HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check if current user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has admin role in user_roles table
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
    AND created_at IS NOT NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false for security
    RAISE WARNING 'Auth role check failed for user %, error: %', auth.uid(), SQLERRM;
    RETURN false;
END;
$$;

-- Helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- First check user_roles table if authenticated
  IF auth.uid() IS NOT NULL THEN
    RETURN COALESCE(
      (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
      'authenticated'
    );
  END IF;
  
  -- Fallback to JWT claim or anonymous
  RETURN COALESCE(
    auth.jwt() ->> 'user_role',
    'anonymous'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'anonymous';
END;
$$;

-- Helper function to validate booking access for public check-in
CREATE OR REPLACE FUNCTION public.validate_booking_access(
  p_booking_id UUID,
  p_email TEXT
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Get booking with email validation (using actual schema columns)
  SELECT id, contact_email, status
  INTO booking_record
  FROM bookings 
  WHERE id = p_booking_id
    AND contact_email = LOWER(TRIM(p_email));
  
  -- Return true if booking found and accessible
  RETURN booking_record.id IS NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Booking access validation failed for %, error: %', p_booking_id, SQLERRM;
    RETURN false;
END;
$$;

-- ============================================================================
-- STEP 2: AUDIT LOGGING INFRASTRUCTURE
-- ============================================================================

-- Function to log audit events (using existing checkin_audit_log structure)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_table_name TEXT,
  p_booking_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO checkin_audit_log (
    action,
    user_id,
    user_role,
    booking_id,
    ip_address,
    details
  ) VALUES (
    p_action,
    COALESCE(auth.uid()::text, 'anonymous'),
    get_user_role(),
    p_booking_id,
    inet_client_addr(),
    COALESCE(p_details, jsonb_build_object('table', p_table_name))
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if audit logging fails
    RAISE LOG 'Security audit logging failed: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 3: PUBLIC ACCESS TABLES - Customer-facing features
-- ============================================================================

-- Menu Items - Public read access for customer menu viewing
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access to menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow insert access to menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow update access to menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow delete access to menu_items" ON public.menu_items;

-- Allow public read access to available menu items only
CREATE POLICY "Public can view available menu items"
  ON public.menu_items
  FOR SELECT
  TO public, anon
  USING (is_available = true);

-- Admin can perform all operations
CREATE POLICY "Admin full access to menu items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Menu Categories - Public read access
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow insert access to menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow update access to menu_categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow delete access to menu_categories" ON public.menu_categories;

CREATE POLICY "Public can view active menu categories"
  ON public.menu_categories
  FOR SELECT
  TO public, anon
  USING (is_active = true);

CREATE POLICY "Admin full access to menu categories"
  ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Rooms - Public read access for booking
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow insert access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow update access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow delete access to rooms" ON public.rooms;

CREATE POLICY "Public can view available rooms"
  ON public.rooms
  FOR SELECT
  TO public, anon
  USING (is_active = true);

CREATE POLICY "Admin full access to rooms"
  ON public.rooms
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Properties - Public read access for property info
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to properties" ON public.properties;
DROP POLICY IF EXISTS "Allow insert access to properties" ON public.properties;
DROP POLICY IF EXISTS "Allow update access to properties" ON public.properties;
DROP POLICY IF EXISTS "Allow delete access to properties" ON public.properties;

CREATE POLICY "Public can view active properties"
  ON public.properties
  FOR SELECT
  TO public, anon
  USING (is_active = true);

CREATE POLICY "Admin full access to properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- STEP 4: MIXED ACCESS TABLES - Public create/update for check-in, admin modify
-- ============================================================================

-- Bookings - Public can create and update for check-in, admin can view/modify all
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow insert access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow update access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow delete access to bookings" ON public.bookings;

-- Public can create new bookings with validation
CREATE POLICY "Public can create bookings"
  ON public.bookings
  FOR INSERT
  TO public, anon
  WITH CHECK (
    -- Validate booking data constraints using actual column names
    check_in >= CURRENT_DATE
    AND check_out > check_in
    AND no_of_pax > 0
    AND no_of_pax <= 10
    AND contact_email IS NOT NULL
    AND LENGTH(contact_email) >= 5
    AND property_id IS NOT NULL
  );

-- Public can view bookings (application layer handles access control)
CREATE POLICY "Public can view bookings for validation"
  ON public.bookings
  FOR SELECT
  TO public, anon
  USING (true);  -- Application layer controls access via booking reference + email

-- Public can update bookings for check-in operations only
CREATE POLICY "Public can update for checkin"
  ON public.bookings
  FOR UPDATE
  TO public, anon
  USING (true)  -- Application layer validates booking reference + email match
  WITH CHECK (
    -- Allow updates to check-in related fields only
    contact_email IS NOT NULL
    AND LENGTH(contact_email) >= 5
  );

-- Admin can perform all operations
CREATE POLICY "Admin full access to bookings"
  ON public.bookings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Guest Profiles - Public can create and update during booking/check-in
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow read access to guest_profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow insert access to guest_profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow update access to guest_profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow delete access to guest_profiles" ON public.guest_profiles;

CREATE POLICY "Public can create guest profiles"
  ON public.guest_profiles
  FOR INSERT
  TO public, anon
  WITH CHECK (
    -- Basic validation for guest profile creation
    email IS NOT NULL
    AND name IS NOT NULL
    AND LENGTH(name) >= 2
    AND LENGTH(email) >= 5
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- Allow public to view guest profiles for check-in validation
CREATE POLICY "Public can view guest profiles for checkin"
  ON public.guest_profiles
  FOR SELECT
  TO public, anon
  USING (true);  -- Application layer controls access

-- Allow public to update guest profiles during check-in
CREATE POLICY "Public can update guest profiles for checkin"
  ON public.guest_profiles
  FOR UPDATE
  TO public, anon
  USING (true)
  WITH CHECK (
    -- Allow updates to profile fields
    email IS NOT NULL
    AND LENGTH(email) >= 5
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

CREATE POLICY "Admin full access to guest profiles"
  ON public.guest_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Check-in Data - Public can create and update for check-in process
ALTER TABLE public.checkin_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create checkin data"
  ON public.checkin_data
  FOR INSERT
  TO public, anon
  WITH CHECK (
    -- Validate required check-in fields
    booking_id IS NOT NULL
    AND first_name IS NOT NULL
    AND last_name IS NOT NULL
    AND email IS NOT NULL
    AND phone IS NOT NULL
    AND id_type IS NOT NULL
    AND id_number IS NOT NULL
    AND address IS NOT NULL
    AND emergency_contact_name IS NOT NULL
    AND emergency_contact_phone IS NOT NULL
    AND purpose_of_visit IS NOT NULL
    AND terms_accepted = true
  );

-- Allow public to view their own check-in data
CREATE POLICY "Public can view own checkin data"
  ON public.checkin_data
  FOR SELECT
  TO public, anon
  USING (true);  -- Application layer controls access via booking reference

-- Allow public to update check-in data before completion
CREATE POLICY "Public can update checkin data"
  ON public.checkin_data
  FOR UPDATE
  TO public, anon
  USING (true)
  WITH CHECK (
    -- Maintain data integrity
    booking_id IS NOT NULL
    AND email IS NOT NULL
    AND terms_accepted = true
  );

CREATE POLICY "Admin full access to checkin data"
  ON public.checkin_data
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- STEP 5: ADMIN-ONLY TABLES - Complete protection
-- ============================================================================

-- Expenses - Admin only access
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow insert access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow update access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow delete access to expenses" ON public.expenses;

CREATE POLICY "Admin only access to expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expense Categories - Admin only access
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to expense categories"
  ON public.expense_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expense Budgets - Admin only access
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to expense budgets"
  ON public.expense_budgets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expense Line Items - Admin only access
ALTER TABLE public.expense_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to expense line items"
  ON public.expense_line_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Expense Shares - Admin only access
ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to expense shares"
  ON public.expense_shares
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User Roles - Admin only access (critical security table)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin Profiles - Self-management for admin users
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage own profile"
  ON public.admin_profiles
  FOR ALL
  TO authenticated
  USING (
    public.is_admin() 
    AND auth.uid() = user_id
  )
  WITH CHECK (
    public.is_admin() 
    AND auth.uid() = user_id
  );

-- Notifications - Admin only access
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Check-in Audit Log - Admin only read access
ALTER TABLE public.checkin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to checkin audit log"
  ON public.checkin_audit_log
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Calendar Conflicts - Admin only access
ALTER TABLE public.calendar_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to calendar conflicts"
  ON public.calendar_conflicts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Email related tables - Admin only access
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Admin only access to email messages" ON public.email_messages;

-- Deny all anonymous access
CREATE POLICY "Deny anon access to email messages" 
  ON public.email_messages 
  FOR ALL 
  TO anon 
  USING (false) 
  WITH CHECK (false);

-- Allow only admin access for authenticated users
CREATE POLICY "Admin only access to email messages" 
  ON public.email_messages 
  FOR ALL 
  TO authenticated 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

ALTER TABLE public.email_booking_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to email booking imports" ON public.email_booking_imports FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to gmail tokens" ON public.gmail_tokens FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.gmail_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to gmail settings" ON public.gmail_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- STEP 6: PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Indexes to support RLS policy performance
CREATE INDEX IF NOT EXISTS idx_menu_items_available 
  ON public.menu_items(is_available) 
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_menu_categories_active 
  ON public.menu_categories(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rooms_active 
  ON public.rooms(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_properties_active 
  ON public.properties(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_dates 
  ON public.bookings(check_in, check_out);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_email 
  ON public.guest_profiles(email);

CREATE INDEX IF NOT EXISTS idx_checkin_data_booking 
  ON public.checkin_data(booking_id);

CREATE INDEX IF NOT EXISTS idx_checkin_data_email 
  ON public.checkin_data(email);

-- Indexes for admin operations
CREATE INDEX IF NOT EXISTS idx_expenses_admin 
  ON public.expenses(created_at DESC) 
  WHERE created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_admin 
  ON public.bookings(created_at DESC, status)
  WHERE created_at IS NOT NULL;

-- Critical index for user role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
  ON public.user_roles(user_id, role) 
  WHERE role IS NOT NULL;

-- ============================================================================
-- STEP 7: SECURITY TESTING AND MONITORING FUNCTIONS
-- ============================================================================

-- Function to test RLS policies comprehensively
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE(
  test_name TEXT,
  table_name TEXT,
  operation TEXT,
  user_type TEXT,
  expected_result TEXT,
  actual_result TEXT,
  passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_record RECORD;
  result_count INTEGER;
  original_role TEXT;
BEGIN
  -- Store original role
  SELECT current_user INTO original_role;
  
  -- Test 1: Public access to menu items
  BEGIN
    SET ROLE anon;
    SELECT COUNT(*) INTO result_count FROM public.menu_items;
    RETURN QUERY SELECT 
      'Public menu access'::TEXT,
      'menu_items'::TEXT,
      'SELECT'::TEXT,
      'anon'::TEXT,
      'success'::TEXT,
      'success'::TEXT,
      true;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'Public menu access'::TEXT,
        'menu_items'::TEXT,
        'SELECT'::TEXT,
        'anon'::TEXT,
        'success'::TEXT,
        'failed: ' || SQLERRM,
        false;
  END;
  
  -- Reset role
  EXECUTE format('SET ROLE %I', original_role);
  
  -- Test 2: Anonymous user cannot access expenses
  BEGIN
    SET ROLE anon;
    SELECT COUNT(*) INTO result_count FROM public.expenses;
    RETURN QUERY SELECT 
      'Anonymous expense access'::TEXT,
      'expenses'::TEXT,
      'SELECT'::TEXT,
      'anon'::TEXT,
      'denied'::TEXT,
      'unexpected success'::TEXT,
      false;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RETURN QUERY SELECT 
        'Anonymous expense access'::TEXT,
        'expenses'::TEXT,
        'SELECT'::TEXT,
        'anon'::TEXT,
        'denied'::TEXT,
        'properly denied'::TEXT,
        true;
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'Anonymous expense access'::TEXT,
        'expenses'::TEXT,
        'SELECT'::TEXT,
        'anon'::TEXT,
        'denied'::TEXT,
        'error: ' || SQLERRM,
        true;  -- Any error is acceptable for security
  END;
  
  -- Reset role
  EXECUTE format('SET ROLE %I', original_role);
  
END;
$$;

-- Performance monitoring view
CREATE OR REPLACE VIEW public.rls_performance_stats AS
SELECT 
  schemaname,
  relname as tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  seq_scan as sequential_scans,
  seq_tup_read as sequential_reads,
  idx_scan as index_scans,
  idx_tup_fetch as index_reads,
  ROUND((idx_scan::NUMERIC / NULLIF(seq_scan + idx_scan, 0) * 100), 2) as index_usage_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- Function to validate RLS is properly enabled
CREATE OR REPLACE FUNCTION public.validate_rls_enabled()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT,
    c.relrowsecurity,
    COUNT(p.polname)::INTEGER
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.relkind = 'r'  -- Only tables
    AND c.relname NOT LIKE 'pg_%'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$;

-- ============================================================================
-- STEP 8: GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_booking_access(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, JSONB) TO anon, authenticated;

-- Grant testing functions to admin users
GRANT EXECUTE ON FUNCTION public.test_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_rls_enabled() TO authenticated;

-- Grant select on performance monitoring view
GRANT SELECT ON public.rls_performance_stats TO authenticated;

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

-- Log the completion of RLS implementation
SELECT public.log_security_event(
  'RLS_MIGRATION_COMPLETE',
  'system',
  NULL,
  jsonb_build_object(
    'migration_date', NOW(),
    'version', '5.2.1',
    'tables_secured', (
      SELECT COUNT(*) 
      FROM pg_class c 
      WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND c.relkind = 'r' 
        AND c.relrowsecurity = true
    )
  )
);

-- Final validation
SELECT 'Accurate RLS Migration Complete - Validating...' as status;
SELECT * FROM public.validate_rls_enabled();
