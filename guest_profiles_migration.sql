-- Guest Profiles Migration for Story 1.3
-- Run this SQL in your Supabase SQL editor

-- Create guest_profiles table
CREATE TABLE IF NOT EXISTS public.guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Contact Information
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  
  -- Guest Statistics
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_stay_date DATE,
  typical_group_size INTEGER DEFAULT 1,
  
  -- Privacy Preferences
  email_marketing_consent BOOLEAN DEFAULT true,
  sms_marketing_consent BOOLEAN DEFAULT true,
  data_retention_consent BOOLEAN DEFAULT true,
  
  -- Staff Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing fields to bookings table for guest data collection
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
ADD COLUMN IF NOT EXISTS additional_guest_names TEXT,
ADD COLUMN IF NOT EXISTS guest_profile_id UUID REFERENCES public.guest_profiles(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON public.guest_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON public.guest_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_name ON public.guest_profiles(name);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_last_stay ON public.guest_profiles(last_stay_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile_id ON public.bookings(guest_profile_id);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_profiles;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for guest_profiles
CREATE POLICY "Allow authenticated users to read guest profiles" ON public.guest_profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert guest profiles" ON public.guest_profiles
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update guest profiles" ON public.guest_profiles
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Allow anonymous users to create guest profiles during check-in
CREATE POLICY "Allow anon to insert guest profiles" ON public.guest_profiles
FOR INSERT TO anon
WITH CHECK (true);

-- Create function to update updated_at timestamp for guest_profiles
CREATE OR REPLACE FUNCTION update_guest_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for guest_profiles
DROP TRIGGER IF EXISTS update_guest_profiles_updated_at ON public.guest_profiles;
CREATE TRIGGER update_guest_profiles_updated_at 
    BEFORE UPDATE ON public.guest_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_guest_profiles_updated_at();

-- Create function to automatically update guest profile statistics
CREATE OR REPLACE FUNCTION update_guest_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update guest profile statistics when a booking is created or updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.guest_profile_id IS NOT NULL THEN
            UPDATE public.guest_profiles 
            SET 
                total_stays = (
                    SELECT COUNT(*) 
                    FROM public.bookings 
                    WHERE guest_profile_id = NEW.guest_profile_id 
                    AND status = 'checked-out'
                ),
                total_spent = (
                    SELECT COALESCE(SUM(total_amount), 0) 
                    FROM public.bookings 
                    WHERE guest_profile_id = NEW.guest_profile_id 
                    AND payment_status IN ('paid', 'partial')
                ),
                last_stay_date = (
                    SELECT MAX(check_out) 
                    FROM public.bookings 
                    WHERE guest_profile_id = NEW.guest_profile_id 
                    AND status = 'checked-out'
                ),
                typical_group_size = (
                    SELECT ROUND(AVG(no_of_pax)) 
                    FROM public.bookings 
                    WHERE guest_profile_id = NEW.guest_profile_id
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.guest_profile_id;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger to update guest profile stats when bookings change
DROP TRIGGER IF EXISTS update_guest_stats_on_booking_change ON public.bookings;
CREATE TRIGGER update_guest_stats_on_booking_change
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_profile_stats();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guest_profiles TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;