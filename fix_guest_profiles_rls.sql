-- Fix Guest Profiles RLS Policies
-- This migration fixes the Row Level Security policies for guest_profiles table
-- to allow anonymous users to search and read guest profiles during check-in

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update guest profiles" ON public.guest_profiles;
DROP POLICY IF EXISTS "Allow anon to insert guest profiles" ON public.guest_profiles;

-- Create new policies that allow anonymous users to read and create guest profiles
-- This is necessary for the check-in process where guests create profiles anonymously

-- Policy 1: Allow anonymous users to read guest profiles (for search functionality)
CREATE POLICY "Allow anon to read guest profiles" ON public.guest_profiles
FOR SELECT TO anon
USING (true);

-- Policy 2: Allow anonymous users to insert guest profiles (for check-in)
CREATE POLICY "Allow anon to insert guest profiles" ON public.guest_profiles
FOR INSERT TO anon
WITH CHECK (true);

-- Policy 3: Allow anonymous users to update guest profiles (for check-in updates)
CREATE POLICY "Allow anon to update guest profiles" ON public.guest_profiles
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated users full access (for admin management)
CREATE POLICY "Allow authenticated users full access to guest profiles" ON public.guest_profiles
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'guest_profiles'
ORDER BY policyname;

-- Add comment to document the change
COMMENT ON TABLE public.guest_profiles IS 'Guest profiles with RLS policies allowing anonymous access for check-in process';