-- Property Management Complete Database Migration
-- This migration adds all missing tables for full Property Management functionality

-- =====================================================
-- 1. PRICING RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Rule Configuration
  rule_name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  season_type TEXT NOT NULL DEFAULT 'regular', -- regular, peak, off-peak
  
  -- Pricing Details
  base_price DECIMAL(10,2) NOT NULL,
  weekend_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Booking Constraints
  minimum_stay INTEGER DEFAULT 1,
  maximum_stay INTEGER DEFAULT 30,
  advance_booking_days INTEGER DEFAULT 0,
  
  -- Validity Period
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. GUEST VISITS TABLE (for cross-property tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id UUID NOT NULL REFERENCES public.guest_profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  
  -- Visit Details
  visit_date DATE NOT NULL,
  room_type TEXT,
  amount_spent DECIMAL(10,2) DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  
  -- Guest Preferences
  special_requests TEXT[],
  amenity_preferences TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. GUEST PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id UUID NOT NULL REFERENCES public.guest_profiles(id) ON DELETE CASCADE,
  
  -- Room Preferences
  preferred_room_type TEXT,
  preferred_bed_type TEXT,
  preferred_floor TEXT,
  
  -- Amenity Preferences
  amenity_preferences TEXT[],
  
  -- Communication Preferences
  communication_preference TEXT DEFAULT 'email', -- email, sms, both
  
  -- Special Requirements
  special_requirements TEXT[],
  dietary_restrictions TEXT[],
  accessibility_needs TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one preference record per guest
  UNIQUE(guest_profile_id)
);

-- =====================================================
-- 4. PROPERTY ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.property_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Date Range
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  -- Occupancy Metrics
  total_rooms INTEGER NOT NULL,
  occupied_rooms INTEGER DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Revenue Metrics
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_daily_rate DECIMAL(10,2) DEFAULT 0,
  revenue_per_available_room DECIMAL(10,2) DEFAULT 0,
  
  -- Booking Metrics
  total_bookings INTEGER DEFAULT 0,
  confirmed_bookings INTEGER DEFAULT 0,
  cancelled_bookings INTEGER DEFAULT 0,
  no_show_bookings INTEGER DEFAULT 0,
  
  -- Guest Metrics
  total_guests INTEGER DEFAULT 0,
  repeat_guests INTEGER DEFAULT 0,
  average_stay_duration DECIMAL(4,2) DEFAULT 0,
  
  -- Rating Metrics
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique analytics per property per date range
  UNIQUE(property_id, date_from, date_to)
);

