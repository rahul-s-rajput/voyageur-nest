-- Migration to create checkin_data table
-- Run this SQL in your Supabase SQL editor

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS public.checkin_data;

-- Create checkin_data table with all required fields
CREATE TABLE public.checkin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) NOT NULL,
  guest_profile_id UUID,
  
  -- Personal Details
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  first_name TEXT, -- Alternative field name for compatibility
  last_name TEXT,  -- Alternative field name for compatibility
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  dateOfBirth TEXT,
  date_of_birth TEXT, -- Alternative field name for compatibility
  nationality TEXT,
  idType TEXT NOT NULL CHECK (idType IN ('passport', 'license', 'national_id', 'other')),
  id_type TEXT, -- Alternative field name for compatibility
  idNumber TEXT NOT NULL,
  id_number TEXT, -- Alternative field name for compatibility
  
  -- Address
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  zipCode TEXT,
  zip_code TEXT, -- Alternative field name for compatibility
  
  -- Emergency Contact
  emergencyContactName TEXT NOT NULL,
  emergency_contact_name TEXT, -- Alternative field name for compatibility
  emergencyContactPhone TEXT NOT NULL,
  emergency_contact_phone TEXT, -- Alternative field name for compatibility
  emergencyContactRelation TEXT NOT NULL,
  emergency_contact_relation TEXT, -- Alternative field name for compatibility
  
  -- Visit Details
  purposeOfVisit TEXT NOT NULL CHECK (purposeOfVisit IN ('leisure', 'business', 'family', 'medical', 'other')),
  purpose_of_visit TEXT, -- Alternative field name for compatibility
  arrivalDate TEXT NOT NULL,
  arrival_date TEXT, -- Alternative field name for compatibility
  departureDate TEXT NOT NULL,
  departure_date TEXT, -- Alternative field name for compatibility
  roomNumber TEXT NOT NULL,
  room_number TEXT, -- Alternative field name for compatibility
  numberOfGuests INTEGER NOT NULL DEFAULT 1,
  number_of_guests INTEGER, -- Alternative field name for compatibility
  
  -- Additional Guests (JSON array)
  additionalGuests JSONB DEFAULT '[]',
  additional_guests JSONB, -- Alternative field name for compatibility
  
  -- Special Requests
  specialRequests TEXT,
  special_requests TEXT, -- Alternative field name for compatibility
  
  -- Preferences (JSON object)
  preferences JSONB DEFAULT '{"wakeUpCall": false, "newspaper": false, "extraTowels": false, "extraPillows": false, "roomService": false, "doNotDisturb": false}',
  
  -- Agreement
  termsAccepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN, -- Alternative field name for compatibility
  marketingConsent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN, -- Alternative field name for compatibility
  
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

-- Policy to allow all operations for now (you can restrict this based on your auth requirements)
CREATE POLICY "Allow all operations on checkin_data" ON public.checkin_data
FOR ALL USING (true);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_checkin_data_updated_at 
    BEFORE UPDATE ON public.checkin_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data
/*
INSERT INTO public.checkin_data (
  booking_id,
  firstName,
  lastName,
  email,
  phone,
  idType,
  idNumber,
  address,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelation,
  purposeOfVisit,
  arrivalDate,
  departureDate,
  roomNumber,
  numberOfGuests,
  termsAccepted,
  marketingConsent
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