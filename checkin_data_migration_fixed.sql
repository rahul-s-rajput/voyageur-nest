-- Fixed Migration to create checkin_data table with snake_case columns
-- Run this SQL in your Supabase SQL editor

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS public.checkin_data;

-- Create checkin_data table with snake_case field names (matching what the code sends)
CREATE TABLE public.checkin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  guest_profile_id UUID,
  
  -- Personal Details (snake_case)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth TEXT,
  nationality TEXT,
  id_type TEXT NOT NULL CHECK (id_type IN ('passport', 'license', 'national_id', 'other')),
  id_number TEXT NOT NULL,
  
  -- Address
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  
  -- Emergency Contact (snake_case)
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relation TEXT NOT NULL,
  
  -- Visit Details (snake_case)
  purpose_of_visit TEXT NOT NULL CHECK (purpose_of_visit IN ('leisure', 'business', 'family', 'medical', 'other')),
  arrival_date TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  room_number TEXT NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  
  -- Additional Guests (JSON array, snake_case)
  additional_guests JSONB DEFAULT '[]',
  
  -- Special Requests (snake_case)
  special_requests TEXT,
  
  -- Preferences (JSON object)
  preferences JSONB DEFAULT '{"wakeUpCall": false, "newspaper": false, "extraTowels": false, "extraPillows": false, "roomService": false, "doNotDisturb": false}',
  
  -- Agreement (snake_case)
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  
  -- Document URLs
  id_document_urls TEXT[],
  
  -- Metadata
  form_completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkin_data_booking_id ON public.checkin_data(booking_id);
CREATE INDEX IF NOT EXISTS idx_checkin_data_email ON public.checkin_data(email);
CREATE INDEX IF NOT EXISTS idx_checkin_data_phone ON public.checkin_data(phone);
CREATE INDEX IF NOT EXISTS idx_checkin_data_created_at ON public.checkin_data(created_at);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_data;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.checkin_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow anon to insert checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow anon to select checkin_data" ON public.checkin_data;
DROP POLICY IF EXISTS "Allow anon to update checkin_data" ON public.checkin_data;

-- Policy to allow anonymous users to insert check-in data
CREATE POLICY "Allow anon to insert checkin_data" ON public.checkin_data
FOR INSERT TO anon
WITH CHECK (true);

-- Policy to allow anonymous users to select check-in data
CREATE POLICY "Allow anon to select checkin_data" ON public.checkin_data
FOR SELECT TO anon
USING (true);

-- Policy to allow anonymous users to update check-in data
CREATE POLICY "Allow anon to update checkin_data" ON public.checkin_data
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- Policy to allow authenticated users full access (if needed later)
CREATE POLICY "Allow authenticated users full access" ON public.checkin_data
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_checkin_data_updated_at ON public.checkin_data;
CREATE TRIGGER update_checkin_data_updated_at 
    BEFORE UPDATE ON public.checkin_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public.checkin_data TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data
/*
INSERT INTO public.checkin_data (
  booking_id,
  first_name,
  last_name,
  email,
  phone,
  id_type,
  id_number,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_relation,
  purpose_of_visit,
  arrival_date,
  departure_date,
  room_number,
  number_of_guests,
  terms_accepted,
  marketing_consent
) VALUES (
  (SELECT id FROM public.bookings LIMIT 1), -- Use an existing booking ID
  'John',
  'Doe',
  'john.doe@example.com',
  '+1234567890',
  'passport',
  'P123456789',
  '123 Main St, City, Country',
  'Jane Doe',
  '+1234567891',
  'spouse',
  'leisure',
  '2024-01-15',
  '2024-01-20',
  '101',
  2,
  true,
  false
);
*/