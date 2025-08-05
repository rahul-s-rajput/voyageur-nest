-- Fix RLS Policy for Pricing Rules
-- This migration resolves the authentication issue with pricing rules
-- by allowing anonymous users to manage pricing rules in development/demo environment

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to manage pricing rules" ON public.pricing_rules;

-- Create a new policy that allows both authenticated and anonymous users
-- This is suitable for development/demo environments with device token authentication
CREATE POLICY "Allow all users to manage pricing rules" ON public.pricing_rules
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Also ensure anon users have the necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO anon;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'RLS Policy updated for pricing_rules table';
    RAISE NOTICE 'Anonymous users can now manage pricing rules';
    RAISE NOTICE 'This is suitable for development/demo environments';
END $$;