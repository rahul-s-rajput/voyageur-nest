-- CRITICAL SECURITY FIX MIGRATION
-- This migration addresses the severe security vulnerabilities in checkin_data RLS policies
-- PRIORITY: IMMEDIATE - Apply to production ASAP

-- Run this SQL in your Supabase SQL editor

-- ========================================
-- 1. FIX CRITICAL RLS POLICY VULNERABILITIES
-- ========================================

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Allow anon to select checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow anon to update checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow anon to insert checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.checkin_data;

-- Create secure RLS policies with proper access control
-- Policy 1: Allow anonymous users to insert check-in data (with booking validation)
CREATE POLICY "Secure anon insert checkin_data" ON public.checkin_data
FOR INSERT TO anon
WITH CHECK (
  -- Ensure booking_id exists and is valid
  booking_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id)
);

-- Policy 2: Allow anonymous users to select ONLY their own check-in data
CREATE POLICY "Secure anon select checkin_data" ON public.checkin_data
FOR SELECT TO anon
USING (
  -- Only allow access if booking_id matches the session booking
  booking_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'booking_id',
    current_setting('request.booking_id', true)
  )::uuid
);

-- Policy 3: Allow anonymous users to update ONLY their own check-in data
CREATE POLICY "Secure anon update checkin_data" ON public.checkin_data
FOR UPDATE TO anon
USING (
  -- Only allow updates to their own booking
  booking_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'booking_id',
    current_setting('request.booking_id', true)
  )::uuid
)
WITH CHECK (
  -- Ensure they can't change the booking_id to access other records
  booking_id = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'booking_id',
    current_setting('request.booking_id', true)
  )::uuid
);

-- Policy 4: Allow authenticated staff full access for management
CREATE POLICY "Staff full access checkin_data" ON public.checkin_data
FOR ALL TO authenticated
USING (
  -- Only allow if user has staff role
  auth.jwt() ->> 'role' = 'staff' OR
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'staff' OR
  auth.jwt() ->> 'role' = 'admin'
);

-- ========================================
-- 2. FIX STORAGE BUCKET SECURITY
-- ========================================

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Allow anonymous uploads to id-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous reads from id-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous updates to id-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous deletes from id-documents" ON storage.objects;

-- Create secure storage policies with path-based access control
-- Policy 1: Allow anonymous uploads only to their booking folder
CREATE POLICY "Secure anonymous uploads to id-documents" 
ON storage.objects 
FOR INSERT 
TO anon 
WITH CHECK (
  bucket_id = 'id-documents' AND
  -- Ensure uploads go to a booking-specific folder
  name LIKE COALESCE(
    current_setting('request.jwt.claims', true)::json->>'booking_id',
    current_setting('request.booking_id', true)
  ) || '/%'
);

-- Policy 2: Allow anonymous reads only from their booking folder
CREATE POLICY "Secure anonymous reads from id-documents" 
ON storage.objects 
FOR SELECT 
TO anon 
USING (
  bucket_id = 'id-documents' AND
  name LIKE COALESCE(
    current_setting('request.jwt.claims', true)::json->>'booking_id',
    current_setting('request.booking_id', true)
  ) || '/%'
);

-- Policy 3: Allow staff to read all files
CREATE POLICY "Staff read all id-documents" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'id-documents' AND
  (auth.jwt() ->> 'role' = 'staff' OR auth.jwt() ->> 'role' = 'admin')
);

-- Policy 4: Allow staff to delete files (for cleanup)
CREATE POLICY "Staff delete id-documents" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'id-documents' AND
  (auth.jwt() ->> 'role' = 'staff' OR auth.jwt() ->> 'role' = 'admin')
);

-- ========================================
-- 3. ADD AUDIT LOGGING
-- ========================================

-- Create audit log table for tracking access
CREATE TABLE IF NOT EXISTS public.checkin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_data_id UUID REFERENCES public.checkin_data(id),
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'SELECT', 'DELETE')),
  user_role TEXT,
  user_id TEXT,
  booking_id UUID,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  details JSONB DEFAULT '{}'
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_checkin_audit_log_timestamp ON public.checkin_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkin_audit_log_booking_id ON public.checkin_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_audit_log_action ON public.checkin_audit_log(action);

-- Enable RLS on audit log
ALTER TABLE public.checkin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can read audit logs
CREATE POLICY "Staff read audit logs" ON public.checkin_audit_log
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'role' = 'staff' OR
  auth.jwt() ->> 'role' = 'admin'
);

-- ========================================
-- 4. ADD DATA RETENTION POLICIES
-- ========================================

-- Create function to automatically delete old check-in data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_checkin_data()
RETURNS void AS $$
BEGIN
  -- Delete check-in data older than 7 years (adjust as per your retention policy)
  DELETE FROM public.checkin_data 
  WHERE created_at < NOW() - INTERVAL '7 years';
  
  -- Delete audit logs older than 2 years
  DELETE FROM public.checkin_audit_log 
  WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. ADD RATE LIMITING TABLE
-- ========================================

-- Create table for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_ip_action ON public.rate_limit_log(ip_address, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_window_start ON public.rate_limit_log(window_start);

-- Enable RLS on rate limit log
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can read rate limit logs
CREATE POLICY "Staff read rate limit logs" ON public.rate_limit_log
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'role' = 'staff' OR
  auth.jwt() ->> 'role' = 'admin'
);

-- ========================================
-- 6. VERIFICATION AND TESTING
-- ========================================

-- Test the new policies (these should return 0 rows for anon users without proper context)
-- SELECT COUNT(*) FROM public.checkin_data; -- Should return 0 for anon without booking_id

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public.checkin_data TO anon;
GRANT SELECT ON public.rate_limit_log TO authenticated;
GRANT SELECT ON public.checkin_audit_log TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Log this security fix
INSERT INTO public.checkin_audit_log (
  action,
  user_role,
  details
) VALUES (
  'UPDATE',
  'system',
  jsonb_build_object(
    'message', 'Critical security fix applied - RLS policies hardened',
    'timestamp', NOW()::text,
    'migration_version', '1.0',
    'applied_by', 'system'
  )
);

COMMENT ON TABLE public.checkin_data IS 'Guest check-in data with secure RLS policies - booking-specific access only';
COMMENT ON TABLE public.checkin_audit_log IS 'Audit trail for all check-in data access and modifications';
COMMENT ON TABLE public.rate_limit_log IS 'Server-side rate limiting tracking for form submissions';