-- =====================================================
-- 5. GUEST LOYALTY TIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guest_loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id UUID NOT NULL REFERENCES public.guest_profiles(id) ON DELETE CASCADE,
  
  -- Loyalty Information
  tier_name TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  current_points INTEGER DEFAULT 0,
  
  -- VIP Status
  is_vip BOOLEAN DEFAULT false,
  vip_since DATE,
  
  -- Tier Benefits
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  priority_booking BOOLEAN DEFAULT false,
  complimentary_upgrades BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one loyalty record per guest
  UNIQUE(guest_profile_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Pricing Rules Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_rules_property_id ON public.pricing_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room_type ON public.pricing_rules(room_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_season ON public.pricing_rules(season_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON public.pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_validity ON public.pricing_rules(valid_from, valid_to);

-- Guest Visits Indexes
CREATE INDEX IF NOT EXISTS idx_guest_visits_guest_id ON public.guest_visits(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_visits_property_id ON public.guest_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_visits_date ON public.guest_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_guest_visits_booking_id ON public.guest_visits(booking_id);

-- Guest Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_guest_preferences_guest_id ON public.guest_preferences(guest_profile_id);

-- Property Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_property_analytics_property_id ON public.property_analytics(property_id);
CREATE INDEX IF NOT EXISTS idx_property_analytics_date_range ON public.property_analytics(date_from, date_to);

-- Guest Loyalty Indexes
CREATE INDEX IF NOT EXISTS idx_guest_loyalty_guest_id ON public.guest_loyalty_tiers(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_guest_loyalty_tier ON public.guest_loyalty_tiers(tier_name);
CREATE INDEX IF NOT EXISTS idx_guest_loyalty_vip ON public.guest_loyalty_tiers(is_vip);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_loyalty_tiers ENABLE ROW LEVEL SECURITY;

-- Pricing Rules Policies
CREATE POLICY "Allow authenticated users to manage pricing rules" ON public.pricing_rules
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Guest Visits Policies
CREATE POLICY "Allow authenticated users to manage guest visits" ON public.guest_visits
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Guest Preferences Policies
CREATE POLICY "Allow authenticated users to manage guest preferences" ON public.guest_preferences
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon to read guest preferences" ON public.guest_preferences
FOR SELECT TO anon USING (true);

-- Property Analytics Policies
CREATE POLICY "Allow authenticated users to read property analytics" ON public.property_analytics
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert property analytics" ON public.property_analytics
FOR INSERT TO authenticated WITH CHECK (true);

-- Guest Loyalty Policies
CREATE POLICY "Allow authenticated users to manage guest loyalty" ON public.guest_loyalty_tiers
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all new tables
CREATE TRIGGER update_pricing_rules_updated_at 
    BEFORE UPDATE ON public.pricing_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_visits_updated_at 
    BEFORE UPDATE ON public.guest_visits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_preferences_updated_at 
    BEFORE UPDATE ON public.guest_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_analytics_updated_at 
    BEFORE UPDATE ON public.property_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_loyalty_updated_at 
    BEFORE UPDATE ON public.guest_loyalty_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REAL-TIME SUBSCRIPTIONS
-- =====================================================

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_loyalty_tiers;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to anon and authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Pricing Rules
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT SELECT ON public.pricing_rules TO anon;

-- Guest Visits
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_visits TO authenticated;
GRANT SELECT ON public.guest_visits TO anon;

-- Guest Preferences
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guest_preferences TO anon;

-- Property Analytics
GRANT SELECT, INSERT, UPDATE ON public.property_analytics TO authenticated;
GRANT SELECT ON public.property_analytics TO anon;

-- Guest Loyalty
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_loyalty_tiers TO authenticated;
GRANT SELECT ON public.guest_loyalty_tiers TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- SAMPLE DATA FUNCTIONS (Optional)
-- =====================================================

-- Function to calculate guest loyalty tier based on spending and visits
CREATE OR REPLACE FUNCTION calculate_guest_loyalty_tier(guest_id UUID)
RETURNS TEXT AS $$
DECLARE
    total_spent DECIMAL;
    total_visits INTEGER;
    tier_name TEXT;
BEGIN
    -- Get guest statistics
    SELECT 
        COALESCE(gp.total_spent, 0),
        COALESCE(gp.total_stays, 0)
    INTO total_spent, total_visits
    FROM public.guest_profiles gp
    WHERE gp.id = guest_id;
    
    -- Calculate tier based on spending and visits
    IF total_spent >= 50000 OR total_visits >= 10 THEN
        tier_name := 'platinum';
    ELSIF total_spent >= 25000 OR total_visits >= 5 THEN
        tier_name := 'gold';
    ELSIF total_spent >= 10000 OR total_visits >= 2 THEN
        tier_name := 'silver';
    ELSE
        tier_name := 'bronze';
    END IF;
    
    -- Update or insert loyalty tier
    INSERT INTO public.guest_loyalty_tiers (guest_profile_id, tier_name, current_points)
    VALUES (guest_id, tier_name, FLOOR(total_spent / 100))
    ON CONFLICT (guest_profile_id) 
    DO UPDATE SET 
        tier_name = EXCLUDED.tier_name,
        current_points = EXCLUDED.current_points,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN tier_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Insert a completion log
DO $$
BEGIN
    RAISE NOTICE 'Property Management Complete Migration executed successfully!';
    RAISE NOTICE 'Created tables: pricing_rules, guest_visits, guest_preferences, property_analytics, guest_loyalty_tiers';
    RAISE NOTICE 'Added indexes, RLS policies, triggers, and permissions';
END $$;